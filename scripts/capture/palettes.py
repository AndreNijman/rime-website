#!/usr/bin/env python3
"""palettes.py OUT_DIR — each published scene's colors.json, dark and light:
the `source` block src/data/scenes.json holds, which build-scenes.mjs maps from
matugen exactly as the shell's own template does."""
import json, os, sys
root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
scenes = json.load(open(os.path.join(root, "src/data/scenes.json")))["scenes"]
os.makedirs(sys.argv[1], exist_ok=True)
for s in scenes:
    for mode in ("dark", "light"):
        json.dump(s[mode]["source"], open(os.path.join(sys.argv[1], f"{s['id']}-{mode}.json"), "w"))
    print(s["id"])
