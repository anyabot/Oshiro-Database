"""Parse AL-family binary objects into Python structures.

Ported from ``parse_al.lua``, scoped (for now) to the stat-bearing object
types -- the rest (images/animations) are recognised but returned as opaque.

Supported:
  * ALLZ -- transparently decompressed, then re-parsed
  * ALAR -- archive: a table of contents of named sub-objects (v2 and v3)
  * ALTB -- table: rows of typed fields described by an ALRD header
  * ALRD -- table header: field definitions (offset/type/name)

ALTB is the workhorse for stats; ``table_to_records`` flattens an ALTB into a
list of ``{field_name: value}`` dicts.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from typing import Any, Optional

import numpy as np

from .allz import decompress

# Object types we recognise but do not (yet) decode into structure.
_OPAQUE_TYPES = {"ALOD", "ALMT", "ALSN", "ALFT"}

# 5-bit -> 8-bit channel expansion (the Lua tool's table). 4-bit channels
# expand as v * 17 (= round(v * 255 / 15)).
_CONV5 = np.array([(v // 8) * 64 + (v % 8) * 9 for v in range(32)], np.uint8)


@dataclass
class ALObject:
    type: str
    # Generic payload; exact shape depends on type (see parsers below).
    data: dict[str, Any] = field(default_factory=dict)
    rows: list = field(default_factory=list)        # ALTB rows / ALAR members
    header: Optional["ALObject"] = None             # ALRD for ALTB
    raw: Optional[bytes] = None                      # decompressed bytes (ALLZ)


@dataclass
class ALField:
    offset: int
    type: int
    name_en: str
    name_jp: str


class _Reader:
    """Little-endian binary reader with the helpers parse_al.lua relies on."""

    __slots__ = ("d",)

    def __init__(self, data: bytes):
        self.d = data

    def u8(self, o: int) -> int:
        return self.d[o]

    def u16(self, o: int) -> int:
        return self.d[o] | (self.d[o + 1] << 8)

    def u32(self, o: int) -> int:
        return int.from_bytes(self.d[o:o + 4], "little")

    def s32(self, o: int) -> int:
        v = self.u32(o)
        return v - 0x100000000 if v >= 0x80000000 else v

    def f32(self, o: int) -> float:
        return struct.unpack_from("<f", self.d, o)[0]

    def string(self, o: int, maxlen: int) -> str:
        end = o + maxlen
        if end <= o:
            return ""
        stop = self.d.find(0, o, end)
        if stop < 0:
            if end > len(self.d):
                raise IndexError("string runs past the end of the data")
            stop = end
        return self.d[o:stop].decode("utf-8", "replace")


def _align(offset: int, a: int, n: int) -> int:
    """Align ``offset`` (0-based) the way the Lua ``align(offset, a, n)`` did.

    The Lua used 1-based offsets, so its residue ``n`` is relative to a 1-based
    cursor; every call site in parse_al.lua uses ``n == 1``, i.e. "1-based
    offset ≡ 1 (mod a)" == "0-based offset ≡ 0 (mod a)". We translate here so
    call sites stay verbatim with the Lua (``_align(off, 4, 1)``).
    """
    target = (n - 1) % a
    while offset % a != target:
        offset += 1
    return offset


class Parser:
    def __init__(self, data: bytes):
        self.r = _Reader(data)
        self.d = data

    def parse(self) -> ALObject:
        # Top-level container compression (ALL4 / ALLZ) is unwrapped first so
        # the parser only ever sees real AL objects. The inner ALLZ branch of
        # _object handles compressed sub-objects encountered mid-stream.
        magic = self.d[:4]
        if magic in (b"ALL4", b"ALLZ"):
            raw = decompress(self.d)
            inner = Parser(raw)._object(0)[1]
            inner.raw = raw
            return inner
        _, obj = self._object(0)
        return obj

    # Returns (next_offset_or_None, ALObject)
    def _object(self, off: int):
        r = self.r
        otype = r.string(off, 4)
        obj = ALObject(type=otype)

        if otype in ("ALLZ", "ALL4"):
            # A compressed sub-object: decompress from this offset onward and
            # parse the result. (Inside an archive, members can be compressed.)
            raw = decompress(self.d[off:])
            inner = Parser(raw)._object(0)[1]
            inner.raw = raw
            return None, inner

        if otype == "ALAR":
            return self._alar(off, obj)

        if otype == "ALTB":
            return self._altb(off, obj)

        if otype == "ALRD":
            return self._alrd(off, obj)

        if otype == "ALTX":
            return self._altx(off, obj)

        if otype == "ALIG":
            return self._alig(off, obj)

        if otype in _OPAQUE_TYPES:
            # Not decoded here; callers extracting stats won't hit these.
            return None, obj

        raise ValueError(f"unknown object type {otype!r} at 0x{off:x}")

    # ---- ALAR: archive of named members -------------------------------------
    def _alar(self, off: int, obj: ALObject):
        r = self.r
        base = off
        vers = r.u8(off + 4)
        assert vers in (2, 3), f"ALAR version {vers}"

        def toc_entry(o: int):
            e: dict[str, Any] = {}
            if vers == 2:
                e["index"] = r.u16(o); o += 2
                o += 2
                e["address"] = r.u32(o); o += 4
                e["size"] = r.u32(o); o += 4
                o += 4
                e["name"] = r.string(base + e["address"] - 0x22, 0x20)
            else:
                e["index"] = r.u16(o); o += 2
                o += 2
                e["address"] = r.u32(o); o += 4
                e["size"] = r.u32(o); o += 4
                o += 6
                e["name"] = r.string(o, 0xFFFF)
                o += len(e["name"]) + 1
                o = _align(o, 4, 1)
            return o, e

        record_count = r.u16(off + 6)
        if vers == 2:
            off += 0x10
        else:
            off += 0x10
            off += 2  # data_offset (u16)
            for _ in range(record_count):
                off += 2  # toc_offset table
            off = _align(off, 4, 1)

        members = []
        for _ in range(record_count):
            off, entry = toc_entry(off)
            ext = entry["name"].rsplit(".", 1)[-1].lower() if "." in entry["name"] else ""
            addr = base + entry["address"]
            if ext in ("txt", "lua"):
                value = ALObject(type="TEXT", data={
                    "text": self.d[addr:addr + entry["size"]]
                })
            else:
                _, value = self._object(addr)
                # retain raw bytes for opaque types (ALOD/ALMT/...) so callers can
                # sub-decode (e.g. ALOD animation length for the attack interval).
                if value is not None and value.type in _OPAQUE_TYPES and not value.raw:
                    value.raw = self.d[addr:addr + entry["size"]]
            members.append({"name": entry["name"], "value": value, "toc": entry})

        obj.rows = members
        return None, obj

    # ---- ALRD: table header --------------------------------------------------
    def _alrd(self, off: int, obj: ALObject):
        r = self.r
        count = r.u8(off + 6)
        off += 10
        fields: list[ALField] = []
        for _ in range(count):
            foff = r.u16(off); off += 2
            ftype = r.u8(off)
            b = r.u8(off + 1)
            off += 2
            len_en = r.u8(off)
            len_jp = r.u8(off + 1)
            off += 2
            name_en = r.string(off, len_en); off += len_en + 1
            name_jp = r.string(off, len_jp); off += len_jp + 1
            off = _align(off, 4, 1)
            off += b
            off = _align(off, 4, 1)
            fields.append(ALField(offset=foff, type=ftype,
                                  name_en=name_en, name_jp=name_jp))
        obj.rows = fields
        return off, obj

    # ---- ALTB: table of typed rows ------------------------------------------
    def _altb(self, off: int, obj: ALObject):
        r = self.r
        start = off
        off += 4
        vers = r.u8(off); off += 1
        assert vers == 1
        form = r.u8(off); off += 1
        # form 0x00: no strings section and no label (numeric-only table)
        assert form in (0x00, 0x04, 0x10, 0x14, 0x1E), f"ALTB form {form:#x}"
        count = r.u16(off); off += 2
        off += 2  # unk1 (header length)
        entry_offset = start + r.u16(off); off += 2
        size = r.u32(off); off += 4

        strings_start = None
        strings_size = None
        # form 0x04 carries a strings section like 0x14 (two u32 after rowsize)
        if form in (0x04, 0x14, 0x1E):
            strings_size = r.u32(off); off += 4
            strings_start = start + r.u32(off); off += 4

        names_start = None
        if form == 0x1E:
            names_start = r.u32(off); off += 4

        # form 0x04 has no 4-byte table label — the ALRD follows the strings
        # section directly. Other forms carry a label tag before it.
        if r.string(off, 4) == "ALRD":
            label = ""
        else:
            label = r.string(off, 4); off += 4
        off, header = self._object(off)
        assert header.type == "ALRD"
        obj.header = header
        obj.data["label"] = label
        off = _align(off, 4, 1)

        header_fields: list[ALField] = header.rows
        rows = []
        for _ in range(count):
            row = []
            for fld in header_fields:
                if fld.type in (1, 0x20):
                    v: Any = r.s32(off + fld.offset)
                elif fld.type == 4:
                    v = r.f32(off + fld.offset)
                elif fld.type == 5:
                    v = r.u8(off + fld.offset)
                else:
                    v = None
                if fld.type == 0x20 and strings_start is not None:
                    v = r.string(strings_start + v, 0xFFFF)
                row.append({"field": fld, "value": v})
            rows.append(row)
            off += size

        off = _align(off, 4, 1)
        if strings_start is not None:
            off = strings_start + strings_size
            off = _align(off, 4, 1)
        if names_start is not None:
            off += 4  # unk == 1
            name_len = r.u8(off); off += 1
            obj.data["name"] = r.string(off, name_len)
            off += name_len
            off = _align(off, 4, 1)

        obj.rows = rows
        return off, obj

    # ---- ALTX: texture container (sprite frames + raw image) -----------------
    def _altx(self, off: int, obj: ALObject):
        r = self.r
        start = off
        off += 4
        vers = r.u8(off); off += 1
        assert vers in (0, 1)  # current game uses v1; same layout as v0
        form = r.u8(off); off += 1
        assert form in (0, 0x0E)
        count = r.u16(off); off += 2
        alig_offset = start + r.u32(off); off += 4

        def parse_sprites(off: int) -> dict[int, Any]:
            # v0: the table holds each block's absolute offset (from the ALTX
            # start). v1: it holds cumulative DELTAS -- block i starts at the
            # running sum of entries 0..i. Reading v1 deltas as absolutes made
            # the cursor drift into garbage sprite records on multi-sprite
            # atlases (HomeRotationBanner et al).
            block_start = []
            pos = 0
            for _ in range(count):
                v = r.u16(off); off += 2
                if vers >= 1:
                    pos += v
                    block_start.append(start + pos)
                else:
                    block_start.append(start + v)
            off = _align(off, 4, 1)
            sprites: dict[int, Any] = {}
            for i in range(count):
                # The block-start table is authoritative: seek to it instead of
                # trusting the sequential cursor. An optional fixed 0x20-byte
                # sprite-name field sits immediately BEFORE the block (it may
                # fill all 0x20 bytes with no NUL terminator).
                bs = block_start[i]
                frame_name = None
                if off <= bs - 0x20:
                    s = r.string(bs - 0x20, 0x20)
                    if s and all(32 <= ord(c) < 127 for c in s):
                        frame_name = s
                off = bs
                index = r.u16(off); off += 2
                if index in sprites:
                    index = max(sprites) + 1 + i
                off += 2
                frames = r.u16(off); off += 2
                off += 2
                ft: list[dict[str, int]] = []
                for _ in range(frames):
                    fr = {
                        "x": r.u16(off), "y": r.u16(off + 2),
                        "width": r.u16(off + 4), "height": r.u16(off + 6),
                    }
                    off += 8
                    ft.append(fr)
                for fr in ft:
                    fr["origin_x"] = r.u16(off); fr["origin_y"] = r.u16(off + 2)
                    off += 4
                sprites[index] = {"name": frame_name, "frames": ft}
            return sprites

        if form == 0:
            obj.data["sprites"] = parse_sprites(off)
            off = alig_offset
            _, rawimage = self._object(off)
            assert rawimage.type == "ALIG"
            obj.data["image"] = rawimage
            return None, obj
        else:
            # form 0x0e: image is named, stored elsewhere (e.g. the per-card
            # art PNGs). The sprite cut table is still present and holds the
            # atlas regions inside the external image (Oshiro card art: main
            # illustration + the 3 expression faces). Some archives may omit
            # it -- drop sprites on any structural surprise.
            try:
                obj.data["sprites"] = parse_sprites(off)
            except Exception:
                obj.data.pop("sprites", None)
            off = alig_offset
            width = r.u16(off); off += 2
            height = r.u16(off); off += 2
            name = r.string(off, 0x100)
            obj.data.update(image_name=name, width=width, height=height)
            return None, obj

    # ---- ALIG: raw pixel image ----------------------------------------------
    def _alig(self, off: int, obj: ALObject):
        r = self.r
        off += 4
        vers = r.u8(off); off += 1
        assert vers == 1
        off += 3  # unk1/unk2/unk3
        form = r.string(off, 4); off += 4
        palette_form = r.string(off, 4); off += 4
        width = r.u32(off); off += 4
        height = r.u32(off); off += 4
        off += 4  # unk5 (u16 ==1) + unk6 (u16 ==0x20)
        hdr_pal = r.u32(off); off += 4  # 0x20 header + palette bytes

        obj.data["width"] = width
        obj.data["height"] = height
        obj.data["format"] = form

        d = self.d
        n = width * height
        # Produce RGBA bytes regardless of source format. Pixels are decoded
        # as whole numpy arrays; the result is byte-identical to a per-pixel
        # walk of the same layout.

        if form in ("PAL4", "PAL8", "PAL6"):
            assert palette_form == "RGBA"
            # PAL4 = 4-bit indices (2/byte); PAL8 = 1 byte/index; PAL6 =
            # 16-bit indices. The palette SIZE is variable and encoded in the
            # header's last dword: 0x20 (the header itself) + palette bytes
            # (PAL8 0x420 = 256 entries; PAL6 0x820/0x1020 = 512/1024,
            # verified on Card2245_1's 1024-color AW art; PAL4 0x60 = 16 --
            # matches the old Lua's unk7 assert values).
            psize = (hdr_pal - 0x20) // 4
            if psize <= 0:
                psize = {"PAL4": 16, "PAL8": 256, "PAL6": 512}[form]
            palette = np.frombuffer(d, np.uint8, psize * 4, off).reshape(psize, 4)
            off += psize * 4
            if form == "PAL4":
                packed = np.frombuffer(d, np.uint8, n // 2, off)
                off += n // 2
                idx = np.empty(packed.size * 2, np.intp)
                idx[0::2] = packed >> 4
                idx[1::2] = packed & 0xF
            elif form == "PAL8":
                idx = np.frombuffer(d, np.uint8, n, off).astype(np.intp)
                off += n
            else:  # PAL6: 16-bit little-endian index into a 512-entry palette
                idx = np.frombuffer(d, "<u2", n, off).astype(np.intp)
                off += 2 * n
            rgba = palette[idx].tobytes()
        elif form in ("ABG5", "BGR5", "ABG4", "BGR4"):
            pix = np.frombuffer(d, "<u2", n, off).astype(np.intp)
            off += 2 * n
            out = np.empty((n, 4), np.uint8)
            if form == "ABG5":
                out[:, 0] = _CONV5[(pix >> 11) & 31]
                out[:, 1] = _CONV5[(pix >> 6) & 31]
                out[:, 2] = _CONV5[(pix >> 1) & 31]
                out[:, 3] = (pix & 1) * 255
            elif form == "BGR5":
                out[:, 0] = _CONV5[(pix >> 10) & 31]
                out[:, 1] = _CONV5[(pix >> 5) & 31]
                out[:, 2] = _CONV5[pix & 31]
                out[:, 3] = ((pix >> 15) & 1) * 255
            elif form == "ABG4":
                out[:, 0] = ((pix >> 12) & 15) * 17
                out[:, 1] = ((pix >> 8) & 15) * 17
                out[:, 2] = ((pix >> 4) & 15) * 17
                out[:, 3] = (pix & 15) * 17
            else:  # BGR4
                out[:, 0] = ((pix >> 8) & 15) * 17
                out[:, 1] = ((pix >> 4) & 15) * 17
                out[:, 2] = (pix & 15) * 17
                out[:, 3] = ((pix >> 12) & 15) * 17
            rgba = out.tobytes()
        elif form == "RGBA":
            rgba = bytes(d[off: off + 4 * n])
            off += 4 * n
        elif form == "BGRA":
            chunk = d[off: off + 4 * n]
            off += 4 * n
            if len(chunk) % 4:
                raise ValueError("truncated BGRA pixel data")
            rgba = (np.frombuffer(chunk, np.uint8).reshape(-1, 4)[:, [2, 1, 0, 3]]
                    .tobytes())
        else:
            raise ValueError(f"unknown ALIG format {form!r}")

        obj.data["rgba"] = rgba
        return off, obj


def parse(data: bytes) -> ALObject:
    """Parse a (possibly ALLZ-compressed) AL object from bytes."""
    return Parser(data).parse()


def table_to_records(obj: ALObject) -> list[dict[str, Any]]:
    """Flatten an ALTB into a list of ``{field_name: value}`` dicts."""
    if obj.type != "ALTB":
        raise ValueError(f"expected ALTB, got {obj.type}")
    out = []
    for row in obj.rows:
        rec = {}
        for cell in row:
            rec[cell["field"].name_en] = cell["value"]
        out.append(rec)
    return out
