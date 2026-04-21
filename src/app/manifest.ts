import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ahorro — Personal Finance Coach",
    short_name: "Ahorro",
    description: "Gestión de gastos compartidos, multi-moneda.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0e17",
    theme_color: "#0a0e17",
    lang: "es",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/svg/icon-light.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/svg/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa/icon-maskable-384.png", sizes: "384x384", type: "image/png", purpose: "maskable" },
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/pwa/apple-touch-icon-180.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
