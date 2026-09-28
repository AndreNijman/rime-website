---
title: "Updating"
description: "What sudo rime update does, in order, every flag it takes, and what can stop it."
section: "Use"
order: 10
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/ops.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/trust-enforcement.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/update-channels.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-boot-migrate"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.core"
verified: "rime-os@2d9c5438a"
---

## The short version

```sh
sudo rime update          # download and stage the newest image, then packages, Flatpaks, firmware
sudo systemctl reboot     # start the new image
sudo rime rollback        # if something broke: go back to the previous image at the next boot
```

Rime is one signed system image. An update downloads the new image beside the
one you are running and stages it; you use it after a restart. Nothing updates
on its own: the image masks the automatic update timer it inherits from Fedora,
so every update is one you started.

The OS, the kernel, the graphics drivers, Rime Shell, the login screen and the
boot splash all ship in that image, so they update together and roll back
together. Rime Shell has no updater of its own.

On a machine installed from the v2.1.0 ISO that has not taken its first update
yet, the command is `apex`, and that first update needs extra steps. See
[Install Rime](/docs/install). `apex` keeps working on Rime as another name for
`rime`, and prints a one-line note when you use it.

## Before you update

```sh
sudo rime update --check   # is there an update? downloads nothing
rime trust --gate          # would the signature check accept it? no root, stages nothing
```

`--check` asks bootc whether a newer image exists and asks fwupd about firmware.
It does not run the signature check. `rime trust --gate` does: it resolves the
tag your machine follows, fetches the signature for whatever that tag points at
now, and prints the decision `rime update` would reach. It exits 1 if the update
would be refused.

## What `sudo rime update` does, in order

1. **Checks the last update.** If the machine came back from its previous update
   with a regression, it stops here. See *The regression stop* below.
2. **Checks the signature** of the image it is about to deploy: the one the
   registry serves now, not the one you booted. See *The signature check* below.
3. **Checks the staged rollout.** A signed rollout document can hold a machine
   back for a while. None has been published, so today this never holds
   anything. See [Update channels](/docs/channels).
4. **Records what is running**, so the next update can tell whether this one
   caused a problem.
5. **Tries to move the boot path.** Installs from the published ISO boot GRUB.
   If the machine passes a safety precheck, the update converts it in place to
   systemd-boot, keeps GRUB as a fallback, and changes nothing else in the image
   on that run. The precheck refuses with Secure Boot on, on a disk whose boot
   partition belongs to Windows, when space is short, when an update is already
   staged, or after a previous attempt failed. A refusal is not an error: the
   machine stays on GRUB. `rime boot status` says which path this machine is on.
6. **Stages the new image** with `bootc upgrade`. A machine still following an
   `apex-os` tag moves to the `rime-os` name instead (see below).
7. **Updates the rest:** the packages you added with `rime install`, then
   Flatpak applications, then firmware through fwupd. A Flathub outage never
   fails an OS update.

If rpm-ostree layered packages block the image step, the update says so and
points at `sudo rime pkg adopt`. See [Installing software](/docs/packages).

## Flags

| Flag | What it does |
|---|---|
| `--check` | Report what is available. Downloads and stages nothing. |
| `--skip-firmware` | Skip the fwupd pass. |
| `--firmware-only` | Run only the firmware pass and leave the OS image alone. Cannot be combined with `--skip-firmware`. |
| `--skip-packages` | Skip refreshing the packages you installed with `rime install`. |
| `--skip-flatpak` | Skip updating Flatpak applications. |
| `--force` | Update even though the last update left this machine with a regression. It also takes a release a staged rollout is holding back. It does **not** skip the signature check. |
| `--allow-unverified` | Deploy once even though the image's signature does not verify. It prints the full refusal first. |
| `--fsync` | Keep ostree's per-object fsync on during the download. About half the speed (roughly 8 MiB/s against 14.6 MiB/s, measured), in exchange for durability if power fails mid-update. |

## After the update

Restart to use the new image:

```sh
sudo systemctl reboot
```

Until you restart, the running system is unchanged. `/etc`, `/var` and your
home directory carry over into the new image as they are.

To see what you are running:

```sh
rime changelog
```

It prints `bootc status`, then the image reference your machine follows and that
image's labels, such as the source revision and the Rime Shell revision it was
built from. The labels are read from the registry, so they describe what the tag
points to now; after a newer build that is not the image you booted. It prints
no written changelog; the release notes are on [/updates](/updates). If
`bootc status` cannot run, for example without root, it prints
`rpm-ostree status` instead.

## The signature check

`rime update` refuses to deploy an image whose signature does not verify. What
it checks, and what it leaves out, is on [Verify what you run](/docs/verify).
The defaults are:

```text
signature=enforce
provenance=warn
```

`provenance` is the signed SBOM attestation. To change either on your machine,
write only the keys you want to `/etc/rime/trust.conf`; it wins per key over the
image's defaults. Each key takes `enforce`, `warn` or `off`:

| | `enforce` | `warn` | `off` |
|---|---|---|---|
| verified | deploy | deploy | deploy |
| fails to verify | refuse | refuse | warn, deploy |
| none published | refuse | warn, deploy | warn, deploy |
| could not be checked | refuse | warn, deploy | warn, deploy |

Things worth knowing:

- **Offline, under `enforce`, the update is refused.** Nothing can be verified
  without the registry.
- **"Does not verify" and "could not be checked" are different messages.** The
  first says the image is not what it claims to be. The second says your
  machine could not find out, for example because the registry was unreachable.
- **`--allow-unverified` and `--force` are separate.** Getting past the
  regression stop never turns off the signature check.
- **Running `bootc upgrade` yourself skips the check.** Only `rime update`
  applies it. The containers policy that bootc reads accepts any image.

## The regression stop

If the machine came back from its last update with a problem the image could
have caused, the next `rime update` refuses:

```text
rime: this machine came back from its last update with a problem, so the next
      one is being held.
  gpu-driver: no driver is bound to the discrete GPU
  systemd unit failed: rime-shell.service

Go back with `sudo rime rollback`, then reboot.
Take it anyway with `sudo rime update --force`.
```

Four things count: the GPU driver, Rime Shell, the filesystem and the package
extension. Network problems do not count, because an update did not cause them
and refusing the next one would strand you on the release that broke you. The
check runs on your machine only, and nothing is reported anywhere.

## Moving from `apex-os` to `rime-os`

Every build is published under both `ghcr.io/andrenijman/rime-os` and the old
name, `ghcr.io/andrenijman/apex-os`, with the same digest, the same tags and a
signature under each name. A machine that follows a tag of the old name checks
whether the new name serves the same tag. If it does, the update verifies it and
runs `bootc switch` to it. If the switch fails, the update checks the old name
and upgrades under it instead.

The tag name stays the same: a machine on `apex-os:apex` moves to
`rime-os:apex`. Every tag in use today points at the same image. A machine
pinned to a digest, or following a fork's image, never moves.

## How much it downloads

The image is built in four layers (kernel, core, base, image), so an ordinary
release moves only the thin top layers. A release that rebuilds the kernel or
core layer is a larger download for every machine.
