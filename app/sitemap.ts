import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://borchardtct.com/",
      // Update when the homepage content changes, not when the site rebuilds.
      lastModified: "2026-11-25",
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
