"""Lists every color literal in a stylesheet and says whether it is Carbon.

Anything not in the palette is a leftover from the previous design system and
needs a token. rgba() counts too — a translucent indigo is still indigo.
"""
import re
import sys
from pathlib import Path

theme = Path("src/styles/theme.css").read_text()
carbon = {v.lower() for v in re.findall(r":\s*(#[0-9a-fA-F]{6})\s*;", theme)}

target = Path(sys.argv[1] if len(sys.argv) > 1 else "src/styles/styles.css")
lines = target.read_text().splitlines()

hexes, rgbas, named = [], [], []
for i, line in enumerate(lines, 1):
    stripped = line.strip()
    if stripped.startswith("/*") or stripped.startswith("*"):
        continue
    for m in re.finditer(r"#[0-9a-fA-F]{3,8}\b", line):
        hexes.append((i, m.group(0), line.strip()))
    for m in re.finditer(r"rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)", line):
        rgbas.append((i, m.group(0), line.strip()))

def expand(h):
    h = h.lower()
    if len(h) == 4:  # #abc
        h = "#" + "".join(c * 2 for c in h[1:])
    return h[:7]

print(f"{target}\n")
print("HEX LITERALS")
print("=" * 92)
off = 0
for line_no, value, text in hexes:
    is_carbon = expand(value) in carbon
    if not is_carbon:
        off += 1
    tag = "carbon" if is_carbon else "OFF-PALETTE"
    print(f"  {line_no:>5}  {value:<10} {tag:<12} {text[:58]}")

print()
print("rgba() / rgb()")
print("=" * 92)
for line_no, value, text in rgbas:
    print(f"  {line_no:>5}  {value:<28} {text[:52]}")

print()
print(f"{len(hexes)} hex literals ({off} off-palette), {len(rgbas)} rgb/rgba")
