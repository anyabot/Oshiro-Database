"""Read single members of an ALAR archive without decoding the others.

Map archives (``MapNNNNN.aar``) carry a compressed background texture next to
their small tables; decoding it dominates parse time, so stage exports read
the table of contents and parse only the members they ask for.
"""

from __future__ import annotations

from typing import Any

from .parse import Parser, _align, _Reader, table_to_records


def _toc(data: bytes) -> dict[str, int]:
    """Member name -> absolute offset, for an uncompressed ALAR."""
    r = _Reader(data)
    assert data[:4] == b"ALAR", data[:4]
    vers = r.u8(4)
    count = r.u16(6)
    off = 0x10
    if vers != 2:
        off += 2 + 2 * count
        off = _align(off, 4, 1)
    out: dict[str, int] = {}
    for _ in range(count):
        if vers == 2:
            addr = r.u32(off + 4)
            name = r.string(addr - 0x22, 0x20)
            off += 16
        else:
            addr = r.u32(off + 4)
            off += 14
            name = r.string(off, 0xFFFF)
            off += len(name) + 1
            off = _align(off, 4, 1)
        out[name] = addr
    return out


class LazyArchive:
    def __init__(self, data: bytes):
        self.data = data
        self.offsets = _toc(data)

    def names(self) -> list[str]:
        return list(self.offsets)

    def table(self, name: str) -> list[dict[str, Any]]:
        _, obj = Parser(self.data)._object(self.offsets[name])
        return table_to_records(obj)

    def columns(self, name: str) -> list[tuple[str, str]]:
        _, obj = Parser(self.data)._object(self.offsets[name])
        return [(f.name_en, f.name_jp) for f in obj.header.rows]
