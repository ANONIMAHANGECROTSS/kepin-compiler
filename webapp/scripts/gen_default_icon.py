#!/usr/bin/env python3
"""Generate default JAROTCOMPILER launcher icon (192x192 PNG) as base64."""
from PIL import Image, ImageDraw
import base64, io

W = H = 192
img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# rounded-square background (not pure black), radius 44
d.rounded_rectangle([0, 0, W - 1, H - 1], radius=44, fill=(12, 15, 20, 255))

# subtle inset border
d.rounded_rectangle([10, 10, W - 11, H - 11], radius=36, outline=(166, 226, 46, 90), width=3)

# terminal prompt glyph: ">>" chevrons in lime
cx, cy = 96, 96
lw = 14
d.line([(cx - 38, cy - 30), (cx + 4, cy), (cx - 38, cy + 30)], fill=(166, 226, 46, 255), width=lw, joint="curve")
d.line([(cx + 2, cy - 30), (cx + 44, cy), (cx + 2, cy + 30)], fill=(166, 226, 46, 255), width=lw, joint="curve")

buf = io.BytesIO()
img.save(buf, "PNG")
data = buf.getvalue()
b64 = base64.b64encode(data).decode()
with open("/home/z/my-project/scripts/default_icon_b64.txt", "w") as f:
    f.write(b64)
print("PNG bytes:", len(data), "| base64 chars:", len(b64))
