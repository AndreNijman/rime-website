---
title: "Rollback"
description: "Go back to the previous image, keep a known-good one, and know what a rollback does not undo."
section: "Use"
order: 20
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/rollback.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/recovery.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/update-channels.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/ops.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/boot-v2.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-migrate-from-apex"
verified: "rime-os@2d9c5438a"
---

## Go back to the previous image

```sh
sudo rime rollback
sudo systemctl reboot
```

`rime rollback` runs `bootc rollback`. It swaps the default image and the
previous one, so the previous image starts at the next boot. Nothing changes
until you restart.

You can also pick the previous image from the boot menu as the machine starts,
which is the way back when the new image does not reach a desktop.

The graphics driver is part of the image, so rolling back the image also rolls
back the driver.

On a machine that has not taken its first update since the rename, the command
is `sudo apex rollback`.

## Keep a known-good image

bootc keeps two images: the one you booted and one more. Two bad updates in a
row can therefore push out the last image that worked. Before anything risky,
pin the one you are running:

```sh
sudo rime pin
```

That runs `ostree admin pin 0`, which keeps the booted image from being
removed. A pinned image stays until you unpin it with `ostree admin pin
--unpin` and its index, as `ostree admin status` lists it.

## What a rollback puts back, and what it leaves

A rollback replaces `/usr`: the OS, the kernel and its modules, the graphics
drivers, Rime Shell, the login screen and the boot splash.

It leaves these as the newer image left them:

| Kept as it is | What that means |
|---|---|
| `/etc` | System settings, accounts, network connections, `/etc/rime/trust.conf`. |
| `/var`, including home directories | Your files and every setting in your home directory. |
| Packages from `rime install` | They live in a system extension with its own rollback, `sudo rime pkg rollback`. |
| Flatpak applications | Managed by Flatpak, not by the image. |
| AppImages installed with `rime install` | Pinned to the file you installed. |

Settings written by a newer Rime can meet an older Rime after a rollback. To see
which stores on your machine that applies to, and whether the older image can
still read each one:

```sh
rime schema status
```

It reads files only, so it is safe to run while you decide. `rime schema
migrate` runs machine-written stores forward to the current schema; it is a dry
run unless you add `--commit`, and it copies each file it changes first.

## Two bad updates in a row

Rime already guards against the second one. When a machine comes back from an
update with a problem the image could have caused (the GPU driver, Rime Shell,
the filesystem or the package extension), the next `sudo rime update` refuses
and points you at `sudo rime rollback`. `--force` overrides it. See
[Updating](/docs/updating).

With a pinned image as well, the image that worked stays on disk whatever
happens next.

## No automatic rollback yet

Machines installed from the published ISO boot GRUB. The automatic rollback
Rime has designed counts failed boots through systemd-boot, and on a GRUB
machine it is inactive. If an update leaves you with a machine that does not
boot, pick the previous image in the boot menu.

An update can move a machine to systemd-boot in place when its safety precheck
passes (it refuses with Secure Boot on, among other cases). To see which boot
path your machine uses and whether a boot counter is in effect:

```sh
rime boot status
```

## Rolling back across the rename

The first boot of a Rime image moves state from the old APEX paths (for example
`/etc/apex` and `/var/lib/apex`) to the new Rime ones, and leaves a link at each
old path. An APEX image you roll back to still finds its data through those
links.
