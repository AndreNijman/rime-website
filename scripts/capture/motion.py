#!/usr/bin/env python3
"""motion.py MASTER — per-frame change of a recording: pts (s) and the share of
pixels that changed since the previous frame, from a 480x300 grey decode."""
import subprocess, sys
import numpy as np
W, H = 480, 300
def frames(path):
    pts = [float(l.split(",")[0]) for l in subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "frame=pts_time", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True).stdout.split() if l.strip()]
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}:flags=area,format=gray",
                          "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
    return pts[:len(a)], a
if __name__ == "__main__":
    pts, a = frames(sys.argv[1])
    prev = a[0]
    for t, f in zip(pts, a):
        ch = float((np.abs(f - prev) > 6).mean()); prev = f
        print(f"{t:8.3f} {ch:.5f}")
