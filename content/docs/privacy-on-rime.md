---
title: "Privacy on Rime"
description: "Every network contact a stock Rime install makes without being asked, how to turn each off, and what stays on the machine."
section: "Reference"
order: 40
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/units/rime-remoted.service"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/remote.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/relay/wrangler.jsonc"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/NetworkManager/21-rime-connectivity.conf"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/units/10-rime-countme-nonfatal.conf"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/units/rime-flatpak-preinstall.service"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/update-channels.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/qualify.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/Containerfile.core"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/UpdateService.qml"
  - "https://github.com/AndreNijman/rime-shell/blob/6289d1f8/src/services/config_tab/pages/MiscPage.qml"
verified: "rime-os@2d9c5438a"
---

## The short version

Rime runs no telemetry service. It collects no usage data, sends no crash
reports and never updates the OS on its own. It does run one service, the relay for Rime
Remote, and a stock install connects to it. A few other contacts are on by
default, most of them inherited from Fedora. Each is listed below with how to
turn it off.

## Contacts made without you asking

| What | Who receives it | When | Turn it off |
|---|---|---|---|
| Rime Remote relay | Rime's relay on Cloudflare | always, per account | `systemctl --user disable --now rime-remoted.service` |
| Connectivity check | Fedora | every 5 minutes while online | a NetworkManager setting |
| Count Me | Fedora's mirrors | weekly | mask Fedora's timer |
| Flathub setup and Zen Browser | Flathub | once, at first boot | runs once |
| Rime Shell's update check | Cloudflare DNS (a ping) | 30 seconds after each login | a Settings switch |

Clock synchronisation follows Fedora's default. Rime adds no configuration for
it.

### Rime Remote relay

Rime Remote lets a paired phone reach this machine. Its service,
`rime-remoted`, is on for every person's account, and it keeps one outbound
WebSocket open to Rime's relay at `wss://apex-relay.andrenijman.com`, even when
no phone is paired. It reconnects if the connection drops.

- The relay carries encrypted traffic it cannot read. It sees both ends'
  addresses, when a session runs and how much data moves. It stores nothing.
- The relay runs on Cloudflare Workers with Cloudflare's request logging on.
  The relay's configuration does not say what Cloudflare keeps, or for how
  long.
- While it runs, the service also announces itself on your local network over
  mDNS (`_rime-remote._tcp`).
- It opens no inbound port. LAN access needs `sudo rime firewall allow
  rime-remote`.
- The Android app asks GitHub's API for Rime Remote's releases each time it
  starts, to offer an update. Apart from that and a UnifiedPush distributor if
  you install one, the phone contacts only your paired computers and the relay.

The phone app has not been released, so nobody can pair a phone yet without
building the app themselves.

To turn it off for your account:

```sh
systemctl --user disable --now rime-remoted.service
```

To keep it but stay on your local network only, drop the relay:

```sh
systemctl --user edit rime-remoted
```

and add:

```ini
[Service]
ExecStart=
ExecStart=/usr/bin/rime-remoted
```

Rime Remote also starts Rime's agent runtime. If you turn Rime Remote off and
still want agent sessions, or want [Closing the lid](/docs/lid) to keep working,
run `rime agent enable`.

### NetworkManager's connectivity check

Every 300 seconds while a connection is up, NetworkManager fetches
`http://fedoraproject.org/static/hotspot.txt` over plain HTTP. This is how the
desktop can tell a hotel or campus sign-in page from a working connection.

To turn it off, create a file in `/etc/NetworkManager/conf.d/` with a higher
number than `21-rime-connectivity.conf`, for example
`/etc/NetworkManager/conf.d/99-no-connectivity-check.conf`:

```ini
[connectivity]
enabled=false
```

It applies once NetworkManager restarts; a reboot does it. Captive portals then
show as a connection that does not load.

### Fedora Count Me

rpm-ostree's Count Me sends Fedora's mirrors a weekly anonymous ping so Fedora
can count installations. Rime leaves it on and only stops a failed ping from
marking the system as degraded. To turn it off, mask Fedora's timer:

```sh
sudo systemctl mask rpm-ostree-countme.timer
```

### First boot: Flathub and Zen Browser

Once the machine is online after the first boot, it adds the Flathub remote and
installs Zen Browser from it, in the background. Each runs once. Firefox stays
the default browser.

### Rime Shell's own update check

Thirty seconds after Rime Shell starts, it pings `1.1.1.1` (Cloudflare's DNS
service) once to see whether the network is up, then tries to fetch updates for
itself from its source repository. On an installed system that fetch cannot
succeed, because the image carries no repository for it: the shell updates only
with the OS image. The ping still goes out.

Turn it off in Settings, **Misc, Updates, Automatic updates**. This switch
affects only the shell's check. OS updates are separate and never automatic.

## Contacts only when you ask

- **`rime update`** downloads the image from GitHub's container registry
  (`ghcr.io`), checks packages and Flatpaks, and asks fwupd for firmware.
- **`rime install`** and **`rime search`** reach Fedora, RPM Fusion, any COPR you
  enabled, and Flathub.
- **Rime Search answers** (queries starting with `?`) go to Wolfram|Alpha only
  when local arithmetic cannot answer and you have supplied your own Wolfram|Alpha
  AppID.
- **The VPN tab** checks your public address at `api.ipify.org` when you connect
  a sing-box VPN.
- **`rime ai pull`** downloads models from Hugging Face.
- **Online accounts** you connect are contacted when you use them.
- **Rime Remote push notifications** go out only after a paired phone has
  registered a push endpoint. The message is a sealed envelope with no machine
  or project details in it.
- **The Claude and ChatGPT desktop apps** talk to their vendors when you use
  them. Neither updates itself on Rime.
- **Firefox** keeps Mozilla's defaults. Rime's policy sets only dark mode and
  the home page.

The OS image never updates on its own: the automatic update timer inherited
from Fedora is masked. Rime does not change Fedora's default for fwupd's
metadata refresh timer.

## What stays on the machine

- **Health reports.** `rime channel report` prints the five fields a report
  would contain and says nothing was sent. This build contains no code that
  sends it, and Rime runs no server to receive it. See
  [Update channels](/docs/channels).
- **The rollout slot** is derived from `/etc/machine-id` and never sent.
- **Metrics.** `rimed` serves its measurements on `127.0.0.1:9723`, reachable
  from this machine only.
- **Crash dumps** stay local, capped at 256 MB. There is no crash uploader.
- **`rime qualify`**, the hardware compatibility record, keeps nothing until you
  run `rime qualify consent grant`. Then it keeps results in
  `~/.local/state/rime/qualification.json`. `rime qualify consent decline`
  deletes them. `rime qualify export` writes a file where you choose, and
  nothing uploads it.
- **Agent handoff packets** stay on the machine.

## On a machine installed from the v2.1.0 ISO

This page describes current Rime images. A machine installed from the v2.1.0
ISO runs an older APEX-OS image, with the `apex` command, until its first
update. See [Install Rime](/docs/install).
