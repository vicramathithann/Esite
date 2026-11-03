import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vnmobiles.in";

  // Public storefront routes only - strictly excluding all /admin and /api routes
  const routes = [
    "",
    "/products",
    "/compare",
    "/cart",
    "/login",
    "/register",
    "/forgot-password",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "" ? 1.0 : 0.8,
  }));
}

