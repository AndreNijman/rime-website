---
title: "Installing software"
description: "rime install for Fedora packages, Flatpaks, local .rpm, .deb and AppImage files, COPRs and capsules, and what it refuses."
section: "Use"
order: 30
sources:
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/docs/packages.md"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/rimed/rime/src/main.rs"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/files/system/libexec/rime-pkg"
  - "https://github.com/AndreNijman/rime-os/blob/2d9c5438a/README.md"
verified: "rime-os@2d9c5438a"
---

## The commands

```sh
sudo rime install android-tools     # a package from Fedora, RPM Fusion or an enabled COPR
sudo rime install org.gimp.GIMP     # a reverse-DNS id installs the Flatpak from Flathub
sudo rime install ~/Downloads/app.rpm                    # a local .rpm file
sudo rime install --allow-unsigned ~/Downloads/app.deb   # a local .deb file
sudo rime install --allow-unsigned ./Thing.AppImage      # an AppImage
sudo rime remove android-tools
rime search wireshark               # the repositories and Flathub
rime resolve obs-studio             # which source Rime would use, and why
rime pkg list
```

Reading needs no root. Anything that installs or removes needs `sudo`. On a
machine that has not taken its first update since the rename, use `apex` in
place of `rime`.

## Why not `rpm-ostree install`

Rime is an image-based system. Layering a package with `rpm-ostree` marks the
image as locally modified, and from then on `bootc upgrade` refuses to run:
installing one tool would stop the machine updating, without a word.

`rime install` builds a **systemd system extension** instead: one squashfs image
at `/var/lib/extensions/rime-user.raw` that systemd overlays onto `/usr` at boot.

- The OS image is never modified, so updates keep working.
- Programs land in the real `/usr/bin`, with their launcher entries, icons, man
  pages, completions, systemd units and udev rules where the system already
  looks.
- Everything you asked for lives in one extension, rebuilt from your list on
  every change.
- `rime rollback` (the OS) and `rime pkg rollback` (your packages) are
  independent.

What happens on an install: dnf resolves against the installed image and
downloads only what the image lacks, `rpmkeys` checks every RPM's signature,
the files are extracted without running package scripts, shared caches are
rebuilt, SELinux labels are applied, and the new extension replaces the old one
in one step. A package's `/etc` files go to the real `/etc`; if you edited one,
yours stays and the new version lands beside it as `*.rimenew`.

After an OS version change, `rime-sysext-rebuild.service` rebuilds the extension
on the first boot. Offline, it leaves the rebuild for later rather than failing
the boot. `rime update` also refreshes your packages, so they get Fedora's
security fixes.

## Where packages come from

- **Fedora**, and **RPM Fusion Free and Nonfree**, enabled in every image.
- **COPRs you enable.** COPRs are third-party repositories, run by neither Fedora
  nor Rime. Enabling one trusts its owner until you disable it:

  ```sh
  sudo rime repo enable-copr OWNER/PROJECT
  rime repo list
  sudo rime repo disable-copr OWNER/PROJECT
  ```

  Rime still checks every downloaded RPM against a trusted key. Disabling the
  COPR removes its key again.
- **Flathub**, for any reverse-DNS application id (three or more dot-separated
  parts, such as `org.gimp.GIMP`). A plain name like `gimp` means the RPM.
- **Files you already have**: `.rpm`, `.deb` or AppImage.

There is no Rime package registry.

A bare name can exist as an RPM, a Flatpak and a package inside a capsule, so
Rime ranks the sources. `rime resolve NAME` shows every candidate, what vouches
for each, the choice Rime would make and the command for each alternative. To
choose yourself for one install, add `--source rpm`, `--source flatpak` or
`--source capsule`.

Other install flags:

| Flag | Does |
|---|---|
| `--no-weak-deps` | Skip weak dependencies: a smaller install with fewer optional features. |
| `--enable-repo REPO` | Also consider a repository that is disabled by default. |
| `--allow-unsigned` | Accept a local file no trusted key covers (see below). |
| `--source rpm\|flatpak\|capsule` | Pick the source for a bare name. |
| `--env CAPSULE` | Which capsule `--source capsule` installs into. Defaults to your first. |

## Local files

### `.rpm`

```sh
sudo rime install ~/Downloads/some-app.rpm
```

The file goes through the same pipeline as a repository package. Rime copies it
to `/var/lib/rime/pkg/local/`, and every later rebuild uses that copy, so the
original can go. Its dependencies still come from the repositories. `rime update`
cannot update the file itself: install a newer file to move it.

An RPM that no trusted key covers is refused. If you accept where it came from:

```sh
sudo rime install --allow-unsigned ~/Downloads/some-app.rpm
```

`--allow-unsigned` applies only to the files named on that command, never to
repository packages. Rime records the decision against the file's exact
checksum, and `rime pkg list` and `rime pkg verify` keep saying the package was
never verified.

Package scripts do not run. Most packages work anyway. A vendor RPM that creates
its short command name in a script may land under `/opt` with a working launcher
entry and no command on `PATH`; `rime pkg info` shows what was installed.

### `.deb`

```sh
sudo rime install --allow-unsigned ~/Downloads/app_1.0_amd64.deb
```

`rime install --help` does not list `.deb`, but the engine accepts it. Rime
unpacks the package into the same extension. It is not an apt client:

- it fetches no `.deb` and resolves no Debian dependencies. It prints the
  `Depends:` line so you can install anything missing with `rime install`;
- it never runs the maintainer scripts, and refuses a package whose program
  only a script would create;
- it accepts files only under `/usr` and `/opt`, and refuses shared libraries
  in the system library paths;
- every `.deb` needs `--allow-unsigned`, because Debian signs the repository
  index, not the file.

### AppImage

```sh
sudo rime install --allow-unsigned ./Thing.AppImage
sudo rime remove Thing                 # by the command name it installed
sudo rime remove ./Thing.AppImage      # or by the file it came from
```

Rime unpacks the AppImage once into `/usr/local/lib/rime-appimage/NAME/`, with a
launcher entry, an icon and a command in `/usr/local/bin`. It never runs the
AppImage file itself.

An installed AppImage is **pinned**. `rime update` does not move it, says so by
name on every run, and never follows the vendor's own update channel. To update,
install the newer file. It takes two to three times the file's size on disk.
Every AppImage needs `--allow-unsigned`. If the software also comes as an RPM, a
COPR or a Flatpak, use that instead.

## Managing what you installed

| Command | Does |
|---|---|
| `rime pkg list` | What you asked for, and what came in as dependencies. |
| `rime pkg status` | The extension's state: what it was built for, whether it is merged. |
| `rime pkg info` | The full record of the last build. |
| `sudo rime pkg upgrade` | Re-resolve every package against the repositories. |
| `sudo rime pkg rebuild` | Rebuild for the running OS version. `--if-needed` does nothing unless it has to. |
| `sudo rime pkg rollback` | Restore the previous extension. |
| `rime pkg verify` | Check the extension against its recorded checksum, and each AppImage against the file you accepted. |
| `sudo rime pkg adopt` | Convert rpm-ostree layered packages into the extension, then reset the layers so updates work again. Restart afterwards. |

## What `rime install` refuses

| Refused | Why |
|---|---|
| Kernels, `kmod-*`, `akmod-*` | They need an initramfs and a real image; kernel modules ship in the image. |
| `glibc`, `systemd`, `rpm`, `dnf`, `bootc`, `ostree`, the bootloader, the SELinux policy, core tools | A second copy of the running system's foundations cannot be undone without a rollback. |
| A newer version of something the image ships | That is an OS update. |
| Anything the image already provides | Nothing to do. |
| An RPM for another architecture | It cannot run here. |
| A local RPM no trusted key covers | Unless you pass `--allow-unsigned` for that file. |

## Flatpaks

Flathub is the only Flatpak remote Rime configures, added at first boot. Zen
Browser is installed from it at first boot; Firefox stays the default browser.
Bazaar, a graphical store for Flatpaks, is in the image.

`rime update` also updates Flatpak applications, system-wide and for you. Skip
that with `--skip-flatpak`.

## Capsules: software that expects a mutable system

`pip install --user`, `npm -g`, an SDK that wants `/opt`, a package that exists
only for Ubuntu: these belong in a capsule, a rootless container that still sees
your home directory, your terminal and your devices. Capsules are yours, not the
machine's, so no capsule command takes `sudo`.

```sh
rime env create ubuntu                  # aliases: fedora, ubuntu, arch, debian, python, cuda, rocm
rime env create cuda                    # an alias brings its device profile: this one sees the GPU
rime env create tools --gpu none        # device access: nvidia, amd, hw or none (the default)
rime env enter ubuntu                   # a shell inside it
rime env exec ubuntu -- make test       # one command, no terminal
rime env install ubuntu some-package    # with the capsule's own package manager
rime env export ubuntu some-app         # put its GUI application in your launcher
rime env list
rime env rm ubuntu
```

`rime install --source capsule NAME` also installs into a capsule, and it is the
one form of `rime install` that runs without `sudo`.

Capsules are built on distrobox and podman. They are not a security boundary:
a capsule can reach your files.
