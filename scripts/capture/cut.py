#!/usr/bin/env python3
"""cut.py TAKE_DIR OUT_DIR — one recorded take into the website's clips.

A take (record.sh) is a lossless master of the real shell plus the moments its
transitions were asked for. Each transition becomes one clip:

  * its start is found in the pixels, not guessed: the first frame after the
    request that differs from the one before it, less a short static lead;
  * it runs until the next transition starts, so the last frame of one clip is
    the frame before the first frame of the next: clips chain without a seam;
  * it is cropped to the part of the screen that differs from the resting
    desktop in any of its frames (plus padding), since everything outside that
    is the rest still the page already shows beneath it;
  * it is retimed from the recording's slow motion (the shell's own motion
    speed setting, SPEED times slower) to real time at 60 fps.

Writes OUT_DIR/<variant>/<from>-<to>.{av1,h264}.mp4, rest.png and clips.json.
"""
import json, os, subprocess, sys
import numpy as np

FULL_W, FULL_H = 3840, 2400
SW, SH = 960, 600            # analysis size (a quarter of the output per side)
PAD = 48                     # padding round a clip's changes, output pixels
ONSET = 2e-5                 # share of analysis pixels that must change: a surface starting
LEAD = 0.10                  # real seconds of stillness kept before a transition


def probe_pts(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
                          "frame=pts_time", "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout
    return [float(l.split(",")[0]) for l in out.split() if l.strip()]


def decode(path, w, h, fmt="rgb24"):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h}:flags=area,format={fmt}",
                          "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    ch = 3 if fmt == "rgb24" else 1
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, ch)


def main(take_dir, out_dir):
    meta = json.load(open(os.path.join(take_dir, "take.json")))
    master = os.path.join(take_dir, "master.mkv")
    vdir0 = os.path.join(out_dir, meta["variant"])
    have = json.load(open(os.path.join(vdir0, "clips.json")))["clips"] if os.path.exists(os.path.join(vdir0, "clips.json")) else {}
    if all("settle" in have.get(f"{e['from']}-{e['to']}", {}) for e in meta["events"]):
        print(f"{meta['variant']}/{meta['take']}: already cut")
        return
    speed = meta["speed"]
    pts = probe_pts(master)
    frames = decode(master, SW, SH)
    n = min(len(pts), len(frames))
    pts, frames = pts[:n], frames[:n]
    diff = [0.0] + [float((np.abs(frames[i].astype(np.int16) - frames[i - 1]).max(axis=2) > 3).mean())
                    for i in range(1, n)]

    # The recorder's clock: frame 0 is at rec_t0 plus its start-up, measured as
    # the latency between the first request and the motion it caused.
    rec_t0 = meta["rec_t0_ns"] / 1e9
    events = meta["events"]            # [{"t_ns", "from", "to"}]
    # The first request finds the recorder's own latency (nothing moves for
    # seconds before it); later ones are looked for just after their request,
    # so the Dashboard's ticking seconds (requests are made mid-second) are
    # never taken for a transition.
    onsets = []
    lat = None
    for ev in events:
        approx = ev["t_ns"] / 1e9 - rec_t0
        lo = approx - 1.0 if lat is None else approx + lat - 0.4
        i = next((k for k in range(n) if pts[k] >= lo and diff[k] > ONSET), None)
        if i is not None and lat is None:
            lat = pts[i] - approx
        if i is None:
            sys.exit(f"no motion after the request for {ev['from']} -> {ev['to']} at ~{approx:.2f}s")
        # Nothing may be moving in the lead-in, or the previous clip would end mid-motion.
        lead_t = pts[i] - LEAD
        j = max(0, next(k for k in range(n) if pts[k] >= lead_t))
        busy = [k for k in range(j, i) if diff[k] > ONSET]
        if busy:
            sys.exit(f"{ev['from']} -> {ev['to']}: the screen was still moving {pts[i] - pts[busy[0]]:.2f}s before it")
        onsets.append((j, i))
    # A take ends still: find where the last transition settles.
    last_move = max(k for k in range(n) if diff[k] > ONSET)
    end = next((k for k in range(last_move, n) if pts[k] >= pts[last_move] + 0.25), n - 1)

    # The resting desktop: the still frame just before the first transition.
    rest_i = max(0, onsets[0][0] - 1)
    full = decode_frame(master, pts[rest_i])
    vdir = os.path.join(out_dir, meta["variant"])
    os.makedirs(vdir, exist_ok=True)
    rest_path = os.path.join(vdir, "rest.png")
    if not os.path.exists(rest_path):
        from PIL import Image
        Image.fromarray(full).save(rest_path, optimize=False, compress_level=3)
    rest = frames[rest_i]

    # Each state, settled: the last still frame before the next transition
    # (lossless, from the master) — the page shows it without JavaScript.
    from PIL import Image
    for k, ev in enumerate(events):
        still = os.path.join(vdir, f"{ev['to']}.png")
        if ev["to"] == "rest" or os.path.exists(still):
            continue
        last = (onsets[k + 1][0] if k + 1 < len(events) else end) - 1
        Image.fromarray(decode_frame(master, pts[last])).save(still, compress_level=3)

    manifest_path = os.path.join(vdir, "clips.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"clips": {}}
    for k, ev in enumerate(events):
        a = onsets[k][0]
        b = onsets[k + 1][0] if k + 1 < len(events) else end
        seg = frames[a:b + 1]
        # Every pixel that is not the rest desktop in any frame of the clip.
        changed = np.zeros(rest.shape[:2], bool)
        for f in seg:
            changed |= np.abs(f.astype(np.int16) - rest).max(axis=2) > 3
        ys, xs = np.nonzero(changed)
        sx, sy = FULL_W / SW, FULL_H / SH
        x0 = max(0, int(xs.min() * sx) - PAD); x1 = min(FULL_W, int((xs.max() + 1) * sx) + PAD)
        y0 = max(0, int(ys.min() * sy) - PAD); y1 = min(FULL_H, int((ys.max() + 1) * sy) + PAD)
        x0 -= x0 % 16; y0 -= y0 % 16
        w = min(FULL_W - x0, -(-(x1 - x0) // 16) * 16); h = min(FULL_H - y0, -(-(y1 - y0) // 16) * 16)
        name = f"{ev['from']}-{ev['to']}"
        # When it stops moving (a ticking second included), in playback seconds:
        # the page may start the next clip from here, since every frame after
        # it is the state's own.
        moving = [q for q in range(onsets[k][1], b) if diff[q] > ONSET]
        settle = round(((pts[moving[-1]] if moving else pts[a]) - pts[a] + 0.05) / speed, 3)
        if name in manifest["clips"] and os.path.exists(os.path.join(vdir, f"{name}.av1.mp4")):
            if manifest["clips"][name].get("take") == meta["take"]:
                manifest["clips"][name]["settle"] = min(settle, manifest["clips"][name]["duration"])
            continue   # the same edge from an earlier take: every take joins on the same frames
        t0, t1 = pts[a], pts[b]
        vf = f"crop={w}:{h}:{x0}:{y0},setpts=(PTS-STARTPTS)/{speed},fps=60"
        encode(master, t0, t1, vf, os.path.join(vdir, f"{name}.av1.mp4"), "av1")
        encode(master, t0, t1, vf, os.path.join(vdir, f"{name}.h264.mp4"), "h264")
        dur = (t1 - t0) / speed
        manifest["clips"][name] = {"from": ev["from"], "to": ev["to"], "box": [x0, y0, w, h],
                                   "duration": round(dur, 3), "settle": min(settle, round(dur, 3)), "take": meta["take"]}
        print(f"{meta['variant']}/{name}: {dur:.2f}s, box {w}x{h}+{x0}+{y0}, "
              f"av1 {os.path.getsize(os.path.join(vdir, name + '.av1.mp4')) // 1024} KB, "
              f"h264 {os.path.getsize(os.path.join(vdir, name + '.h264.mp4')) // 1024} KB")
    manifest.update({"size": [FULL_W, FULL_H], "shell": meta["shell"], "speed": speed,
                     "scene": meta["scene"], "scheme": meta["scheme"], "reduced": meta["reduced"]})
    json.dump(manifest, open(manifest_path, "w"), indent=1, sort_keys=True)


def decode_frame(path, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", path, "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(FULL_H, FULL_W, 3)


def encode(src, t0, t1, vf, out, codec):
    common = ["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.4f}", "-to", f"{t1:.4f}", "-i", src, "-an",
              "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
              "-movflags", "+faststart"]
    if codec == "av1":
        cmd = common + ["-vf", vf + ",scale=out_color_matrix=bt709:out_range=tv,format=yuv420p10le",
                        "-c:v", "libsvtav1", "-preset", "5", "-crf", "30", "-g", "999", "-svtav1-params", "tune=0", out]
    else:
        cmd = common + ["-vf", vf + ",scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high", "-g", "999", out]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
