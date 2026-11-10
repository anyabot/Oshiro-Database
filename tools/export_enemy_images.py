"""Enemy battle sprites -> public/enemy-icon/<DotID>.webp (one standing frame each).

Enemy.DotID (外観) names Enemy%03d.atx inside EnemyStory1.aar (793 of the 795 DotIDs in use are
there); an enemy with DotID 0 uses its own EnemyID (1769 of the 1777 such enemies have that sheet). Each sheet holds three animations in sprite-index order: attack, stand, walk; the icon is
the first frame of the stand animation (the first animation when a sheet has only one).
Incremental: existing icons are skipped and nothing is deleted.

  python export_enemy_images.py
"""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image

from oshirore.cache import GameCache
from oshirore.lazy import LazyArchive
from oshirore.parse import Parser

MAX = 128


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "public" / "enemy-icon"
    out.mkdir(parents=True, exist_ok=True)
    c = GameCache()
    arc = LazyArchive(c.read("EnemyStory1.aar"))
    dots = sorted({r["DotID"] or r["EnemyID"] for r in c.table("EnemyTable.aar", "Enemy.atb") if r["EnemyID"]})
    new = have = missing = 0
    for d in dots:
        path = out / f"{d}.webp"
        if path.is_file():
            have += 1
            continue
        name = "Enemy%03d.atx" % d
        if name not in arc.offsets:
            missing += 1
            continue
        _, obj = Parser(arc.data)._object(arc.offsets[name])
        img, sprites = obj.data.get("image"), obj.data.get("sprites") or {}
        if img is None or "rgba" not in img.data or not sprites:
            missing += 1
            continue
        sheet = Image.frombytes("RGBA", (img.data["width"], img.data["height"]), img.data["rgba"])
        keys = sorted(sprites)
        order = ([keys[1]] if len(keys) > 1 else []) + keys
        icon = None
        # first non-empty frame of the stand animation, else of any animation
        for k in order:
            for f in sprites[k]["frames"]:
                if f["width"] < 2 or f["height"] < 2:
                    continue
                cand = sheet.crop((f["x"], f["y"], f["x"] + f["width"], f["y"] + f["height"]))
                if cand.getbbox():
                    icon = cand
                    break
            if icon:
                break
        if icon is None:
            missing += 1
            continue
        icon.thumbnail((MAX, MAX), Image.LANCZOS)
        buf = io.BytesIO()
        try:
            icon.save(buf, "WEBP", quality=88, method=6)
        except ValueError as err:
            print(f"Enemy{d:03d}: {err}")
            missing += 1
            continue
        path.write_bytes(buf.getvalue())
        new += 1
    print(f"{new} new enemy icons, {have} already there, {missing} DotIDs without a sprite -> {out}")


if __name__ == "__main__":
    main()
