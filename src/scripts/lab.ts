// The Motion Lab: record an open (or an open reversed halfway) with the
// ported lifecycle, then scrub or replay it through the Shell's centerBloom.
import * as Geo from "../vendor/rime-shell/geometry.mjs";
import { T1 } from "../geometry/theme.mjs";
import { record, at, type Sample } from "../motion/record";
import { isReduced, onMotionChange } from "../motion/policy";

const W = 1440, B = T1.borderWidth, NH = T1.notchHeight;
const G = { cx: W / 2, strip: B, notchW: T1.cNotchMinWidth, notchH: NH, shoulder: T1.notchShoulder, notchBottom: T1.notchBottom, w: 900, h: NH + T1.dashboardHeight, r: T1.radiusXL, shoulderW1: 28, shoulderH1: 22 };

export function initLab(): void {
  const found = document.querySelector<HTMLElement>("[data-lab]");
  if (!found || found.dataset.bound) return;
  const lab: HTMLElement = found;
  lab.dataset.bound = "1";
  const body = lab.querySelector<SVGPathElement>("[data-lab-body]")!;
  const range = lab.querySelector<HTMLInputElement>("[data-lab-t]")!;
  const tout = lab.querySelector<HTMLOutputElement>("[data-lab-tout]")!;
  const head = lab.querySelector<SVGLineElement>("[data-lab-head]")!;
  const play = lab.querySelector<HTMLButtonElement>("[data-lab-play]")!;
  const playReal = lab.querySelector<HTMLButtonElement>("[data-lab-play-real]")!;
  const marks = lab.querySelector<SVGGElement>("[data-lab-marks]")!;
  const reads = Object.fromEntries([...lab.querySelectorAll<HTMLElement>("[data-r]")].map((e) => [e.dataset.r!, e]));

  const recs = { open: record(), reverse: record({ closeAt: 190 }) };
  let rec: Sample[] = recs.open;
  let T = rec[rec.length - 1].t;

  function chart() {
    const X = (t: number) => (t / T) * 300, Y = (v: number) => 110 - v * 90;
    for (const k of ["lead", "body", "trail"] as const) {
      const pts = rec.filter((_, i) => i % 3 === 0).map((s) => `${X(s.t).toFixed(1)},${Y(s[k]).toFixed(1)}`).join(" ");
      lab.querySelector(`[data-c="${k}"]`)!.setAttribute("points", pts);
    }
  }

  function draw(t: number) {
    const s = at(rec, t);
    const r = Geo.centerBloom(s.progress, { ...G, ch: { w: s.lead, d: s.body, n: s.trail, fw: s.leadFlow, fd: s.bodyFlow } });
    body.setAttribute("d", r.path);
    const p = r.params;
    reads.W.textContent = p.W.toFixed(0);
    reads.D.textContent = p.D.toFixed(0);
    reads.sw.textContent = p.sw.toFixed(1);
    reads.rb.textContent = p.rb.toFixed(1);
    reads.bow.textContent = p.bow.toFixed(1);
    tout.value = `${Math.round(t)} ms`;
    const hx = (t / T) * 300;
    head.setAttribute("x1", String(hx)); head.setAttribute("x2", String(hx));
    // width and depth markers
    const [lw, ld, tw, td] = ["w", "d", "wt", "dt"].map((k) => marks.querySelector<SVGElement>(`[data-m="${k}"]`)!);
    const y = Math.max(NH + 18, p.D + 22);
    lw.setAttribute("x1", String(p.L)); lw.setAttribute("x2", String(p.R)); lw.setAttribute("y1", String(y)); lw.setAttribute("y2", String(y));
    tw.setAttribute("x", String((p.L + p.R) / 2 - 8)); tw.setAttribute("y", String(y + 24));
    const x = p.R + p.sw + 18;
    ld.setAttribute("x1", String(x)); ld.setAttribute("x2", String(x)); ld.setAttribute("y1", "0"); ld.setAttribute("y2", String(p.D));
    td.setAttribute("x", String(x + 8)); td.setAttribute("y", String(Math.max(24, p.D / 2)));
  }

  const setMode = (m: "open" | "reverse") => {
    rec = recs[m];
    T = rec[rec.length - 1].t;
    range.max = String(Math.round(T));
    range.value = String(m === "open" ? Math.round(T) : 190);
    chart();
    draw(+range.value);
  };
  lab.querySelector('[data-name="lab-mode"]')!.addEventListener("change", (e) => setMode((e.target as HTMLInputElement).value as "open" | "reverse"));
  range.addEventListener("input", () => { stop(); draw(+range.value); });

  let raf = 0, t0 = 0, speed = 0.25;
  function frame(now: number) {
    const t = (now - t0) * speed;
    range.value = String(Math.min(T, t));
    draw(Math.min(T, t));
    if (t < T) raf = requestAnimationFrame(frame); else stop();
  }
  function start(s: number) {
    stop(); speed = s; t0 = performance.now();
    play.setAttribute("aria-pressed", "true");
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); play.setAttribute("aria-pressed", "false"); }
  play.addEventListener("click", () => start(0.25));
  playReal.addEventListener("click", () => start(1));
  // A replay is spatial motion: under Reduce Motion the scrubber still works,
  // the Play buttons do not animate.
  const gate = () => { const r = isReduced(); play.disabled = r; playReal.disabled = r; if (r) stop(); };
  onMotionChange(gate); gate();

  setMode("open");

  // ── refresh rates ─────────────────────────────────────────────────────────
  // The same open recorded at 60, 144 and 1000 frames a second. The springs
  // are solved exactly for the time that passed, so the only difference is a
  // decision the lifecycle makes once per frame: the body starts when the lead
  // crosses openRelease (SurfaceLifecycle.qml _onStep). Then the failure the
  // Shell fixed (theme/anim/SpringFollower.qml): Qt's SpringAnimation stepped
  // at a fixed 16 ms, so on a 144 Hz panel most frames repeated a position.
  const a60 = record({ hz: 60 }), a144 = record({ hz: 144 }), a1000 = record({ hz: 1000 });
  const par = (x: Sample) => Geo.centerBloom(x.progress, { ...G, ch: { w: x.lead, d: x.body, n: x.trail, fw: x.leadFlow, fd: x.bodyFlow } }).params;
  let d60 = 0, d144 = 0;
  for (const s of a1000) {
    const ref = par(s), p60 = par(at(a60, s.t)), p144 = par(at(a144, s.t));
    d60 = Math.max(d60, Math.abs(ref.W - p60.W), Math.abs(ref.D - p60.D));
    d144 = Math.max(d144, Math.abs(ref.W - p144.W), Math.abs(ref.D - p144.D));
  }
  const openMs = 520, frames = Math.round(openMs / (1000 / 144));
  const fixed = new Set<number>();
  for (let k = 0; k < frames; k++) fixed.add(Math.floor((k * 1000) / 144 / 16));
  const hzEl = document.querySelector<HTMLElement>("[data-lab-hz]");
  if (hzEl) {
    const strong = (t: string) => { const b = document.createElement("strong"); b.className = "mono"; b.textContent = t; return b; };
    hzEl.replaceChildren(
      "Measured just now in this page: each spring is solved exactly for the time that passed, so the shape does not depend on the refresh rate — except where the lifecycle decides, once per frame, that the width is far enough along for the depth to start. Against a 1000 Hz reference that costs up to ",
      strong(`${d144.toFixed(0)} px`), " mid-open at 144 Hz and ", strong(`${d60.toFixed(0)} px`),
      " at 60 Hz, and nothing at rest. A spring stepped every 16 ms instead would show only ",
      strong(`${fixed.size} of ${frames}`),
      " distinct positions during a 520 ms open on a 144 Hz panel. That judder is why Rime Shell's springs step on the wall clock (SpringFollower.qml).",
    );
  }
}
