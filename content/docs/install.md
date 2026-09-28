---
title: "Install Rime"
description: "Download and check the installer, write it to a USB stick, install, and get the first update through."
section: "Start"
order: 10
sources:
  - "https://github.com/AndreNijman/rime-os/releases/tag/v2.1.0"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/1672d059/README.md"
  - "https://github.com/AndreNijman/rime-os/blob/1672d059/installer/build-live-iso.sh"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/trust-enforcement.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/trust.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/ops.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-migrate-from-apex"
verified: "rime-os@2d9c5438a"
---

## The installer still says APEX-OS

Until 2026-09-28, Rime was APEX-OS. The only installer published so far is
the **APEX-OS v2.1.0** network installer. There is no Rime-named ISO yet, no
Windows installer and no Android app.

The v2.1.0 ISO installs an APEX-OS image. Your first update moves the machine to
Rime. Until then the screens say APEX, and the command is `apex`, not `rime`.

That first update has a known problem. Read **The first update**, at the end of
this page, before you run it.

## What you need

- A 64-bit PC with UEFI. Legacy BIOS machines can also boot the stick.
- A USB stick of 4 GB or more. Writing the ISO erases it.
- At least 16 GB of disk. The installer stages the download before it installs:
  - with a second drive or USB stick that has 32 GB free, it stages there and
    does not erase that drive;
  - with nothing else plugged in, it stages on the disk you install to, which
    then needs about 53 GB.
- A network connection for the whole install. The OS downloads during it.
- About 30 minutes, most of it waiting.

The installer cannot handle three things yet:

- USB Wi-Fi adapters that need out-of-tree drivers (RTL8812AU, 88x2bu, 8188eu).
  Use Ethernet or USB tethering from a phone.
- Captive-portal Wi-Fi, such as hotel or airport sign-in pages. The installer
  has no browser.
- Tablets with no physical keyboard. The account page needs one.

## Download and check it

Take both files from the [download page](/download) or the
[v2.1.0 release](https://github.com/AndreNijman/rime-os/releases/tag/v2.1.0):

| File | Size | SHA-256 |
|---|---|---|
| `apex-os-netinstall-x86_64.iso` | 1,902,344,192 bytes | `7208b6fd5c2641e3e1bb035eac0d1c642f4f7eda85b1ba3295993b8ec0227248` |
| `apex-os-netinstall-x86_64.iso.sha256` | | |

Check the download before you write it. A truncated ISO fails much later, in
ways that look like hardware faults.

```sh
sha256sum -c apex-os-netinstall-x86_64.iso.sha256
# macOS:
shasum -a 256 -c apex-os-netinstall-x86_64.iso.sha256
```

On Windows, in PowerShell, compare the output with the contents of the
`.sha256` file:

```powershell
Get-FileHash .\apex-os-netinstall-x86_64.iso -Algorithm SHA256
```

The ISO itself carries no signature. The checksum tells you the file arrived
intact. [Verify what you run](/docs/verify) covers what else you can check,
including the image the ISO downloads.

## Write it to a USB stick

Writing the ISO erases the whole stick. On Linux and macOS, naming the wrong
device erases that device instead, with no confirmation and no undo.

**Windows.** Use [Rufus](https://rufus.ie/):

1. Plug in the stick and open Rufus.
2. Under **Device**, select the stick. Check that the size looks right.
3. Under **Boot selection**, choose SELECT and pick the ISO.
4. Leave everything else as it is and click **START**.
5. If Rufus reports an *ISOHybrid image*, choose **Write in DD Image mode**.
6. Confirm the erase warning and wait.

[balenaEtcher](https://etcher.balena.io/) also works: select the image, select
the drive, Flash.

**Linux.**

```sh
lsblk        # find the stick by its SIZE, not only its name
sudo dd if=apex-os-netinstall-x86_64.iso of=/dev/sdX bs=4M oflag=direct status=progress
sync
```

Write to the whole disk (`/dev/sdX`), never to a partition (`/dev/sdX1`).

**macOS.**

```sh
diskutil list                  # find the disk, for example /dev/disk4
diskutil unmountDisk /dev/diskN
sudo dd if=apex-os-netinstall-x86_64.iso of=/dev/rdiskN bs=4m
```

## Keeping Windows on the same disk

Skip this section if Rime gets the whole disk.

The installer can install into an existing partition, but it does not shrink
Windows for you. Do that from Windows first:

1. **Suspend BitLocker.** Control Panel, BitLocker, *Suspend protection*. If you
   change the boot configuration while BitLocker is active, Windows asks for
   its 48-digit recovery key at the next boot.
2. **Turn off Fast Startup.** Control Panel, Power Options, *Choose what the
   power buttons do*, untick **Turn on fast startup**. Fast Startup leaves the
   Windows partition half-hibernated, which is unsafe to resize.
3. **Shrink C:.** Right-click Start, Disk Management, right-click `C:`,
   *Shrink Volume*. Give Rime at least 53 GB, because with no second drive
   plugged in the installer stages the download on this partition. With a
   second drive or stick that has 32 GB free, 40 GB is enough.
4. **Create a partition in the free space.** Right-click the unallocated space,
   *New Simple Volume*, accept the defaults. The installer lists partitions,
   not unallocated space.
5. Restart into Windows once, cleanly, before you install.

An install into an existing partition cannot be encrypted. The installer
refuses that combination.

## Boot the stick

Restart and open the one-time boot menu. The key is usually F12, sometimes F9,
F10 or Esc (ThinkPad F12, Dell F12, HP F9, Acer F12, MSI F11, ASUS Esc). Pick
the USB entry. If the stick is not listed, turn off **Fast Boot** in the
firmware setup.

The stick boots with Secure Boot on or off: it starts through Fedora's signed
shim and kernel.

The v2.1.0 menu has three entries:

| Entry | Use it when |
|---|---|
| **Install APEX-OS** | Start here. |
| **Install APEX-OS (safe graphics …)** | The screen goes black after the menu. |
| **Install APEX-OS (troubleshoot …)** | The stick is not found. It drops to a debug shell. |

The graphical installer appears after 30 to 60 seconds.

## The installer, page by page

The installer has seven numbered steps. Three extra pages appear only when they
apply: choosing a partition, disk encryption and Secure Boot.

1. **Welcome.** Read it and continue.
2. **Keyboard and time zone.** Pick the layout, its variant and your time zone,
   then type into the test field and check what comes out. The disk passphrase
   prompt uses this layout at every boot, before anything else has loaded.
3. **Network.** Pick a Wi-Fi network and enter its password. School, university
   and work networks also ask for a username. For a hidden network, type its
   name into the hidden-network field. On Ethernet, the page says you are
   connected. Do not skip this page: the download needs it, and the installer
   copies the connection into the installed system.
4. **Disk.** Choose where to install. The installer never offers the stick you
   booted from. An empty list usually means the drive is in RAID or RST mode in
   the firmware; switch it to **AHCI** and rescan.
5. **Use.** The whole disk, or the partition you prepared from Windows.
6. **Account.** The username must be lowercase, start with a letter or an
   underscore, and contain no spaces. Set a password and a computer name.
   - **Encrypt this disk** (whole-disk installs only). LUKS2 over the whole
     system, ticked by default. You can say no. Use the eye icon to check the
     passphrase as you type it, because you will type it again at a boot prompt
     with one keyboard layout.
   - **Secure Boot** (UEFI machines). Choose a one-time password to enrol Rime's
     signing key, or skip. Enrol even if Secure Boot is off today, so you can
     turn it on later without reinstalling.
7. **Confirm.** Every partition is listed as **ERASED**, **KEPT** or **SHARED**.
   Nothing has been written yet. Type `ERASE` to start. The confirmation is tied
   to the disk itself: the installer records each device's serial number, size
   and partition IDs on this page and checks them again before the first
   write, so a different drive swapped in during the download cannot be erased
   in its place.

### The recovery key

If you encrypted the disk, the last screen shows a **recovery key**, and Reboot
stays locked until you tick that you have written it down. The key opens the
disk when the passphrase does not, including when the keyboard produces the
wrong characters.

The installer also tries to save a copy on the USB stick. The stick usually
travels with the laptop, so move the key somewhere else and delete that file.

### If the install fails

The installer prints what failed and drops to a root shell. A photo of the
screen is usually enough to diagnose it.

- Ctrl+Alt+F2 gives a login prompt: user `root`, password `apex`.
- The logs are `/var/log/apex-install.log` and
  `/var/log/apex-installer-launch.log`.
- Nothing is written to any disk before you type `ERASE`, so a failure before
  that point has changed nothing.

Please [open an issue](https://github.com/AndreNijman/rime-os/issues) with the
photo or the log.

## First boot

The install takes 10 to 25 minutes, depending on your connection. When it
finishes, remove the stick and restart.

If you set a Secure Boot password, a blue **MOK management** screen appears
once. Choose **Enroll MOK**, **Continue**, **Yes**, type the password, then
**Reboot**. The firmware uses this screen to confirm that a person is at the
machine.

If Secure Boot is on and you skipped enrolment, the installed kernel does not
boot: it is signed with Rime's own key, which the boot chain trusts only once it
is enrolled. Turn Secure Boot off in the firmware settings to boot it.
[Verify what you run](/docs/verify) says what Secure Boot does and does not
cover on Rime.

Log in with the account you created. On the v2.1.0 image the desktop finishes
its setup at first login and needs the network for it.

## The first update

This account comes from reading the source code. Nobody has reproduced it on a
real v2.1.0 install yet.

**What goes wrong.** The update client in the v2.1.0 image trusts one signer:
the old `apex-os` build workflow. Every image published since 2026-09-28
13:45 UTC is signed by the renamed `rime-os` workflow, so by the source the
first `sudo apex update` on a fresh v2.1.0 install stops at the signature check.
Machines installed from v2.0.0 are in the same position. A machine that ran
`apex update` between 03:37 and 13:45 UTC on 2026-09-28 received an in-between
release that trusts both names, and is not affected.

**The cautious choice is to wait** for an installer published under the Rime
name: it records the new image name and ships an update client that trusts the
new signer, so none of this applies.

**Why not `apex update --allow-unverified`.** That would get past the check, but
it runs the rest of the old client too, including its boot-migration step. On a
machine with Secure Boot off, that step can try to move the machine from GRUB to
systemd-boot using a version of the helper that could leave a machine unable to
update if the trial boot failed. The steps below skip the old client entirely.

### 1. Ask what the update would do

This needs no root and changes nothing:

```sh
apex trust --gate
```

If it says the update would deploy, run `sudo apex update`, reboot, and skip to
step 5. If it refuses and names the `rime-os` signer, continue.

### 2. Verify the image on another computer

cosign is not in the package sources Rime uses, so run this on a computer that
has it:

```sh
cosign verify ghcr.io/andrenijman/rime-os:rime \
  --certificate-identity https://github.com/AndreNijman/rime-os/.github/workflows/build-image.yml@refs/heads/main \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

cosign prints the digest it verified (the `docker-manifest-digest` field). Note
it.

### 3. Switch to the Rime image

```sh
sudo bootc switch ghcr.io/andrenijman/rime-os:rime
```

This one command uses bootc directly, which checks no signature itself. That is
acceptable here, once, because you verified the image in step 2 and check the
result in step 4. Afterwards, use `rime update` as normal: it is the command that
checks signatures.

### 4. Check what was staged, then restart

The tag can move between your check and the download, because every build
republishes it. Confirm that the staged image is the digest you verified:

```sh
sudo bootc status
```

If the staged digest differs, verify that digest with cosign before you restart
(`cosign verify ghcr.io/andrenijman/rime-os@sha256:…` with the same two flags).
If that verification fails, do not restart: a staged image does not run until
you boot it. Otherwise:

```sh
sudo systemctl reboot
```

### 5. After the restart

The machine now runs Rime and tracks `ghcr.io/andrenijman/rime-os:rime`. At this
first boot it moves its state from the old APEX paths to the new ones, and leaves
links at the old paths so a rollback can still find it. `rime` is the command
from now on; `apex` still works and prints a one-line note.

```sh
rime trust --gate
```

It should report a verified signature, and from now on `sudo rime update` checks
every image itself. See [Updating](/docs/updating).

If anything is wrong after the restart, `sudo rime rollback` and a reboot take
you back to the v2.1.0 image. See [Rollback](/docs/rollback).

### Don't turn the check off

Setting `signature=off` in `/etc/apex/trust.conf` also gets an update through,
but it stays off: the first Rime boot moves `/etc/apex` to `/etc/rime`, so every
later update would deploy without a signature check. If you already did it,
delete that line once you are on Rime.

