#!/usr/bin/env python3
"""Guarded deployment and rollback for the bct-site-proxy Worker."""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests


API_BASE = "https://api.cloudflare.com/client/v4"
ZONE_NAME = "borchardtct.com"
SCRIPT_NAME = "bct-site-proxy"
WORKER_FILE = Path(__file__).with_name("worker.js")
EXPECTED_ROUTES = ("borchardtct.com/*", "www.borchardtct.com/*")
EXPECTED_SECRET_BINDINGS = {
    "BCT_GRAPH_TENANT_ID",
    "BCT_GRAPH_CLIENT_ID",
    "BCT_GRAPH_CLIENT_SECRET",
    "LEAD_MAILBOX",
}
RATE_LIMIT_BINDING = "LEAD_RATE_LIMIT"


class Cloudflare:
    def __init__(self) -> None:
        email = os.environ.get("CF_API_EMAIL")
        api_key = os.environ.get("CF_GLOBAL_API_KEY")
        self.account_id = os.environ.get("CF_ACCOUNT_ID")
        if not email or not api_key or not self.account_id:
            raise RuntimeError("CF_API_EMAIL, CF_GLOBAL_API_KEY and CF_ACCOUNT_ID are required")

        self.session = requests.Session()
        self.session.headers.update(
            {
                "X-Auth-Email": email,
                "X-Auth-Key": api_key,
                "Accept": "application/json",
            }
        )
        self._zone_id: str | None = None

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        response = self.session.request(method, API_BASE + path, timeout=60, **kwargs)
        try:
            payload = response.json()
        except ValueError as error:
            raise RuntimeError(f"Cloudflare returned non-JSON HTTP {response.status_code}") from error
        if not response.ok or not payload.get("success"):
            errors = payload.get("errors") or [{"code": response.status_code, "message": "request failed"}]
            sanitized = [{"code": item.get("code"), "message": item.get("message")} for item in errors]
            raise RuntimeError(f"Cloudflare API error: {sanitized}")
        return payload.get("result")

    def raw_script(self) -> requests.Response:
        response = self.session.get(
            API_BASE + f"/accounts/{self.account_id}/workers/scripts/{SCRIPT_NAME}",
            timeout=60,
        )
        if not response.ok:
            raise RuntimeError(f"Unable to download current Worker source (HTTP {response.status_code})")
        return response

    @property
    def zone_id(self) -> str:
        if self._zone_id:
            return self._zone_id
        zones = self.request("GET", "/zones", params={"name": ZONE_NAME, "status": "active"})
        exact = [zone for zone in zones if zone.get("name") == ZONE_NAME]
        if len(exact) != 1:
            raise RuntimeError(f"Expected one active {ZONE_NAME} zone, found {len(exact)}")
        account_id = (exact[0].get("account") or {}).get("id")
        if account_id and account_id != self.account_id:
            raise RuntimeError("Zone account does not match CF_ACCOUNT_ID")
        self._zone_id = exact[0]["id"]
        return self._zone_id

    def settings(self) -> dict[str, Any]:
        result = self.request("GET", f"/accounts/{self.account_id}/workers/scripts/{SCRIPT_NAME}/settings")
        return result if isinstance(result, dict) else {}

    def routes(self) -> list[dict[str, Any]]:
        result = self.request("GET", f"/zones/{self.zone_id}/workers/routes")
        return result if isinstance(result, list) else []

    def deployed_version_id(self) -> str:
        result = self.request("GET", f"/accounts/{self.account_id}/workers/scripts/{SCRIPT_NAME}/deployments")
        deployments = result.get("deployments", []) if isinstance(result, dict) else result
        if not isinstance(deployments, list):
            raise RuntimeError("Unable to identify the current Worker deployment")

        for deployment in deployments:
            versions = deployment.get("versions") or []
            if len(versions) == 1 and float(versions[0].get("percentage", 0)) == 100:
                version_id = versions[0].get("version_id")
                if version_id:
                    return str(version_id)
        raise RuntimeError("Expected a single Worker version receiving 100% of traffic")

    def upload_content(self) -> None:
        source = WORKER_FILE.read_bytes()
        files = {
            "metadata": (None, json.dumps({"main_module": WORKER_FILE.name}), "application/json"),
            WORKER_FILE.name: (WORKER_FILE.name, source, "application/javascript+module"),
        }
        self.request(
            "PUT",
            f"/accounts/{self.account_id}/workers/scripts/{SCRIPT_NAME}/content",
            files=files,
        )

    def deploy_version(self, version_id: str) -> None:
        self.request(
            "POST",
            f"/accounts/{self.account_id}/workers/scripts/{SCRIPT_NAME}/deployments",
            json={
                "strategy": "percentage",
                "versions": [{"version_id": version_id, "percentage": 100}],
            },
        )


def binding_snapshot(settings: dict[str, Any]) -> list[dict[str, Any]]:
    bindings = settings.get("bindings") or []
    if not isinstance(bindings, list):
        raise RuntimeError("Worker settings did not contain a binding list")
    safe_bindings = []
    for binding in bindings:
        safe_binding = dict(binding)
        if safe_binding.get("type") == "secret_text":
            safe_binding.pop("text", None)
        safe_bindings.append(safe_binding)
    return sorted(safe_bindings, key=lambda binding: str(binding.get("name", "")))


def route_snapshot(routes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    selected = []
    for route in routes:
        if route.get("script") == SCRIPT_NAME or route.get("pattern") in EXPECTED_ROUTES:
            selected.append(
                {
                    "pattern": route.get("pattern"),
                    "script": route.get("script"),
                    "request_limit_fail_open": route.get("request_limit_fail_open"),
                }
            )
    return sorted(selected, key=lambda route: str(route.get("pattern", "")))


def assert_expected_bindings(bindings: list[dict[str, Any]]) -> None:
    by_name = {binding.get("name"): binding for binding in bindings}
    expected_names = EXPECTED_SECRET_BINDINGS | {RATE_LIMIT_BINDING}
    if set(by_name) != expected_names:
        raise RuntimeError("Worker bindings differ from the documented lead-form bindings")

    for name in EXPECTED_SECRET_BINDINGS:
        if by_name[name].get("type") != "secret_text":
            raise RuntimeError(f"Binding {name} must be a secret_text binding")

    rate_binding = by_name[RATE_LIMIT_BINDING]
    if rate_binding.get("type") != "ratelimit":
        raise RuntimeError(f"Binding {RATE_LIMIT_BINDING} must be a ratelimit binding")
    simple = rate_binding.get("simple") or {}
    if simple.get("limit") != 5 or simple.get("period") != 60:
        raise RuntimeError(f"Binding {RATE_LIMIT_BINDING} must use limit 5 and period 60")
    namespace_id = str(rate_binding.get("namespace_id") or "")
    if not namespace_id.isdigit() or int(namespace_id) < 1:
        raise RuntimeError(f"Binding {RATE_LIMIT_BINDING} requires a positive integer namespace_id")


def assert_expected_routes(routes: list[dict[str, Any]]) -> None:
    observed = route_snapshot(routes)
    observed_patterns = tuple(sorted(route.get("pattern") for route in observed))
    if observed_patterns != tuple(sorted(EXPECTED_ROUTES)):
        raise RuntimeError("Worker routes differ from the documented apex and www routes")
    if any(route.get("script") != SCRIPT_NAME for route in observed):
        raise RuntimeError("A required route is assigned to another Worker")


def backup_current(cf: Cloudflare) -> tuple[Path, dict[str, Any]]:
    raw_script = cf.raw_script()
    settings = cf.settings()
    safe_settings = {**settings, "bindings": binding_snapshot(settings)}
    routes = cf.routes()
    version_id = cf.deployed_version_id()
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = Path(
        os.environ.get(
            "BCT_WORKER_BACKUP_DIR",
            Path.home() / ".aidevops" / ".agent-workspace" / "backups" / SCRIPT_NAME,
        )
    ).expanduser()
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f"{SCRIPT_NAME}-{timestamp}.json"
    payload = {
        "created_at": datetime.now(UTC).isoformat(),
        "zone": ZONE_NAME,
        "script": SCRIPT_NAME,
        "deployed_version_id": version_id,
        "source_content_type": raw_script.headers.get("content-type"),
        "source_base64": base64.b64encode(raw_script.content).decode("ascii"),
        "settings": safe_settings,
        "routes": routes,
    }
    backup_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    backup_path.chmod(0o600)
    return backup_path, payload


def smoke_test() -> None:
    root = requests.get(f"https://{ZONE_NAME}/", timeout=60, allow_redirects=False)
    if root.status_code != 200:
        raise RuntimeError(f"GET / smoke test returned HTTP {root.status_code}")

    empty_lead = requests.post(f"https://{ZONE_NAME}/api/lead", timeout=60, data=b"")
    if empty_lead.status_code != 400:
        raise RuntimeError(f"POST /api/lead smoke test returned HTTP {empty_lead.status_code}")


def deploy(cf: Cloudflare, backup_path: Path, backup: dict[str, Any]) -> None:
    before_bindings = binding_snapshot(backup["settings"])
    before_routes = route_snapshot(backup["routes"])
    assert_expected_bindings(before_bindings)
    assert_expected_routes(backup["routes"])

    upload_started = False
    try:
        upload_started = True
        cf.upload_content()

        after_bindings = binding_snapshot(cf.settings())
        after_routes = route_snapshot(cf.routes())
        if after_bindings != before_bindings:
            raise RuntimeError("Worker bindings changed during the code-only upload")
        if after_routes != before_routes:
            raise RuntimeError("Worker routes changed during the code-only upload")

        smoke_test()
    except Exception as error:
        if upload_started:
            try:
                cf.deploy_version(str(backup["deployed_version_id"]))
                if cf.deployed_version_id() != str(backup["deployed_version_id"]):
                    raise RuntimeError("Cloudflare did not restore the backed-up version")
            except Exception as rollback_error:
                raise RuntimeError(
                    f"Deployment failed and automatic rollback failed; use backup {backup_path}: {rollback_error}"
                ) from error
        raise RuntimeError(f"Deployment failed; restored version from {backup_path}: {error}") from error


def rollback(cf: Cloudflare, backup_path: Path) -> None:
    backup = json.loads(backup_path.read_text(encoding="utf-8"))
    if backup.get("zone") != ZONE_NAME or backup.get("script") != SCRIPT_NAME:
        raise RuntimeError("Backup does not belong to the expected zone and Worker")
    version_id = backup.get("deployed_version_id")
    if not version_id:
        raise RuntimeError("Backup does not include a deployed version ID")
    cf.deploy_version(str(version_id))
    if cf.deployed_version_id() != str(version_id):
        raise RuntimeError("Cloudflare did not activate the requested rollback version")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--check", action="store_true", help="Back up and validate without uploading")
    action.add_argument("--deploy", action="store_true", help="Back up, upload, smoke-test and auto-rollback on failure")
    action.add_argument("--rollback", type=Path, metavar="BACKUP", help="Activate the version stored in a backup file")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        cf = Cloudflare()
        if args.rollback:
            rollback(cf, args.rollback.expanduser().resolve())
            print(json.dumps({"ok": True, "rolled_back": True, "script": SCRIPT_NAME}))
            return 0

        backup_path, backup = backup_current(cf)
        bindings = binding_snapshot(backup["settings"])
        assert_expected_bindings(bindings)
        assert_expected_routes(backup["routes"])
        if args.check:
            print(json.dumps({"ok": True, "checked": True, "backup": str(backup_path)}))
            return 0

        deploy(cf, backup_path, backup)
        print(json.dumps({"ok": True, "deployed": True, "backup": str(backup_path)}))
        return 0
    except (RuntimeError, OSError, ValueError, requests.RequestException) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
