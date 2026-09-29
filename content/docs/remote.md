---
title: "Rime Remote"
description: "Your agent sessions on an Android phone: install the app, check it, pair it with a computer, and take a phone off again."
section: "Use"
order: 65
sources:
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/docs/remote.md"
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/docs/android-app.md"
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/android/signing-certificate.sha256"
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/rimed/rime/src/remote.rs"
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/files/system/units/rime-remoted.service"
  - "https://github.com/AndreNijman/rime-os/blob/df44d9394/relay/wrangler.jsonc"
verified: "rime-os@df44d9394"
---

## What it is

Rime Remote is an Android app for the agent sessions on your Rime computers. It
lists every session on each computer you pair, the ones that need you first.
You can watch a session's live terminal, reply when it is waiting (typed, spoken
through Android's own recogniser, or as a photo or file), and pause, resume,
interrupt or stop it. You can also start a new one in any project, with its own
worktree.

Everything runs on the computer. The phone only shows and sends.

It cannot approve anything that needs root. The phone shows what is waiting at
the machine, and can revoke permissions already given, but the approval itself
is always made at the computer, with your password. There is no setting that
changes this.

## Install it

You need Android 9 or later. Download the APK from
[Rime Remote's release](/download#remote) in a browser on the phone, and let
the browser install apps when Android asks.

Before you install it, you can check it came from Rime's build. On any machine
with the Android build tools:

```sh
sha256sum rime-remote-*.apk
apksigner verify --print-certs rime-remote-*.apk
```

The first line must match the SHA-256 on the download page. The certificate
digest `apksigner` prints must be

```
9b2418f3cd37ba2ae83cdaeec5068280e02dc64135fdb1bb9fcb247326a66c67
```

which is the fingerprint Rime publishes in
`android/signing-certificate.sha256`. Every Rime Remote release is signed with
that key, and Android refuses an update signed by any other, so this check
matters most for the first install.

### Updates

Each time it starts, the app asks GitHub for Rime Remote's releases. When a
newer one is out it says so, and **Update** downloads it, checks it against its
published SHA-256 and hands it to Android's installer.

## Pair it with a computer

1. On the computer, open **Settings › Devices › Pair a device**. It shows a
   code.
2. In the app, tap **Add a computer** and scan the code. If the camera can't,
   run `rime remote pair --text` on the computer and use **Paste a code
   instead** on the phone.

A code works once, for three minutes. Scanning it pins that computer's key on
the phone, and the phone makes a key of its own for that computer alone, kept in
Android's keystore behind your fingerprint or screen lock. You can pair several
computers.

The app keeps nothing else: no transcripts, no scrollback, no history, and it
is excluded from Android's backups.

## How it reaches the computer

On the same network, the phone connects to the computer directly, if you let
it in:

```sh
sudo rime firewall allow rime-remote
```

Otherwise, and away from home, it goes through Rime's relay. The connection is
end-to-end encrypted either way (Noise, X25519 and ChaCha20-Poly1305). The relay
is run by the Rime project. It carries encrypted bytes it cannot read, but it
does see both addresses, when you connect and how much data moves. The app
shows which path a connection took.

## Notifications

To be told when an agent is waiting for you, needs a permission decision,
finishes or fails, install a UnifiedPush distributor such as ntfy on the phone.
Rime Remote uses no Google services. Each notification carries a few encrypted
numbers; its text is written on the phone.

## Agents started from the phone

An agent you start from the phone runs on the computer and keeps going when you
put the phone away. By default it pauses while the computer's screen is locked.
To keep it running:

```sh
rime agent lock --remote continue
```

## Take a phone off

**Forget** in the app removes the computer from the phone, but the computer
still trusts that phone. To revoke it, on the computer:

```sh
rime remote devices
rime remote revoke <device>
```

Revoking takes effect at once.

## Turn Rime Remote off

Rime Remote's service, `rime-remoted`, runs in every account and keeps one
connection open to the relay. To turn it off for your account:

```sh
systemctl --user disable --now rime-remoted
```

It also starts Rime's agent runtime. If you still want agent sessions, or
[Closing the lid](/docs/lid) to keep working, run `rime agent enable`.
