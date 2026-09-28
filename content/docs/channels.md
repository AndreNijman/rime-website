---
title: "Update channels"
description: "Only the edge channel exists today. What the channel design is, what each rime channel command does, and why nothing is sent."
section: "Reference"
order: 20
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/update-channels.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/channel.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rimed-core/src/channel.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/.github/workflows/build-image.yml"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/.github/workflows/promote-channel.yml"
verified: "rime-os@2d9c5438a"
---

## Where things stand

Every Rime machine is on **edge**, and edge is the only channel that exists.

The image tags in use (`rime`, `apex`, `daily`, `gaming-mesa`, `gaming-nvidia`
and `edge`, under both `ghcr.io/andrenijman/rime-os` and the old
`ghcr.io/andrenijman/apex-os`) all point at one image. CI moves all of them on
every successful build of `main`, and a weekly scheduled build republishes
`main` as well. They are names for the same thing, not editions. A machine
reports whichever of these tags it follows as "edge under an older name".

The `beta`, `candidate` and `stable` tags have never been published: the
workflow that creates them has never run. `sudo rime channel set` refuses to
move a machine to any of them, because a tag the registry does not serve would
leave the machine with nothing to update to.

The client side of the design is built and tested. The rest of this page
describes it, so you know what the commands say and what they will do once the
other channels are published.

## The design

| Channel | What arrives |
|---|---|
| `edge` | every successful build of `main`, as soon as it is published |
| `beta` | a build that has been on edge and looks sound |
| `candidate` | a build being considered for stable |
| `stable` | only builds that have been through the other three |

A channel is only which tag `bootc upgrade` follows. The promotion workflow is
written to refuse a digest that is not already on the channel above, and one
that this repository's build workflow on `main` has not signed.

## The commands

```sh
rime channel status              # which channel, and how the last update went
rime channel list                # the four channels and which one you are on
sudo rime channel set beta --dry-run
sudo rime channel set beta       # refused today: the tag does not exist
rime channel report              # the health report, and whether anything is sent
rime channel rollout             # whether a staged rollout is holding this machine
rime channel rollout --offline   # decide on the last rollout document accepted, contact nothing
```

`status`, `list`, `report` and `rollout` need no root. `status` reads the
image's origin file and `/etc/machine-id` and contacts nothing. `rollout` is the
one verb that contacts the registry, unless you add `--offline`. `status`,
`report` and `rollout` take `--json`.

`set` needs root, because it runs `bootc switch`. It checks that the target tag
resolves first and refuses if the registry says it does not exist. `--force`
switches anyway; `--dry-run` prints what it would run. If the registry cannot be
reached at all, `set` switches without the check and says so.

### Moving toward stable

Moving toward `stable` usually deploys an older image, so `set` pins the current
image first (`ostree admin pin 0`) and does not switch if the pin fails. It also
prints what your saved state will do: the switch replaces `/usr` and leaves
`/etc`, `/var` and your home directory as they are. `rime schema status` says
which stores that affects. See [Rollback](/docs/rollback).

## Staged rollout

Every machine has a rollout slot from 0 to 99, derived from `/etc/machine-id`.
It stays the same across reboots and is never sent anywhere.

The rollout percentage lives in a signed document the publisher would put at
`ghcr.io/andrenijman/rime-os:rollout`, in the same registry as the image. Your
machine verifies its signature under a different signer from the image's
(the promotion workflow), and only then reads it. It refuses a document that has
expired, was issued more than 30 days ago or more than an hour in the future,
has a lower serial than one it already accepted, names another repository, or
uses a newer schema than it reads. It caches the last accepted document at
`/var/lib/rime/channel/rollout.json`, so blocking the tag cannot undo a halt.

A held machine skips the image and still updates its packages, Flatpaks and
firmware, and `rime update` exits 0. `sudo rime update --force` takes the held
release anyway.

**No rollout document has ever been published**, so nothing is held today.
Nothing halts a release automatically either: a person would publish a halt.

## The health stop

This part works today, on every machine. If a machine comes back from an update
with a problem the image could have caused (the GPU driver, Rime Shell, the
filesystem or the package extension), the next `rime update` refuses and points
at `sudo rime rollback`. Network trouble does not count. See
[Updating](/docs/updating).

## What is sent

Nothing. Rime operates no telemetry service.

`rime channel report` prints the five fields a health report would contain
(channel, tag, digest, healthy, reasons) and says nothing was sent. It leaves out
the machine id, the rollout slot, the hostname, the hardware, your packages, you
and your network.

Reporting is off by default. The opt-in is `~/.config/rime/channel.toml`:

```toml
report = true
endpoint = "https://example.invalid/rime-health"
```

Even with both set, this build sends nothing: it has no code that transmits a
report, and Rime runs no endpoint to receive one. A file that cannot be read
counts as off.
