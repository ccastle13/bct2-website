import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, services, serviceSlugs } from "../service-data";

const siteUrl = "https://borchardtct.com";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    return {};
  }

  const canonical = `${siteUrl}/services/${service.slug}`;

  return {
    title: service.metaTitle,
    description: service.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: service.metaTitle,
      description: service.description,
      siteName: "Borchardt Construction Technology",
      images: [
        {
          url: "/images/bct-hero-earthwork.webp",
          width: 1920,
          height: 1080,
          alt: "Construction earthwork site",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: service.metaTitle,
      description: service.description,
      images: ["/images/bct-hero-earthwork.webp"],
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getService(slug);

  if (!service) {
    notFound();
  }

  const canonical = `${siteUrl}/services/${service.slug}`;
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description,
    url: canonical,
    provider: {
      "@type": "Organization",
      name: "Borchardt Construction Technology",
      url: siteUrl,
    },
  };

  return (
    <div className="min-h-screen bg-bct-ink text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="border-b border-white/10 bg-bct-ink">
        <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-5 py-4 sm:h-32 sm:px-8 sm:py-5">
          <Link href="/" className="flex items-center pb-5" aria-label="BCT home">
            <Image
              src="/images/bct-logo-transparent.png"
              alt="Borchardt Construction Technology"
              width={190}
              height={160}
              className="h-18 w-auto object-contain sm:h-20"
              priority
            />
          </Link>
          <Link
            href="/#services"
            className="text-sm font-semibold text-white/75 transition-colors hover:text-bct-yellow"
          >
            All services
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-white/10 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div>
              <p className="mb-5 font-mono text-sm text-bct-yellow">Service {service.number}</p>
              <h1 className="max-w-[13ch] text-5xl leading-[0.96] font-semibold tracking-tight sm:text-7xl">
                {service.title}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
                {service.overview}
              </p>
              <a
                href="mailto:arek@borchardtct.com?subject=Website%20inquiry"
                className="mt-9 inline-flex h-12 items-center rounded-full bg-bct-yellow px-7 text-sm font-semibold text-black transition-colors hover:bg-white sm:h-14 sm:text-base"
              >
                Start a project
              </a>
            </div>

            <aside className="rounded-2xl border border-bct-yellow/35 bg-bct-yellow/8 p-6 sm:p-7">
              <p className="text-xs font-semibold tracking-[0.18em] text-bct-yellow uppercase">
                Owner review before publishing
              </p>
              <dl className="mt-5 space-y-4 text-sm leading-relaxed">
                <div>
                  <dt className="font-semibold text-white">Exact deliverables</dt>
                  <dd className="text-white/65">needs owner input</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Software and file formats</dt>
                  <dd className="text-white/65">needs owner input</dd>
                </div>
                <div>
                  <dt className="font-semibold text-white">Supported equipment and brands</dt>
                  <dd className="text-white/65">needs owner input</dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="border-b border-white/10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-bct-yellow uppercase">
              Current scope
            </p>
            <h2 className="max-w-xl text-3xl leading-tight font-semibold tracking-tight sm:text-5xl">
              A direct path from project files to field use.
            </h2>
            <ol className="mt-10 grid gap-4 lg:grid-cols-3">
              {service.scope.map((item, index) => (
                <li key={item} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <p className="mb-5 font-mono text-sm text-bct-yellow">0{index + 1}</p>
                  <p className="text-lg leading-relaxed text-white/75">{item}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Related BCT services</h2>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {services
                .filter((item) => item.slug !== service.slug)
                .map((item) => (
                  <Link
                    key={item.slug}
                    href={`/services/${item.slug}`}
                    className="rounded-2xl border border-white/10 p-5 text-white/70 transition-colors hover:border-bct-yellow/60 hover:text-white"
                  >
                    {item.title}
                  </Link>
                ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Borchardt Construction Technology</p>
          <Link href="/" className="transition-colors hover:text-white">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
