// Mobile audit: every page on emulated phones. Reports horizontal overflow
// (and which elements cause it), touch targets under 44 × 44 CSS px that are
// not inline text links, and inputs whose font-size makes iOS zoom. Writes
// full-page screenshots for review.
//   node tests/tools/mobile-audit.mjs <out-dir> [base]
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://127.0.0.1:8788";
const PAGES = ["/", "/shell", "/system", "/personalise", "/security", "/download", "/updates", "/updates/2026.09.28.4",
  "/updates/apex-v2.1.0", "/docs", "/docs/install", "/docs/updating", "/journal", "/journal/springs-on-the-wall-clock",
  "/source", "/privacy", "/brand", "/sitemap", "/nope"];
const SIZES = [[390, 844], [360, 740], [320, 640]];
const b = await chromium.launch();
for (const [w, h] of SIZES) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
  for (const path of PAGES) {
    const p = await ctx.newPage();
    await p.goto(base + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(2800);   // past the reveal failsafe, so screenshots show every section
    const r = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const over = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.position === "fixed" || el.closest(".fluid-layer, .stage-desk, .page-field, [hidden]")) continue;
        const rc = el.getBoundingClientRect();
        if (rc.width && (rc.right > vw + 1 || rc.left < -1)) {
          // skip children of a horizontal scroller
          let s = el.parentElement, scrolled = false;
          while (s) { const c = getComputedStyle(s); if (/(auto|scroll|hidden|clip)/.test(c.overflowX) && s.scrollWidth > s.clientWidth) { scrolled = true; break; } s = s.parentElement; }
          if (!scrolled) over.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} ${Math.round(rc.left)}→${Math.round(rc.right)}`);
        }
      }
      const small = [];
      for (const el of document.querySelectorAll("a[href], button, input, select, summary, label.f-chip, label.rail-item, label.segmented-opt")) {
        if (el.closest(".fluid-layer, [hidden], .stage-desk")) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const rc = el.getBoundingClientRect();
        if (!rc.width || !rc.height) continue;
        // inline links inside running text are exempt (WCAG 2.5.8)
        if (el.tagName === "A" && cs.display === "inline" && el.closest("p, li, td, dd, figcaption")) continue;
        if (el.matches(".segmented-opt input, .f-chip input, .rail-item input")) continue;   // visually hidden; the label is the target
        if (rc.width < 44 || rc.height < 44) small.push(`${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ")[0] : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 24)}" ${Math.round(rc.width)}×${Math.round(rc.height)}`);
      }
      const scrollers = [...document.querySelectorAll("body *")].filter((e) => { const c = getComputedStyle(e); return /(auto|scroll)/.test(c.overflowX) && e.scrollWidth > e.clientWidth + 1 && !e.closest("[hidden], .fluid-layer"); })
        .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join(".")} ${e.scrollWidth}/${e.clientWidth}`);
      const zoom = [...document.querySelectorAll("input, textarea, select")].filter((i) => parseFloat(getComputedStyle(i).fontSize) < 16 && i.type !== "range" && i.type !== "radio" && i.type !== "checkbox").map((i) => `${i.name || i.id} ${getComputedStyle(i).fontSize}`);
      return { sw: document.documentElement.scrollWidth, vw, over: [...new Set(over)].slice(0, 12), small: [...new Set(small)], zoom, scrollers, height: document.documentElement.scrollHeight };
    });
    const flag = r.sw > r.vw ? `OVERFLOW ${r.sw}>${r.vw}` : "ok";
    console.log(`\n[${w}] ${path}  ${flag}  height ${r.height}`);
    if (r.over.length) console.log("  wide:", r.over.join(" | "));
    if (r.small.length) console.log(`  small targets (${r.small.length}):`, r.small.slice(0, 14).join(" | "));
    if (r.zoom.length) console.log("  iOS-zoom inputs:", r.zoom.join(", "));
    if (r.scrollers.length) console.log("  side-scrollers:", r.scrollers.join(" | "));
    if (w === 390) await p.screenshot({ path: `${out}/m${path.replace(/[\/.?=]/g, "_") || "_home"}.png`, fullPage: true });
    await p.close();
  }
  await ctx.close();
}
// The frame's surfaces, open: their targets too.
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
const p = await ctx.newPage();
await p.goto(base + "/", { waitUntil: "networkidle" });
for (const [name, sel] of [["bloom", "[data-bloom-trigger]"], ["pour", ".frame-get"]]) {
  await p.tap(sel); await p.waitForTimeout(700);
  const small = await p.evaluate((layer) => [...document.querySelectorAll(`[data-${layer}] a[href], [data-${layer}] button, [data-${layer}] input`)]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.width < 44 || r.height < 44) && !(el.tagName === "A" && getComputedStyle(el).display === "inline" && el.closest("p, li")); })
    .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 20)}" ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`), name);
  console.log(`\n[390] surface ${name}: small targets (${small.length})`, small.join(" | "));
  console.log("  focused:", await p.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
  await p.screenshot({ path: `${out}/surface-${name}.png` });
  await p.keyboard.press("Escape"); await p.waitForTimeout(600);
}
await b.close();
