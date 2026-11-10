"""Stage map backgrounds: MapBg01.atx of every cached Map%05d.aar -> public/stage-map/<map>.webp.

Incremental: maps already written are skipped and nothing is ever deleted, so a map the game
drops from its cache keeps its picture. Decoding a background takes ~2 s (pure-Python ALLZ), so
the first run is slow; later runs only add new maps.

  python export_stage_images.py [--width 640] [--limit N]
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image

from oshirore.cache import GameCache
from oshirore.lazy import LazyArchive
from oshirore.parse import Parser


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent / "public" / "stage-map"))
    ap.add_argument("--width", type=int, default=640)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    c = GameCache()
    done = new = 0
    for n in range(100000):
        name = "Map%05d.aar" % n
        if not c.has(name):
            continue
        path = out / f"{n}.webp"
        if path.is_file():
            done += 1
            continue
        arc = LazyArchive(c.read(name))
        bg = next((m for m in arc.names() if m.startswith("MapBg") and m.endswith(".atx")), None)
        if not bg:
            continue
        _, obj = Parser(arc.data)._object(arc.offsets[bg])
        img = obj.data.get("image")
        if img is None or "rgba" not in img.data:
            continue
        im = Image.frombytes("RGBA", (img.data["width"], img.data["height"]), img.data["rgba"]).convert("RGB")
        if im.width > args.width:
            im = im.resize((args.width, round(im.height * args.width / im.width)), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=78, method=6)
        path.write_bytes(buf.getvalue())
        new += 1
        if new % 50 == 0:
            print(f"{new} new maps written", flush=True)
        if args.limit and new >= args.limit:
            break
    print(f"{new} new, {done} already there -> {out}")


if __name__ == "__main__":
    main()
