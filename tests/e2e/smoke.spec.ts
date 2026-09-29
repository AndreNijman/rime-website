// Every page loads with no console errors and no CSP violations, in every engine.
import { test, expect } from "@playwright/test";
import { PAGES } from "./pages";
for (const path of PAGES) {
  test(`loads cleanly: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await page.addInitScript(() => document.addEventListener("securitypolicyviolation", (e) => console.error(`CSP: ${e.violatedDirective} ${e.blockedURI}`)));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    await page.waitForTimeout(400);
    expect(errors, errors.join("\n")).toEqual([]);
  });
}
test("the canonical URL drops ?from=", async ({ page }) => {
  await page.goto("/updates/2026.09.28.4?from=2026.09.27.3");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://rimeos.com/updates/2026.09.28.4");
  await expect(page.locator("[data-from]")).toContainText("You updated from APEX-OS 2026.09.27.3");
  await expect(page.locator("[data-crossed] li").first()).toBeVisible();
});
test("a rollback is not celebrated", async ({ page }) => {
  await page.goto("/updates/2026.09.28.3?from=2026.09.28.4");
  await expect(page.locator("[data-from]")).toContainText("rollback");
  await expect(page.locator("[data-crossed]")).toBeHidden();
});
test("release JSON matches its page", async ({ request }) => {
  const j = await (await request.get("/updates/2026.09.28.4.json")).json();
  expect(j.id).toBe("2026.09.28.4");
  expect(j.notes).toBe("https://rimeos.com/updates/2026.09.28.4");
  const idx = await (await request.get("/updates/index.json")).json();
  expect(idx.latest).toBe("2026.09.29");
  const latest = await (await request.get("/updates/2026.09.29.json")).json();
  expect(latest.provenance.imageDigest).toBe("sha256:4d6ab78de40e79e4111d899ff620e08b8039b91ad76e60da8efcca80a12ccd23");
});
