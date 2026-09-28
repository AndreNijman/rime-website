#!/usr/bin/env python3
"""Original, procedurally generated scenes for rimeos.com's wallpaper rail.

These are NOT wallpapers Rime ships. They exist because the six wallpapers
inherited from the Brain_Shell fork have no recorded artwork licence, and a
public page needs images whose provenance is this file. The palette story is
unaffected: every scene still goes through Rime's own matugen command
(scripts/build-palettes.mjs), so what the page shows is what Rime would do
with it.

    python3 scripts/scenes/generate-scenes.py          # writes assets/wallpapers/scene-*.jpg

Deterministic: fixed seeds, so a rebuild produces the same bytes on the same
numpy/Pillow.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

W, H = 2560, 1440
OUT = Path(__file__).resolve().parents[2] / "assets" / "wallpapers"


def hexrgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def lerp(a, b, t):
    return a + (b - a) * t


def vgrad(stops: list[tuple[float, str]]) -> np.ndarray:
    """A vertical gradient through (position, colour) stops, H x W x 3."""
    ys = np.linspace(0, 1, H)
    col = np.zeros((H, 3))
    for i in range(len(stops) - 1):
        p0, c0 = stops[i]
        p1, c1 = stops[i + 1]
        m = (ys >= p0) & (ys <= p1)
        t = ((ys[m] - p0) / max(1e-9, p1 - p0))[:, None]
        t = t * t * (3 - 2 * t)
        col[m] = lerp(hexrgb(c0), hexrgb(c1), t)
    return np.repeat(col[:, None, :], W, axis=1)


def ridge(rng: np.random.Generator, base: float, amp: float, octaves: int = 5, rough: float = 0.5) -> np.ndarray:
    """A ridge line's height (0 = top of frame) at every x, from summed sines."""
    xs = np.linspace(0, 1, W)
    y = np.full(W, base)
    a, f = amp, 1.4
    for _ in range(octaves):
        ph = rng.uniform(0, 2 * math.pi)
        y += a * np.sin(2 * math.pi * f * xs + ph)
        # a second, detuned partial breaks the regularity
        y += 0.5 * a * np.sin(2 * math.pi * f * 1.7 * xs + rng.uniform(0, 2 * math.pi))
        a *= rough
        f *= 2.1
    return y


def paint_layer(img: np.ndarray, top: np.ndarray, colour: str, fog: str | None = None, fog_depth: float = 0.0,
                fog_top: np.ndarray | None = None) -> None:
    """Fill everything below `top` with colour, fading into `fog` toward the ridge.

    `fog_top` measures the fog from a smoother line than the silhouette, so a
    jagged canopy does not drag vertical streaks of fog down with every tip."""
    ys = np.arange(H)[:, None] / H
    below = ys >= top[None, :]
    c = hexrgb(colour)
    if fog is not None and fog_depth > 0:
        ft = top if fog_top is None else fog_top
        d = np.clip((ys - ft[None, :]) / fog_depth, 0, 1)[..., None]
        layer = lerp(hexrgb(fog), c, d)
    else:
        layer = np.broadcast_to(c, img.shape)
    # 1.5 px anti-aliased edge
    edge = np.clip((ys - top[None, :]) * H / 1.5, 0, 1)[..., None]
    img[:] = np.where(below[..., None], lerp(img, layer, edge), img)


def glow(img: np.ndarray, cx: float, cy: float, r: float, colour: str, strength: float) -> None:
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx / W - cx) * (W / H)) ** 2 + (yy / H - cy) ** 2)
    k = np.exp(-(d / r) ** 2)[..., None] * strength
    img[:] = lerp(img, hexrgb(colour), np.clip(k, 0, 1))


def disc(img: np.ndarray, cx: float, cy: float, r: float, colour: str) -> None:
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((xx / W - cx) * (W / H)) ** 2 + (yy / H - cy) ** 2)
    a = np.clip((r - d) * H / 2.0, 0, 1)[..., None]
    img[:] = lerp(img, hexrgb(colour), a)


def ribbons(img: np.ndarray, rng: np.random.Generator, colours: list[str], n: int) -> None:
    """Soft curved light ribbons: long gaussian bands along a wandering curve."""
    yy, xx = np.mgrid[0:H, 0:W]
    xs = xx / W
    for i in range(n):
        c = colours[i % len(colours)]
        y0 = rng.uniform(0.25, 0.8)
        amp = rng.uniform(0.08, 0.22)
        f = rng.uniform(0.5, 1.2)
        ph = rng.uniform(0, 2 * math.pi)
        centre = y0 + amp * np.sin(2 * math.pi * f * xs + ph) + 0.06 * np.sin(2 * math.pi * 2.3 * f * xs + ph * 1.7)
        width = rng.uniform(0.006, 0.03) * (0.6 + 0.8 * np.sin(math.pi * xs) ** 2)
        k = np.exp(-(((yy / H) - centre) / width) ** 2)[..., None]
        fade = (np.sin(math.pi * np.clip(xs * 1.1 - 0.05, 0, 1)) ** 1.5)[..., None]
        img[:] = img + hexrgb(c) * k * fade * rng.uniform(0.35, 0.8)


def grain(img: np.ndarray, rng: np.random.Generator, amount: float) -> np.ndarray:
    return np.clip(img + rng.normal(0, amount, img.shape), 0, 1)


def save(img: np.ndarray, name: str, blur: float = 0.0) -> None:
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8))
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / name, quality=90, optimize=True, progressive=True)
    print("wrote", OUT / name)


def harbour_dusk() -> None:
    rng = np.random.default_rng(1101)
    img = vgrad([(0, "#2a1f4a"), (0.38, "#b4547a"), (0.62, "#f2a36b"), (1, "#f7c98f")])
    glow(img, 0.66, 0.6, 0.35, "#ffe0a8", 0.55)
    disc(img, 0.66, 0.6, 0.055, "#fff1d2")
    layers = [(0.60, 0.035, "#a45a7f", "#e79a7c", 0.25),
              (0.66, 0.045, "#743f6c", "#b4647e", 0.22),
              (0.73, 0.05, "#4a2a55", "#7c4a6e", 0.2),
              (0.82, 0.05, "#2b1a38", "#4a2d4f", 0.18),
              (0.92, 0.035, "#170f22", "#2b1a38", 0.1)]
    for base, amp, col, fog, fd in layers:
        paint_layer(img, ridge(rng, base, amp, rough=0.48), col, fog, fd)
    save(grain(img, rng, 0.012), "scene-harbour-dusk.jpg")


def deep_water() -> None:
    rng = np.random.default_rng(2202)
    img = vgrad([(0, "#031a24"), (0.45, "#0b4a5c"), (1, "#062a36")])
    glow(img, 0.3, 0.2, 0.5, "#2aa7a1", 0.35)
    layers = [(0.42, 0.06, "#0e5a6b", "#1b7f86", 0.3),
              (0.52, 0.07, "#0a4656", "#127080", 0.3),
              (0.63, 0.07, "#07384a", "#0d5868", 0.3),
              (0.75, 0.06, "#052a3a", "#0a4656", 0.25),
              (0.88, 0.05, "#031c28", "#062f3e", 0.2)]
    for base, amp, col, fog, fd in layers:
        paint_layer(img, ridge(rng, base, amp, octaves=3, rough=0.35), col, fog, fd)
    ribbons(img, rng, ["#5fe0c8", "#8fd8ff"], 3)
    save(grain(img, rng, 0.01), "scene-deep-water.jpg", blur=0.6)


def fern() -> None:
    rng = np.random.default_rng(3303)
    img = vgrad([(0, "#dfe9b8"), (0.5, "#bcd58c"), (1, "#8fb56a")])
    glow(img, 0.22, 0.3, 0.3, "#f6f7d8", 0.6)
    layers = [(0.44, 0.03, "#9fbf7c", "#cddfa6", 0.3),
              (0.52, 0.04, "#6f9a5e", "#a8c586", 0.25),
              (0.62, 0.05, "#46744a", "#7ea56a", 0.22),
              (0.74, 0.05, "#2b5238", "#4f7b52", 0.2),
              (0.87, 0.04, "#173424", "#2b5238", 0.12)]
    for base, amp, col, fog, fd in layers:
        top = ridge(rng, base, amp, octaves=6, rough=0.55)
        # a sawtooth canopy: tree tips along the ridge
        xs = np.linspace(0, 1, W)
        tips = 0.012 * np.abs(np.sin(2 * math.pi * rng.uniform(55, 90) * xs + rng.uniform(0, 6)))
        paint_layer(img, top - tips * (base > 0.5), col, fog, fd, fog_top=top - 0.012 * (base > 0.5))
    save(grain(img, rng, 0.012), "scene-fern.jpg")


def ember() -> None:
    rng = np.random.default_rng(4404)
    img = vgrad([(0, "#0a0605"), (0.6, "#140a07"), (1, "#1c0c08")])
    glow(img, 0.72, 0.62, 0.45, "#5a1a0c", 0.6)
    ribbons(img, rng, ["#ff7a2e", "#ffb347", "#e0402a"], 7)
    save(grain(img, rng, 0.01), "scene-ember.jpg", blur=1.2)


def chalk() -> None:
    rng = np.random.default_rng(5505)
    img = vgrad([(0, "#f4f1ea"), (0.55, "#e9e4da"), (1, "#dcd6ca")])
    glow(img, 0.78, 0.28, 0.4, "#ffffff", 0.7)
    layers = [(0.58, 0.02, "#d3d6dc", "#e6e5e2", 0.3),
              (0.66, 0.03, "#b9c2cf", "#d6d9de", 0.25),
              (0.76, 0.035, "#98a7ba", "#bfc8d3", 0.25),
              (0.88, 0.03, "#7a8ca3", "#9eacbd", 0.2)]
    for base, amp, col, fog, fd in layers:
        paint_layer(img, ridge(rng, base, amp, octaves=4, rough=0.45), col, fog, fd)
    save(grain(img, rng, 0.008), "scene-chalk.jpg")


if __name__ == "__main__":
    harbour_dusk()
    deep_water()
    fern()
    ember()
    chalk()
