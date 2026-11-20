import type { MetadataRoute } from "next";
import { serviceSlugs } from "./services/service-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const servicePages: MetadataRoute.Sitemap = serviceSlugs.map((slug) => ({
    url: `https://borchardtct.com/services/${slug}`,
    lastModified: new Date("2026-11-20"),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [
    {
      url: "https://borchardtct.com/",
      lastModified: new Date("2026-11-20"),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...servicePages,
  ];
}
