# rimeos.com

The website for Rime: product pages, the release record the OS links to after
an update, downloads and docs. Built from `RimeOS_Website_Master_Specification_v1.md`
in this directory.

The site does not imitate Rime Shell. Its demo desktops are recordings of the
real Shell, and the rest runs the Shell's own code: motion, springs, colour
roles and fluid geometry are rime-shell's files, vendored byte for byte and
hash-pinned; palettes come from Rime's own matugen command.

```sh
npm install
npm run dev          # http://localhost:4321
npm run build        # gates + astro build + postbuild gate → dist/
npm run preview
npm test             # unit tests (vitest)
npm run test:e2e     # Playwright: Chromium, Firefox, WebKit (needs a build)
npm run check        # astro check (TypeScript 6)
npm run launch-gates # what must be true before the site goes public
```

Node 22+. `npm run scenes` needs matugen 4.2 (the version Rime ships) and
Python 3 with numpy + Pillow only if you regenerate the site's own scenes.

## Layout

```
content/
  updates/<id>/release.yaml   one file per release: the page, its JSON and the feeds come from it
  docs/*.md                   user docs (collection schema in src/content.config.ts)
  journal/*.md                engineering notes
  wallpapers.json             every scene the site may show, with source and licence
  downloads.json              GENERATED from the GitHub release (npm run downloads)
assets/wallpapers/            scene sources (Rime's default + five generated for the site)
src/
  vendor/rime-shell/          GENERATED: motion.js, spring.js, roles.js, geometry.js + LICENSE @ SOURCE.json ref
  motion/                     policy (Reduce Motion), Spring (rAF, wall clock), SurfaceLifecycle port, recorder
  geometry/theme.mjs          ThemeSet.qml's token table
  scripts/                    client islands: frame, fluid surfaces, stage, rail, search, lab, filters
  components/ layouts/ pages/
  data/scenes.json            GENERATED palettes + Light Fields (npm run scenes)
  data/password-shapes.json   GENERATED from rime-shell's materialpath.js (npm run shapes)
  styles/generated/           GENERATED motion.css (npm run tokens) and scenes.css
scripts/                      generators and gates (each file says what it does)
tests/unit tests/e2e tests/visual
public/_headers               security and cache headers (applied by Cloudflare's asset server)
public/media/shell/           GENERATED recordings of the Shell (scripts/build-stage.mjs)
deploy/                       the Worker that serves dist/ at rimeos.com
```

## How the Shell's code gets here

`scripts/sync-shell.mjs` copies four files from a rime-shell revision and wraps
each (the originals end in a `module.exports` guard that is dead in a browser
module). The text between the `BEGIN/END VERBATIM` markers is the Shell's,
unedited; `SOURCE.json` records the ref and a sha256 per file.

- every `npm run build` checks the hashes (offline);
- `npm run verify:vendor` compares with `git show <ref>:<path>` in `../rime-shell`;
- to move to a new Shell revision: `npm run vendor:shell -- --ref <rev>`, then
  `npm run tokens`, `npm run shapes`, `npm test`, and look at the site.

`src/motion/lifecycle.ts` is a line-for-line port of `SurfaceLifecycle.qml`
(liquid lead/body/trail channels, first-frame gate, content choreography,
Reduce Motion behaviour); `src/scripts/fluid.ts` is FluidShape plus the reveal
clip. The frame, the site map (CENTER_BLOOM), the download panel (RIGHT_POUR /
BOTTOM_RISE on phones) and the product stage all run on them.

## The recordings

Every desktop on the site (home, Shell, Personalise) is the real Rime Shell:
rime-shell's `shell.qml` at a pinned revision, recorded by `scripts/capture/`
and published by `scripts/build-stage.mjs`.

```sh
git -C ../rime-shell archive <rev> | tar -x -C /var/tmp/shell && git -C ../rime-shell rev-parse <rev> > /var/tmp/shell/.rime-shell-commit
SHELL_ROOT=/var/tmp/shell scripts/capture/capture-all.sh /var/tmp/rime-capture   # about an hour
node scripts/build-stage.mjs /var/tmp/rime-capture                                # public/media/shell, src/data/stage.json
```

- **Where it runs:** a Hyprland nested in a private headless labwc (rime-shell's
  own `tests/lib/headless.sh` sandbox: private HOME, runtime dir and session
  bus), one output at 3840 × 2400 scale 2, the L16's 1920 × 1200 at twice the
  pixels, with the image's `/usr/share/rime/hypr/rime/appearance.lua`. Nothing
  appears on the desk.
- **What is real:** the Shell's code and a fresh install's settings, the fonts
  and icons installed on the machine, and each scene's palette (the `source`
  block of `src/data/scenes.json`, i.e. matugen through the Shell's template).
- **What is canned:** Wi-Fi (rime-shell's `fake-nmcli`), Bluetooth, brightness,
  uptime and the account name (`scripts/capture/fakes/`), the NetworkManager and
  UPower the bar reads for its Wi-Fi and battery icons (a private system bus,
  `fakes/system-bus.py`, on the real interfaces' introspection XML), three notifications
  sent on the private bus inside the notification service's 500 ms start-up
  grace (so no toast is ever on screen), and the clock.
- **Time:** `clockshift.so` (LD_PRELOAD, the shell process only) starts every
  session at 09:41 on 28 September 2026 and dilates every clock the shell reads
  3.125 times. The shell draws each transition over 3.125 times as many
  frames, and `cut.py` plays the recording back 3.125 times faster, so springs,
  Qt animations, timers and the Dashboard's seconds all come out at real speed.
  Qt's animation driver is the time-based one (`QSG_USE_SIMPLE_ANIMATION_DRIVER`);
  the default steps 16.67 ms per frame, which is only right at a steady vsync.
- **Clips:** each take is one continuous lossless master through a few
  states; `cut.py` finds each transition's first moving frame, cuts it to the
  start of the next (so clips chain on the same frame), crops it to what differs
  from the resting desktop, and encodes AV1 and H.264. The page shows the rest
  still and plays clips over it, feathered at their inner edges (`stage.ts`).

## Palettes

`npm run scenes` (scripts/build-scenes.mjs):

1. regenerates Rime's default wallpaper with matugen and refuses to continue
   unless it matches the Shell's test fixture byte for byte;
2. runs `matugen image <wall> --source-color-index 0 --type scheme-content -m <mode> --dry-run -j hex`
   in an empty HOME for every published scene, maps the result as
   `rime-shell-colors.json.example` does, and resolves it with `roles.js`;
3. rejects any mapping that misses WCAG AA where the site uses it;
4. writes responsive AVIF/WebP/JPEG wallpapers and a pre-blurred Light Field
   per scheme, pulled toward the base surface just far enough that primary
   text stays at 7:1 on its brightest pixel.

The output is committed; `npm run scenes:check` diffs a fresh run against it.
Only scenes with `publish: true` in `content/wallpapers.json` are built. The six
wallpapers inherited with rime-shell are recorded there with `publish: false`:
they have no licence on record.

## Releases

A release is `content/updates/<id>/release.yaml` (schema in
`src/content.config.ts`, after spec §8.3). From it the build makes:

| URL | What |
|---|---|
| `/updates/<id>` | the page (spec §8.1): highlights, areas, fixed, known issues, provenance, rollback |
| `/updates/<id>?from=<id>` | the same page plus "you updated from…" and every release crossed, computed in the browser from the static index |
| `/updates/<id>.json` | machine-readable record |
| `/updates/index.json` | every release, newest first, with predecessors |
| `/updates/latest` | 302 to the newest (Cloudflare `_redirects`; a static fallback page elsewhere) |
| `/updates/feed.xml`, `rss.xml`, `feed.json` | Atom, RSS, JSON Feed |

**IDs** are `YYYY.MM.DD` by the promotion date in AWST, with `.2`, `.3`… for a
second promotion the same day. Releases from before the rename keep
`apex-vX.Y.Z` and `product: apex`; the chain of `predecessor` fields is one
line from the first release to the newest (a unit test holds it to that), so
`?from=` works across the rename.

**Order of publishing** (spec §9.2): the page and its JSON go live before the
image tag users receive is promoted. `npm run build` fails if any release in
the index lacks its page or JSON, or if they disagree.

### The OS side (spec §7, Phase 6 — not in this repository)

For the "open what changed after an update" hand-off, the image needs
`/usr/share/rime/release.json` with at least `id` and
`notes: "https://rimeos.com/updates/<id>"`, and Rime Shell a ReleaseService that
opens `<notes>?from=<previous id>` once per user after a forward update (never
after a rollback or on first install). Everything this site must provide for
that exists: stable canonical URLs, the `?from=` view, and the JSON. The site is
informational only; nothing here is consulted by an update.

## Gates

- **build** (`scripts/postbuild.mjs`): every release has page + JSON and they
  agree; every internal link, `#anchor`, `src` and `srcset` resolves; every
  `<img>` has `alt`; no `style=""` attributes (the CSP forbids them); JS per page
  under budget. Also writes `_redirects`, `security.txt` and the social cards.
- **unit** (`tests/unit`): vendored files unedited; springs frame-rate exact;
  lifecycle open/close/reversal/Reduce Motion; CENTER_BLOOM and RIGHT_POUR swept
  through recorded trajectories; every palette clears its floors; release chain,
  highlights, sources, `?from=` arithmetic.
- **e2e** (`tests/e2e`): every page loads with no console errors or CSP
  violations in three engines; the site works without JavaScript; keyboard and
  focus behaviour of the frame; axe (dark and light); visual baselines.
- **launch** (`npm run launch-gates`): facts outside this repo that must hold
  before going public.

### Phones

`tests/e2e/phone.spec.ts` holds every page to no sideways scroll at 390 and
320 px and 44 × 44 px touch targets (inline links in running text excepted),
and checks the site map and download sheet on a touch screen. Tools for a
closer look, all against a running site (default `http://127.0.0.1:8788`):

| | |
|---|---|
| `node tests/tools/mobile-audit.mjs <dir>` | overflow, small targets and side-scrollers at 390/360/320; full-page shots |
| `node tests/tools/mobile-ix.mjs <dir>` | the frame's menu, search, download sheet and stage with motion on |
| `node tests/tools/iphone-check.mjs <dir>` | the same checks in WebKit as an iPhone (run it in the Playwright container) |
| `node tests/tools/desk-shots.mjs <dir>` | full-page desktop shots of every page, to diff before and after a phone change |
| `node tests/tools/hidden-leaks.mjs` | elements with `hidden` that still display |

Phone layout lives in each component's own `@media (max-width: 760px)` and
`(pointer: coarse)` rules; the phone notch is 50 px (`--notch-h`), so the
capsule's inside is one 44 px target tall.

WebKit needs system libraries an immutable host may lack; run it in
Playwright's container:

```sh
podman run --rm --network host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.62.1-noble npx playwright test --project=webkit
```

## Security headers and privacy

Astro writes a per-page CSP meta tag with a hash for every inline script and
style (`security.csp` in `astro.config.mjs`); `public/_headers` adds
`frame-ancestors`, HSTS and the rest. Fonts and images are self-hosted; there
are no third-party requests, no cookies and no analytics.

## Deploying

rimeos.com is `dist/` served by one Cloudflare Worker with static assets
(`deploy/`). The asset server applies `public/_headers` and `public/_redirects`
as Cloudflare Pages would. The Worker sends `http://` and `www.` to
`https://rimeos.com`, answers byte ranges for the stage's clips (the asset
server ignores `Range`, and Safari will not play a video without `206`), and
marks the `workers.dev` preview host `noindex`.

```sh
npm run build
npx wrangler deploy -c deploy/wrangler.jsonc --env production   # Worker rimeos-production
```

`build.format: "file"` and `trailingSlash: "never"` make `/updates/2026.09.28.4`
answer 200 from `2026.09.28.4.html`; `html_handling: "auto-trailing-slash"`
sends `/shell/` to `/shell`. The two hostnames are attached to the Worker as
Workers Custom Domains, outside the config.

## Licence

MIT (`LICENSE`). The files in `src/vendor/rime-shell/` are Rime Shell's, under
its own MIT notice (`src/vendor/rime-shell/LICENSE`). The default wallpaper is a
rime-os asset; the five site scenes are generated by `scripts/scenes/` and are
original to this repository. The recordings in `public/media/shell/` are of
Rime Shell running.
