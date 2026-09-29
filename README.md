# rimeos.com

The website for Rime: product pages, the release record the OS links to after
an update, downloads and docs. Built from `RimeOS_Website_Master_Specification_v1.md`
in this directory.

The site does not imitate Rime Shell. It runs the Shell's own code: motion,
springs, colour roles and fluid geometry are rime-shell's files, vendored byte
for byte and hash-pinned; palettes come from Rime's own matugen command.

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
  vendor/rime-shell/          GENERATED: motion.js, spring.js, roles.js, geometry.js @ SOURCE.json ref
  motion/                     policy (Reduce Motion), Spring (rAF, wall clock), SurfaceLifecycle port, recorder
  geometry/theme.mjs          ThemeSet.qml's token table
  scripts/                    client islands: frame, fluid surfaces, stage, rail, search, lab, filters
  components/ layouts/ pages/
  data/scenes.json            GENERATED palettes + Light Fields (npm run scenes)
  data/password-shapes.json   GENERATED from rime-shell's materialpath.js (npm run shapes)
  styles/generated/           GENERATED motion.css (npm run tokens) and scenes.css
scripts/                      generators and gates (each file says what it does)
tests/unit tests/e2e tests/visual
public/_headers               Cloudflare Pages security and cache headers
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

The build output in `dist/` is a static site made for Cloudflare Pages
(`build.format: "file"`, `trailingSlash: "never"`, so `/updates/2026.09.28.4`
answers 200 from `2026.09.28.4.html`). It has not been deployed.
