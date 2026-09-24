import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// BASE_PATH is set by the Pages workflow ("/<repo>/"); "/" everywhere else.
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version}+${(process.env.GITHUB_SHA ?? "dev").slice(0, 7)}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "En français — Révisions",
        short_name: "En français",
        description: "Leçons, audio et exercices pour réviser le français.",
        lang: "fr",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#FAF6EC",
        theme_color: "#FAF6EC",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            // Neural audio: cache each clip the first time it plays, for offline use.
            urlPattern: ({ url }) => url.pathname.includes("/audio/") && !url.pathname.endsWith("manifest.json"),
            handler: "CacheFirst",
            options: { cacheName: "audio", expiration: { maxEntries: 5000 }, rangeRequests: true },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith("/audio/manifest.json"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "audio-manifest" },
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
  },
});
