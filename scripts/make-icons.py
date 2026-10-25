#!/usr/bin/env python3
"""Write PWA PNG icons without third-party libraries."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path


def png(width: int, height: int, rgba: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + rgba[y * stride : (y + 1) * stride]
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def pixel(x: float, y: float) -> tuple[int, int, int, int]:
    # Foundry brown with a copper pouring funnel.
    bg = (22, 20, 16)
    copper = (196, 106, 45)
    cream = (244, 239, 228)
    dx = x - 0.5
    dy = y - 0.5
    r = (dx * dx + dy * dy) ** 0.5
    if r > 0.46:
        return (*bg, 255)
    # Funnel mouth
    if 0.18 < y < 0.34 and abs(dx) < 0.22 + (0.34 - y) * 0.15:
        return (*copper, 255)
    # Cone
    if 0.32 < y < 0.62:
        half = 0.20 * (0.62 - y) / 0.30 + 0.045
        if abs(dx) < half:
            return (*copper, 255)
    # Sprue stem
    if 0.60 < y < 0.82 and abs(dx) < 0.045:
        return (*copper, 255)
    # Highlight
    if 0.24 < y < 0.30 and -0.16 < dx < -0.02:
        return (*cream, 255)
    return (31, 27, 22, 255)


def write_icon(path: Path, size: int) -> None:
    pixels = bytearray()
    for j in range(size):
        y = (j + 0.5) / size
        for i in range(size):
            x = (i + 0.5) / size
            pixels.extend(pixel(x, y))
    path.write_bytes(png(size, size, bytes(pixels)))


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "public"
    out.mkdir(exist_ok=True)
    write_icon(out / "icon-192.png", 192)
    write_icon(out / "icon-512.png", 512)
    write_icon(out / "apple-touch-icon.png", 180)
    print("wrote icons")


if __name__ == "__main__":
    main()
