// PasswordShapes.qml on the web: each character adds one Material 3 Expressive
// shape that pops in on M3E's "fast spatial" spring (EXPRESSIVE.fastSpatial,
// response 0.222 s, damping 0.6 — about 9.5 % over), turning the last −18° into
// place, born in the accent and settling to the text colour over `settle`.
// Removing one shrinks it away on surfaceExitSmall. Under Reduce Motion a shape
// is simply there and fades in over the hover beat. Length is the only input.
import { Spring } from "../motion/spring";
import * as M from "../vendor/rime-shell/motion.mjs";
import { BASE, effect, isReduced, spatial } from "../motion/policy";

const NS = "http://www.w3.org/2000/svg";
export function initPasswordShapes(): void {
  const root = document.querySelector<HTMLElement>("[data-pw]");
  if (!root || root.dataset.bound) return;
  root.dataset.bound = "1";
  const paths: string[] = JSON.parse(root.dataset.shapes ?? "[]");
  const row = root.querySelector<HTMLElement>("[data-pw-row]")!;
  const caret = root.querySelector<HTMLElement>("[data-pw-caret]")!;
  const input = root.querySelector<HTMLInputElement>("[data-pw-input]")!;
  const ph = root.querySelector<HTMLElement>("[data-pw-ph]")!;
  // A per-page random offset, so no shape sits next to itself (as the Shell's seed).
  const seed = Math.floor(Math.random() * paths.length);
  const live: { el: SVGSVGElement; spring: Spring }[] = [];
  const text = () => getComputedStyle(root).getPropertyValue("--rime-text-primary").trim();

  function add(i: number) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", paths[(seed + i) % paths.length]);
    svg.append(p);
    row.insertBefore(svg, caret);
    const sp = M.expressive("fastSpatial", 1, isReduced());
    const spring = new Spring({ value: 0, response: sp.response, dampingFraction: sp.damping });
    spring.onStep = () => {
      const k = Math.max(0, spring.value);
      svg.style.transform = `scale(${k.toFixed(3)}) rotate(${(-18 * (1 - Math.min(1, k))).toFixed(2)}deg)`;
    };
    if (sp.response === 0) {
      spring.value = spring.target = 1; spring.onStep();
      svg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: effect(BASE.hover) });
    } else { spring.onStep(); spring.setTarget(1); }
    p.animate([{ fill: getComputedStyle(p).fill }, { fill: text() }], { duration: effect(BASE.settle), fill: "forwards", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" });
    live.push({ el: svg, spring });
  }
  function remove() {
    const s = live.pop(); if (!s) return;
    s.spring.stop();
    const d = spatial(BASE.surfaceExitSmall);
    if (d <= 0) { s.el.remove(); return; }
    s.el.animate([{ transform: s.el.style.transform || "scale(1)", width: "18px" }, { transform: "scale(0)", width: "0px" }], { duration: d, easing: "cubic-bezier(0.15, 0.55, 0.25, 1)" }).onfinish = () => s.el.remove();
  }
  input.addEventListener("input", () => {
    const n = input.value.length;
    while (live.length < n) add(live.length);
    while (live.length > n) remove();
    caret.classList.toggle("on", n > 0);
    ph.style.opacity = n > 0 ? "0" : "1";
  });
}
