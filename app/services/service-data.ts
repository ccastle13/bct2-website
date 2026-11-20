export type Service = {
  slug: string;
  number: string;
  title: string;
  metaTitle: string;
  description: string;
  overview: string;
  scope: string[];
};

export const services: Service[] = [
  {
    slug: "3d-machine-control-models",
    number: "01",
    title: "3D machine-control models",
    metaTitle: "3D Machine-Control Model Building | BCT",
    description:
      "Machine-control and rover site models structured around project plans, grading surfaces, and equipment workflows.",
    overview:
      "BCT builds 3D construction site models around the project plans and the agreed field workflow. The scope is confirmed from the available project files before work begins.",
    scope: [
      "Review the available project plans and surfaces",
      "Confirm the intended machine-control or rover workflow",
      "Prepare the agreed site model for practical field use",
    ],
  },
  {
    slug: "site-takeoffs",
    number: "02",
    title: "Site takeoffs",
    metaTitle: "Construction Site Takeoff Services | BCT",
    description:
      "Quantity takeoffs for earthwork, paving, concrete, pipe, and associated materials from approved project files.",
    overview:
      "BCT prepares site quantity takeoffs from approved project files. The requested materials and scope are confirmed before the takeoff begins.",
    scope: [
      "Review the approved project files",
      "Confirm the earthwork, paving, concrete, pipe, or material scope",
      "Prepare the agreed quantity takeoff",
    ],
  },
  {
    slug: "construction-drafting",
    number: "03",
    title: "Construction drafting",
    metaTitle: "Construction Drafting Services | BCT",
    description:
      "Plan-based drafting support for construction teams, prepared around the agreed project scope and deliverable format.",
    overview:
      "BCT provides plan-based drafting support for construction work. Each request starts with the project files, intended use, and agreed drafting scope.",
    scope: [
      "Review the supplied plans and project files",
      "Confirm the drawing purpose and requested scope",
      "Prepare the agreed construction drafting work",
    ],
  },
  {
    slug: "3d-land-surface-modeling",
    number: "04",
    title: "3D land and surface modeling",
    metaTitle: "3D Land & Grading Surface Modeling | BCT",
    description:
      "Digital terrain, grading, and surface models prepared from approved project files for field and office workflows.",
    overview:
      "BCT prepares digital terrain, grading, and surface models from approved project information. The intended field or office use is confirmed as part of the scope.",
    scope: [
      "Review the available terrain, grading, and project information",
      "Confirm how the surface will be used",
      "Prepare the agreed land or grading surface model",
    ],
  },
  {
    slug: "drone-data-processing",
    number: "05",
    title: "Drone data processing",
    metaTitle: "Construction Drone Data Processing | BCT",
    description:
      "Progress and surface-data workflows that help teams compare field conditions with project surfaces.",
    overview:
      "BCT supports progress and surface-data workflows using supplied drone data. Available inputs and the intended project comparison are confirmed before processing.",
    scope: [
      "Review the supplied drone and project data",
      "Confirm the intended progress or surface comparison",
      "Process the data for the agreed construction workflow",
    ],
  },
  {
    slug: "gps-rover-setup-localization-calibration",
    number: "06",
    title: "GPS rover setup, localization, and calibration",
    metaTitle: "GPS Rover Setup & Localization Support | BCT",
    description:
      "Setup, troubleshooting, calibration, localization, control, and crew training for supported systems.",
    overview:
      "BCT supports construction teams with GPS rover setup, localization, calibration, control, troubleshooting, and training for supported systems.",
    scope: [
      "Confirm the system, project control, and requested support",
      "Work through the agreed setup, localization, or calibration scope",
      "Provide practical support for the field workflow",
    ],
  },
];

export const serviceSlugs = services.map((service) => service.slug);

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}
