import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://borchardtct.com",
      lastModified: new Date("2026-11-19"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
