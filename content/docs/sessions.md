---
title: "Desktop sessions"
description: "Rime Tiling, Rime Scrolling, Rime Floating, Rime Gaming Mode and Rime Safe Graphics: what each is, how to pick one, and what differs."
section: "Use"
order: 40
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.base"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/desktop/rime-greet/GreetContext.qml"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/desktop/wayland-sessions/rime-gaming.desktop"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/gaming-and-sessions.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/recovery.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/desktop/labwc/rc.xml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/README.md"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/compositor/CompositorService.qml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/config_tab/KeybindService.qml"
verified: "rime-os@2d9c5438a"
---

## The five sessions

| Session | What it is | Runs Rime Shell |
|---|---|---|
| **Rime Tiling** | Hyprland, a tiling compositor. The default. | yes |
| **Rime Scrolling** | niri, which lays windows out in columns on a strip you scroll through. | yes |
| **Rime Floating** | labwc, a stacking compositor with title bars, like a traditional desktop. | yes |
| **Rime Gaming Mode** | Steam Big Picture inside gamescope, with no desktop underneath. Appears after you install gamescope. | no |
| **Rime Safe Graphics** | A minimal recovery desktop that renders on the CPU. | no |

All five ship in the image except Gaming Mode's packages, which you install
yourself. See [Gaming](/docs/gaming).

## Picking one at the login screen

The login screen has a session picker. It chooses, in this order:

1. the session you pick in the picker;
2. **Rime Safe Graphics**, if your session died within 45 seconds three times in
   a row (a suggestion only; see [Recovery](/docs/recovery));
3. the last session you used, if it is still installed;
4. **Rime Tiling**.

Moving between sessions always goes through the login screen, and there is no
automatic login, so each switch asks for your password once.

Rime Shell detects which of the three desktops it runs on. If detection goes
wrong, Settings, **Misc** lets you set it to Tiling, Scrolling or Floating.

## Rime Tiling (Hyprland)

The default, and the session Rime Shell supports most fully.

- Windows open, move and change workspace on springs; a closing window shrinks
  away over 200 ms. Hyprland's animations follow Rime Shell's motion speed and
  Reduce Motion setting.
- SUPER with the left mouse button drags a window; SUPER with the right button
  resizes it. SUPER with the scroll wheel changes workspace.
- Ten workspaces, plus a scratchpad (SUPER+S).
- The tiling layout (dwindle, master, monocle or scrolling) shows in the top bar
  and can be cycled.
- Window corners are kept in line with the rounded frame around the screen.
- **Filter** in Quick Settings applies a screen shader, such as high contrast,
  grayscale or sepia.
- Alt+Tab opens Rime's window switcher.
- Recording a new shortcut by pressing it works in Settings, **Keybinds**.
- Screenshots and recordings can pick a single window.

## Rime Scrolling (niri)

- Workspaces are created as you need them.
- Alt+Tab is niri's own window switcher.
- niri shows its "Important Hotkeys" overlay each time it starts. That is niri's
  default, and Rime leaves it on.
- niri's default configuration lives in `~/.config/niri/config.kdl`, with its
  own bindings. Rime appends an include of the shell's generated bindings at the
  end, so where both bind the same key, Rime Shell's binding wins.
- Border colour and gaps come from `config.kdl`, not from the shell.

Not available here: the scratchpad, the tiling layout indicator, the Filter
tile, recording a shortcut by pressing it, and window picking for screenshots.

## Rime Floating (labwc)

- Windows float and have title bars, so the top bar reserves its full height.
- The left of the top bar shows a dock of up to five pinned or running windows.
- Alt+Tab is labwc's own switcher, across every desktop.
- SUPER with an arrow key moves a window to that edge of the screen;
  SUPER+SHIFT with an arrow key snaps it to that edge. SUPER+SHIFT+SPACE keeps a
  window on top.
- The window border colour follows the wallpaper when the wallpaper changes.

Not available here: moving a window to another workspace from the shell, the
scratchpad, the tiling layout indicator, the Filter tile, recording a shortcut
by pressing it, and window picking for screenshots.

## What is the same everywhere

On all three desktops you get the top bar, the Dashboard, the notification and
network panels, the volume and brightness display in the notch, the lock screen,
the workspace indicator, idle inhibit (Caffeine), Night Light, screenshots and
screen recording. Shortcuts are edited in one place, Settings, **Keybinds**, and
written for all three. See [Keyboard shortcuts](/docs/shortcuts).

## Rime Gaming Mode

Steam's Big Picture interface runs inside gamescope, drawing straight to the
display with no desktop compositor in the way. The login screen offers it only
once gamescope is installed:

```sh
sudo rime install steam gamescope mangohud gamemode
```

Start it from the login screen, or from the power menu (the Rime mark at the
top left): **Gaming**, then **Enter Gaming Mode**. That logs you out and returns
to the login screen with Gaming Mode selected. When Steam quits, the session
ends and the login screen comes back. See [Gaming](/docs/gaming).

## Rime Safe Graphics

A labwc session with its own read-only configuration, software rendering and no
Rime Shell. It exists for when the graphics driver, the compositor
configuration or the shell is broken. Right-click for a recovery menu. See
[Recovery](/docs/recovery).

## On a machine installed from an APEX-OS ISO

This page describes current Rime images. A machine installed from an APEX-OS
ISO (v2.1.0 or older) runs an older APEX-OS image, with the `apex` command,
until its first update. See
[Installed from an APEX-OS ISO](/docs/install#installed-from-an-apex-os-iso).
