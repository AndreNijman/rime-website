# shellcheck shell=bash
# ─────────────────────────────────────────────────────────────────────────────
#  session.sh — the real Rime Shell, running where nobody can see it, for the
#  website's recordings. Source it; do not execute it.
#
#  The shell under capture is rime-shell's own shell.qml at a pinned revision
#  (an export of that commit, SHELL_ROOT), started exactly as a login starts it,
#  inside a Hyprland that is itself nested in a private headless labwc. Nothing
#  appears on the desk: the sandbox is rime-shell's tests/lib/headless.sh
#  (private HOME, XDG_RUNTIME_DIR and session bus, stubbed system tools), and
#  only the one output that exists inside it is recorded.
#
#  What is real: the shell's code, fonts (read-only, as the harness borrows
#  them), the image's Hyprland appearance (/usr/share/rime/hypr/rime/
#  appearance.lua: gaps, borders, the no_anim layer rule), a fresh install's
#  settings, and the palette matugen makes from the wallpaper shown.
#  What is canned: agent sessions (fakes/rime + agents.json: the Shell asks the
#  `rime` command for them), Wi-Fi (rime-shell's fake-nmcli), Bluetooth, NetworkManager
#  and UPower on a private system bus (fakes/system-bus.py, so neither this
#  machine's networks, signal nor battery is recorded), notifications
#  (sent on the private bus), brightness, uptime and the account name
#  (fakes/), and the clock, which clockshift.so starts at
#  09:41 on 28 September 2026 in every session so no clip shows a different
#  minute from the next (and dilates, see record.sh).
#
#    SHELL_ROOT   the rime-shell export to run (required)
#    CAP_MODE     output mode, default 3840x2400@60 (the L16's 1920x1200 at 2x)
#    CAP_SCALE    output scale, default 2
# ─────────────────────────────────────────────────────────────────────────────

CAP_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
: "${SHELL_ROOT:?SHELL_ROOT must name a rime-shell export}"
CAP_MODE="${CAP_MODE:-3840x2400@60}"
CAP_SCALE="${CAP_SCALE:-2}"
CAP_EPOCH="${CAP_EPOCH:-$(TZ=Australia/Perth date -d '2026-09-28 09:41:00' +%s)}"
CAP_SHIM="${CAP_SHIM:-$CAP_HERE/.build/clockshift.so}"

# shellcheck source=/dev/null
. "$SHELL_ROOT/tests/lib/headless.sh"

cap_lw_pid=""; cap_hy_pid=""; cap_bg_pid=""; cap_qs_pid=""; cap_rec_pid=""; cap_sysbus_pid=""; cap_sysfake_pid=""
CAP_OUTPUT=""

cap_build_shim() {
    [ -f "$CAP_SHIM" ] && [ "$CAP_SHIM" -nt "$CAP_HERE/clockshift.c" ] && return 0
    mkdir -p "$(dirname "$CAP_SHIM")"
    gcc -O2 -shared -fPIC -o "$CAP_SHIM" "$CAP_HERE/clockshift.c" -ldl
}

cap_hc() {
    env -i HOME="$HOME" PATH=/usr/bin:/bin XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" \
        HYPRLAND_INSTANCE_SIGNATURE="$HYPRLAND_INSTANCE_SIGNATURE" hyprctl "$@"
}

# cap_begin — the sandbox, labwc, Hyprland and one output at CAP_MODE.
cap_begin() {
    headless_require quickshell grim labwc Hyprland start-hyprland swaybg wf-recorder
    cap_build_shim || { echo "FAIL: could not build clockshift.so"; return 1; }
    headless_begin
    unset HYPRLAND_INSTANCE_SIGNATURE
    headless_unstub hyprctl
    ln -sf "$SHELL_ROOT/tests/lib/fake-nmcli" "$HEADLESS_W/bin/nmcli"
    local f
    for f in bluetoothctl brightnessctl uptime rime; do ln -sf "$CAP_HERE/fakes/$f" "$HEADLESS_W/bin/$f"; done
    # The Agent Center's sessions and requests (fakes/rime reads them); the
    # guide's first-run card is dismissed, as it is after anyone's first look.
    export CAP_AGENTS="${CAP_AGENTS:-$CAP_HERE/fakes/agents.json}"
    mkdir -p "$XDG_STATE_HOME/rime-shell"
    printf '{"onboardingDismissed":true}' > "$XDG_STATE_HOME/rime-shell/agent-help.json"
    local n
    for n in nmtui blueman-manager rfkill sing-box; do ln -sf "$HEADLESS_W/bin/_stub" "$HEADLESS_W/bin/$n"; done

    # A private SYSTEM bus for the shell, with NetworkManager and UPower on it
    # (fakes/system-bus.py): the bar reads Wi-Fi strength and the battery from
    # there, and must show the canned ones, not this machine's.
    local sysbus
    sysbus="$(dbus-daemon --session --address="unix:path=$HEADLESS_RUNTIME/system_bus" --fork --nopidfile \
                --print-address=1 --print-pid=1 2>/dev/null)"
    [ -n "$sysbus" ] || { echo "FAIL: no private system bus"; return 1; }
    CAP_SYSTEM_BUS="$(printf '%s\n' "$sysbus" | sed -n 1p)"; cap_sysbus_pid="$(printf '%s\n' "$sysbus" | sed -n 2p)"
    DBUS_SYSTEM_BUS_ADDRESS="$CAP_SYSTEM_BUS" python3 "$CAP_HERE/fakes/system-bus.py" "$CAP_HERE/fakes/dbus" \
        > "$HEADLESS_W/system-bus.log" 2>&1 &
    cap_sysfake_pid=$!
    for _ in $(seq 1 50); do grep -q "up" "$HEADLESS_W/system-bus.log" 2>/dev/null && break; sleep 0.1; done
    grep -q "up" "$HEADLESS_W/system-bus.log" || { echo "FAIL: fake system services"; cat "$HEADLESS_W/system-bus.log"; return 1; }

    mkdir -p "$HEADLESS_W/cfg/labwc"
    : > "$HEADLESS_W/cfg/labwc/autostart"
    printf '<?xml version="1.0"?>\n<labwc_config></labwc_config>\n' > "$HEADLESS_W/cfg/labwc/rc.xml"
    local before host
    before="$(headless_sockets)"
    env -i HOME="$HOME" PATH=/usr/bin:/bin XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" XDG_CONFIG_HOME="$HEADLESS_W/cfg" \
        WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 labwc > "$HEADLESS_W/labwc.log" 2>&1 &
    cap_lw_pid=$!
    host="$(headless_wait_socket "$before")"
    [ -n "$host" ] || { echo "FAIL: labwc did not come up"; return 1; }

    mkdir -p "$HOME/.config/hypr"
    cat > "$HOME/.config/hypr/hyprland.lua" <<LUA
-- The image's own look, then one output at the recording's size.
package.path = "/usr/share/rime/hypr/?.lua;" .. package.path
require("rime.appearance")
hl.monitor({ output = "", mode = "${CAP_MODE}", position = "0x0", scale = ${CAP_SCALE} })
hl.config({ cursor = { invisible = true }, misc = { disable_hyprland_logo = true, disable_splash_rendering = true } })
-- A config with no binds trips Hyprland's emergency mode, whose banner would
-- be recorded; the shell adds its own binds (rime.shell-keybinds) at start.
hl.bind("SUPER + Q", hl.dsp.window.close())
LUA
    before="$(headless_sockets)"
    env -i HOME="$HOME" PATH=/usr/bin:/bin XDG_RUNTIME_DIR="$XDG_RUNTIME_DIR" WAYLAND_DISPLAY="$host" \
        XDG_CURRENT_DESKTOP=Hyprland LIBSEAT_BACKEND=seatd \
        start-hyprland > "$HEADLESS_W/hypr.log" 2>&1 &
    cap_hy_pid=$!
    local sock="" f
    for _ in $(seq 1 60); do
        for f in "$XDG_RUNTIME_DIR"/hypr/*/.socket.sock; do [ -S "$f" ] && sock="$f"; done
        [ -n "$sock" ] && break; sleep 0.5
    done
    [ -n "$sock" ] || { echo "FAIL: nested Hyprland did not come up"; tail -20 "$HEADLESS_W/hypr.log"; return 1; }
    export HYPRLAND_INSTANCE_SIGNATURE; HYPRLAND_INSTANCE_SIGNATURE="$(basename "$(dirname "$sock")")"
    headless_assert_not_ambient_signature "$HYPRLAND_INSTANCE_SIGNATURE" || return 1
    local disp
    disp="$(headless_wait_socket "$before")"
    [ -n "$disp" ] || { echo "FAIL: no Hyprland wayland socket"; return 1; }
    export WAYLAND_DISPLAY="$disp" XDG_CURRENT_DESKTOP=Hyprland
    sleep 1.5
    # The nested window gives Hyprland no usable output of its own here; a
    # headless one takes the monitor rule above (mode and scale).
    cap_hc output create headless >/dev/null 2>&1
    for _ in $(seq 1 20); do
        CAP_OUTPUT="$(cap_hc -j monitors | python3 -c 'import json,sys; m=[x for x in json.load(sys.stdin) if x["name"].startswith("HEADLESS")]; print(m[0]["name"] if m else "")')"
        [ -n "$CAP_OUTPUT" ] && break; sleep 0.25
    done
    [ -n "$CAP_OUTPUT" ] || { echo "FAIL: no headless output"; return 1; }
    echo "capture: Hyprland $HYPRLAND_INSTANCE_SIGNATURE, output $CAP_OUTPUT $(cap_hc -j monitors | python3 -c 'import json,sys; m=json.load(sys.stdin); m=[x for x in m if x["name"].startswith("HEADLESS")] if isinstance(m,list) else m; print(m[0]["width"], m[0]["height"], m[0]["refreshRate"], m[0]["scale"])')"
    echo "configerrors: $(cap_hc -j configerrors | tr -d '\n\t ')"
}

# cap_seed PALETTE_JSON WALLPAPER [settings-json-fragment] [dark|light]
cap_seed() {
    local palette="$1" wall="$2" extra="${3:-}" mode="${4:-dark}"
    local ud="$HOME/.config/rime-shell/src/user_data"
    mkdir -p "$ud" "$HOME/.cache/rime-shell"
    cp "$palette" "$HOME/.cache/rime-shell/colors.json"
    printf '{"currentWall":"%s","wallpaperDir":"~/Pictures/Wallpapers","scheme":"content","mode":"%s"}' "$wall" "$mode" > "$ud/wallpaper.json"
    printf '{%s}' "$extra" > "$ud/settings.json"
    # What the wallpaper service writes when it applies a wallpaper (the
    # profile card and the Appearance page show it).
    cp "$wall" "$HOME/.curr_wall_static.jpg"
    [ -n "$cap_bg_pid" ] && kill "$cap_bg_pid" 2>/dev/null
    swaybg -o "$CAP_OUTPUT" -m fill -i "$wall" >/dev/null 2>&1 &
    cap_bg_pid=$!
}

cap_shell_start() {
    CAP_LOG="$HEADLESS_W/shell.log"
    CAP_SHELL_T0="$(date +%s%N)"   # the shim's clock reads CAP_EPOCH at about this instant
    # shellcheck disable=SC2086  # CAP_QT_ENV is a list of NAME=value words
    env USER=rime DBUS_SYSTEM_BUS_ADDRESS="$CAP_SYSTEM_BUS" LD_PRELOAD="$CAP_SHIM" CLOCKSHIFT_EPOCH="$CAP_EPOCH" CLOCKSHIFT_DILATE="${CAP_DILATE:-1}" ${CAP_QT_ENV:-} \
        TZ=Australia/Perth LANG=C.UTF-8 LC_ALL=C.UTF-8 quickshell -p "$SHELL_ROOT/shell.qml" > "$CAP_LOG" 2>&1 &
    cap_qs_pid=$!
    if [ "${CAP_SEED_NOTIFICATIONS:-1}" = 1 ]; then
        # The notification service lists, but does not toast, what arrives in
        # its first 500 ms; the three notifications are sent the moment its
        # name appears on the bus, so no toast is ever on screen.
        for _ in $(seq 1 500); do
            gdbus call --session --dest org.freedesktop.DBus --object-path /org/freedesktop/DBus \
                --method org.freedesktop.DBus.NameHasOwner org.freedesktop.Notifications 2>/dev/null | grep -q true && break
            sleep 0.02
        done
        cap_notifications
    fi
    for _ in $(seq 1 160); do grep -q "Configuration Loaded" "$CAP_LOG" 2>/dev/null && break; sleep 0.25; done
    grep -q "Configuration Loaded" "$CAP_LOG" || { echo "FAIL: shell did not load"; tail -30 "$CAP_LOG"; return 1; }
    sleep 2.0
    # On a fresh HOME the shell's include of its generated keybinds races the
    # file's first write (a known first-login quirk); one reload settles it,
    # and the error overlay it leaves must not be in any frame.
    cap_hc reload >/dev/null 2>&1
    sleep 1.5
    local errs; errs="$(cap_hc -j configerrors | tr -d '\n\t ')"
    case "$errs" in '[""]'|'[]') : ;; *) echo "FAIL: Hyprland config errors after reload: $errs"; return 1 ;; esac
    sleep 1.0    # boot-grace timers, first paint, lazy singletons
}

cap_shell_stop() {
    [ -n "$cap_qs_pid" ] && { kill "$cap_qs_pid" 2>/dev/null; wait "$cap_qs_pid" 2>/dev/null; }
    cap_qs_pid=""
}

cap_ipc() { quickshell -p "$SHELL_ROOT/shell.qml" ipc call "$@" >/dev/null 2>&1; }

cap_grab() { grim -l 0 -o "$CAP_OUTPUT" "$1"; }

# cap_at SECONDS — wait until the shell's clock reads 09:41:SECONDS.
cap_at() {
    local target=$(( CAP_SHELL_T0 + $(python3 -c "print(int(${1} * 1e9))") )) now
    now="$(date +%s%N)"
    [ "$now" -lt "$target" ] && sleep "$(python3 -c "print(($target - $now) / 1e9)")"
    return 0
}

# cap_notify SUMMARY BODY — a notification on the private bus. Its toast
# shows for five seconds; send them before a take, never during one.
cap_notify() {
    gdbus call --session --dest org.freedesktop.Notifications --object-path /org/freedesktop/Notifications \
        --method org.freedesktop.Notifications.Notify "${3:-Rime}" 0 "${4:-}" "$1" "$2" "[]" "{}" 0 >/dev/null 2>&1
}

# The same three in every take, so the bell and the centre look the same in
# every clip.
cap_notifications() {
    cap_notify "Update ready" "Rime 2026.09.28.4 is staged. It starts at your next reboot." "Rime Update" "system-software-update"
    cap_notify "Build finished" "rime-os image built and signed in 41 minutes." "Terminal" "utilities-terminal"
    cap_notify "Design review in 10 minutes" "Rime Shell: the layout button and the frame corners." "Calendar" "x-office-calendar"
}

# cap_record_start FILE — lossless master of the output, timestamps kept.
cap_record_start() {
    wf-recorder -y -o "$CAP_OUTPUT" -f "$1" -c libx264rgb -p preset=ultrafast -p crf=0 \
        > "$HEADLESS_W/rec.log" 2>&1 &
    cap_rec_pid=$!
    sleep 1.0
}
cap_record_stop() {
    [ -n "$cap_rec_pid" ] && { kill -INT "$cap_rec_pid" 2>/dev/null; wait "$cap_rec_pid" 2>/dev/null; }
    cap_rec_pid=""
}

cap_end() {
    cap_record_stop
    cap_shell_stop
    [ -n "$cap_bg_pid" ] && kill "$cap_bg_pid" 2>/dev/null
    [ -n "$cap_hy_pid" ] && kill "$cap_hy_pid" 2>/dev/null
    sleep 0.5
    [ -n "$cap_lw_pid" ] && kill "$cap_lw_pid" 2>/dev/null
    sleep 0.3
    [ -n "$cap_sysfake_pid" ] && kill "$cap_sysfake_pid" 2>/dev/null
    [ -n "$cap_sysbus_pid" ] && kill "$cap_sysbus_pid" 2>/dev/null
    cap_bg_pid=""; cap_hy_pid=""; cap_lw_pid=""; cap_sysfake_pid=""; cap_sysbus_pid=""
    [ -n "$HEADLESS_W" ] && headless_cleanup
    HEADLESS_W=""; HEADLESS_COMP_PID=""; HEADLESS_BUS_PID=""
    return 0
}
