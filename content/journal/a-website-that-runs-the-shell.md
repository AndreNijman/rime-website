---
title: "A website that runs the shell"
description: "rimeos.com draws its bar, its demo desktop and its colours with Rime Shell's own code, pinned to rime-shell@6289d1f8, and refuses to build when that code drifts or to write palettes the Shell would not produce."
date: 2026-09-28
author: "Andre Nijman"
sources:
  - "https://github.com/AndreNijman/rime-shell/tree/6289d1f89916d3432ca3bd1f4ca68db7141559d9"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/theme/roles.js"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/src/shapes/fluid/geometry.js"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f89916d3432ca3bd1f4ca68db7141559d9/tests/fixtures/palettes-matugen-4.2.0.json"
  - "/journal/springs-on-the-wall-clock"
---

The front page of rimeos.com shows a Rime desktop. Click the centre notch and the Dashboard blooms out of it; click the Wi-Fi icon and a panel pours from the right. We did not film that desktop or draw it in a design tool. The site runs four of Rime Shell's own source files, draws its bar with the Shell's geometry, and takes its colours from the command the Shell runs on your wallpaper. This post covers how the site stays identical to a pinned Shell revision, and what it refuses to publish.

## Four files, byte for byte

The Shell keeps its motion numbers, springs, colour roles and fluid geometry in plain JavaScript with no QML imports, because node runs the Shell's own tests against them. A browser can run them too.

| File in rime-shell | What it holds |
|---|---|
| `src/theme/motion.js` | duration tokens, curves, spring roles, the speed and Reduce Motion arithmetic |
| `src/theme/spring.js` | the closed-form spring step |
| `src/theme/roles.js` | surface and text roles as mixes of the palette, and WCAG contrast |
| `src/shapes/fluid/geometry.js` | the bar's silhouette and the path of each surface family |

`scripts/sync-shell.mjs` copies each file from rime-shell `6289d1f8` with `git show <ref>:<path>`. The originals end in a `module.exports` guard that a browser module cannot use, so the script wraps each file, untouched, between two marker lines inside a function scope, publishes its exports under one global, and writes an ESM shim beside it. `SOURCE.json` records the revision, the sha256 of each file and its export names. Re-vendoring fails if the Shell stops exporting a name the site imports.

Two checks guard the copy. `npm run build` starts with `sync-shell.mjs --check-hashes`, which hashes the text between the markers, offline, and fails on any local edit. `sync-shell.mjs --check-upstream` compares the same text with `git show` in a rime-shell checkout. The script's header sets the intent: "a drift is a build failure rather than a slow divergence." Moving the site to a newer Shell is one command at the new ref, and a diff to review.

## The frame is the Shell's bar

The bar across the top of every page is `RimeFrame.astro`, drawn by `barSilhouette` and `barHairline` from geometry.js at the Shell's scale-1 tokens: a 6 px border, a 40 px notch height, a 15 px notch radius, a 17 px corner radius and a 300 px centre notch. The server renders it at a nominal 1440 px, and `frame.ts` redraws it for the real width on load. Without JavaScript each trigger stays a plain link.

The site's own surfaces use the Shell's families. The site map and search bloom out of the centre notch (CENTER_BLOOM). The download panel pours from the right notch (RIGHT_POUR), and on a phone it rises from the bottom edge (BOTTOM_RISE). Each runs on a TypeScript port of `SurfaceLifecycle.qml`, stepping the vendored `spring.js` by the wall clock with the Shell's 50 ms clamp.

`fluid.ts` rebuilds one SVG path per frame from the family's function. The content keeps its final layout, and the family's `clip` rectangle reveals it, so a moving silhouette never re-lays out the text inside. A frame costs one `d` attribute, one clip-path, one transform and two opacities. [Springs on the wall clock](/journal/springs-on-the-wall-clock) covers the motion model, including the one frame-rate artifact it has, which the port inherits.

## A desktop rebuilt from source

The demo stage, `ProductStage.astro`, is a 1440 × 900 logical screen at the same tokens. geometry.js draws the frame and the bar. The 900 × 520 Dashboard blooms from the centre notch, and the network and notification panes pour from the right. Layout and labels follow the Shell's `DashboardLayout.qml`, `DashHome.qml`, `QuickSettings.qml`, `NetworkPane.qml` and `NotificationList.qml` at the pinned revision. Names, networks and notifications are demo data.

A video could not do what the reconstruction does. The stage takes the palette you pick elsewhere on the site. It follows the site's motion setting: under Reduce Motion the guided tour stops and surfaces fade, as the Shell's do. Without JavaScript it renders the finished Dashboard as a still, from the path `centerBloom(1, …)` returns, so the stage never shows an empty box.

## Palettes from the Shell's command

Rime Shell runs matugen on each wallpaper you set and maps six Material roles into its palette. `scripts/build-scenes.mjs` runs the same command for each scene the site shows, inside a throwaway HOME so no local config leaks in:

```sh
matugen image <wall> --source-color-index 0 --type scheme-content -m <mode> --dry-run -j hex
```

It maps the output the way `src/config/rime-shell-colors.json.example` does (`background` from `surface`, `active` from `primary`, `text` from `on_surface`, and three more), then resolves the roles with the vendored `roles.js`.

Before any of that, the script regenerates the palette of Rime's default wallpaper in both modes and compares it with the fixture the Shell's tests pin, `tests/fixtures/palettes-matugen-4.2.0.json`. Dark mode must come out as background `#121315`, accent `#b2c8ec` and text `#e3e2e5`; light mode as `#faf9fb`, `#000613` and `#1b1c1e`; the other three fields must match too. If one hex digit differs, the script writes nothing, so a matugen release that changes its output, or a changed mapping, shows up as a refusal.

The script is a generator, not a build step. We commit its output, `src/data/scenes.json` and a generated stylesheet, and `build-scenes.mjs --check` regenerates the palettes and fails if the committed file differs from a fresh run.

## A contrast gate, and what it caught

The Shell holds its roles to targets: 7:1 for primary text, 4.5:1 for secondary, 3:1 for tertiary text and icons. The site's gate lists each foreground role with the surfaces the site draws it on, and applies two thresholds. A role that misses the WCAG AA floor (4.5:1 for primary and secondary text, 3:1 for tertiary and accent text) stops the script before it writes a palette. A role that passes AA but misses the Shell's target prints a warning.

The gate caught one mapping. Tertiary text is `mix(T, B, 0.50)`, and the raised surface is `mix(B, T, 0.05)`. On the base surface, tertiary reads 3.24 to 3.28:1 on the light schemes and 4.34 to 4.39:1 on the dark ones. On the raised surface it falls under 3:1 on every light scheme, at 2.94 to 2.97. A stronger mix would have fixed the number, but the palette belongs to the Shell, and the site should show what the Shell draws. The site draws tertiary on the base surface only, for placeholders and decoration. The Shell's own `roles.js` checks tertiary against the base surface alone and reserves it for "placeholders and disabled only".

## A background solved for 7:1

Each scene also gets a Light Field: the wallpaper, resized to 320 × 180 and blurred, then mixed toward the page's base surface. The script solves the strength. It steps the mix up from 0.30 by 0.02 and stops at the first value where primary text clears 7:1 at the worst pixel of the result. If no strength up to 0.96 gets there, the script fails.

The published strengths run from 0.30 to 0.78. The chalk scene's light mode passed at the first step with 8.24:1, and the other eleven fields land between 7.08:1 and 7.35:1 at their worst pixel. The script blurs the image once, so the browser composites the field with no runtime filter.

## Wallpapers we could not show

Rime Shell ships six wallpapers inherited from Brain_Shell, the project it was forked from, which added all six in one commit on 2026-06-09. None has a recorded source, author or licence in the tree, and we do not read the fork's MIT licence as a licence for its artwork. One is upstream's own artwork and reads "BRAIN SHELL". Another carries embedded C2PA content credentials whose strings name an image-generation model; we read those strings and did not validate the signature. The other four carry no provenance metadata.

`content/wallpapers.json` records all six with `publish: false` and a note on each. The site shows Rime's default wallpaper, a repository asset, and five scenes made for the site. `scripts/scenes/generate-scenes.py` paints each one at 2560 × 1440 with numpy and Pillow, from gradients, ridge lines built out of summed sines, glows and grain, with a fixed seed. The provenance of each image is that file. The scenes go through the same matugen command as the default wallpaper, so their palettes are the ones Rime would produce.

The six inherited wallpapers still ship in the Shell. Clearing their provenance, or replacing them, is open work in rime-shell.
