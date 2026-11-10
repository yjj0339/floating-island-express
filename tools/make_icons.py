#!/usr/bin/env python3
"""Generate PWA / iOS home-screen icons for Floating Island Express."""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

SS = 4  # supersample factor


def rounded_rect_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def gradient(size, top, bottom):
    img = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(1, size - 1)
        c = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        img.putpixel((0, y), c)
    return img.resize((size, size))


def draw_icon(size, padding=0.0, bg_radius=0.26):
    S = size * SS
    canvas = Image.new("RGBA", (S, S), (0, 0, 0, 0))

    bg = gradient(S, (255, 150, 108), (230, 66, 40)).convert("RGBA")
    mask = rounded_rect_mask(S, int(S * bg_radius))
    canvas.paste(bg, (0, 0), mask)

    # soft top highlight
    hi = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse([-S * 0.30, -S * 0.80, S * 1.30, S * 0.40], fill=(255, 255, 255, 36))
    canvas.alpha_composite(Image.composite(hi, Image.new("RGBA", (S, S), (0, 0, 0, 0)), mask))

    k = 0.56 * (1 - padding)
    dx = -0.045
    def t(x, y):
        return ((x - 0.5 + dx) * k * S + S / 2, (y - 0.5 + 0.01) * k * S + S / 2)

    # dashed flight swoosh behind the plane
    arc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ad = ImageDraw.Draw(arc)
    width = max(2, int(S * 0.018))
    box = [S * 0.14, S * 0.14, S * 0.88, S * 0.86]
    start_a, end_a, steps = 200, 300, 20
    for i in range(steps):
        if i % 2:
            continue
        a0 = start_a + (end_a - start_a) * i / steps
        a1 = a0 + (end_a - start_a) / steps * 0.55
        ad.arc(box, a0, a1, fill=(255, 255, 255, 95), width=width)
    canvas.alpha_composite(arc)

    plane_pts = [(0.083, 0.875), (0.958, 0.500), (0.083, 0.125),
                 (0.083, 0.417), (0.708, 0.500), (0.083, 0.583)]

    # soft drop shadow
    shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.polygon([t(x, y + 0.045) for (x, y) in plane_pts], fill=(140, 26, 8, 80))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(S * 0.016)))

    plane = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    pd = ImageDraw.Draw(plane)
    pd.polygon([t(x, y) for (x, y) in plane_pts], fill=(255, 255, 255, 255))
    # lower wing fold, slightly warmer
    pd.polygon([t(0.083, 0.583), t(0.083, 0.875), t(0.708, 0.500)], fill=(255, 225, 212, 255))
    canvas.alpha_composite(plane)

    out = canvas.resize((size, size), Image.LANCZOS)
    return out


for name, size, pad in [
    ("icon-180.png", 180, 0.0),
    ("icon-192.png", 192, 0.0),
    ("icon-512.png", 512, 0.0),
    ("icon-maskable-512.png", 512, 0.18),
]:
    img = draw_icon(size, padding=pad)
    img.save(os.path.join(OUT, name))
    print("wrote", name)
