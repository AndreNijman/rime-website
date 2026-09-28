---
title: "Recovery"
description: "What to do when an update misbehaves or the desktop will not start: rime recover, Rime Safe Graphics, rollback and the rescue target."
section: "Troubleshooting"
order: 10
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/recovery.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/recover.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/rollback.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.base"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/nexus/PageRegistry.qml"
verified: "rime-os@2d9c5438a"
---

## When an update misbehaves

Most problems after an update are fixed by going back to the image that worked.
The graphics driver is part of the image, so this also rolls back a driver.

```sh
sudo rime rollback
sudo systemctl reboot
```

If the machine does not reach a desktop, pick the previous image from the boot
menu instead. Before your next update, pin the image that works:

```sh
sudo rime pin
```

Your next `sudo rime update` refuses to run while the machine is in a state the
last update could have caused, and tells you so. `--force` overrides that. It
never turns off the signature check; that takes `--allow-unverified`.

Rollback puts back `/usr` and leaves `/etc`, `/var` and your home directory as
they are. See [Rollback](/docs/rollback) for what that means.

On a machine that has not taken its first update since the rename, these
commands are `apex …` rather than `rime …`.

## Find out what is wrong

```sh
rime recover status
```

It reports eight components, each with a state and the command that addresses
it: the current image, the previous image, Secure Boot, the filesystem, the GPU
driver, Rime Shell, the network and your package extension.

| State | Means |
|---|---|
| `verified` | present and checked against something |
| `available` | present and usable, but nothing verified it (a previous image exists; nobody has proved it boots) |
| `attention` | present and wrong in a way a named action fixes |
| `unavailable` | could not be determined, or does not exist on this hardware. Never a synonym for "fine" |

It reads files only. It starts no program, contacts nothing and needs no root,
and it exits non-zero when something needs attention. `--json` prints the same
rows for a program.

The same report is in Settings, under **System, Recovery**, along with the
checks from `rime doctor`.

```sh
rime doctor
```

`rime doctor` diagnoses the **power stack** (the `rimed` daemon and the power
controls it drives), not the whole system. A WARN line is information, not a
fault: a laptop with no firmware power profile is not broken.

## Repair

```sh
rime recover repair            # dry run: what it would do
rime recover repair --commit   # re-seed your desktop files
sudo rime recover repair --commit   # rebuild the package extension
```

Repair runs only steps that are safe to repeat and remove nothing, and only
steps the status report asks for. Run as you, it re-seeds your desktop setup.
Run with `sudo`, it rebuilds the package extension. It never rolls back and
never resets.

For broken packages you added yourself, `sudo rime pkg rollback` restores the
previous extension.

## Reset your desktop settings

```sh
rime recover reset --scope desktop   # dry run: prints exactly what would go
rime recover reset --scope user      # a wider dry run
```

A reset is always a dry run first. It prints every path it would remove and
every path it keeps, then the one command that performs it, with a token tied to
that exact plan:

```text
To perform it, run exactly:
  rime recover reset --scope user --commit --confirm user:9:3f2a1c9b
```

If anything on the machine changes between the plan and the commit, the token
no longer matches and nothing is touched.

| | `--scope desktop` | `--scope user` |
|---|---|---|
| Rime Shell settings, keybinds and caches | removed | removed |
| Generated Hyprland input, monitor and keybind files | emptied, not removed | emptied, not removed |
| Your blueprint (`~/.config/rime/blueprint.toml`) | kept | removed |
| Per-game profiles, trusted devices, local-model settings | kept | removed |
| `~/.local/state/rime` (applied blueprint, recorded agent sessions) | kept | removed |

Both scopes keep your documents, projects, credentials, `~/.ssh`, `~/.gnupg`,
browser profiles, your Hyprland, niri and labwc configuration, capsules,
installed packages, Flatpaks, downloaded models and the images on disk.
Everything removed, except caches, is copied first to
`~/rime-reset-backup-<timestamp>`.

Run it as yourself. It refuses to run as root, because root's home is not yours.
A full factory reset (accounts removed, `/etc` restored, disks repartitioned) is
a reinstall. No command on a running system does it.

## When the desktop will not start: Rime Safe Graphics

Rime Safe Graphics is a minimal desktop that renders on the CPU, for when the
graphics driver, the compositor configuration or Rime Shell is broken. It is a
labwc session with its own read-only configuration, so nothing in your
`~/.config` can break it. It does not start Rime Shell. It opens one terminal.

**From the login screen.** Pick **Rime Safe Graphics** in the session list.

**The login screen offers it for you.** If your session dies within 45 seconds
three times in a row, the login screen preselects Rime Safe Graphics and puts a
line above the password box saying your desktop did not start. It only preselects:
choose your usual desktop and the machine stops suggesting it. Rime never
remembers Safe Graphics as your default. A normal session that lasts 45 seconds
clears the count; a reboot does not. To clear it by hand:

```sh
sudo /usr/libexec/rime-session-watchdog reset
/usr/libexec/rime-session-watchdog status   # what it believes now
```

The count catches a session that exits. It does not catch a desktop that stays
up while painting nothing, or a shell that crashes in a loop inside a running
compositor. For those, use a text console.

**From a text console.** Press Ctrl+Alt+F2, log in, and run:

```sh
/usr/libexec/rime-safe-graphics
```

To check it would start without starting it:

```sh
/usr/libexec/rime-safe-graphics check
```

### Inside Safe Graphics

Right-click anywhere for the recovery menu:

- **What is wrong**: `rime recover status`
- **Full health report**: `rime doctor`
- **Collect diagnostics**: writes `rime-diagnostics-<date>.tar.gz` to your home
  directory, with the boot journal at warning level and above, your session
  journal, the status and doctor reports as JSON, `lspci -k` and the loaded
  modules. From a terminal, the same is
  `/usr/libexec/rime-safe-graphics diagnose`.
- **Roll back to the previous deployment**: `sudo rime rollback`
- **Files** (Thunar) and **Network** (`nmtui`)
- **Log out**

Super+Return opens a terminal, Super+Q closes a window and Alt+Tab switches.

## The rescue target

Rime ships no recovery boot entry. On a machine that boots GRUB (every install
from the published ISO), you can start the systemd rescue target for one boot.

It asks for the root password. The installer creates only your account and
sets no root password, so give root one while the machine still works
(`sudo passwd root`); otherwise the rescue target will not open a shell.

1. At the GRUB menu, press `e` on the entry you want.
2. Add `systemd.unit=rescue.target` to the end of the line that starts with
   `linux`.
3. Press Ctrl+X to boot it.

The change lasts for that one boot. For a permanent menu entry, add one
to `/etc/grub.d/40_custom` and regenerate the GRUB configuration yourself; back
up `/boot/grub2/grub.cfg` first. Rime does not do this for you.

On a machine that boots systemd-boot with a signed unified kernel image, the
kernel command line cannot be edited at boot, so this route does not exist.
`rime recover status` lists which ways back in exist on your machine.
