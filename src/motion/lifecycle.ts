// ─── SurfaceLifecycle ────────────────────────────────────────────────────────
// A line-for-line port of rime-shell's components/SurfaceLifecycle.qml — the
// one clock a Rime surface, and the notch it grows out of, runs on:
// Closed → Opening → Open → Closing, driven by springs.
//
// Liquid channels (the Shell's Dashboard and right panel both set liquid: true):
//   lead   moves first on the way in (a bloom's width, a pour's depth) and
//          leaves LAST — it is the part touching the bar
//   body   follows once the lead has crossed `openRelease`; on the way out it
//          leaves first, and the lead follows once the body is below
//          `closeRelease`
//   trail  a critically damped follower of the body: radii, shoulders, fillets
//   *Flow  speed relative to a nominal open's peak (≈1 at the fastest, 0 at
//          rest); geometry.js bends edges by it
//
// All three springs advance together, once per animation frame, by the wall
// clock (clamped to 50 ms), with the Shell's closed-form step. Content arrives
// once the body has substance (`contentAt`) and leaves ahead of it; under
// Reduce Motion the springs snap and the surface fades instead (alpha).
// ─────────────────────────────────────────────────────────────────────────────
import { step, atRest } from "../vendor/rime-shell/spring.mjs";
import { schedule, unschedule, MAX_STEP } from "./spring";
import { BASE, CURVES, ease, effect, isReduced, spatial, REDUCED_EFFECT_CAP } from "./policy";

type S = { value: number; velocity: number; target: number; response: number; damping: number; running: boolean };
const mk = (): S => ({ value: 0, velocity: 0, target: 0, response: 0.5, damping: 1, running: false });

export type Phase = "Closed" | "Opening" | "Open" | "Closing";

export interface LifecycleOptions {
  liquid?: boolean;
  enter?: number;          // ms, spatial role (default morphEnter)
  exit?: number;           // ms (default morphExit)
  contentAt?: number;
  contentDelay?: boolean;  // false: content with the body (menus)
  manual?: boolean;        // never schedule frames; the caller steps it (recordings, tests)
  ignorePolicy?: boolean;  // full motion whatever the visitor's setting (a recording they scrub by hand)
  forceReduced?: boolean;  // Reduce Motion for this surface alone (the side-by-side demo)
  onUpdate?: (l: SurfaceLifecycle) => void;
  onOpened?: () => void;
  onClosed?: () => void;
  onMapped?: (mapped: boolean) => void;
}

class Tween {
  from = 0; to = 0; t0 = 0; ms = 0; curve: number[] = CURVES.effects; active = false;
  start(from: number, to: number, ms: number, curve: number[], t0: number) {
    this.from = from; this.to = to; this.ms = ms; this.curve = curve; this.t0 = t0; this.active = ms > 0 && from !== to;
  }
  at(now: number): number {
    if (!this.active) return this.to;
    const t = Math.min(1, (now - this.t0) / this.ms);
    if (t >= 1) this.active = false;
    return this.from + (this.to - this.from) * ease(this.curve, t);
  }
}

export class SurfaceLifecycle {
  // Shell defaults (SurfaceLifecycle.qml)
  leadIn = 0.72; bodyIn = 0.92; leadOut = 0.70; bodyOut = 0.80; trailScale = 0.80;
  leadDamping = 0.84; bodyDamping = 0.80; enterDamping = 1.0; exitDamping = 1.0;
  openRelease = 0.12; closeRelease = 0.35;
  contentAt = 0.30; minFraction = 0.35;

  readonly liquid: boolean;
  private enterBase: number; private exitBase: number;
  private readonly contentDelay: boolean;
  private readonly opts: LifecycleOptions;

  /** Slow-motion factor for the Motion Lab's replays; 1 everywhere else. */
  timeScale = 1;
  open = false;
  content = 0;
  alpha = 0;
  private body = mk(); private lead = mk(); private trail = mk();
  private settling = false; private arrived = false; private announced = false;
  private contentPending = false; private ready = true; private readyAt = 0;
  private cTween = new Tween(); private aTween = new Tween();
  private last = 0; private ticking = false; private wasMapped = false;
  private readonly tick = (now: number) => this.frame(now);

  constructor(opts: LifecycleOptions = {}) {
    this.opts = opts;
    this.liquid = opts.liquid ?? true;
    this.enterBase = opts.enter ?? BASE.morphEnter;
    this.exitBase = opts.exit ?? BASE.morphExit;
    this.contentDelay = opts.contentDelay ?? true;
    if (opts.contentAt !== undefined) this.contentAt = opts.contentAt;
  }

  get enterDuration() { return this.opts.forceReduced ? 0 : this.opts.ignorePolicy ? this.enterBase : spatial(this.enterBase); }
  get exitDuration() { return this.opts.forceReduced ? 0 : this.opts.ignorePolicy ? this.exitBase : spatial(this.exitBase); }
  get contentIn() { return this.opts.forceReduced ? Math.min(REDUCED_EFFECT_CAP, BASE.hover) : effect(isReduced() ? BASE.hover : BASE.fadeIn); }
  get contentOut() { return this.opts.forceReduced ? Math.min(REDUCED_EFFECT_CAP, BASE.fadeOut) : effect(BASE.fadeOut); }

  // ── outputs ────────────────────────────────────────────────────────────────
  get progress() { return Math.max(0, Math.min(1, this.body.value)); }
  get bodyValue() { return this.body.value; }
  get leadValue() { return this.liquid ? this.lead.value : this.body.value; }
  get trailValue() { return this.liquid ? this.trail.value : this.body.value; }
  get bodyFlow() { return this.body.response > 0 ? this.body.velocity * this.body.response / 2.3 : 0; }
  get leadFlow() { return !this.liquid ? this.bodyFlow : this.lead.response > 0 ? this.lead.velocity * this.lead.response / 2.3 : 0; }
  get mapped() {
    return this.open || this.settling || this.progress > 0 || this.content > 0 || this.alpha > 0
      || (this.liquid && (this.lead.value > 0 || this.trail.value > 0));
  }
  get phase(): Phase {
    if (!this.mapped) return "Closed";
    if (this.open) return this.arrived ? "Open" : "Opening";
    return "Closing";
  }
  /** Channels in the shape geometry.js's `g.ch` takes, for a family whose lead is its width (CENTER_BLOOM). */
  channelsWidthLead() { return { w: this.leadValue, d: this.bodyValue, n: this.trailValue, fw: this.leadFlow, fd: this.bodyFlow }; }
  /** … and for one whose lead is its depth (RIGHT_POUR: the right edge drops first). */
  channelsDepthLead() { return { d: this.leadValue, w: this.bodyValue, n: this.trailValue, fd: this.leadFlow, fw: this.bodyFlow }; }

  // ── input ──────────────────────────────────────────────────────────────────
  setOpen(open: boolean): void {
    if (open === this.open && (open ? this.mapped : !this.mapped)) return;
    this.open = open;
    if (open && !this.wasMapped) {
      // The first frame: hold every spring at 0 — where the body IS the notch —
      // until the surface has been on screen for a frame (the Shell waits for
      // frameSwapped; a browser's equivalent is one rAF after it is shown).
      this.ready = false;
      this.readyAt = 0;
    }
    this.drive();
  }
  toggle(): void { this.setOpen(!this.open); }

  // ── internals ──────────────────────────────────────────────────────────────
  private anyRunning() { return this.body.running || (this.liquid && (this.lead.running || this.trail.running)); }
  private snapAll(to: number) {
    for (const s of [this.body, this.lead]) { s.target = to; s.value = to; s.velocity = 0; s.running = false; }
    this.trail.target = this.body.value; this.trail.value = this.body.value; this.trail.velocity = 0; this.trail.running = false;
  }
  private setTarget(s: S, t: number) {
    s.target = t;
    if (!atRest(s.value, s.velocity, t, 0.0005)) s.running = true;
  }
  private atOpen() { return this.body.value >= 0.98 && (!this.liquid || this.lead.value >= 0.98); }
  private atClosed() {
    const low = (s: S) => s.value <= 0.004 && Math.abs(s.velocity) < 0.35;
    return low(this.body) && (!this.liquid || (low(this.lead) && low(this.trail)));
  }

  private retarget() {
    if (this.open) {
      if (this.liquid) {
        this.setTarget(this.lead, 1);
        if (this.lead.value >= this.openRelease) this.setTarget(this.body, 1);
      } else this.setTarget(this.body, 1);
    } else {
      this.setTarget(this.body, 0);
      if (this.liquid && this.body.value <= this.closeRelease) this.setTarget(this.lead, 0);
    }
  }

  private dur(full: number, from: number, to: number) {
    const d = Math.abs(to - from);
    if (full <= 0 || d <= 0) return 0;
    return Math.round(full * Math.max(this.minFraction, d));
  }

  private startContent() {
    this.contentPending = false;
    const to = this.open ? 1 : 0;
    const ms = this.dur(this.open ? this.contentIn : this.contentOut, this.content, to);
    if (ms <= 0) { this.content = to; this.cTween.active = false; return; }
    this.cTween.start(this.content, to, ms, CURVES.effects, this.clock());
  }

  private drive() {
    this.settling = !this.open;
    this.announced = false;
    const spatialOn = (this.open ? this.enterDuration : this.exitDuration) > 0;
    const dur = (this.open ? this.enterDuration : this.exitDuration) / 1000;
    if (this.open) {
      this.body.response = dur * (this.liquid ? this.bodyIn : 1);
      this.body.damping = this.liquid ? this.bodyDamping : this.enterDamping;
      this.lead.response = dur * this.leadIn;
      this.lead.damping = this.leadDamping;
    } else {
      this.body.response = dur * (this.liquid ? this.bodyOut : 1);
      this.body.damping = this.exitDamping;
      this.lead.response = dur * this.leadOut;
      this.lead.damping = this.exitDamping;
    }
    this.trail.response = dur * this.trailScale;
    this.trail.damping = 1;

    if (!spatialOn) {
      if (this.open) this.snapAll(1);
    } else if (!(this.open && !this.ready)) {
      this.retarget();
    }
    this.arrived = this.open && this.atOpen();

    if (spatialOn) { this.aTween.active = false; this.alpha = 1; }
    else {
      const to = this.open ? 1 : 0;
      const ms = this.dur(this.open ? this.contentIn : this.contentOut, this.alpha, to);
      if (ms <= 0) { this.alpha = to; this.aTween.active = false; } else this.aTween.start(this.alpha, to, ms, CURVES.effects, this.clock());
    }

    this.cTween.active = false;
    this.contentPending = false;
    if (this.open && this.content < 1 && (!this.ready || (spatialOn && this.contentDelay && this.progress < this.contentAt)))
      this.contentPending = true;
    else this.startContent();
    this.ensureTicking();
    this.emit();
  }

  /** Now, on the clock frames are stepped by (a recording's own clock in manual mode). */
  private clock() { return this.opts.manual ? this.last : performance.now(); }

  private ensureTicking() {
    if (this.ticking || this.opts.manual) return;
    this.ticking = true;
    this.last = performance.now();
    schedule(this.tick);
  }

  private frame(now: number) {
    const dt = Math.min(MAX_STEP, Math.max(0, (now - this.last) / 1000)) * this.timeScale;
    this.last = now;

    if (!this.ready) {
      // One presented frame after being shown, the springs may move.
      if (this.readyAt === 0) this.readyAt = now;
      else { this.ready = true; if (this.open) this.drive(); }
    }

    for (const s of this.liquid ? [this.lead, this.body] : [this.body]) {
      if (!s.running) continue;
      const r = step(s.value, s.velocity, s.target, s.response, s.damping, dt);
      s.velocity = r[1]; s.value = r[0];
      if (atRest(s.value, s.velocity, s.target, 0.0005)) { s.value = s.target; s.velocity = 0; s.running = false; }
    }
    if (this.liquid) {
      // The trail's target is wherever the body is right now.
      const t = this.trail;
      t.target = this.body.value;
      if (!atRest(t.value, t.velocity, t.target, 0.0005) || this.body.running) {
        const r = step(t.value, t.velocity, t.target, t.response, t.damping, dt);
        t.velocity = r[1]; t.value = r[0]; t.running = true;
        if (!this.body.running && atRest(t.value, t.velocity, t.target, 0.0005)) { t.value = t.target; t.velocity = 0; t.running = false; }
      } else t.running = false;
    }
    if (this.cTween.active) this.content = this.cTween.at(now);
    if (this.aTween.active) this.alpha = this.aTween.at(now);

    this.onStep();
    this.check();
    this.emit();

    const busy = this.anyRunning() || this.cTween.active || this.aTween.active || this.contentPending || !this.ready;
    if (!busy) { this.ticking = false; unschedule(this.tick); }
  }

  private onStep() {
    const spatialOn = (this.open ? this.enterDuration : this.exitDuration) > 0;
    if (this.liquid && spatialOn && this.ready) {
      if (this.open && this.body.target < 1 && this.lead.value >= this.openRelease) this.setTarget(this.body, 1);
      if (!this.open && this.lead.target > 0 && this.body.value <= this.closeRelease) this.setTarget(this.lead, 0);
    }
    if (this.open) {
      if (this.contentPending && this.ready && this.progress >= this.contentAt) this.startContent();
      if (!this.arrived && this.atOpen()) this.arrived = true;
    } else if (this.settling && this.anyRunning() && this.atClosed()) {
      this.snapAll(0);
    }
  }

  private check() {
    const busy = this.cTween.active || this.aTween.active || this.contentPending || (!this.open && this.anyRunning());
    if (busy) return;
    if (this.open) {
      if (this.arrived && !this.announced) { this.announced = true; this.opts.onOpened?.(); }
      return;
    }
    if (this.settling) {
      if (this.progress > 0 && this.alpha <= 0 && this.exitDuration <= 0) this.snapAll(0);
      if (this.progress <= 0 && this.content <= 0 && (!this.liquid || (this.lead.value <= 0 && this.trail.value <= 0))) {
        this.alpha = 0;
        this.settling = false;
        this.opts.onClosed?.();
      }
    }
  }

  private emit() {
    const m = this.mapped;
    if (m !== this.wasMapped) { this.wasMapped = m; this.opts.onMapped?.(m); }
    this.opts.onUpdate?.(this);
  }

  /** Test hook: advance the whole lifecycle by dt seconds without rAF. */
  advanceForTest(dt: number, now = performance.now()) { this.last = now - dt * 1000; this.frame(now); }
}
