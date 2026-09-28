---
title: "Keyboard shortcuts"
description: "Rime Shell's default shortcuts, what differs between the three desktops, and where to change them."
section: "Reference"
order: 30
sources:
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/config_tab/KeybindService.qml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/desktop/hypr/rime/keybindings.lua"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/desktop/labwc/rc.xml"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-shell-firstrun"
verified: "rime-os@2d9c5438a"
---

## Changing them

Every shortcut below is a default. Change any of them in Settings (SUPER+C),
under **Input, Keybinds**. Rime Shell writes your choices for all three desktops
at once:

- **Rime Tiling:** a generated Hyprland module, applied at once.
- **Rime Scrolling:** a generated file that `~/.config/niri/config.kdl` includes
  at its end, so it wins over niri's own bindings for the same key. niri reloads
  it by itself.
- **Rime Floating:** a marked block inside `~/.config/labwc/rc.xml`, rewritten on
  every save, after which labwc reloads.

Recording a new shortcut by pressing it works only on Rime Tiling. SUPER is the
key with the Windows or Command logo.

## Dashboard and settings

| Shortcut | Opens |
|---|---|
| SUPER+D | Dashboard: Home |
| ALT+SPACE | Dashboard: Apps (Rime Search) |
| CTRL+SHIFT+ESCAPE | Dashboard: System |
| SUPER+Z | Dashboard: Tasks |
| SUPER+C | Settings |

## Panels

| Shortcut | Opens |
|---|---|
| SUPER+ESCAPE | Power menu |
| SUPER+N | Notifications |
| SUPER+SHIFT+W | Wallpaper |
| SUPER+V | Clipboard history |
| SUPER+SHIFT+M | Desktop menu (the one a right-click on the desktop opens) |
| SUPER+ALT+W | Network: Wi-Fi |
| SUPER+ALT+B | Network: Bluetooth |
| SUPER+ALT+G | Network: VPN |
| SUPER+ALT+H | Network: Hotspot |
| SUPER+A | Audio: Output |
| SUPER+ALT+I | Audio: Input |
| SUPER+M | Audio: Mixer |

## Quick actions

| Shortcut | Does |
|---|---|
| SUPER+B | Focus Mode |
| ALT+F9 | Screen recording |
| SUPER+ALT+V | Push to talk |
| SUPER+ALT+S | Screen reader on or off |
| PRINT | Screenshot of an area (the screen freezes while you pick) |
| SUPER+PRINT | Screenshot of the whole screen |
| SUPER+L | Lock the screen |

The screen reader shortcut runs a system command instead of going through the
shell, so it works even when Rime Shell has crashed or not started.

## Applications

| Shortcut | Does |
|---|---|
| SUPER+T | Terminal |
| SUPER+W | Web browser (your default browser) |
| SUPER+E | File manager |
| SUPER+Q | Close the focused window |

## Media keys for keyboards without them

Hardware media and brightness keys work as usual. These duplicate them:

| Shortcut | Does |
|---|---|
| CTRL+SUPER+SPACE | Play or pause |
| CTRL+SUPER+RIGHT | Next track |
| CTRL+SUPER+LEFT | Previous track |
| CTRL+SUPER+EQUAL | Volume up (repeats while held) |
| CTRL+SUPER+MINUS | Volume down (repeats while held) |
| CTRL+SUPER+0 | Mute |
| CTRL+SUPER+UP | Brightness up (repeats while held) |
| CTRL+SUPER+DOWN | Brightness down (repeats while held) |

## Windows and workspaces

These come from Rime Tiling (Hyprland). The other two desktops use the nearest
action they have, or none.

| Shortcut | Rime Tiling | Rime Scrolling | Rime Floating |
|---|---|---|---|
| SUPER+F | Fullscreen | Fullscreen | Fullscreen |
| SUPER+SHIFT+SPACE | Toggle floating | Toggle floating | Keep on top |
| SUPER+P | Pseudotile | nothing | nothing |
| SUPER+J | Toggle split | nothing | nothing |
| SUPER+arrow | Move focus | Focus the column left or right, the window up or down | Move the window to that edge |
| SUPER+SHIFT+arrow | Move the window | Move the column left or right, the window up or down | Snap the window to that edge |
| SUPER+1 to SUPER+0 | Go to workspace 1 to 10 | Go to workspace | Go to desktop |
| SUPER+SHIFT+1 to SUPER+SHIFT+0 | Move the window to workspace 1 to 10 | Move the window to workspace | Move the window to desktop |
| SUPER+S | Show or hide the scratchpad | no scratchpad | nothing |
| SUPER+SHIFT+S | Move the window to the scratchpad | no scratchpad | nothing |

## Only on Rime Tiling

These are part of the Hyprland configuration in the image, not the shell's
table:

| Shortcut | Does |
|---|---|
| SUPER + left mouse drag | Move a window |
| SUPER + right mouse drag | Resize a window |
| SUPER + scroll wheel | Next or previous workspace |
| ALT+TAB, ALT+SHIFT+TAB | Rime's window switcher: hold ALT, tap TAB, release ALT to switch |
| ALT+ESCAPE (while switching) | Cancel the switch |

On Rime Scrolling and Rime Floating, ALT+TAB is the compositor's own switcher.

## In Rime Safe Graphics

The recovery session has its own three: SUPER+RETURN opens a terminal, SUPER+Q
closes a window and ALT+TAB switches. Everything else is on the right-click
menu.

## Inside the Dashboard

- ESCAPE closes the Dashboard and most panels. In Rime Search it first closes a
  preview, then clears the text, then closes the Dashboard.
- In Rime Search, RETURN opens a preview for anything that changes the system,
  and CTRL+RETURN runs it.
- On the Tasks board, CTRL+LEFT and CTRL+RIGHT move a card between columns, and
  DELETE removes it.
- Tab bars are one Tab stop: the arrow keys move along them, HOME and END jump
  to the ends.

## On a machine installed from the v2.1.0 ISO

This page describes current Rime images. A machine installed from the v2.1.0
ISO runs an older APEX-OS image, with the `apex` command, until its first
update. See [Install Rime](/docs/install).
