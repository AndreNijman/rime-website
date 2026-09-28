---
title: "Gaming"
description: "Install Steam and Gaming Mode, check the machine is ready, use rime game and rime mode, set per-game profiles, and run games on the discrete GPU."
section: "Use"
order: 50
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.rime"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.core"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/gaming-and-sessions.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/modes-and-workloads.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/gaming.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-gaming-session"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/scripts/desktop-launch.sh"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/PowerMenu.qml"
verified: "rime-os@2d9c5438a"
---

## What ships, and what you install

The image already carries the parts that must be signed to load under Secure
Boot: the NVIDIA driver (580 series), `xone` for Xbox One and Series
controllers, and `xpadneo` for Xbox controllers over Bluetooth. CI builds them
against Rime's kernel and signs them with the same key as the kernel, so the key
you enrolled at install covers them.

The gaming programs install when you want them:

```sh
sudo rime install steam gamescope mangohud gamemode
```

They go into Rime's system extension, like any other package, and keep updating
with `sudo rime update`. See [Installing software](/docs/packages). Sunshine is
not in any enabled repository; it needs a COPR or a downloaded `.rpm`.

## Is this machine ready?

```sh
rime gaming
rime gaming --json
```

It reports whether Gaming Mode can start and whether it is set up: the login
screen's Gaming Mode entry, the gamescope session, which screen and GPU Gaming
Mode will use, and any connected controllers. It changes nothing and exits
non-zero when Gaming Mode would not start. Settings, **System, Gaming** covers
Gaming Mode, what it needs and the performance policy.

## Rime Gaming Mode

Gaming Mode is Steam's Big Picture interface running inside gamescope, drawing
straight to the display with no desktop compositor in between. The login screen
offers **Rime Gaming Mode** once gamescope is installed.

- **To enter it**, pick it at the login screen, or open the power menu (the Rime
  mark at the top left) and choose **Gaming**, then **Enter Gaming Mode**. That
  logs you out and brings back the login screen with Gaming Mode selected.
- **To leave it**, quit Steam. The session ends and the login screen returns.
- There is no automatic login, so each switch asks for your password once.

**Which screen.** Gaming Mode runs on the GPU that drives the connected monitor,
and prefers an external monitor over the built-in panel. On a laptop whose
external port is wired to the discrete GPU, that puts the game on the discrete
GPU and on the monitor. `rime gaming` names the screen it will use.

**The MangoHud overlay is off in Gaming Mode.** gamescope's overlay option and
its native Wayland option cannot both be on, and Rime keeps native Wayland
games working.

On entry, Gaming Mode also switches on game mode, below, and releases it when
the session ends.

## `rime game`: the hardware settings

```sh
rime game start               # enter game mode
rime game start --pid 12345   # and move a process (and its children) onto the game cores
rime game attach 12345        # add another process to a running session
rime game status
rime game stop                # restore everything game mode changed
```

Game mode moves the game onto the performance cores, steers interrupts away
from them, locks GPU clocks, selects the highest power tier and requests a
sched-ext scheduler (below).

## `rime mode`: named modes

A mode is a named combination of the power tier, the AC/battery auto-switch and
game mode. It needs no root and stores no state: the current mode is worked out
from what the machine is doing.

```sh
rime mode list
rime mode show gaming          # what it changes, what it only reports, and why
rime mode status
rime mode set gaming
rime mode set gaming --dry-run
rime mode set --auto           # apply what rime workload measured
rime mode set daily            # back to normal
```

| Mode | Power tier | Game mode |
|---|---|---|
| `daily` | automatic | off |
| `gaming` | performance | on |
| `development` | performance | off |
| `creator` | performance | off |
| `ai` | balanced | off |
| `battery` | power-saver | off |
| `couch` | balanced | off |
| `server` | performance | off |

`gaming` is the only mode that turns game mode on. Nothing switches modes by
itself; `rime mode set --auto` applies a suggestion once, when you run it.

Two read-only companions:

```sh
rime workload   # what the machine is measured to be doing, and which mode that suggests
rime perf       # CPU and GPU clocks, power, temperatures, VRAM, scheduler
```

`rime perf` reports frame time as unavailable and says why, rather than printing
a number it did not measure.

## Per-game profiles

A profile stores a mode, a power tier and a fan mode for one game, keyed by its
Steam AppID, in `~/.config/rime/games.toml`.

```sh
rime game profile set 1091500 --title "My game" --mode gaming --fan max
rime game profile list
rime game profile show 1091500      # and the steps applying it would run
rime game profile apply 1091500
rime game profile launch-command 1091500
rime game profile remove 1091500
rime game profile path
```

`set` takes `--title`, `--mode`, `--tier` (`performance`, `balanced`,
`power-saver`), `--fan` (`auto`, `max`, `curve`, `manual`, `manual:<0-255>`) and
`--note`. Only the options you give change.

Profiles do not apply themselves when a game starts. `launch-command` prints a
line for the game's **Launch Options** in Steam:

```text
rime game profile apply 1091500 && %command%
```

That applies the profile, then starts the game. Nothing is restored when the
game exits: run `rime mode set daily` or `rime game stop` afterwards.

## Laptops with two GPUs

Applications that ask for the discrete GPU in their launcher entry
(`PrefersNonDefaultGPU=true`; Steam does) are started by Rime Shell's launcher
through `switcherooctl launch`, so they and the games Steam starts run on the
discrete GPU. `switcheroo-control` is installed and enabled.

## Controllers

- **Wired Xbox One and Series controllers** work as shipped, through `xone`.
- **The Xbox wireless dongle** also uses `xone`, but it needs a firmware file
  from a Microsoft driver package that Rime cannot redistribute, so the image
  does not include it. Run xone's `xone-get-firmware.sh` once to fetch it (get
  the script from the xone project if it is not on your machine).
- **Xbox controllers over Bluetooth** use `xpadneo`, for rumble, battery level
  and correct stick mapping.

## The scheduler and the kernel

Rime builds its own kernel from CachyOS's sources, with the BORE scheduler and
sched-ext support. Game mode asks for `scx_lavd`, a sched-ext scheduler; no
sched-ext scheduler loads at boot, only during game mode.

The `scx_lavd` 1.1.3 in the upstream packages can stall a game thread until the
kernel's watchdog removes the scheduler. Rime builds 1.1.3 with the upstream fix
and installs it in place of the packaged one while the packages are still at
1.1.3. `/usr/lib/rime-scx-versions` records which build shipped.

Two known limits remain: after a watchdog stop, the scheduler loader restarts
`scx_lavd`, and Rime checks that the scheduler loaded only once, when game mode
starts.

gamescope's realtime priority option needs a capability that no Rime machine
grants today, so Gaming Mode does not pass it. `rime gaming` shows this as its
own row.

## On a machine installed from the v2.1.0 ISO

This page describes current Rime images. A machine installed from the v2.1.0
ISO runs an older APEX-OS image, with the `apex` command, until its first
update. See [Install Rime](/docs/install).
