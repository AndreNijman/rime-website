---
title: "Verify what you run"
description: "Check the installer download, verify the system image and its SBOM with cosign, and know what rime update checks and what it does not."
section: "Reference"
order: 10
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/trust-enforcement.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/trust.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/.github/workflows/build-image.yml"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/trust/enforcement.conf"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.core"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
  - "https://github.com/AndreNijman/rime-os/releases/tag/v2.1.0"
verified: "rime-os@2d9c5438a"
---

## The installer download

The published installer is `apex-os-netinstall-x86_64.iso` (APEX-OS v2.1.0),
1,902,344,192 bytes, SHA-256
`7208b6fd5c2641e3e1bb035eac0d1c642f4f7eda85b1ba3295993b8ec0227248`.

```sh
sha256sum -c apex-os-netinstall-x86_64.iso.sha256
```

**The ISO is not signed.** The checksum sits on the same release page as the
file, so it proves the download is complete and uncorrupted, not who made it.

You can check what the ISO installs. It downloads the system image by digest,
`sha256:148f57de20e1db04ee672037791d10d6d6d02a188784b6f213255c7d50153a92`, pinned
in the registry as `ghcr.io/andrenijman/apex-os:netinstall-v2.1.0`. The
workflow that gives a release image that permanent tag checks its signature
first. You can check the signature yourself:

```sh
cosign verify ghcr.io/andrenijman/apex-os:netinstall-v2.1.0 \
  --certificate-identity-regexp '^https://github\.com/AndreNijman/(apex|rime)-os/\.github/workflows/build-image\.yml@' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

## The system image

Every Rime image is signed by CI with cosign, keyless, under a GitHub Actions
identity. CI verifies its own signature and attestation before it moves any tag.
Since the rename, that identity is:

```text
https://github.com/AndreNijman/rime-os/.github/workflows/build-image.yml@refs/heads/main
```

Images built before the rename were signed as `AndreNijman/apex-os`. Current
Rime clients accept both.

### On your machine

```sh
rime trust            # what was checked when the booted image arrived, and what the next update will check
rime trust --verify   # does the registry hold a signature and an SBOM attestation for the image I am running?
rime trust --gate     # would the next update be accepted? exits 1 if it would be refused
```

None of these needs root. Plain `rime trust` reads local files only. `--verify`
and `--gate` ask the registry, and a registry that cannot be reached is reported
as unavailable, never as unsigned. Add `--json` for a program.

`--verify` and `--gate` answer different questions. The tag your machine follows
moves on every build, so the image you run and the image you would update to are
usually different. Only the next one can be refused, so that is the one the
gate checks.

### With cosign, from any computer

cosign is not installed on Rime, and Fedora does not package it. Run it on a
computer that has it:

```sh
cosign verify ghcr.io/andrenijman/rime-os:rime \
  --certificate-identity https://github.com/AndreNijman/rime-os/.github/workflows/build-image.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

The same image is also published, and signed, as
`ghcr.io/andrenijman/apex-os:apex` and under the other tags. To check the exact
image a machine runs, use its digest (`ghcr.io/andrenijman/rime-os@sha256:…`)
in place of the tag.

## The SBOM attestation

Every build attaches a software bill of materials as a signed attestation. It is
an SPDX document listing every package in the image (9,830 in a recent build), with
name, version, purl and CPE identifiers: the RPMs, the npm trees inside the
bundled Claude and ChatGPT desktop apps, and the Go and Rust modules inside
binaries. It is signed by the same identity as the image and recorded in the
public Sigstore transparency log; the build fails if no log entry is made.

It is a flat package list. It carries no file inventory and no dependency
graph, because the full document is too large for the transparency log.

To read it:

```sh
cosign verify-attestation \
  ghcr.io/andrenijman/rime-os@sha256:... \
  --type spdxjson \
  --certificate-identity-regexp '^https://github\.com/AndreNijman/(apex|rime)-os/\.github/workflows/build-image\.yml@' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  | jq -r '.payload | @base64d | fromjson | .predicate.packages[] | "\(.name) \(.versionInfo)"'
```

For the full file-level document with the dependency graph, generate it from the
public image yourself. It needs about 16 GB of memory and fifteen minutes:

```sh
syft "registry:ghcr.io/andrenijman/rime-os@sha256:..." -o spdx-json
```

## What `rime update` checks

Before it deploys anything, `rime update` verifies the image the registry serves
now. All of these must hold:

1. the signature payload's hash matches the digest that named it;
2. the ECDSA signature verifies over that payload, with the key in the signing
   certificate;
3. the certificate chains to the Sigstore root pinned in the image, at
   `/usr/share/rime-os/trust/fulcio-root.pem`, not to a root the signature
   supplied;
4. the certificate names the expected identity, issued by GitHub's token
   endpoint;
5. the signed payload names this digest and this repository.

It also checks for the SBOM attestation (the `provenance` setting).

### What it does not check

- **The transparency log.** Your machine does not check the Rekor entry, and
  every report says "the transparency log was not checked". It verifies the
  certificate chain at the certificate's own start time instead. This is the
  posture of `cosign verify --insecure-ignore-tlog`. To check the log, run
  cosign as shown above.
- **Anything bootc pulls on its own.** The containers policy that bootc reads
  accepts any image. Only `rime update` applies the check; running
  `bootc upgrade` yourself skips it.
- **The kernel at run time.** Secure Boot on Rime covers the boot chain: shim,
  GRUB, and a kernel signed with Rime's own key, which you enrol during the
  install. The kernel does not enforce module signatures and does not enter
  lockdown under Secure Boot.

The verification uses `skopeo` and `openssl`, which the image carries.

## Changing what is enforced

The image's defaults are `signature=enforce` and `provenance=warn`. To change
one on your machine, write only that key to `/etc/rime/trust.conf`; it wins over
the image's default for that key. For example, to refuse any update whose SBOM
attestation is missing as well as one whose signature fails:

```sh
printf 'provenance=enforce\n' | sudo tee /etc/rime/trust.conf
```

`tee` replaces the file, so include every key you want to keep.

A value other than `enforce`, `warn` or `off` is ignored with a note naming the
file and line, so a typo never turns the check off. An unreadable file falls
back to the defaults. The full decision table is on
[Updating](/docs/updating).

## On a machine installed from the v2.1.0 ISO

Until its first update, such a machine runs an older APEX-OS image. The same
commands start with `apex` (`apex trust --gate`), the settings file is
`/etc/apex/trust.conf`, and the client trusts only the old `apex-os` signer.
[Install Rime](/docs/install) covers the first update.
