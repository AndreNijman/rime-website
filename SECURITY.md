# Security policy

## Reporting a vulnerability

Report security problems privately through GitHub's private vulnerability
reporting: [open a report](https://github.com/AndreNijman/rime-website/security/advisories/new).
Please don't open a public issue or pull request with exploit details.

This repository is rimeos.com: the site, its build, and the Cloudflare Worker
that serves it. Problems in Rime OS itself go to
[rime-os](https://github.com/AndreNijman/rime-os/security/advisories/new), which
is also the contact rimeos.com's
[security.txt](https://rimeos.com/.well-known/security.txt) names, and
problems in the desktop go to
[rime-shell](https://github.com/AndreNijman/rime-shell/security/advisories/new).
security.txt names rime-os because it is the one contact for all of Rime; a
website report filed there reaches the same person and is not lost.

Examples of what is in scope here:

- a way to make rimeos.com serve content that did not come from this
  repository's `main`;
- a download link, checksum or verification command on the site that points
  somewhere it should not, or would pass for a file it should reject;
- a weakness in the security headers or the Content Security Policy in
  `public/_headers`;
- a problem in `deploy/worker.js`, for example in how it handles redirects or
  byte ranges.

Reports go straight to the maintainer. One person maintains Rime, so there is
no guaranteed response time, but every report is read.

## Supported versions

Only the live site, deployed from `main`, is supported.
