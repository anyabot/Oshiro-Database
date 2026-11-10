"""Read game files from the desktop client's local cache.

The DMM desktop client (``shiroprore_exe``) keeps every downloaded asset in
``<install>/.cache/<sha256(file name)>``, already decompressed, with the
asset's MD5 in ``.cache/MD5/<sha256>.md5``. The cache is refreshed by the
client on every game update, so it is the current data as of the last time
the game was started.
"""

from __future__ import annotations

import hashlib
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from .parse import ALObject, parse, table_to_records

DEFAULT_CACHE = Path(os.environ.get("OSHIRO_CACHE", Path.home() / "shiroprore_exe" / ".cache"))


class GameCache:
    def __init__(self, root: Path = DEFAULT_CACHE):
        self.root = Path(root)
        if not self.root.is_dir():
            raise FileNotFoundError(f"game cache not found: {self.root} (set OSHIRO_CACHE)")

    def path(self, name: str) -> Path:
        return self.root / hashlib.sha256(name.encode("utf-8")).hexdigest()

    def has(self, name: str) -> bool:
        return self.path(name).is_file()

    def md5(self, name: str) -> str | None:
        p = self.root / "MD5" / (hashlib.sha256(name.encode("utf-8")).hexdigest() + ".md5")
        return p.read_text(encoding="utf-8-sig").strip() if p.is_file() else None

    def read(self, name: str) -> bytes:
        p = self.path(name)
        if not p.is_file():
            raise FileNotFoundError(f"{name} is not in the game cache")
        return p.read_bytes()

    @lru_cache(maxsize=64)
    def obj(self, name: str) -> ALObject:
        return parse(self.read(name))

    def members(self, name: str) -> dict[str, ALObject]:
        """Members of an ALAR archive, keyed by member file name."""
        o = self.obj(name)
        if o.type != "ALAR":
            raise ValueError(f"{name}: expected ALAR, got {o.type}")
        return {m["name"]: m["value"] for m in o.rows}

    def table(self, archive: str, member: str | None = None) -> list[dict[str, Any]]:
        """Rows of an ALTB, either a top-level .atb or a member of an .aar."""
        o = self.obj(archive) if member is None else self.members(archive)[member]
        return table_to_records(o)
