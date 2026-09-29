// Phone interactions with motion ON: frame menu, search, download sheet, stage.
//   node tests/tools/mobile-ix.mjs <out-dir> [base]
import { chromium } from "@playwright/test";
const out = process.argv[2];
const base = process.argv[3] ?? "http://127.0.0.1:8788";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "no-preference" });
const p = await ctx.newPage();
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
await p.goto(base + "/", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
await shot("01-home");
await p.tap("[data-bloom-trigger]");
await p.waitForTimeout(160); await shot("02-menu-mid");
await p.waitForTimeout(900); await shot("03-menu-open");
console.log("focused after menu:", await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 80)));
await p.tap("[data-bloom] [data-close]", { position: { x: 20, y: 820 } }).catch((e) => console.log("close tap", e.message));
await p.waitForTimeout(900); await shot("04-menu-closed");
await p.tap("[data-search-trigger]");
await p.waitForTimeout(900);
await p.keyboard.type("rollback");
await p.waitForTimeout(800); await shot("05-search");
await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
await p.waitForTimeout(900);
await p.tap(".frame-get");
await p.waitForTimeout(200); await shot("06-pour-mid");
await p.waitForTimeout(1000); await shot("07-pour-open");
await p.keyboard.press("Escape"); await p.waitForTimeout(900);
// stage
await p.evaluate(() => document.querySelector(".stage")?.scrollIntoView({ block: "center" }));
await p.waitForTimeout(3000); await shot("08-stage");
const acts = await p.$$(".stage-act");
for (let i = 0; i < acts.length; i++) {
  await acts[i].tap(); await p.waitForTimeout(1200); await shot(`09-stage-act${i}`);
}
await b.close();
