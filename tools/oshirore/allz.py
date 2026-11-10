"""AL container decompression: ``ALLZ`` (legacy) and ``ALL4`` (current).

Two on-disk compression containers appear:

  * ``ALLZ`` -- the legacy bitstream LZ77 scheme handled by the original Lua
    tool. Ported faithfully below.
  * ``ALL4`` -- the *new* format the current game shipped (and the reason the
    old Lua tool broke). Layout: ``"ALL4"`` + version(u32) + dst_size(u32) +
    a standard LZ4 *frame*. Decoded via the ``lz4`` package.

``decompress()`` dispatches on the magic and returns non-container input
unchanged.

The ALLZ port below is line-for-line from ``parse_al.lua``. ALLZ is an
LZ77-style scheme with a bitstream-coded control word interleaved with raw
literal bytes.

Header:
  "ALLZ", version(==1), minbits_length, minbits_offset, minbits_literal,
  dst_size (u32 little-endian).

The decoder keeps a single shared byte cursor (``self.off``) used both to
refill the LSB-first bit buffer and to read literal bytes. This shared-cursor
behaviour matters: when a literal run is read, any partially-buffered bits are
discarded and reading resumes byte-aligned from the cursor -- exactly as the
Lua does. The control words around each literal save/restore the cursor so the
literal bytes are read from the right place.
"""

from __future__ import annotations


class _Stream:
    """Mirrors the Lua decoder's shared (bits, bits_count, offset) state."""

    __slots__ = ("data", "off", "bits", "count")

    def __init__(self, data: bytes, off: int):
        self.data = data
        self.off = off          # byte cursor (0-based)
        self.bits = 0
        self.count = 0

    def _ensure(self, n: int) -> None:
        while self.count < n:
            self.bits |= self.data[self.off] << self.count
            self.off += 1
            self.count += 8

    def bit(self) -> int:
        self._ensure(1)
        r = self.bits & 1
        self.bits >>= 1
        self.count -= 1
        return r

    def bits_n(self, n: int) -> int:
        self._ensure(n)
        r = self.bits & ((1 << n) - 1)
        self.bits >>= n
        self.count -= n
        return r

    def unary(self) -> int:
        n = 0
        while self.bit() == 1:
            n += 1
        return n

    def control(self, minbits: int) -> int:
        u = self.unary()
        n = self.bits_n(u + minbits)
        if u > 0:
            return n + (((1 << u) - 1) << minbits)
        return n


def decompress(data: bytes) -> bytes:
    """Decompress an AL container. Non-container input is returned unchanged."""
    magic = data[:4]
    if magic == b"ALL4":
        return _decompress_all4(data)
    if magic != b"ALLZ":
        return data

    assert data[4] == 1, "unsupported ALLZ version"
    minbits_length = data[5]
    minbits_offset = data[6]
    minbits_literal = data[7]
    dst_size = int.from_bytes(data[8:12], "little")

    s = _Stream(data, 12)
    dst = bytearray()

    def read_literal_len() -> int:
        return 1 + s.control(minbits_literal)

    def read_length() -> int:
        return 3 + s.control(minbits_length)

    def read_offset() -> int:
        return -1 - s.control(minbits_offset)

    def copy_literal(n: int) -> None:
        for _ in range(n):
            dst.append(s.data[s.off])
            s.off += 1

    def copy_word(off: int, length: int) -> None:
        for _ in range(length):
            dst.append(dst[len(dst) + off])

    # initial segment
    copy_literal(read_literal_len())

    word_off = read_offset()
    word_len = read_length()
    literal = 0

    finish = "overflow"
    while s.off <= len(data):
        if len(dst) + word_len >= dst_size:
            finish = "word"
            break
        if s.bit() == 0:
            literal = read_literal_len()
            if len(dst) + word_len + literal >= dst_size:
                finish = "literal"
                break
            literal_offset = s.off
            s.off += literal
            next_off = read_offset()
            next_len = read_length()
            copy_word(word_off, word_len)
            control_offset = s.off
            s.off = literal_offset
            copy_literal(literal)
            assert s.off == literal_offset + literal
            s.off = control_offset
            word_off, word_len = next_off, next_len
        else:
            next_off = read_offset()
            next_len = read_length()
            copy_word(word_off, word_len)
            word_off, word_len = next_off, next_len

    if finish == "word":
        copy_word(word_off, word_len)
    elif finish == "literal":
        copy_word(word_off, word_len)
        copy_literal(literal)
    else:
        raise ValueError("ALLZ stream overflowed without terminating")

    if len(dst) != dst_size:
        raise ValueError(f"ALLZ size mismatch: got {len(dst)}, expected {dst_size}")
    return bytes(dst)


def _decompress_all4(data: bytes) -> bytes:
    """Decompress an ALL4 container (``ALL4`` + u32 version + u32 size + LZ4 frame)."""
    try:
        import lz4.frame
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "ALL4 files require the 'lz4' package (pip install lz4)"
        ) from exc

    version = int.from_bytes(data[4:8], "little")
    assert version == 1, f"unsupported ALL4 version {version}"
    dst_size = int.from_bytes(data[8:12], "little")
    out = lz4.frame.decompress(data[12:])
    if len(out) != dst_size:
        raise ValueError(f"ALL4 size mismatch: got {len(out)}, expected {dst_size}")
    return out
