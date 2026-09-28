// Screenshot the frame's surfaces mid-motion and settled.
import { chromium } from "@playwright/test";
const out = process.argv[2];
const b = await chromium.launch();
for (const [name, w, h] of [["desk", 1440, 900], ["phone", 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: "dark", deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:4321/system", { waitUntil: "networkidle" });
  const trig = name === "desk" ? ".frame-trigger" : ".frame-trigger";
  await p.click(trig);
  await p.waitForTimeout(150); await p.screenshot({ path: `${out}/${name}-bloom-150.png` });
  await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}-bloom-done.png` });
  await p.keyboard.type("roll");
  await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${name}-lens.png` });
  await p.keyboard.press("Escape"); await p.keyboard.press("Escape");
  await p.waitForTimeout(800);
  await p.click(name === "desk" ? ".frame-download" : ".frame-get");
  await p.waitForTimeout(160); await p.screenshot({ path: `${out}/${name}-pour-160.png` });
  await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}-pour-done.png` });
  await ctx.close();
}
await b.close();
