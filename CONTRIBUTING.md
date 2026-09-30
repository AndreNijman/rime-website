# Contributing to rimeos.com

Thanks for helping. This repository is the website for
[Rime OS](https://github.com/AndreNijman/rime-os). The [README](README.md)
explains how the site is built; this file covers how a change gets onto it.

## Where a change belongs

| Change | Repository |
|---|---|
| A page, the docs, the release pages' layout, the build or its gates | this one |
| What a release page says about a change | the rime-os or rime-shell pull request's `## Release note` section |
| The OS or the desktop themselves | [rime-os](https://github.com/AndreNijman/rime-os), [rime-shell](https://github.com/AndreNijman/rime-shell) |

Release records under `content/updates/` are written by
`scripts/sync-releases.mjs` from the published image and the pull requests
merged since the release before. Fix the wording of a generated record by
committing the corrected `release.yaml`; a record on `main` is never
overwritten.

Everything the site says about Rime has to be true of the code it links to.
If a claim and the code disagree, the code wins, and the page changes.

## Issues

Use the issue forms: one for a page that is broken, one for content that is
wrong or out of date. Security problems do not go in issues: see
[SECURITY.md](SECURITY.md).

## Pull requests

- Branch from `main`, one topic per branch, and open a pull request against
  `main`.
- Two checks must pass: `Build and unit tests` (vitest, `astro check`,
  `npm run build` with its gates) and `Browser tests` (Playwright in
  Chromium, Firefox and WebKit). The branch must be up to date with `main`
  when it merges, and pull requests merge with a merge commit.
- A merge to `main` deploys rimeos.com straight away
  (`.github/workflows/deploy.yml`). There is no staging copy, so what merges
  is what visitors get.

### Commits

- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`.
- One logical change per commit. Say why in the body, not only what.
- No AI attribution in commits, pull request text or source files.

## Testing

Node 22 or newer.

```sh
npm install
npm run build        # the gates, astro build, then the postbuild gate
npm test             # unit tests (vitest)
npm run check        # astro check
npm run test:e2e     # Playwright, after a build
```

The visual baselines in `tests/visual` were taken on one machine, so a
screenshot comparison can fail elsewhere with nothing wrong. CI runs the
browser tests with `RIME_SKIP_VISUAL=1` for that reason; do the same locally
unless you are updating the baselines on purpose.

Files under `src/vendor/rime-shell/`, `src/data/scenes.json`,
`public/media/shell/` and `content/downloads.json` are generated. Change the
source or rerun the generator the README names for them; never edit them by
hand. The build refuses a vendored file that no longer matches its pinned
hash.

## Licence

The site is released under the [MIT licence](LICENSE), and contributions are
accepted under the same licence. `src/vendor/rime-shell/` is Rime Shell's code
under its own MIT notice.

Taking part here means following the [Code of Conduct](CODE_OF_CONDUCT.md).
