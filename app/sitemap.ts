import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/site-url";

const staticRoutes = [
  "",
  "/facts-on-news",
  "/home-page",
  "/join-the-circle",
  "/library",
  "/news",
  "/theories",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
  }));
}
