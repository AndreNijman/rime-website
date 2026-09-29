#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  capture-all.sh WORK_DIR — every recording the website shows, from the real
#  Rime Shell at the revision in SHELL_ROOT (an export of rime-shell).
#
#  The default scene (the wallpaper a fresh install starts with), dark and
#  light, with full motion and with Reduce Motion: every transition between
#  rest, the Dashboard, Wi-Fi and the notification centre, cross edges
#  included. The five other scenes, dark and light: each surface opening and
#  closing, and Wi-Fi <-> notifications. Takes already recorded are kept.
#  Then cut.py makes the clips; build-stage.mjs publishes them.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="${1:?usage: capture-all.sh WORK_DIR}"
: "${SHELL_ROOT:?SHELL_ROOT must name a rime-shell export}"
walls="$here/../../assets/wallpapers"
mkdir -p "$work"
python3 "$here/palettes.py" "$work/palettes" >/dev/null

ALL=(dash network notifications dash-network network-dash dash-notifications notifications-dash)
BASIC=(dash network notifications)

wall_of() { [ "$1" = rime-default ] && echo "$walls/rime-wallpaper-default.jpg" || echo "$walls/scene-$1.jpg"; }

run() {   # run VARIANT SCENE MODE REDUCED TAKE...
    local variant="$1" scene="$2" mode="$3" reduced="$4"; shift 4
    local t todo=()
    for t in "$@"; do [ -f "$work/takes/$variant/$t/take.json" ] || todo+=("$t"); done
    [ "${#todo[@]}" -eq 0 ] && return 0
    "$here/record.sh" "$work/takes" "$variant" "$scene" "$mode" "$work/palettes/$scene-$mode.json" \
        "$(wall_of "$scene")" "$reduced" "${todo[@]}" || return 1
}

for mode in dark light; do
    run "rime-default-$mode" rime-default "$mode" false "${ALL[@]}" || exit 1
    run "rime-default-$mode-reduced" rime-default "$mode" true "${ALL[@]}" || exit 1
done
for scene in harbour-dusk deep-water fern ember chalk; do
    for mode in dark light; do run "$scene-$mode" "$scene" "$mode" false "${BASIC[@]}" || exit 1; done
done

for take in "$work"/takes/*/*/; do
    python3 "$here/cut.py" "$take" "$work/clips" 2>&1 | grep -v "^Svt" || exit 1
done
echo "capture-all: done"
