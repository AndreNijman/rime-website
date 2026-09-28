---
title: "Renaming an operating system that is already running"
description: "How APEX-OS became Rime without stranding the machines already running it: two releases in a fixed order, a rollback test that found four bugs, and the installs the plan cannot reach."
date: 2026-09-28
author: "Andre Nijman"
sources:
  - "https://github.com/AndreNijman/rime-os/pull/70"
  - "https://github.com/AndreNijman/rime-os/pull/71"
  - "https://github.com/AndreNijman/rime-shell/pull/29"
  - "/updates/2026.09.28.3"
  - "/updates/2026.09.28.4"
---

On 2026-09-28 APEX-OS became Rime OS, and APEX Shell became Rime Shell. Renaming the source took one scripted pass. Renaming the installed machines took two releases in a fixed order, because each machine depends on three names it cannot change by itself: the container image it pulls, the repository that signs that image, and the paths its own files point at.

Get the order wrong and a machine stops updating before it can download the release that would repair it.

## Two names a machine cannot follow

Our CI signs Rime images keyless with Sigstore, from GitHub Actions. The certificate identity is the URL of the workflow that built the image, and that URL contains the repository: `https://github.com/AndreNijman/apex-os/.github/workflows/build-image.yml@refs/heads/main`. Rename the repository and the next image carries a different identity. The update command refuses an unverified image by default (`signature=enforce`). The comment in `rimed/rime/src/trust.rs` spells out what follows:

> A machine that knew only [`EXPECTED_SIGNER`] would refuse all of them under `signature=enforce` and could never update again, which is also how it would miss the fix.

The image name fails from the other side. GitHub redirects a renamed repository for git and its API, but the GitHub Container Registry does not redirect a renamed package, and a bootc machine keeps pulling the reference in its origin, `ghcr.io/andrenijman/apex-os:<tag>`, until something changes it.

The machines had to learn the new names before we renamed anything.

## Release A: learn the names, rename nothing

Release A is rime-os [#70](https://github.com/AndreNijman/rime-os/pull/70), published as [2026.09.28.3](/updates/2026.09.28.3). It made three changes.

The expected signer became a set. The client accepts the `apex-os` and the `rime-os` workflow identities by default, so an image signed before the rename, and a rollback to one, still verifies. Put the defaults back to the old identity alone and three of the five new trust-enforcement cases fail.

`apex update` learned to follow the image. Only a tag of the old name moves:

```rust
fn renamed_reference(current: &str) -> Option<String> {
    if current.contains('@') {
        return None;
    }
    let tag = current.strip_prefix(OLD_IMAGE)?.strip_prefix(':')?;
    if tag.is_empty() || tag.contains('/') {
        return None;
    }
    Some(format!("{NEW_IMAGE}:{tag}"))
}
```

A digest pin stays where its owner put it, and a fork's image is left alone. Before it moves, the client asks the registry whether the new name serves that tag: one `skopeo inspect --raw` request. The move is `bootc switch`, which stages the image and rewrites the origin, so later updates are a plain `bootc upgrade` under the new name. The trust gate checks the new name before the switch; if the switch fails, the client gates the old name again and upgrades as before.

The build workflow started publishing each image under both names. `skopeo copy --preserve-digests` puts the bytes under a tag nothing tracks, the workflow reads that tag back to prove the digest held, and then it signs and attests under the second name, because a cosign signature names its repository. The step runs last, so a failure there leaves the fleet on the name it already had, and the run red.

## The rename, then Release B

Our two test machines, a laptop and a gaming desktop, booted Release A. Then we renamed both GitHub repositories; the repository IDs stayed the same and the old URLs redirect.

Release B is rime-os [#71](https://github.com/AndreNijman/rime-os/pull/71) with rime-shell [#29](https://github.com/AndreNijman/rime-shell/pull/29), published as [2026.09.28.4](/updates/2026.09.28.4). Its first commit is the mechanical rename: one case map over file contents, symlink targets and paths. The commits after it handle names that live outside a single image build.

`/usr/bin/apex` is a two-line alias that prints `` apex: this command is now `rime` `` to stderr and runs `rime`. The note avoids stdout because MCP servers speak over it. The old names of 21 units, 47 helper programs and the old `/usr/share` trees are links, and the build asserts that `apex --help` and `rime --help` print the same text.

Two services move the state. `rime-migrate-from-apex` runs early in each boot and renames `/var/lib/apex*` and `/etc/apex` with `rename(2)`, not a copy, leaving a relative symlink at each old path for a rollback to find. It also carries one file across: a machine whose systemd-boot trial had failed records `phase=failed`, and without it the new boot migrator would try the trial again. `rime-session-migrate` runs as the user before `basic.target`. That ordering protects the Rime Remote identity key: `rime-remoted` creates a fresh key when it finds none, and paired phones know the machine by the old one.

## What kept the APEX name

Each kept name carries a `rime-rename: keep` comment in the tree.

- The `\EFI\APEX\` directory on the EFI system partition and the "APEX-OS Primary" firmware entry. Installed machines boot shim and GRUB from `\EFI\APEX\SHIMX64.EFI`, and their NVRAM entries name that path.
- The Secure Boot and signing secret names in CI (`APEX_SB_*` and the rest). GitHub does not return a secret's value, so we cannot copy one under a new name.
- The Rime Remote relay Worker, its domain, the `apex-remote:` pairing scheme and the wire labels. Paired clients dial that host, and installed phones parse that scheme.
- Backup formats: the `apexbk1` recipient prefix and the `apex-backup` bucket prefix that existing backups live under.
- The `apex` image tag, with `rime` added beside it.

Our plan before Release A also kept the unified kernel image names (`apex-*.efi`). During Release B we checked the field: published installs boot shim and GRUB, so no machine carries a UKI and no loader entry names one. Release B renamed them to `rime-*.efi`.

## A round trip in a VM

bootc keeps the previous deployment, and `rime rollback` boots it. A rollback runs APEX's code against state Rime has already moved. We took a VM that started on Release A through APEX, Rime, APEX and Rime with a Release B test image. The first trip into Rime passed. The trips back found four bugs over two runs.

**The secret store.** The first migration moved `/var/lib/apex-secretd` and left a symlink. APEX's `apex-secretd.service` declares `StateDirectory=apex-secretd`, and systemd refuses a symlink there (238/STATE_DIRECTORY), so APEX booted without its credential broker. The store now stays put, and `rime-secretd.service` declares `StateDirectory=apex-secretd:rime-secretd`, which has systemd create the new name as a link to the old.

**Session files rewritten too early.** The first session migration rewrote users' files to Rime-only names. After a rollback the idle lock called a shell path APEX lacks, APEX's first-run step failed at each login, and niri started without a shell. The rule now: rewrite a line once the image stops answering to the old name. Release B carries the aliases, so it leaves those lines alone. Quickshell IPC calls are the exception, since quickshell finds a running instance by the path as given and an alias cannot carry that. Hypridle runs its commands through `sh`, so its lock command became a chain:

```sh
qs -c /usr/share/apex-shell … || qs -c /usr/share/rime-shell …
```

The APEX path comes first because APEX's first-run check reads the first `qs -c` path. On Rime the chain costs about 30 ms per idle lock.

**Keybinds registered 63 times.** The second run found this one. Hyprland reported a C stack overflow in `require("rime.shell-keybinds-user")` and registered each bind 63 times, then 125 after another trip. APEX Shell protects hand-edited keybinds with a rescue script: a `shell-keybinds.lua` without the `APEX-SHELL-GENERATED` marker moves into `shell-keybinds-user.lua`. Rime's generator wrote its own marker, so APEX took the generated file for the user's and moved it. The generated module requires `shell-keybinds-user.lua` at its end, so it required itself. The generated file now carries both markers, and loaded under any other module name it returns at once:

```lua
if type(modname) == "string" and modname ~= "shell-keybinds"
        and not modname:match("%.shell%-keybinds$") then
    return
end
```

The test replays APEX's rescue script, byte for byte, against the new file. Strip the marker line and the script moves the file; strip the guard and the count goes back to 63.

**niri's include block.** After a rollback, APEX's first-run step finds no APEX include block in the niri config, because the migration renamed it, and appends another. Each round trip added one. The next Rime login now removes APEX's block when Rime's is present. This fix came after the second VM run. The migration suite covers it with a real `niri validate`; no VM boot has.

On the second run, each boot passed: the first-run step exited 0, Hyprland reported no config errors, 92 binds registered once each, a stored credential read back on both sides, and the idle lock reached the running shell.

Three rollback limits remain, and the release notes list them: a user's own `qs -p /usr/share/apex-shell` bind in labwc or niri does nothing on APEX, labwc keybinds saved again on Rime call `rime shell …`, and after a package change on Rime a rollback merges both package extensions.

## The machines this plan does not reach

Release A helps a machine that installs it. The `apex-os` tags served it from 03:35Z to 13:45Z UTC on 2026-09-28. A machine that did not update inside that window still runs a client that knows one signer, and images since Release B carry the `rime-os` identity alone, under both names. Under `signature=enforce` that client refuses the update before anything downloads.

Fresh installs from the latest published ISO, v2.1.0, still branded APEX-OS, fall in this group. The installer pins a digest, records the floating tag `ghcr.io/andrenijman/apex-os:apex` as the origin, and ships a client from before Release A. We derived this from that build's source and have not reproduced it on a real install; a read-only `apex trust --gate` on a fresh v2.1.0 VM would settle it.

The override file for extra signers lives under read-only `/usr`, and no image writes it. The old client's own escape hatches, `--allow-unverified` and `signature=off`, would get an update through, but we don't recommend either: the first also runs that client's boot-migration step, whose helper at that revision could leave a machine unable to update if a systemd-boot trial failed, and the second stays off for good. The interim route is to verify the current image with cosign on another machine, `bootc switch` to `ghcr.io/andrenijman/rime-os:rime` once, and check the staged digest before rebooting; [the install guide](/docs/install#the-first-update) has the steps. After that reboot the machine runs the dual-signer client and updates normally. The fix we intend is a new ISO from the current tree, which records `rime-os:rime` and ships the dual-signer client. We have not published it, and 2026.09.28.4 lists this as a known issue.
