// ─── The product stage at runtime ────────────────────────────────────────────
// Plays the recordings of the real Rime Shell (ProductStage.astro,
// src/data/stage.json). The desktop has four states — rest, the Dashboard,
// Wi-Fi and the notification centre — and every transition between them was
// recorded from the shell as one clip of the part of the screen it changes.
// A clip ends on exactly the frame the next one starts on (scripts/capture/
// cut.py), so the stage chains them: the last clip stays paused on its final
// frame, and the next is shown only once its first frame is on screen.
//
// A transition with no recording of its own (another scene's Wi-Fi to
// Dashboard) plays through rest. Under Reduce Motion the stage plays the
// shell's own Reduce Motion recordings, or, for scenes without them, fades the
// settled surface in, as the shell does; with motion off it jumps. A guided
// tour plays while the stage is on screen and motion is full; any interaction
// hands control to the visitor.
// ─────────────────────────────────────────────────────────────────────────────
import data from "../data/stage.json";
import { Follower } from "../motion/spring";
import { BASE, effect, isReduced, motionMode, onMotionChange, springRole } from "../motion/policy";
import { currentScheme, onSchemeChange } from "./prefs";

type Act = "dashboard" | "agents" | "network" | "notifications";
type State = Act | "rest";
type Clip = { from: State; to: State; box: number[]; duration: number; settle?: number; av1: string; h264: string };
type Still = { avif: { w: number; src: string }[]; jpg: string };
type Variant = { scene: string; scheme: "dark" | "light"; reduced: boolean; rest?: Still; restFrom?: string; clips: Record<string, Clip> };

const VARIANTS = data.variants as unknown as Record<string, Variant>;
const [FW, FH] = data.size;            // the recording: 3840 × 2400
const [LW, LH] = data.logical;         // the desktop it shows: 1920 × 1200
const CUT = (LH * 4) / 5;              // a phone's 4:5 cut of it: 960 wide
const FEATHER = 40;                    // recording px blended at a clip's inner edges (cut.py pads 48)
const SIZES = "(max-width: 652px) 200vw, (min-width: 1500px) 1400px, 94vw";

export interface StageHandle {
  open(a: Act | null): void;
  setScene(id: string, img?: unknown): void;
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

// AV1 where it decodes smoothly, H.264 otherwise (Safari without an AV1
// decoder, phones that would decode it in software).
let codecChoice: Promise<"av1" | "h264"> | null = null;
function codec(): Promise<"av1" | "h264"> {
  codecChoice ??= (async () => {
    const probe = document.createElement("video");
    const av1 = probe.canPlayType('video/mp4; codecs="av01.0.12M.10"') !== "";
    const h264 = probe.canPlayType('video/mp4; codecs="avc1.640032"') !== "";
    if (!av1 || !h264) return av1 ? "av1" : "h264";
    try {
      const r = await navigator.mediaCapabilities.decodingInfo({
        type: "file",
        video: { contentType: 'video/mp4; codecs="av01.0.12M.10"', width: 2016, height: 1184, bitrate: 2_500_000, framerate: 60 },
      });
      return r.supported && r.smooth ? "av1" : "h264";
    } catch { return "av1"; }
  })();
  return codecChoice;
}

const pct = (v: number) => `${(v * 100).toFixed(4)}%`;
function mask([x, y, w, h]: number[]) {
  const fx = (FEATHER / w) * 100, fy = (FEATHER / h) * 100;
  const hz = `linear-gradient(to right, ${x > 0 ? `transparent 0%, #000 ${fx}%` : "#000 0%"}, ${x + w < FW ? `#000 ${100 - fx}%, transparent 100%` : "#000 100%"})`;
  const vt = `linear-gradient(to bottom, ${y > 0 ? `transparent 0%, #000 ${fy}%` : "#000 0%"}, ${y + h < FH ? `#000 ${100 - fy}%, transparent 100%` : "#000 100%"})`;
  return `${hz}, ${vt}`;
}
const frameShown = (v: HTMLVideoElement) => new Promise<void>((res) => {
  const rvfc = (v as { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
  if (rvfc) rvfc.call(v, () => res());
  else (v as HTMLVideoElement).addEventListener("playing", () => res(), { once: true });
});
const until = (v: HTMLVideoElement, ev: string, ms: number) => new Promise<void>((res) => {
  const t = window.setTimeout(done, ms);
  function done() { clearTimeout(t); v.removeEventListener(ev, done); res(); }
  v.addEventListener(ev, done);
});
const ready = (v: HTMLVideoElement) => (v.readyState >= 3 ? Promise.resolve() : until(v, "canplay", 8000));

function stillPicture(s: Still, scheme: string): HTMLPictureElement {
  const pic = document.createElement("picture");
  pic.className = `stage-base stage-base--${scheme}`;
  pic.dataset.base = scheme;
  const src = document.createElement("source");
  src.type = "image/avif";
  src.srcset = s.avif.map((x) => `${x.src} ${x.w}w`).join(", ");
  src.sizes = SIZES;
  const img = document.createElement("img");
  img.src = s.jpg; img.alt = ""; img.width = 3840; img.height = 2400; img.decoding = "async";
  pic.append(src, img);
  return pic;
}

function setup(fig: HTMLElement): StageHandle {
  const stage = fig.querySelector<HTMLElement>(".stage")!;
  const desk = fig.querySelector<HTMLElement>("[data-desk]")!;
  const clipsEl = fig.querySelector<HTMLElement>("[data-clips]")!;
  const dismiss = fig.querySelector<HTMLElement>("[data-dismiss]")!;
  const acts = [...fig.querySelectorAll<HTMLElement>("[data-act]")];
  const tabs = [...fig.querySelectorAll<HTMLElement>("[data-tab]")];   // the open Dashboard's own tab bar
  const offered = new Set(acts.map((b) => b.dataset.act));
  const tourBtn = fig.querySelector<HTMLElement>("[data-tour-toggle]");
  const forceReduced = fig.dataset.motion === "reduced";

  let scene = fig.dataset.scene!;
  let state: State = "rest";
  const reduced = () => forceReduced || isReduced();
  const variantKey = () => {
    let base = `${scene}-${currentScheme()}`;
    if (!VARIANTS[base]) base = `${scene}-dark`;
    return reduced() && VARIANTS[`${base}-reduced`] ? `${base}-reduced` : base;
  };

  // ── the desk: scaled to the stage; on a phone a 4:5 cut that pans ─────────
  let narrow = false, k = 1;
  const cutFor = (s: State) => (s === "network" || s === "notifications" ? LW - CUT : LW / 2 - CUT / 2);
  const pan = new Follower(cutFor("rest"), springRole("page"), () => apply());
  function apply() {
    desk.style.transform = narrow ? `translateX(${(-pan.value * k).toFixed(2)}px) scale(${k})` : `scale(${k})`;
  }
  function measure() {
    const w = stage.clientWidth;
    narrow = w < 600;
    stage.classList.toggle("stage--cut", narrow);
    k = narrow ? w / CUT : w / LW;
    apply();
  }
  new ResizeObserver(measure).observe(stage);
  measure();

  // ── clips ──────────────────────────────────────────────────────────────────
  const cache = new Map<string, Promise<HTMLVideoElement | null>>();
  let current: HTMLVideoElement | null = null;     // on screen, paused on its state's frame
  let top = 1;                                      // the stacking order: the newest clip is on top
  function video(vk: string, name: string): Promise<HTMLVideoElement | null> {
    const key = `${vk}/${name}`;
    let p = cache.get(key);
    if (!p) { p = make(vk, name); cache.set(key, p); }
    return p;
  }
  async function make(vk: string, name: string): Promise<HTMLVideoElement | null> {
    const c = VARIANTS[vk]?.clips[name];
    if (!c) return null;
    {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "auto"; v.disablePictureInPicture = true;
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      const [x, y, w, h] = c.box;
      Object.assign(v.style, { left: pct(x / FW), top: pct(y / FH), width: pct(w / FW), height: pct(h / FH), visibility: "hidden" });
      const m = mask(c.box);
      v.style.setProperty("mask-image", m); v.style.setProperty("-webkit-mask-image", m);
      v.style.setProperty("mask-composite", "intersect"); v.style.setProperty("-webkit-mask-composite", "source-in");
      v.src = c[await codec()];
      clipsEl.append(v);
      return v;
    }
  }
  const preload = () => {
    const vk = variantKey();
    for (const [name, c] of Object.entries(VARIANTS[vk]?.clips ?? {})) if (c.from === state) void video(vk, name);
  };
  function hide(v: HTMLVideoElement | null) {
    if (!v) return;
    v.style.visibility = "hidden"; v.style.opacity = ""; v.pause();
  }
  function show(v: HTMLVideoElement) {
    v.style.zIndex = String(++top);                 // above whatever is showing
    v.style.visibility = "visible";
    if (current && current !== v) hide(current);
    current = v;
  }

  /** Play one recorded transition; resolves when it has ended on screen. */
  async function play(vk: string, name: string) {
    const c = VARIANTS[vk].clips[name];
    const v = await video(vk, name);
    if (!v) return;
    await ready(v);
    v.currentTime = 0;
    const first = frameShown(v);
    try { await v.play(); } catch { await jump(vk, c.to); return; }   // autoplay refused (a power-saving mode): no motion
    await first;
    show(v);
    // Done once it stops moving: every later frame is the state's own, and the
    // next clip starts on it.
    await Promise.race([until(v, "ended", c.duration * 1000 + 1500), new Promise((r) => setTimeout(r, (c.settle ?? c.duration) * 1000))]);
    if (!v.ended) v.pause();
    if (c.to === "rest") { hide(v); current = null; }
  }

  /** Show a state without its transition: its recording's last frame, faded in over `ms`. */
  async function jump(vk: string, to: State, ms = 0) {
    const prev = current;
    if (to === "rest") {
      current = null;
      if (prev && ms > 0) await prev.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: "ease-out" }).finished.catch(() => {});
      hide(prev);
      return;
    }
    const c = VARIANTS[vk]?.clips[`rest-${to}`];
    const v = await video(vk, `rest-${to}`);
    if (!v || !c) return;
    await ready(v);
    v.pause();
    v.currentTime = Math.max(0, c.duration - 0.02);
    await until(v, "seeked", 3000);
    v.style.zIndex = String(++top);
    v.style.visibility = "visible";
    current = v;
    if (ms > 0) await v.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out" }).finished.catch(() => {});
    if (prev && prev !== v) hide(prev);
  }

  function route(vk: string, from: State, to: State): string[] {
    const clips = VARIANTS[vk].clips;
    if (clips[`${from}-${to}`]) return [`${from}-${to}`];
    if (from !== "rest" && to !== "rest") return [`${from}-rest`, `rest-${to}`].filter((n) => clips[n]);
    return [];
  }

  function mark(target: State) {
    acts.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.act === target)));
    if (target === "rest") delete stage.dataset.open; else stage.dataset.open = target;
    pan.follow(cutFor(target), springRole("page"));
  }

  // ── going somewhere: one transition at a time, the latest request wins ────
  let busy = false, want: State | null = null;
  async function go(target: State) {
    want = target;
    if (busy) return;
    busy = true;
    while (want !== null && want !== state) {
      const to = want; want = null;
      const vk = variantKey();
      mark(to);
      if (motionMode() === "off" && !forceReduced) await jump(vk, to);
      else if (reduced() && !VARIANTS[vk].reduced) await jump(vk, to, effect(BASE.fadeIn));
      else for (const n of route(vk, state, to)) await play(vk, n);
      state = to;
      preload();
    }
    busy = false;
    if (variantPending) void refresh();
  }

  // ── following the page: scheme, Reduce Motion, the chosen scene ────────────
  let shown = variantKey(), variantPending = false;
  async function refresh() {
    if (busy) { variantPending = true; return; }
    variantPending = false;
    const vk = variantKey();
    if (vk === shown) return;
    shown = vk;
    if (state !== "rest") await jump(vk, state, effect(BASE.state));
    preload();
  }
  onSchemeChange(() => void refresh());
  onMotionChange(() => {
    pan.spring.response = springRole("page").response;
    if (reduced()) stopTour();
    void refresh();
  });

  function setScene(id: string, animate = true) {
    if (id === scene || !VARIANTS[`${id}-dark`]?.rest) return;
    scene = id;
    fig.dataset.scene = id;
    const old = [...desk.querySelectorAll<HTMLElement>("[data-base]")];
    const ms = animate ? effect(BASE.state) : 0;
    for (const m of ["dark", "light"] as const) {
      const pic = stillPicture(VARIANTS[`${id}-${m}`].rest!, m);
      desk.insertBefore(pic, clipsEl);
      if (ms > 0) pic.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
    }
    window.setTimeout(() => old.forEach((p) => p.remove()), ms + 50);
    void refresh();
  }

  // ── the visitor ────────────────────────────────────────────────────────────
  for (const b of acts)
    b.addEventListener("click", () => {
      stopTour();
      const a = b.dataset.act as Act;
      void go(state === a ? "rest" : a);
    });
  // The Dashboard's tabs, while it is open: the recorded page slide to that tab.
  for (const b of tabs)
    b.addEventListener("click", () => {
      stopTour();
      const t = b.dataset.tab as Act;
      if (state !== t) void go(t);
    });
  // A click on the desktop outside the open surface closes it, as on the desk.
  dismiss.addEventListener("click", (e) => {
    const c = VARIANTS[variantKey()].clips[`rest-${state}`];
    if (c) {
      const r = desk.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * FW, y = ((e.clientY - r.top) / r.height) * FH;
      const [bx, by, bw, bh] = c.box;
      if (x >= bx + 48 && x <= bx + bw - 48 && y >= by && y <= by + bh - 48) return;
    }
    stopTour();
    void go("rest");
  });

  // ── the tour ───────────────────────────────────────────────────────────────
  // Only what the stage offers: the Agents step (the Dashboard's tab slide)
  // where the stage has an Agents button.
  const STEPS = ([[1100, "dashboard"], [2400, "agents"], [3400, "rest"], [1300, "network"], [2300, "notifications"], [2600, "rest"], [2000, "dashboard"]] as [number, State][])
    .filter(([, s]) => s === "rest" || offered.has(s));
  let touring = !!tourBtn && !reduced(), visible = false, step = 0, timer = 0;
  function kick() {
    clearTimeout(timer);
    if (!touring || !visible) return;
    const [delay, to] = STEPS[step % STEPS.length];
    timer = window.setTimeout(async () => {
      if (!touring || !visible) return;
      await go(to);
      step = step % STEPS.length === STEPS.length - 1 ? 1 : step + 1;   // the last step leads into the second
      kick();
    }, delay);
  }
  function stopTour() {
    if (!touring) return;
    touring = false;
    clearTimeout(timer);
    tourBtn?.setAttribute("aria-pressed", "false");
  }
  tourBtn?.setAttribute("aria-pressed", String(touring));
  tourBtn?.addEventListener("click", () => {
    if (touring) { stopTour(); return; }
    touring = true;
    tourBtn.setAttribute("aria-pressed", "true");
    step = state === "dashboard" ? 1 : 0;
    kick();
  });
  // The surfaces open from the stage's top edge, so its top sixth on screen
  // (the hero on a 1440 × 900 laptop) is enough to watch the tour.
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting && en.intersectionRatio >= 0.15;
    if (visible) kick(); else clearTimeout(timer);
  }, { threshold: [0, 0.15, 0.5] }).observe(stage);
  // Fetch the clips that can come next a little before the stage is reached.
  new IntersectionObserver(([en]) => { if (en.isIntersecting) preload(); }, { rootMargin: "300px 0px" }).observe(stage);

  // Follow a palette the visitor chose elsewhere on the site.
  const wantScene = document.documentElement.dataset.palette;
  if (wantScene && wantScene !== scene) setScene(wantScene, false);

  return {
    el: fig,
    open(a) { stopTour(); void go(a ?? "rest"); },
    setScene(id) { setScene(id, true); },
  };
}
