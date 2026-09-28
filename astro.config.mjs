// rimeos.com — static site. See README.md for the architecture.
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://rimeos.com",
  output: "static",
  // /shell, /updates/2026.09.28.4 — no trailing slash, served from shell.html
  // and 2026.09.28.4.html (the canonical release URL is baked into images and
  // must answer 200 itself, not redirect).
  trailingSlash: "never",
  build: { format: "file", inlineStylesheets: "never" },
  prefetch: false,
  // Shiki writes inline styles, which the CSP forbids; code blocks stay plain.
  markdown: { syntaxHighlight: false },
  devToolbar: { enabled: false },
  security: {
    csp: {
      algorithm: "SHA-256",
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "manifest-src 'self'",
        "worker-src 'none'",
      ],
    },
  },
  // No data: URIs for fonts or images: the CSP allows only same-origin files.
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/updates/latest") && !page.endsWith("/404"),
    }),
  ],
});
