---
title: "Springs on the wall clock"
description: "Why Rime Shell's surfaces move on closed-form springs stepped by elapsed time, what that fixed on a 144 Hz panel, and the one place where the refresh rate still shows."
date: 2026-09-28
author: "Andre Nijman"
sources:
  - "https://github.com/AndreNijman/rime-shell/tree/6289d1f89916d3432ca3bd1f4ca68db7141559d9"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/theme/spring.js"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/theme/motion.js"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/theme/anim/SpringFollower.qml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/components/SurfaceLifecycle.qml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/shapes/fluid/geometry.js"
---

Rime Shell's surfaces grow out of its bar. The Dashboard blooms from the centre notch, the network panel pours out of the right notch, and the power menu spills from the left edge of the frame. Until 2026-09-26, `SurfaceLifecycle.qml` records, "The body used to run 240 ms on a fixed curve." Now each surface runs on damped springs, and each spring advances by the time that passed since the last frame. One place still leaks the display's refresh rate, and we measured it. Paths refer to rime-shell at `6289d1f8`.

## A reversal keeps its speed

A curve maps elapsed time to progress from a fixed start. The comment in `src/theme/motion.js` puts the problem in two sentences:

> A curve has one shape whatever came before it: reversed half-way, it restarts from rest and the motion kinks. A spring carries its velocity into the new target, so an open caught by a close flows back.

Close the Dashboard while it is still opening and its body keeps the speed it had, slows, and turns around. The lifecycle swaps in the closing spring's response and damping and sets the new target. Nothing restarts from rest: the closed form carries position and velocity across the change.

## Two numbers per spring

We parameterise springs the way SwiftUI does. `response` is the period of the undamped oscillation in seconds, and the damping fraction ζ is 1 at critical damping. With unit mass, ω0 = 2π / response, k = ω0², and c = 2ζω0.

A critically damped change looks finished at about `response`, so the shell sets each response from the matching duration token:

| Role | response | ζ |
|---|---|---|
| `surfaceOpen` | 0.52 s | 1.0 |
| `surfaceClose` | 0.38 s | 1.0 |
| `selection` | 0.40 s | 0.86 |
| `page` | 0.38 s | 1.0 |
| `valueFollow` | 0.20 s | 1.0 |
| `toggle` | 0.30 s | 0.82 |

`tests/motion-test.js` keeps each damping between 0.8 and 1; at 0.86 a selection overshoots by about 0.5 %. The lock screen's password shapes should pop, so their spring lives in a separate table (`EXPRESSIVE`: 0.222 s, ζ 0.6, about 9.5 % over) where no surface can pick it up by mistake. The speed setting (Snappy 0.8, Balanced 1.0, Relaxed 1.25) and the duration slider multiply `response`. Reduce Motion sets it to 0, and the spring snaps.

## Closed form, stepped by elapsed time

`src/theme/spring.js` solves the damped oscillator in closed form, with separate branches for under-, critically and over-damped springs. The critical branch:

```js
var e1 = Math.exp(-w0 * dt);
var B1 = v0 + w0 * d0;
d = (d0 + B1 * dt) * e1;
v = (B1 - w0 * (d0 + B1 * dt)) * e1;
```

An integrator such as Euler's method collects an error that depends on the step size. The closed form has none to collect. The file's header states the consequence: "the motion does not depend on the frame rate: sixty 1/60 s steps land where one 1 s step does."

That holds only if each step gets the right `dt`. `Spring.qml` and `SpringFollower` both run a `FrameAnimation` and read the wall clock:

```js
const dt = Math.min(0.05, Math.max(0, (now - spring._last) / 1000))
```

The 50 ms clamp covers a stalled frame. In the words of `Spring.qml`, "a stalled frame costs one slower step, not a teleport." The spring also writes its velocity before its value, because a listener on the value may snap the spring to rest, and a velocity written afterwards would leave it at rest and still moving.

## The 62 Hz judder

Small things in the shell (the tab pill, the navigation highlight, a switch knob) used to ride on Qt's `SpringAnimation`. The header of `src/theme/anim/SpringFollower.qml` records why that ended:

> That one kept velocity through a retarget, but Qt steps it at a fixed 16 ms, so its values moved at ~62 Hz whatever the display did: invisible on a 60 Hz panel, a judder on [our test desktop's] 144 Hz one (review, 2026-09-26).

`SpringFollower` steps the same closed-form spring as the surfaces, once per frame on the wall clock, "so it is exact at any refresh rate". A pill and the bloom it sits in now move on the same physics. Its first value is its target, so nothing slides in from 0, and a `live` flag makes it jump instead of glide.

The brightness slider's fill shows why the caller picks when to jump. It had two faults. Behind a closed popup the follower was not stepped, so the panel opened on an old level and slid. Under the pointer the fill chased the thumb: 120 px behind at the press, then 16 to 36 px behind through the drag. The fill now binds `live: !dragArea.pressed` and to the window's visibility, so hidden or dragged, it snaps.

## Three springs per surface

`src/components/SurfaceLifecycle.qml` runs Closed, Opening, Open and Closing on springs. It replaced per-surface close timers (`interval: Theme.animDuration + 20`), which made a window's lifetime a guess about its slowest animation. The window now stays mapped until all its channels reach zero.

A surface with `liquid: true` gets three springs:

- **lead** moves first on the way in and leaves last. It is the part touching the bar: the Dashboard's width, or the right panel's depth.
- **body** starts once the lead crosses `openRelease` (0.12). On the way out it leaves first, and the lead follows once the body drops below `closeRelease` (0.35).
- **trail** follows the body, critically damped, and drives radii, shoulders and fillets. It lags a few frames and settles last.

For the Dashboard at Balanced speed, the opening lead has a response of 0.374 s at ζ 0.84, the body 0.478 s at ζ 0.80, and the trail 0.416 s at ζ 1. Closing runs critically damped, lead 0.266 s and body 0.304 s. "Open" means lead and body have both passed 98 %, since a spring's last fraction of a pixel takes as long as the rest. A close unmaps at 0.4 %.

## Secondary motion from speed

`src/shapes/fluid/geometry.js` never tweens a path. Each family derives named parameters (width, depth, shoulders, corners) from the channels and builds the path again every frame. A channel maps to a size in a straight line, because "the spring already supplies the easing, a curve here would ease twice". A spring that passes 1 becomes a swell capped with `tanh`: at most 4 px in width and 6 px in depth on the Dashboard.

The lifecycle also publishes FLOW, `velocity × response / 2.3`. A critically damped spring from rest peaks at 2π/(e·response), about 2.3/response, so flow is near 1 at the fastest and 0 at rest. Secondary motion scales with it. The Dashboard's bottom edge bows by `8 * Math.tanh(fd)` pixels, its middle leading while the body drops and trailing while it rises. At full flow the right panel's leading corner trails by up to 24 px and rounds out by up to 14 px. At rest the flow is zero, so the finished shape is exact. A reversal flips the sign of the flow, so the bow turns over without extra code.

## Hold at the notch until the first frame

Quickshell builds a new backing window on every map, and the compositor needs a commit before anything reaches the screen. On our test laptop that took 50 to 150 ms. A lifecycle that started its clock when `open` flipped had the body a third grown before its first frame appeared, so you saw a large rectangle pop in where the notch should have grown.

The springs now hold at 0, "where the body IS the notch", until the surface's window has swapped a frame since it mapped. A 250 ms timer releases any window that never reports frames. Content waits for the same signal.

## Where the refresh rate still shows

The spring steps are exact at any rate. The discrete decisions between them are not. `_onStep` checks the release once per frame:

```qml
if (life.open && life._body.target < 1 && life._lead.value >= life.openRelease)
    life._body.target = 1
```

The lead crosses 0.12 somewhere inside a frame, and the body starts at the end of it: up to 16.7 ms late at 60 Hz, 6.9 ms at 144 Hz. To measure what that does, we drove `spring.js` with the Dashboard's defaults (a 520 ms open, 520 px deep) at four refresh rates and compared each with a 1000 Hz run, sweeping where the frames fall relative to the start of the open:

| Refresh rate | Largest depth difference from 1000 Hz |
|---|---|
| 60 Hz | 45 px |
| 120 Hz | 22 px |
| 144 Hz | 18 px |
| 240 Hz | 10 px |

With frames aligned to the start, the 60 Hz run peaks at 43 px, 117 ms into the open. The lead channel, which makes no discrete decision, agrees with the reference to within 0.02 px at each rate we tried, and the finished shapes match. At 60 Hz the Dashboard's drop starts a little later than it would at 144 Hz. `closeRelease` has the same pattern on the way out, and the website's port of the lifecycle inherits both.

The fix would find the crossing inside the step, from the closed form or by bisection, and advance the body by the part of the frame after it. We have not written it yet.

## How the tree holds it

`tests/spring-test.js` holds `spring.js` to the physics, and `tests/motion-test.js` holds the tables, the caps and the overshoot bounds. `run-spring-follower-test.sh`, `run-surface-lifecycle-test.sh` and `run-slider-open-test.sh` drive the QML, and `tests/fluid-geometry-test.js` sweeps each family through its channels. Set `RIME_PACING_LOG=1` and each open and close logs the frames it delivered, the worst gap, and the time to its first frame.

rimeos.com runs the same `spring.js`, vendored byte for byte, under a port of `SurfaceLifecycle`. [A website that runs the shell](/journal/a-website-that-runs-the-shell) covers how.
