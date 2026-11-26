import type { MetadataRoute } from "next";
import { TOOLS } from "@/features/tools/registry";
import { BUNDLES } from "@/features/tools/bundles";
import { SITE_URL } from "@/lib/site";

/** Every indexable route, built from the same registry the bench renders. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: "/", priority: 1, changeFrequency: "weekly" as const },
    { path: "/history", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/sites", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  ];

  return [
    ...pages.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...BUNDLES.map((b) => ({
      url: `${SITE_URL}${b.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...TOOLS.map((t) => ({
      url: `${SITE_URL}${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
