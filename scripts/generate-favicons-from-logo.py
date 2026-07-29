#!/usr/bin/env python3
"""Generate favicon PNGs + ICO from NomNom wordmark (aligned with public/logo/logo_single.png)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from PIL import Image


def find_bold_font() -> str | None:
    windir = os.environ.get("WINDIR", "C:/Windows")
    candidates = [
        f"{windir}/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/System/Library/Fonts/SFNSDisplay.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def _try_font(font_path: str | None, px: int):
    from PIL import ImageFont

    try:
        return ImageFont.truetype(font_path, px) if font_path else ImageFont.load_default()
    except OSError:
        return ImageFont.load_default()


def render_monogram_favicon(size_out: int, font_path: str | None) -> Image.Image:
    """
    J + N + N monogram (Just + NomNom, same colors as wordmark). Readable at 16–48px.
    Supersample then scale down for cleaner edges.
    """
    from PIL import ImageDraw

    parts = [
        ("J", (0, 0, 0, 255)),
        ("N", (255, 107, 43, 255)),
        ("N", (255, 107, 43, 255)),
    ]
    scale = 6 if size_out <= 16 else 4
    S = size_out * scale
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    max_w = int(S * 0.88)
    max_h = int(S * 0.80)

    lo, hi, best = 8, min(S * 2, 600), 12
    while lo <= hi:
        mid = (lo + hi) // 2
        font = _try_font(font_path, mid)
        total_w = 0
        max_top = 0
        max_bottom = 0
        for text, _ in parts:
            bbox = d.textbbox((0, 0), text, font=font, anchor="ls")
            total_w += bbox[2] - bbox[0]
            max_top = min(max_top, bbox[1])
            max_bottom = max(max_bottom, bbox[3])
        text_h = max_bottom - max_top
        g = len(parts) - 1
        approx_kern = max(1, int((total_w / max(len(parts), 1)) * 0.08))
        tight_w = int((total_w - g * approx_kern) * 0.96)
        if tight_w <= max_w and text_h <= max_h and total_w > 0:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1

    font = _try_font(font_path, best)
    widths: list[int] = []
    for text, _ in parts:
        bbox = d.textbbox((0, 0), text, font=font, anchor="ls")
        widths.append(bbox[2] - bbox[0])
    # Overlap kerning ~8% of smaller glyph width between adjacent letters
    kern = max(1, int(min(widths) * 0.08))
    gaps = len(parts) - 1
    total = sum(widths) - gaps * kern
    x = (S - total) // 2
    line = "".join(p[0] for p in parts)
    bbox_line = d.textbbox((0, 0), line, font=font, anchor="ls")
    text_h = bbox_line[3] - bbox_line[1]
    y = (S - text_h) // 2 - bbox_line[1]

    for i, ((text, color), w) in enumerate(zip(parts, widths)):
        d.text((x, y), text, font=font, fill=color, anchor="ls")
        if i < gaps:
            x += w - kern

    return img.resize((size_out, size_out), Image.Resampling.LANCZOS)


def render_wordmark_favicon(size: int, font_path: str | None) -> Image.Image:
    """Full Just + NomNom for large touch / PWA icons."""
    from PIL import ImageDraw

    parts = [("Just", (0, 0, 0, 255)), ("NomNom", (255, 107, 43, 255))]
    S = size
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    max_w = int(S * 0.88)
    max_h = int(S * 0.42)

    lo, hi, best = 6, min(S * 3, 400), 8
    while lo <= hi:
        mid = (lo + hi) // 2
        font = _try_font(font_path, mid)
        total_w = 0
        max_top = 0
        max_bottom = 0
        for text, _ in parts:
            bbox = d.textbbox((0, 0), text, font=font, anchor="ls")
            total_w += bbox[2] - bbox[0]
            max_top = min(max_top, bbox[1])
            max_bottom = max(max_bottom, bbox[3])
        text_h = max_bottom - max_top
        if total_w <= max_w and text_h <= max_h and total_w > 0:
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1

    font = _try_font(font_path, best)
    widths: list[int] = []
    for text, _ in parts:
        bbox = d.textbbox((0, 0), text, font=font, anchor="ls")
        widths.append(bbox[2] - bbox[0])
    total = sum(widths)
    x = (S - total) // 2
    line = parts[0][0] + parts[1][0]
    bbox_line = d.textbbox((0, 0), line, font=font, anchor="ls")
    text_h = bbox_line[3] - bbox_line[1]
    y = (S - text_h) // 2 - bbox_line[1]

    for (text, color), w in zip(parts, widths):
        d.text((x, y), text, font=font, fill=color, anchor="ls")
        x += w

    return img


def render_favicon(size: int, font_path: str | None, *, mode: str = "auto") -> Image.Image:
    if mode == "wordmark":
        return render_wordmark_favicon(size, font_path)
    if mode == "monogram":
        return render_monogram_favicon(size, font_path)
    if size <= 48:
        return render_monogram_favicon(size, font_path)
    return render_wordmark_favicon(size, font_path)


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    fav = root / "public" / "favicon"
    fav.mkdir(parents=True, exist_ok=True)

    font_path = find_bold_font()
    if not font_path:
        print("Warning: no bold system font found; using default (may look wrong)", file=sys.stderr)

    outputs = [
        (16, fav / "favicon-16x16.png"),
        (32, fav / "favicon-32x32.png"),
        (180, fav / "apple-touch-icon.png"),
        (192, fav / "android-chrome-192x192.png"),
        (512, fav / "android-chrome-512x512.png"),
    ]

    images_by_size: dict[int, Image.Image] = {}
    for dim, path in outputs:
        im = render_favicon(dim, font_path)
        im.save(path, format="PNG")
        images_by_size[dim] = im
        print("Wrote", path.relative_to(root))

    # Multi-resolution ICO for browsers
    ico_path = fav / "favicon.ico"
    img16 = images_by_size[16]
    img32 = images_by_size[32]
    img48 = render_favicon(48, font_path, mode="monogram")
    img16.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[img32, img48],
    )
    print("Wrote", ico_path.relative_to(root))

    # Payload admin + middleware expect /favicon.ico at public root
    ico_bytes = ico_path.read_bytes()
    root_ico = root / "public" / "favicon.ico"
    root_ico.write_bytes(ico_bytes)
    print("Wrote", root_ico.relative_to(root))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
