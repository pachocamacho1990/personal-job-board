"""Which var() references resolve to nothing, anywhere in the codebase.

An undefined var() does not raise: the browser drops the whole declaration, so
the rule silently does nothing. These are live bugs, not style debt.
"""
import re
from collections import defaultdict
from pathlib import Path

CSS_DIR = Path("src/styles")
SRC = Path("src")

defined = defaultdict(set)   # token -> files that define it
used = defaultdict(lambda: defaultdict(int))

for path in sorted(CSS_DIR.glob("*.css")):
    text = path.read_text()
    for token in re.findall(r"^\s*(--[a-z0-9-]+)\s*:", text, re.M):
        defined[token].add(path.name)
    for token in re.findall(r"var\((--[a-z0-9-]+)", text):
        used[token][path.name] += 1

for path in sorted(SRC.rglob("*.tsx")):
    text = path.read_text()
    # Inline style objects can define custom properties too.
    for token in re.findall(r"['\"](--[a-z0-9-]+)['\"]\s*:", text):
        defined[token].add(f"tsx/{path.name}")
    for token in re.findall(r"var\((--[a-z0-9-]+)", text):
        used[token][f"tsx/{path.name}"] += 1

undefined = {t: c for t, c in used.items() if t not in defined}

print("VAR() REFERENCES THAT RESOLVE TO NOTHING")
print("=" * 78)
total = 0
for token in sorted(undefined, key=lambda t: -sum(undefined[t].values())):
    consumers = undefined[token]
    n = sum(consumers.values())
    total += n
    where = ", ".join(f"{f}:{c}" for f, c in sorted(consumers.items()))
    print(f"  {token:<26} {n:>3} uses   {where}")

print()
print(f"{len(undefined)} undefined tokens across {total} broken references")

# A fallback makes an undefined token harmless: var(--x, #fff) still renders.
print()
print("Of those, which carry a fallback (harmless) vs none (dead rule)?")
print("=" * 78)
with_fb, without_fb = defaultdict(int), defaultdict(int)
for path in list(CSS_DIR.glob("*.css")) + list(SRC.rglob("*.tsx")):
    text = path.read_text()
    for m in re.finditer(r"var\((--[a-z0-9-]+)\s*(,)?", text):
        token, comma = m.group(1), m.group(2)
        if token in undefined:
            (with_fb if comma else without_fb)[token] += 1

for token in sorted(undefined, key=lambda t: -without_fb[t]):
    print(f"  {token:<26} fallback: {with_fb[token]:>2}   NO fallback: {without_fb[token]:>2}")

print()
print(f"references with no fallback (these render nothing): {sum(without_fb.values())}")
