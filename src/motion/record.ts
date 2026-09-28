// Record a lifecycle offline, frame by frame, with the same code the live
// surfaces run: for the Motion Lab's scrubber and for the geometry tests.
import { SurfaceLifecycle } from "./lifecycle";

export type Sample = { t: number; lead: number; body: number; trail: number; leadFlow: number; bodyFlow: number; progress: number };

/**
 * Open at t = 0 and, if `closeAt` is given, close at that time (ms) — the
 * reversal case. Steps at `hz` frames per second until everything is at rest.
 */
export function record(opts: { hz?: number; closeAt?: number; maxMs?: number } = {}): Sample[] {
  const hz = opts.hz ?? 240, dt = 1 / hz, maxMs = opts.maxMs ?? 2400;
  const life = new SurfaceLifecycle({ liquid: true, manual: true, ignorePolicy: true });
  const out: Sample[] = [];
  let now = 1000;
  life.setOpen(true);
  let closed = false;
  for (let t = 0; t <= maxMs; t += dt * 1000) {
    if (opts.closeAt !== undefined && !closed && t >= opts.closeAt) { life.setOpen(false); closed = true; }
    now += dt * 1000;
    life.advanceForTest(dt, now);
    out.push({ t, lead: life.leadValue, body: life.bodyValue, trail: life.trailValue, leadFlow: life.leadFlow, bodyFlow: life.bodyFlow, progress: life.progress });
    const settled = life.open ? life.phase === "Open" && Math.abs(life.bodyValue - 1) < 1e-4 && Math.abs(life.leadValue - 1) < 1e-4 && Math.abs(life.trailValue - 1) < 1e-4
      : !life.mapped;
    if (t > 60 && settled && (opts.closeAt === undefined || closed)) break;
  }
  return out;
}

/** Linear interpolation into a recording at time t (ms). */
export function at(rec: Sample[], t: number): Sample {
  if (t <= rec[0].t) return rec[0];
  const last = rec[rec.length - 1];
  if (t >= last.t) return last;
  let lo = 0, hi = rec.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (rec[m].t <= t) lo = m; else hi = m; }
  const a = rec[lo], b = rec[hi], k = (t - a.t) / (b.t - a.t);
  const L = (x: number, y: number) => x + (y - x) * k;
  return { t, lead: L(a.lead, b.lead), body: L(a.body, b.body), trail: L(a.trail, b.trail), leadFlow: L(a.leadFlow, b.leadFlow), bodyFlow: L(a.bodyFlow, b.bodyFlow), progress: L(a.progress, b.progress) };
}
