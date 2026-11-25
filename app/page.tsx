import type { Metadata } from "next";
import Image from "next/image";
import LeadForm from "./lead-form";

const homeUrl = "https://borchardtct.com/";
const siteName = "Borchardt Construction Technology";
const logoPath = "/images/bct-logo-transparent.png";
const title = "3D Machine-Control Models & Site Takeoffs | BCT";
const description =
  "Borchardt Construction Technology prepares 3D machine-control models, site takeoffs, and drone data and provides GPS support for construction teams.";
const featuredImage = {
  url: "/images/bct-hero-earthwork.webp",
  width: 1920,
  height: 1080,
  alt: "Overhead view of a bulldozer beside a row of rocks and tracks in the soil",
};

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: homeUrl },
  openGraph: {
    type: "website",
    url: homeUrl,
    siteName,
    title,
    description,
    images: [featuredImage],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [featuredImage],
  },
};

const services = [
  {
    number: "01",
    title: "3D model building",
    description:
      "Machine-control and rover site models structured around the project plans and the equipment workflow.",
  },
  {
    number: "02",
    title: "Site takeoffs",
    description:
      "Quantity takeoffs for earthwork, paving, concrete, pipe, and associated materials from approved project files.",
  },
  {
    number: "03",
    title: "Drone data",
    description:
      "Progress and surface-data workflows that help teams compare field conditions with project surfaces.",
  },
  {
    number: "04",
    title: "GPS consulting",
    description:
      "Setup, troubleshooting, calibration, localization, control, and crew training for supported systems.",
  },
];

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${homeUrl}#organization`,
      name: siteName,
      url: homeUrl,
      logo: new URL(logoPath, homeUrl).href,
    },
    {
      "@type": "WebSite",
      "@id": `${homeUrl}#website`,
      name: siteName,
      url: homeUrl,
      publisher: { "@id": `${homeUrl}#organization` },
    },
  ],
};

const pillars = [
  {
    title: "Build",
    description: "3D models for machine control and rover workflows",
  },
  {
    title: "Measure",
    description: "Earthwork, paving, pipe, and material takeoffs",
  },
  {
    title: "Support",
    description: "GPS setup, localization, calibration, and training",
  },
];

const projects = [
  { name: "Cranefield subdivision", image: featuredImage },
  {
    name: "Pappys Landing",
    image: {
      url: "/images/bct-hero-loader.webp",
      alt: "Overhead view of a wheel loader between ridges of soil and a gravel pile",
    },
  },
  {
    name: "Norterra",
    image: {
      url: "/images/bct-hero-excavator.webp",
      alt: "Overhead view of a tracked excavator with its bucket extended toward a cut in the soil",
    },
  },
  { name: "Hope Springs", image: featuredImage },
];

const steps = [
  {
    title: "Share the project",
    description: "Identify the service, target date, equipment or format, and available files.",
  },
  {
    title: "Confirm the scope",
    description: "BCT reviews the inputs and confirms requirements before work begins.",
  },
  {
    title: "Put it to work",
    description: "Receive the agreed deliverable with practical support for the field workflow.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-bct-ink text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-bct-ink/90 backdrop-blur-md">
        <div className="mx-auto flex h-28 max-w-7xl items-center justify-between px-5 py-4 sm:h-32 sm:px-8 sm:py-5">
          <a href="#top" className="flex items-center pb-5">
            <Image
              src={logoPath}
              alt="Borchardt Construction Technology logo"
              width={190}
              height={160}
              className="h-18 w-auto object-contain sm:h-20"
              priority
            />
          </a>
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/75 md:flex">
            <a href="#services" className="transition-colors hover:text-bct-yellow">
              Services
            </a>
            <a href="#work" className="transition-colors hover:text-bct-yellow">
              Work
            </a>
            <a href="#approach" className="transition-colors hover:text-bct-yellow">
              Approach
            </a>
            <a href="#start-a-project" className="transition-colors hover:text-bct-yellow">
              Contact
            </a>
          </nav>
          <a
            href="#start-a-project"
            className="inline-flex h-10 items-center rounded-full bg-bct-yellow px-5 text-sm font-semibold text-black transition-colors hover:bg-white sm:h-11"
          >
            Start a project
          </a>
        </div>
      </header>

      <main id="top">
        <section className="relative isolate min-h-[88vh] overflow-hidden border-b border-white/10">
          <Image
            src={featuredImage.url}
            alt={featuredImage.alt}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-bct-ink via-transparent to-black/40" />

          <div className="relative mx-auto flex min-h-[88vh] max-w-7xl items-end px-5 pb-16 pt-28 sm:px-8 sm:pb-24">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex rounded-full border border-white/20 px-4 py-1.5 text-[0.7rem] font-semibold tracking-[0.22em] text-white/80 uppercase">
                Machine control · Takeoffs · GPS
              </p>
              <h1 className="max-w-[11ch] text-5xl leading-[0.95] font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl">
                Field-ready construction data.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-white/72 sm:text-xl">
                3D machine-control models, site takeoffs, drone data, and GPS support prepared for
                practical use by construction teams.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href="#start-a-project"
                  className="inline-flex h-12 items-center rounded-full bg-bct-yellow px-7 text-sm font-semibold text-black transition-colors hover:bg-white sm:h-14 sm:text-base"
                >
                  Start a project
                </a>
                <a
                  href="#work"
                  className="inline-flex h-12 items-center rounded-full border border-white/25 px-7 text-sm font-semibold text-white transition-colors hover:bg-white/8 sm:h-14 sm:text-base"
                >
                  View project history
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-7xl gap-px bg-white/10 md:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="bg-bct-ink-soft px-6 py-10 sm:px-8 sm:py-12">
                <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-bct-yellow uppercase">
                  {pillar.title}
                </p>
                <p className="max-w-xs text-2xl leading-snug tracking-tight text-white sm:text-[1.7rem]">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="services" className="border-b border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-14 max-w-3xl">
              <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-bct-yellow uppercase">
                Core services
              </p>
              <h2 className="text-4xl leading-none font-semibold tracking-tight sm:text-6xl">
                Practical support from plan set to field.
              </h2>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
                BCT supports contractors with construction data and field technology.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {services.map((service) => (
                <article
                  key={service.number}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 transition-colors hover:border-white/25 sm:p-9"
                >
                  <p className="mb-5 font-mono text-sm text-bct-yellow">{service.number}</p>
                  <h3 className="mb-4 text-2xl tracking-tight sm:text-3xl">{service.title}</h3>
                  <p className="max-w-md text-base leading-relaxed text-white/60">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="work" className="border-b border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-bct-yellow uppercase">
                  Project history
                </p>
                <h2 className="text-4xl leading-none font-semibold tracking-tight sm:text-6xl">
                  Work grounded in real project files.
                </h2>
              </div>
              <p className="max-w-md text-base leading-relaxed text-white/60">
                These images come from the existing BCT project archive.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.name}
                  className="group relative min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-bct-ink-soft sm:min-h-[22rem]"
                >
                  <Image
                    src={project.image.url}
                    alt={project.image.alt}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                    <h3 className="text-2xl tracking-tight uppercase sm:text-3xl">{project.name}</h3>
                    <p className="mt-2 text-sm text-white/65">Project archive</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="approach" className="border-b border-white/10 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-14 max-w-2xl">
              <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-bct-yellow uppercase">
                Working approach
              </p>
              <h2 className="text-4xl leading-none font-semibold tracking-tight sm:text-6xl">
                A direct path from request to usable deliverable.
              </h2>
            </div>

            <ol className="grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => (
                <li
                  key={step.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-8"
                >
                  <p className="mb-6 font-mono text-sm text-bct-yellow">0{index + 1}</p>
                  <h3 className="mb-4 text-2xl tracking-tight">{step.title}</h3>
                  <p className="text-base leading-relaxed text-white/60">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="start-a-project" className="scroll-mt-28 bg-bct-yellow py-16 text-black sm:scroll-mt-32 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
            <div className="max-w-lg lg:pt-4">
              <p className="mb-3 text-xs font-semibold tracking-[0.22em] uppercase">Start a project</p>
              <h2 className="max-w-[12ch] text-4xl leading-none font-semibold tracking-tight sm:text-6xl">
                Have a project to review?
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-black/70 sm:text-lg">
                Tell us what you need, where the project is, and when you need it.
              </p>
            </div>
            <LeadForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              src={logoPath}
              alt="Borchardt Construction Technology logo"
              width={70}
              height={59}
              className="h-7 w-auto opacity-80"
            />
            <p>Borchardt Construction Technology</p>
          </div>
          <p>Field-ready construction data and GPS support.</p>
        </div>
      </footer>
    </div>
  );
}
