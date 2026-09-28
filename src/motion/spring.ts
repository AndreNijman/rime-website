// ─── Spring ──────────────────────────────────────────────────────────────────
// rime-shell's components/Spring.qml, on requestAnimationFrame.
//
// The physics is the Shell's spring.js, vendored byte for byte: step() is the
// closed-form solution, so sixty 1/60 s steps land exactly where one 1 s step
// does and the path cannot depend on the display's refresh rate. Each frame
// steps by the WALL-CLOCK time since the last one — never an assumed 16 ms, the
// mistake that stepped visibly on a 144 Hz panel (spec §14.2) — clamped to
// 50 ms, as the Shell clamps it, so a background-tab stall costs one slow step
// instead of a teleport (spec §3.3).
//
// Retargeting keeps the velocity: an open caught by a close bends back rather
// than restarting from rest.
// ─────────────────────────────────────────────────────────────────────────────
import { step, atRest } from "../vendor/rime-shell/spring.mjs";

export type Tick = (now: number) => void;
const ticks = new Set<Tick>();
let raf = 0;
function loop(now: number) {
  raf = 0;
  for (const t of [...ticks]) t(now);
  if (ticks.size) raf = requestAnimationFrame(loop);
}
export function schedule(t: Tick) {
  ticks.add(t);
  if (!raf) raf = requestAnimationFrame(loop);
}
export function unschedule(t: Tick) { ticks.delete(t); }

/** The longest step one frame may take, in seconds (Spring.qml: 50 ms). */
export const MAX_STEP = 0.05;

export class Spring {
  value = 0;
  velocity = 0;
  target = 0;
  response: number;
  dampingFraction: number;
  epsilon: number;
  running = false;
  onStep: (() => void) | null = null;
  onSettled: (() => void) | null = null;
  private last = 0;
  private readonly tick: Tick;

  constructor(opts: { value?: number; response?: number; dampingFraction?: number; epsilon?: number } = {}) {
    this.value = this.target = opts.value ?? 0;
    this.response = opts.response ?? 0.5;
    this.dampingFraction = opts.dampingFraction ?? 0.86;
    this.epsilon = opts.epsilon ?? 0.0005;
    this.tick = (now) => this.frame(now);
  }

  /** On the target, at rest. Reduce Motion, or a surface built already open. */
  snap(): void {
    this.stop();
    this.velocity = 0;
    this.value = this.target;
    this.onStep?.();
  }

  setTarget(t: number): void {
    this.target = t;
    if (this.response <= 0) { this.snap(); this.onSettled?.(); return; }
    if (atRest(this.value, this.velocity, t, this.epsilon)) {
      this.stop();
    } else if (!this.running) {
      this.running = true;
      this.last = performance.now();
      schedule(this.tick);
    }
  }

  stop(): void {
    this.running = false;
    unschedule(this.tick);
  }

  /** Advance by dt seconds. Public so tests and the geometry sweep can drive it. */
  advance(dt: number): void {
    if (dt <= 0) return;
    const r = step(this.value, this.velocity, this.target, this.response, this.dampingFraction, Math.min(MAX_STEP, dt));
    // Velocity first: a listener reacting to the value may snap this spring.
    this.velocity = r[1];
    this.value = r[0];
  }

  private frame(now: number): void {
    const dt = Math.max(0, (now - this.last) / 1000);
    this.last = now;
    this.advance(dt);
    this.onStep?.();
    if (!this.running) return;
    if (atRest(this.value, this.velocity, this.target, this.epsilon)) {
      this.stop();
      this.velocity = 0;
      this.value = this.target;
      this.onStep?.();
      this.onSettled?.();
    }
  }
}

/**
 * SpringFollower (rime-shell theme/anim/SpringFollower.qml): a value that
 * follows a changing target on a spring role. Used for widths that retarget
 * while a surface is open (a pane switch) and for travelling selections.
 */
export class Follower {
  readonly spring: Spring;
  constructor(value: number, role: { response: number; damping: number }, onStep: () => void) {
    this.spring = new Spring({ value, response: role.response, dampingFraction: role.damping });
    this.spring.onStep = onStep;
  }
  get value() { return this.spring.value; }
  follow(target: number, role?: { response: number; damping: number }) {
    if (role) { this.spring.response = role.response; this.spring.dampingFraction = role.damping; }
    this.spring.setTarget(target);
  }
  jump(target: number) { this.spring.target = target; this.spring.snap(); }
}
