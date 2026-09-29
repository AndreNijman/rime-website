// Every element carrying the hidden attribute whose computed display is not
// "none" (a class rule beat the UA's [hidden] rule), at desktop and phone.
import { chromium } from "@playwright/test";
const base = process.argv[2] ?? "http://127.0.0.1:8788";
const PAGES = ["/", "/shell", "/system", "/personalise", "/security", "/download", "/updates", "/updates/2026.09.28.4",
  "/updates/2026.09.28.4?from=apex-v2.1.0", "/updates/apex-v2.1.0", "/docs", "/docs/install", "/journal", "/journal/springs-on-the-wall-clock",
  "/source", "/privacy", "/brand", "/sitemap", "/nope"];
const b = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  for (const path of PAGES) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(300);
    const leaks = await p.evaluate(() => [...document.querySelectorAll("[hidden]")]
      .filter((e) => getComputedStyle(e).display !== "none")
      .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")}[${getComputedStyle(e).display}] ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`));
    if (leaks.length) console.log(w, path, leaks.join(" | "));
    await p.close();
  }
  await ctx.close();
}
await b.close();
