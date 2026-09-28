// ─── The product stage at runtime ────────────────────────────────────────────
// Runs the reconstructed desktop exactly as the Shell runs its own:
//   Dashboard     CENTER_BLOOM, liquid lifecycle, width leads (Dashboard.qml)
//   right panel   RIGHT_POUR, liquid lifecycle, depth leads (TopBar.rightLife);
//                 switching pane while it is up RETARGETS width and depth on the
//                 page spring and cross-fades the panes (RightPanel.qml) instead
//                 of closing and reopening
// Opening one closes the other (Popups.closeAll()). A guided tour plays while
// the stage is on screen and motion is on; any interaction hands control to
// the visitor. Under Reduce Motion there is no tour and surfaces fade.
// ─────────────────────────────────────────────────────────────────────────────
import * as Geo from "../vendor/rime-shell/geometry.mjs";
import { T1 } from "../geometry/theme.mjs";
import { FluidSurface, place, type Rect } from "./fluid";
import { Follower } from "../motion/spring";
import { BASE, effect, isReduced, onMotionChange, springRole } from "../motion/policy";

const W = 1440, B = T1.borderWidth, NH = T1.notchHeight, SH = T1.notchShoulder, NB = T1.notchBottom;
const LW = 137, CW = T1.cNotchMinWidth, RW = 200;
const DW = 900, DH = NH + T1.dashboardHeight;
type Pane = "network" | "notifications";
const PANE_W: Record<Pane, number> = { network: T1.networkPopupWidth + T1.notchRadius, notifications: T1.notificationsWidth + T1.notchRadius };
const PANE_D: Record<Pane, number> = { network: 372, notifications: 318 };
type Act = "dashboard" | Pane;

export interface StageHandle {
  open(a: Act | null): void;
  setScene(id: string, img: { srcset: Record<string, string>; src: string }): void;
  el: HTMLElement;
}
const handles = new Map<string, StageHandle>();
export function stageById(id: string) { return handles.get(id); }

export function initStages(): void {
  document.querySelectorAll<HTMLElement>("[data-stage]").forEach((fig) => {
    if (handles.has(fig.dataset.stage!)) return;
    handles.set(fig.dataset.stage!, setup(fig));
  });
}

function setup(fig: HTMLElement): StageHandle {
  const stage = fig.querySelector<HTMLElement>(".stage")!;
  const desk = fig.querySelector<HTMLElement>("[data-desk]")!;
  const barLine = fig.querySelector<SVGPathElement>("[data-bar-line]")!;
  const dashEl = fig.querySelector<HTMLElement>('[data-surface="dashboard"]')!;
  const rightEl = fig.querySelector<HTMLElement>('[data-surface="right"]')!;
  const pointer = fig.querySelector<HTMLElement>("[data-pointer]")!;
  const acts = [...fig.querySelectorAll<HTMLElement>("[data-act]")];
  const tourBtn = fig.querySelector<HTMLElement>("[data-tour-toggle]");

  const forceReduced = fig.dataset.motion === "reduced";
  // ── scale the 1440 × 900 desk to the stage ────────────────────────────────
  // Wide: the whole desktop. Narrow (a phone): a 4:5 cut of the real desktop,
  // 520 logical px wide, at a size you can read — never a thumbnail of a
  // 16:10 screen (spec §4.4, §5.2). The cut sits over the notch the current
  // surface grows from, and pans there on the page spring.
  const CUT = 520;
  let narrow = false;
  const cutFor = (a: Act | null) => (a === "network" || a === "notifications" ? W - CUT : W / 2 - CUT / 2);
  const pan = new Follower(W / 2 - CUT / 2, springRole("page"), () => apply());
  function apply() {
    const sw = stage.clientWidth;
    if (!narrow) { desk.style.transform = `scale(${sw / W})`; return; }
    const k = sw / CUT;
    desk.style.transform = `translateX(${(-pan.value * k).toFixed(2)}px) scale(${k})`;
  }
  const fit = () => {
    narrow = stage.clientWidth < 600;
    stage.classList.toggle("stage--cut", narrow);
    apply();
  };
  new ResizeObserver(fit).observe(stage);
  fit();

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const dashFinal: Rect = { x: Math.round(W / 2) - DW / 2 + 8, y: B + 8, w: DW - 16, h: DH - B - 16 };
  const dashHole = dashEl.querySelector<HTMLElement>("[data-hole]")!;
  const holeRect = { x: Math.round(W / 2) - CW / 2 + 2, y: B, w: CW - 4, h: NH - B - 2, rb: NB - 2 };
  place(dashHole, holeRect);
  dashHole.style.borderRadius = `0 0 ${holeRect.rb}px ${holeRect.rb}px`;
  delete dashEl.dataset.ssrOpen;
  const dash = new FluidSurface({
    root: dashEl,
    path: dashEl.querySelector<SVGPathElement>("[data-path]")!,
    reveal: dashEl.querySelector<HTMLElement>("[data-reveal]")!,
    content: dashEl.querySelector<HTMLElement>("[data-content]")!,
    family: "centerBloom",
    lead: "width",
    geometry: () => ({ cx: W / 2, strip: B, notchW: CW, notchH: NH, shoulder: SH, notchBottom: NB, w: DW, h: DH, r: T1.radiusXL, shoulderW1: 28, shoulderH1: 22 }),
    finalRect: () => dashFinal,
    hole: () => holeRect,
    holeCover: dashHole,
    travelPx: forceReduced ? 0 : 10,
    lifecycle: { forceReduced },
  });

  // ── right panel: one surface, two panes ───────────────────────────────────
  let pane: Pane = "network";
  const paneEls: Record<Pane, HTMLElement> = {
    network: rightEl.querySelector<HTMLElement>('[data-pane="network"]')!,
    notifications: rightEl.querySelector<HTMLElement>('[data-pane="notifications"]')!,
  };
  const rw = new Follower(PANE_W.network, springRole("page"), () => right.render());
  const rd = new Follower(PANE_D.network, springRole("page"), () => right.render());
  const rightReveal = rightEl.querySelector<HTMLElement>("[data-reveal]")!;
  const rightFinal = (): Rect => ({ x: W - PANE_W[pane], y: NH, w: PANE_W[pane] - B, h: PANE_D[pane] });
  let attached = false;
  const right = new FluidSurface({
    root: rightEl,
    path: rightEl.querySelector<SVGPathElement>("[data-path]")!,
    reveal: rightReveal,
    content: rightEl.querySelector<HTMLElement>("[data-content]")!,
    family: "rightPour",
    lead: "depth",
    geometry: () => ({ winW: W, strip: B, seam: NH, shoulder: SH, notchBottom: NB, notchW: RW, w: rw.value, h: rd.value, r: T1.radiusL }),
    finalRect: rightFinal,
    travelPx: forceReduced ? 0 : 10,
    lifecycle: {
      forceReduced,
      onUpdate: (l) => {
        // The bar's hairline stops at the seam while a pane hangs below it.
        const a = l.progress > 0;
        if (a !== attached) {
          attached = a;
          barLine.setAttribute("d", Geo.barHairline({ w: W, strip: B, h: NH, shoulder: SH, bottom: NB, leftW: LW, centerW: CW,
            rightW: RW, rightBottomL: NB, rightAttached: a, frameInset: B + T1.cornerRadius }).path);
        }
      },
    },
  });
  place(rightReveal, rightFinal());

  function showPane(p: Pane, crossfade: boolean) {
    const prev = pane;
    pane = p;
    place(rightReveal, rightFinal());
    rw.follow(PANE_W[p], springRole("page"));
    rd.follow(PANE_D[p], springRole("page"));
    if (!crossfade || prev === p) {
      for (const k of Object.keys(paneEls) as Pane[]) { paneEls[k].hidden = k !== p; paneEls[k].style.opacity = "1"; }
      return;
    }
    // RightPanel.qml: the old pane fades over fadeOut, the new one waits that
    // long and fades in over fadeIn.
    const out = paneEls[prev], inn = paneEls[p];
    out.getAnimations().forEach((a) => a.cancel());
    inn.getAnimations().forEach((a) => a.cancel());
    const fo = effect(BASE.fadeOut), fi = effect(BASE.fadeIn);
    out.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fo, fill: "forwards" }).onfinish = () => { if (pane !== prev) out.hidden = true; };
    inn.hidden = false;
    inn.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fi, delay: fo, fill: "both", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" });
  }

  // ── acting like the Shell ─────────────────────────────────────────────────
  let current: Act | null = null;
  function open(a: Act | null) {
    if (a === current) a = null;                       // a second click closes
    if (a === "dashboard") {
      if (right.isOpen) right.close();
      dash.open();
    } else if (a === "network" || a === "notifications") {
      if (dash.isOpen) dash.close();
      if (right.isOpen || right.life.mapped) showPane(a, true);
      else { showPane(a, false); rw.jump(PANE_W[a]); rd.jump(PANE_D[a]); }
      right.open();
    } else {
      dash.close(); right.close();
    }
    current = a;
    if (a) pan.follow(cutFor(a), springRole("page"));
    stage.dataset.open = a ?? "";
    for (const b of acts) {
      const on = b.dataset.act === a;
      if (b.hasAttribute("aria-pressed")) b.setAttribute("aria-pressed", String(on));
      else b.setAttribute("aria-expanded", String(on));
    }
  }

  // Clicks on the desktop outside a surface close it, as the Shell's backdrop does.
  desk.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-act], .st-content")) return;
    if (current) { takeOver(); open(null); }
  });
  for (const b of acts) b.addEventListener("click", (e) => { e.stopPropagation(); takeOver(); open(b.dataset.act as Act); });
  stage.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) { takeOver(); open(null); } });

  // ── the guided tour ───────────────────────────────────────────────────────
  const px = new Follower(1180, { response: 0.62, damping: 1 }, () => drawPointer());
  const py = new Follower(620, { response: 0.62, damping: 1 }, () => drawPointer());
  function drawPointer() { pointer.style.transform = `translate(${px.value}px, ${py.value}px)`; }
  const targets: Record<Act | "away", [number, number]> = {
    dashboard: [W / 2 + 34, 24], network: [W - RW + 28, 24], notifications: [W - 26, 24], away: [1010, 640],
  };
  let touring = !!fig.dataset.tour;
  let visible = false;
  let step = 0, timer = 0;
  const wait = (ms: number) => new Promise<void>((r) => { timer = window.setTimeout(r, ms); });
  const script: [Act | null, number][] = [["dashboard", 2600], [null, 900], ["network", 1900], ["notifications", 2300], [null, 1700]];

  async function run() {
    while (touring && visible && !isReduced()) {
      const [a, hold] = script[step % script.length];
      const tgt = targets[a ?? "away"];
      if (a && narrow) pan.follow(cutFor(a), springRole("page"));
      pointer.hidden = false;
      px.follow(tgt[0]); py.follow(tgt[1]);
      await wait(a ? 720 : 520);
      if (!touring || !visible) break;
      if (a || current) {
        pointer.classList.add("press");
        await wait(110);
        pointer.classList.remove("press");
        // A null step clicks the empty desk, which closes what is open.
        open(a);
      }
      await wait(hold);
      step++;
    }
    if (!touring) pointer.hidden = true;
  }
  let running = false;
  async function kick() {
    if (running || !touring || !visible || isReduced()) return;
    running = true;
    try { await run(); } finally { running = false; }
  }
  function takeOver() {
    if (!touring) return;
    touring = false;
    clearTimeout(timer);
    pointer.hidden = true;
    tourBtn?.setAttribute("aria-pressed", "false");
  }
  tourBtn?.addEventListener("click", () => {
    if (touring) { takeOver(); return; }
    touring = true;
    tourBtn.setAttribute("aria-pressed", "true");
    open(null);
    kick();
  });
  if (tourBtn && isReduced()) { touring = false; tourBtn.setAttribute("aria-pressed", "false"); }
  onMotionChange(() => {
    rw.spring.response = rd.spring.response = springRole("page").response;
    if (isReduced()) takeOver();
  });
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && en.intersectionRatio >= 0.35;
    if (visible) kick(); else clearTimeout(timer);
  }, { threshold: [0, 0.35, 0.6] }).observe(stage);

  // The finished state was server-rendered for no-JS; start from the closed desk.
  dash.life.setOpen(false);
  dashEl.hidden = true;

  const handle: StageHandle = {
    el: fig,
    open(a) { takeOver(); open(a); },
    setScene(id, img) {
      fig.dataset.scene = id;
      fig.dataset.palette = id;
      const pic = fig.querySelector<HTMLElement>("[data-wall]")!;
      const sources = pic.querySelectorAll("source");
      sources[0].setAttribute("srcset", img.srcset.avif);
      sources[1].setAttribute("srcset", img.srcset.webp);
      const im = pic.querySelector("img")!;
      im.setAttribute("srcset", img.srcset.jpg);
      im.setAttribute("src", img.src);
    },
  };
  // Follow a palette the visitor chose elsewhere on the site.
  const want = document.documentElement.dataset.palette;
  const images = JSON.parse(fig.dataset.images ?? "{}");
  if (want && want !== fig.dataset.scene && images[want]) handle.setScene(want, images[want]);
  return handle;
}
