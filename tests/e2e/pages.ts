export const PAGES = ["/", "/why", "/shell", "/system", "/agents", "/personalise", "/security", "/download", "/updates", "/updates/2026.09.28.4",
  "/updates/apex-v2.1.0", "/docs", "/docs/install", "/docs/remote", "/journal", "/source", "/privacy", "/brand", "/sitemap"];

// The site is dark until a visitor chooses otherwise, so a light run has to
// choose Light the way a visitor does (the stored choice), not fake a light OS.
export async function useScheme(page: import("@playwright/test").Page, scheme: "dark" | "light") {
  if (scheme === "light") await page.addInitScript(() => localStorage.setItem("rime.scheme", "light"));
}
