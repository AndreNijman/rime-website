---
title: "Closing the lid"
description: "A laptop with agent sessions running keeps working, VPN included, when you close the lid. One with nothing running suspends as before."
section: "Use"
order: 60
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/lid.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/lid.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rimed-core/src/lid.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/units/rime-lid.service"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/agent-runtime.md"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/lid.js"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/home/QuickSettings.qml"
verified: "rime-os@2d9c5438a"
---

## What happens when you close the lid

If agent sessions are running, the laptop keeps working with the lid shut: the
screen goes off, the work carries on, and a VPN stays connected. If nothing is
running, the laptop suspends, as it always did. You do not switch between the
two; Rime measures which case applies each time.

Three things still put the machine to sleep with the lid shut, and each says
that it fired: it got too hot, the battery reached its floor, or you told it to.
Before a heat or battery suspend, Rime checkpoints the running sessions.

## What counts as live work

An **agent session** in Rime's agent runtime: a coding agent such as `claude`
or `codex` started through `rime agent` (or its shortcut, `a`). One or more
sessions keeps the machine awake. Zero sessions means it suspends.

A program in an ordinary terminal is not counted. To keep the machine awake
whatever is running, pin it on (see below).

If Rime cannot ask the agent runtime (it is not running, or the query fails),
the machine suspends, because a laptop that stays awake on an unanswered
question overheats in a bag. `rime lid status` says why. The agent runtime runs
by default because Rime Remote starts it; if you turned Rime Remote off for your
account, run `rime agent enable` to keep the runtime.

## The commands

```sh
rime lid              # the same as rime lid status
rime lid status       # what the policy sees, and what it would do now
rime lid explain      # the same decision, with every input that produced it
rime lid plan         # what would be powered down on a close. Applies nothing
rime lid report       # what the last closed period did
rime lid pin          # print the current setting
rime lid pin on       # keep working on every close, whatever is running
rime lid pin off      # always suspend on a close
rime lid pin auto     # let the measurement decide again (the default)
```

None of them needs root. `status`, `explain`, `plan` and `report` take `--json`.
The pin is saved in `~/.config/rime/lid.toml`.

### In Rime Shell

- **Quick Settings**, on the Dashboard's Home page, has a **Lid stays awake**
  tile. Tapping it switches between *on* and *auto*. The tile is lit when you
  have pinned it on; the line under it says what the machine is doing.
- Settings, **System, Closing the Lid** shows the same decision, the last
  closed period, and the *off* setting, which the tile cannot select.

**Caffeine** is a different thing. It keeps the screen from dimming, blanking
and locking while you work, and does nothing about the lid.

## The guards

The decision is not taken once. With the lid shut, Rime re-checks every 30
seconds by default:

| Guard | Fires when |
|---|---|
| `thermal` | the hottest sensor comes within 15 °C of its own firmware critical temperature (or reaches 95 °C, for a sensor with no critical temperature) |
| `thermal-unreadable` | a sensor is present and will not report |
| `thermal-no-sensor` | the machine reports no temperature at all |
| `battery` | the charge reaches 20 % |
| `battery-unreadable` | the battery is present and will not say how full it is |

Every guard checkpoints the live sessions, then suspends. The floor is 20 %
rather than lower so that there is enough charge left to resume and finish.

## What turns off, and what stays on

With the lid shut and work running, Rime turns off:

- the panel;
- the keyboard backlight, restored to its previous level when you open the lid;
- Bluetooth, and only if it was on (restored when you open the lid);
- maintenance timers that would otherwise wake the machine: update and cache
  refresh timers, `raid-check` and `updatedb`.

It never touches the shell or the agent runtime. `rime lid plan` lists what it
would do on your machine, and what it cannot do and why.

### The VPN

There is no special VPN handling. The tunnel stays up because the machine does
not suspend, so the network never gets the signal to go to sleep. Wi-Fi power
saving can still drop a long-lived tunnel, so Rime turns Wi-Fi power saving
**off** for the closed period. That costs battery, and it is on by default.

## After you open the lid

```sh
rime lid report
```

It says how long the machine stayed up and why, which guard ended the period if
one did, the peak temperature, what was powered down, what could not be done,
and a VPN timeline sampled across the period. The same summary goes to the
journal:

```sh
journalctl -t rime-lid
```

## Settings

Your settings are in `~/.config/rime/lid.toml`; the machine's are in
`/etc/rime/lid.toml`. Yours win where both exist, and `rime lid status` names
the file it used.

```toml
enabled            = true      # false: stock behaviour, the feature does nothing
pin                = "auto"    # "auto", "on" or "off"
battery_floor_pct  = 20
thermal_headroom_c = 15.0      # degrees below the firmware's critical temperature
thermal_ceiling_c  = 95.0      # only for a sensor with no critical temperature
require_thermal    = true      # a machine with no sensor may not stay awake
poll_secs          = 30

[powerdown]
display             = true
keyboard_backlight  = true
bluetooth           = true
wifi_powersave_off  = true     # costs power; keeps the VPN steadier
```

The driver is `rime-lid.service`, enabled in the image. To see what it would
decide without letting it act:

```sh
rime lid watch --once --dry-run
```

## How it works

Rime holds a logind lid-switch inhibitor while there is live work, and drops
it as soon as there is none. It never changes `HandleLidSwitch=`. If the
service crashes, the inhibitor goes with it, and the laptop suspends on a lid
close like a stock install. To see who holds an inhibitor:

```sh
systemd-inhibit --list
```

## Limits

- **Docked.** With an external display connected, logind applies its docked
  rule (by default, ignore the lid) before any of this. The tile says
  *docked* when that is the case. The heat and battery guards still suspend.
- **Not measured yet: the saving.** Nobody has measured how much less power the
  machine draws with the lid shut and work running than with it open. The
  report records the charge at close and the last charge seen, but the open-lid
  baseline has not been taken.
- A desktop has no lid; the service says so and does nothing.

## On a machine installed from the v2.1.0 ISO

This page describes current Rime images. A machine installed from the v2.1.0
ISO runs an older APEX-OS image, with the `apex` command, until its first
update. See [Install Rime](/docs/install).
