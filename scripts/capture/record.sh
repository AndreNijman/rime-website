#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  record.sh OUT VARIANT SCENE SCHEME PALETTE WALLPAPER REDUCED TAKE...
#
#  One variant (a wallpaper and its palette, dark or light, full motion or
#  Reduce Motion) of the real Rime Shell, recorded as TAKES: each is one
#  continuous master of the desktop going through a few states, so the clips
#  cut.py makes from it end exactly where the next begins.
#
#  Every take restarts the shell, so every take's clock reads 09:41 and the
#  Dashboard (whose clock card shows seconds) is always entered at :22.5 and
#  left at :26.5: a Dashboard clip from one take joins one from another on the
#  same frame. Requests are made mid-second so a ticking second is never
#  mistaken for motion.
#
#  The shell runs at its default settings (Reduce Motion on for the reduced
#  variant, nothing else), but in dilated time: clockshift.so makes every
#  clock it reads run 3.125 times slower, so it draws each transition over
#  3.125 times as many frames, and cut.py plays the recording back 3.125 times
#  faster. Springs, Qt animations, timers and the seconds the Dashboard draws
#  all come out at real speed. Qt's animation driver is the time-based one
#  (QSG_USE_SIMPLE_ANIMATION_DRIVER): the default steps a fixed 16.67 ms per
#  frame, which is only right on a desk drawing every vsync.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out="$1" variant="$2" scene="$3" scheme="$4" palette="$5" wall="$6" reduced="$7"; shift 7
takes=("$@")
mkdir -p "$out"; out="$(cd "$out" && pwd)"
# shellcheck source=session.sh
. "$here/session.sh"

speed=3.125
if [ "$reduced" = true ]; then settings='"reduceMotion":true'; else settings=''; fi
export CAP_DILATE="$speed" CAP_QT_ENV="QSG_USE_SIMPLE_ANIMATION_DRIVER=1"

# The timetable (seconds on the shell's clock): A before the Dashboard, D1 and
# D2 its arrival and departure, B after it. Four real seconds are 1.28 of the
# shell's, well after a transition has settled.
A=18.5 D1=22.5 D2=26.5 B=30.5

events=""; last_at=0
ev() {   # ev AT FROM TO IPC...
    local at="$1" from="$2" to="$3"; shift 3
    cap_at "$at"; last_at="$at"
    local t; t="$(date +%s%N)"
    cap_ipc "$@"
    events="$events{\"t_ns\":$t,\"from\":\"$from\",\"to\":\"$to\"},"
}

take() {
    local name="$1" dir="$out/$variant/$1"
    mkdir -p "$dir"
    cap_begin || return 1
    cap_seed "$palette" "$wall" "$settings" "$scheme"
    cap_shell_start || return 1
    local ambient=false
    case "$name" in
        *agents*)
            # The Agent Center's service starts on the page's first open and
            # draws nothing until its first answer: open it once, unrecorded,
            # so the recorded open is the one a person sees every day after.
            cap_at 5; cap_ipc dashboard-agents toggle
            cap_at 8; cap_ipc dashboard-agents toggle
            # A working session's badge breathes for as long as it works, so
            # cut.py must not take it for a transition (take.json "ambient").
            ambient=true ;;
    esac
    cap_at 14
    cap_grab "$dir/before.png"
    local rec_t0; rec_t0="$(date +%s%N)"
    cap_record_start "$dir/master.mkv"
    events=""
    case "$name" in
        # rest -> Dashboard -> rest
        dash)        ev $D1 rest dashboard dashboard-home toggle
                     ev $D2 dashboard rest dashboard-home toggle ;;
        # rest -> Wi-Fi -> notifications -> Wi-Fi -> rest: one body, retargeting
        network)     ev $A  rest network wifi-toggle toggle
                     ev $D1 network notifications notification-toggle toggle
                     ev $D2 notifications network wifi-toggle toggle
                     ev $B  network rest wifi-toggle toggle ;;
        notifications) ev $A rest notifications notification-toggle toggle
                     ev $D1 notifications rest notification-toggle toggle ;;
        # the cross edges: one surface closing while another opens
        dash-network) ev $D1 rest dashboard dashboard-home toggle
                     ev $D2 dashboard network wifi-toggle toggle
                     ev $B  network rest wifi-toggle toggle ;;
        network-dash) ev $A rest network wifi-toggle toggle
                     ev $D1 network dashboard dashboard-home toggle
                     ev $D2 dashboard rest dashboard-home toggle ;;
        dash-notifications) ev $D1 rest dashboard dashboard-home toggle
                     ev $D2 dashboard notifications notification-toggle toggle
                     ev $B  notifications rest notification-toggle toggle ;;
        notifications-dash) ev $A rest notifications notification-toggle toggle
                     ev $D1 notifications dashboard dashboard-home toggle
                     ev $D2 dashboard rest dashboard-home toggle ;;
        # the Agent Center (the Dashboard's Agents tab): straight in and out,
        # and the tab slide both ways, with the Dashboard entered at D1 and
        # left at D2 as in every other take, so its ticking seconds join
        agents)      ev $A  rest agents dashboard-agents toggle
                     ev $D1 agents rest dashboard-agents toggle ;;
        dash-agents) ev $D1 rest dashboard dashboard-home toggle
                     ev $D2 dashboard agents dashboard-agents toggle
                     ev $B  agents rest dashboard-agents toggle ;;
        agents-dash) ev $A  rest agents dashboard-agents toggle
                     ev $D1 agents dashboard dashboard-home toggle
                     ev $D2 dashboard rest dashboard-home toggle ;;
        *) echo "unknown take $name"; return 1 ;;
    esac
    cap_at "$(python3 -c "print($last_at + 4.5)")"
    cap_record_stop
    cp "$CAP_LOG" "$dir/shell.log"
    local errs; errs="$(grep -E 'TypeError|ReferenceError|is not a type' "$CAP_LOG" | head -5)"
    [ -n "$errs" ] && { echo "shell errors in $variant/$name:"; echo "$errs"; }
    printf '{"variant":"%s","take":"%s","scene":"%s","scheme":"%s","reduced":%s,"speed":%s,"shell":"%s","rec_t0_ns":%s,"ambient":%s,"events":[%s]}\n' \
        "$variant" "$name" "$scene" "$scheme" "$reduced" "$speed" "$(cat "$SHELL_ROOT/.rime-shell-commit" 2>/dev/null || echo unknown)" \
        "$rec_t0" "$ambient" "${events%,}" > "$dir/take.json"
    cap_end
    echo "recorded $variant/$name"
}

trap 'cap_end' EXIT INT TERM
for t in "${takes[@]}"; do take "$t" || { echo "FAIL: take $t"; exit 1; }; done
