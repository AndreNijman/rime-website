// ─── FluidSurface ────────────────────────────────────────────────────────────
// The web counterpart of rime-shell's FluidShape + the reveal Item around a
// surface's content. One path, rebuilt every frame from a geometry.js family
// (the Shell's own file) and a SurfaceLifecycle's channels; nothing tweens a
// path. Content keeps its FINAL layout and is revealed through the family's
// `clip` rectangle, so a morphing body never re-lays-out what is inside it.
//
// Paint cost per frame: one `d` attribute, one clip-path, one transform and
// two opacities. No layout.
// ─────────────────────────────────────────────────────────────────────────────
import * as Geo from "../vendor/rime-shell/geometry.mjs";
import { SurfaceLifecycle, type LifecycleOptions } from "../motion/lifecycle";
import { travel } from "../motion/policy";

export type Rect = { x: number; y: number; w: number; h: number };
export type Family = "centerBloom" | "rightPour" | "leftSpill" | "edgeSpillRight" | "bottomRise" | "cornerRise";

export interface FluidSpec {
  root: HTMLElement | SVGElement;         // shown while mapped
  path: SVGPathElement;
  reveal: HTMLElement;                    // at the content's final rect; clipped
  content: HTMLElement;                   // travels in as it fades
  family: Family;
  lead: "width" | "depth";                // which channel touches the bar
  geometry: () => Record<string, unknown>;
  finalRect: () => Rect;                  // the content's finished box, surface coords
  hole?: () => (Rect & { rb: number }) | null;
  holeCover?: HTMLElement | SVGElement;
  travelPx?: number;
  lifecycle?: LifecycleOptions;
  onFrame?: (life: SurfaceLifecycle, result: any) => void;
}

export class FluidSurface {
  readonly life: SurfaceLifecycle;
  readonly spec: FluidSpec;
  result: any = null;

  constructor(spec: FluidSpec) {
    this.spec = spec;
    const user = spec.lifecycle ?? {};
    this.life = new SurfaceLifecycle({
      liquid: true,
      ...user,
      onUpdate: (l) => { this.render(); user.onUpdate?.(l); },
      onMapped: (m) => { this.setMapped(m); user.onMapped?.(m); },
    });
    this.setMapped(false);
  }

  private setMapped(m: boolean) {
    const r = this.spec.root as HTMLElement;
    r.hidden = !m;
    if (m) r.removeAttribute("inert"); else r.setAttribute("inert", "");
  }

  open() { this.life.setOpen(true); }
  close() { this.life.setOpen(false); }
  toggle() { this.life.toggle(); }
  get isOpen() { return this.life.open; }

  /** Recompute from the current state (also after a resize or retarget). */
  render() {
    const { spec, life } = this;
    if (!life.mapped) return;
    const ch = spec.lead === "width" ? life.channelsWidthLead() : life.channelsDepthLead();
    const fn = (Geo as any)[spec.family];
    const r = fn(life.progress, { ...spec.geometry(), ch });
    this.result = r;

    // The Dashboard's trick: while the bloom is still small, leave the notch's
    // own content window open so the bar's label is SEEN fading underneath,
    // then cover it back in as the body grows (Dashboard.qml _coverK).
    let d = r.path;
    const coverK = Geo.smooth(Geo.span(life.progress, 0.22, 0.6));
    const hole = spec.hole?.();
    if (hole && life.alpha >= 1 && coverK < 1) d += " " + Geo.notchHole(hole.x, hole.y, hole.w, hole.h, hole.rb);
    spec.path.setAttribute("d", d);
    if (spec.holeCover) {
      const hc = spec.holeCover as HTMLElement;
      hc.style.opacity = hole && coverK < 1 ? String(coverK) : "1";
      hc.style.display = hole && life.alpha >= 1 && coverK < 1 ? "" : "none";
    }
    (spec.root as HTMLElement).style.opacity = String(life.alpha);

    const f = spec.finalRect();
    const c = r.clip as Rect;
    const top = Math.max(0, c.y - f.y), left = Math.max(0, c.x - f.x);
    const right = Math.max(0, f.x + f.w - (c.x + c.w)), bottom = Math.max(0, f.y + f.h - (c.y + c.h));
    spec.reveal.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
    spec.content.style.opacity = String(life.content);
    spec.content.style.transform = `translateY(${((1 - life.content) * travel(spec.travelPx ?? 10)).toFixed(2)}px)`;
    spec.onFrame?.(life, r);
  }
}

/** Place an element at a rect in its positioned parent's coordinates. */
export function place(el: HTMLElement, r: Rect) {
  el.style.left = `${r.x}px`;
  el.style.top = `${r.y}px`;
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
}
