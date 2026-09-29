// The recorded stage (ProductStage + stage.ts): every transition is a clip of
// the real shell, chained frame to frame over a still of the desktop.
import { test, expect, type Page } from "@playwright/test";

const visibleClip = (page: Page, stage: string) =>
  page.evaluate((id) => {
    const v = [...document.querySelectorAll<HTMLVideoElement>(`#${id} .stage-clips video`)]
      .filter((x) => getComputedStyle(x).visibility === "visible");
    return v.map((x) => ({ src: x.currentSrc.split("/").pop() ?? "", ended: x.ended || x.paused, paused: x.paused }));
  }, stage);

test.describe("recorded stage", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("opens the Dashboard, pours Wi-Fi out of it, and closes to the desktop", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/shell");
    const stage = page.locator("#shell-stage");
    await stage.scrollIntoViewIfNeeded();
    await stage.locator('.stage-act[data-act="dashboard"]').click();
    await expect(stage.locator('.stage-act[data-act="dashboard"]')).toHaveAttribute("aria-pressed", "true");
    await expect.poll(async () => (await visibleClip(page, "shell-stage"))[0]?.ended, { timeout: 10_000 }).toBe(true);
    expect((await visibleClip(page, "shell-stage"))[0].src).toMatch(/^rest-dashboard\./);

    // The shell closes the Dashboard while Wi-Fi opens: one recorded transition.
    await stage.locator('.stage-act[data-act="network"]').click();
    await expect.poll(async () => (await visibleClip(page, "shell-stage"))[0]?.src ?? "", { timeout: 10_000 }).toMatch(/^dashboard-network\./);
    await expect.poll(async () => (await visibleClip(page, "shell-stage"))[0]?.ended, { timeout: 10_000 }).toBe(true);
    expect(await visibleClip(page, "shell-stage")).toHaveLength(1);    // the one before it is hidden

    await stage.locator('.stage-act[data-act="network"]').click();
    await expect.poll(async () => (await visibleClip(page, "shell-stage")).length, { timeout: 10_000 }).toBe(0);
    await expect(stage.locator(".stage")).not.toHaveAttribute("data-open", /./);
  });

  test("under Reduce Motion it plays the shell's own Reduce Motion recordings", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/shell");
    const stage = page.locator("#shell-stage");
    await stage.scrollIntoViewIfNeeded();
    await stage.locator('.stage-act[data-act="dashboard"]').click();
    await expect.poll(async () => (await visibleClip(page, "shell-stage"))[0]?.ended, { timeout: 10_000 }).toBe(true);
    const src = await page.evaluate(() => document.querySelector<HTMLVideoElement>("#shell-stage .stage-clips video")?.src ?? "");
    expect(src).toMatch(/-reduced\//);
  });

  test("the hero tour runs on its own when motion is full", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator("#hero-stage .stage")).toHaveAttribute("data-open", "dashboard", { timeout: 8_000 });
  });
});
