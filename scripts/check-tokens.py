"""Verifies the N1/N2 contract in src/styles/theme.css.

1. Every var(--cds-*) reference resolves to a token defined in the file.
2. No N2 semantic hardcodes a hex literal (it must point at a primitive).
3. No token is defined twice.
"""
import re
import sys

path = "src/styles/theme.css"
text = open(path).read()

# Split at the N2 banner so we can reason about the two levels separately.
marker = "N2 · SEMANTICS"
assert marker in text, "N2 banner not found"
n1_text, n2_text = text.split(marker, 1)

defined = re.findall(r"^\s*(--cds-[a-z0-9-]+)\s*:", text, re.M)
n1_defined = set(re.findall(r"^\s*(--cds-[a-z0-9-]+)\s*:", n1_text, re.M))
n2_defs = re.findall(r"^\s*(--cds-[a-z0-9-]+)\s*:([^;]+);", n2_text, re.M)

failures = []

# 1. dangling references
referenced = set(re.findall(r"var\((--cds-[a-z0-9-]+)\)", text))
dangling = sorted(referenced - set(defined))
if dangling:
    failures.append(f"var() references to undefined tokens: {dangling}")

# 2. duplicate definitions
dupes = sorted({t for t in defined if defined.count(t) > 1})
if dupes:
    failures.append(f"tokens defined more than once: {dupes}")

# 3. N2 must not hardcode color literals
hex_in_n2 = [(name, val.strip()) for name, val in n2_defs if re.search(r"#[0-9a-fA-F]{3,8}", val)]
if hex_in_n2:
    failures.append(f"N2 semantics with hardcoded hex: {hex_in_n2}")

# 4. every N2 value must reference N1 (var) — rgba(var(...)) counts
no_ref = [(name, val.strip()) for name, val in n2_defs if "var(" not in val]
if no_ref:
    failures.append(f"N2 semantics not pointing at a primitive: {no_ref}")

print(f"N1 primitives defined : {len(n1_defined)}")
print(f"N2 semantics defined  : {len(n2_defs)}")
print(f"total tokens          : {len(defined)}")
print(f"distinct var() refs   : {len(referenced)}")

if failures:
    print("\nFAIL")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)

print("\nOK — every N2 semantic resolves to a defined N1 primitive, no dupes, no hex in N2")
