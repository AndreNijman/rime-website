// Plays the Convergence (src/components/Convergence.astro) once per browser session.
import { Spring } from "../motion/spring";
import { BASE, effect, isReduced, spatial } from "../motion/policy";

const KEY = "rime.converged";
export function runConvergence(): void {
  const el = document.querySelector<HTMLElement>("[data-convergence]");
  if (!el) return;
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === "1"; sessionStorage.setItem(KEY, "1"); } catch { /* storage blocked: play it */ }
  if (seen || isReduced() || spatial(BASE.hero) === 0) return;
  el.dataset.play = "1";
  const drops = [...el.querySelectorAll<SVGCircleElement>("[data-d]")];
  const mark = el.querySelector<SVGGElement>(".conv-mark")!;
  const group = el.querySelector<SVGGElement>(".conv-drops")!;
  // Each drop starts off its plane's left tip and settles on the plane's centre.
  const xy = (s: string | undefined) => (s ?? "0,0").split(",").map(Number) as [number, number];
  const from = drops.map((c) => xy(c.dataset.from));
  const to = drops.map((c) => xy(c.dataset.to));
  const s = new Spring({ value: 0, response: BASE.hero / 1000, dampingFraction: 0.92 });
  s.onStep = () => {
    const k = s.value;
    drops.forEach((c, i) => {
      c.setAttribute("cx", String(from[i][0] + (to[i][0] - from[i][0]) * k));
      c.setAttribute("cy", String(from[i][1] + (to[i][1] - from[i][1]) * k));
    });
  };
  s.onStep();
  requestAnimationFrame(() => s.setTarget(1));
  // The crisp mark takes over as the drops meet.
  window.setTimeout(() => {
    mark.animate([{ opacity: 0 }, { opacity: 1 }], { duration: effect(BASE.fadeIn), fill: "forwards" });
    group.animate([{ opacity: 1 }, { opacity: 0 }], { duration: effect(BASE.fadeIn), fill: "forwards" })
      .onfinish = () => { delete el.dataset.play; };
  }, spatial(BASE.hero) * 0.8);
}
