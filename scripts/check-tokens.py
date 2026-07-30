"""Conformance checks for the Carbon token engine in src/styles/theme.css.

Run from the repo root:  python3 scripts/check-tokens.py

Checks:
  1. Structure  — every var(--cds-*) resolves; no token defined twice within a
                  scope; no N2 semantic hardcodes a hex literal.
  2. Parity     — the g100 theme redefines exactly the same key set as g10. A
                  semantic missing from g100 silently inherits its light value,
                  which is the likeliest way this file breaks.
  3. Contrast   — WCAG ratios for the text/surface pairs that matter, in both
                  themes, against the level each pair is held to.

Known Carbon exceptions are printed rather than hidden: placeholder text and
the support fills do not meet AA in Carbon's own palette, so this reports the
real numbers instead of quietly choosing a threshold they pass.

Groundwork for PJBA-31, which turns this into the project's conformance gate.
"""
import re
import sys

PATH = "src/styles/theme.css"
N2_MARKER = "N2 · SEMANTICS"
G100_SELECTOR = "[data-carbon-theme='g100']"


# ── parsing ──────────────────────────────────────────────

def defs_in(text):
    """Ordered (name, value) pairs of --cds-* definitions."""
    return re.findall(r"^\s*(--cds-[a-z0-9-]+)\s*:\s*([^;]+);", text, re.M)


def load():
    text = open(PATH).read()
    assert N2_MARKER in text, f"{N2_MARKER!r} banner not found"
    assert G100_SELECTOR in text, f"{G100_SELECTOR} block not found"

    # N1 primitives, then g10 semantics, then the g100 override block.
    n1_text, rest = text.split(N2_MARKER, 1)
    g10_text, g100_text = rest.split(G100_SELECTOR, 1)

    return text, defs_in(n1_text), defs_in(g10_text), defs_in(g100_text)


# ── color math ───────────────────────────────────────────

def resolve(name, base, overrides):
    """Resolve a token to a literal, following var() chains. Theme wins."""
    seen = set()
    value = overrides.get(name, base.get(name))
    while value is not None:
        value = value.strip()
        m = re.fullmatch(r"var\((--cds-[a-z0-9-]+)\)", value)
        if not m:
            return value
        ref = m.group(1)
        if ref in seen:
            return None  # cycle
        seen.add(ref)
        value = overrides.get(ref, base.get(ref))
    return None


def to_rgb(value):
    """Hex literal -> (r, g, b). None for anything else, translucent included."""
    if not value:
        return None
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", value)
    if not m:
        return None
    h = m.group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def luminance(rgb):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg, bg):
    lf, lb = luminance(fg), luminance(bg)
    lighter, darker = max(lf, lb), min(lf, lb)
    return (lighter + 0.05) / (darker + 0.05)


# ── contrast expectations ────────────────────────────────

ALL_SURFACES = ["--cds-background", "--cds-layer-01", "--cds-layer-02",
                "--cds-layer-03", "--cds-field-01"]

# Carbon calibrates its low-emphasis tokens against the page background and the
# first two layers. It does not promise them on layer-03, which in g100 is
# Gray 70 — a mid gray that leaves too little headroom: text-helper lands at
# 3.29 there, link-primary at 3.32.
#
# So this list is not a way of dodging red output. It records a real constraint
# on the UI: in g100, a third-level container must not host helper text, links,
# error text or an interactive fill. Only text-primary, text-secondary and the
# icon tokens are safe that deep. Worth checking during PJBA-32's visual QA.
MAIN_SURFACES = ["--cds-background", "--cds-layer-01", "--cds-layer-02",
                 "--cds-field-01"]

# Body text: WCAG AA normal text.
TEXT_AA = [
    ("--cds-text-primary", ALL_SURFACES),
    ("--cds-text-secondary", ALL_SURFACES),
    ("--cds-icon-primary", ALL_SURFACES),
    ("--cds-icon-secondary", ALL_SURFACES),
    ("--cds-text-helper", MAIN_SURFACES),
    ("--cds-text-error", MAIN_SURFACES),
    ("--cds-link-primary", MAIN_SURFACES),
]

# Non-text contrast: UI component boundaries and states.
#
# The numbered suffix on border-strong-* is a pairing contract, not a ranking:
# -01 is meant for layer-01 surfaces, -02 for layer-02. Crossing the levels
# fails by construction (border-strong-01 on layer-02 in g100 is 2.30), so each
# one is checked against the surfaces it is actually for.
UI_AA = [
    ("--cds-border-strong-01", ["--cds-background", "--cds-layer-01", "--cds-field-01"]),
    ("--cds-border-strong-02", ["--cds-layer-02"]),
    ("--cds-interactive", MAIN_SURFACES),
]

# Foreground/fill pairs checked directly rather than against every surface.
ON_COLOR = [
    ("--cds-text-on-color", "--cds-button-primary"),
    ("--cds-text-on-color", "--cds-button-danger-primary"),
    ("--cds-text-inverse", "--cds-background-inverse"),
]

# Carbon's own palette puts these below threshold. Reported, never silently passed.
KNOWN_EXCEPTIONS = {
    "--cds-text-placeholder": "Carbon uses Gray 40; documented as not meeting AA. Never rely on a placeholder to convey information.",
    "--cds-support-warning": "Yellow 30 is a fill carrying a dark glyph, not text.",
    "--cds-support-caution-minor": "fill, not text.",
    "--cds-support-caution-major": "fill, not text.",
}

AA_TEXT, AA_UI = 4.5, 3.0


def main():
    text, n1, g10, g100 = load()

    n1_map, g10_map, g100_map = dict(n1), dict(g10), dict(g100)
    base = {**n1_map, **g10_map}

    failures, notes = [], []

    # ── 1. structure ──
    all_defined = set(n1_map) | set(g10_map)
    referenced = set(re.findall(r"var\((--cds-[a-z0-9-]+)\)", text))
    dangling = sorted(referenced - all_defined)
    if dangling:
        failures.append(f"var() references to undefined tokens: {dangling}")

    for scope_name, pairs in (("N1", n1), ("g10", g10), ("g100", g100)):
        names = [n for n, _ in pairs]
        dupes = sorted({n for n in names if names.count(n) > 1})
        if dupes:
            failures.append(f"{scope_name}: tokens defined more than once: {dupes}")

    for scope_name, pairs in (("g10", g10), ("g100", g100)):
        hexed = [(n, v.strip()) for n, v in pairs if re.search(r"#[0-9a-fA-F]{3,8}", v)]
        if hexed:
            failures.append(f"{scope_name}: semantics with hardcoded hex: {hexed}")
        no_ref = [(n, v.strip()) for n, v in pairs if "var(" not in v]
        if no_ref:
            failures.append(f"{scope_name}: semantics not pointing at a primitive: {no_ref}")

    # ── 2. theme parity ──
    missing = sorted(set(g10_map) - set(g100_map))
    extra = sorted(set(g100_map) - set(g10_map))
    if missing:
        failures.append(
            "semantics defined in g10 but MISSING from g100 — they would inherit "
            f"the light value: {missing}")
    if extra:
        failures.append(f"semantics defined in g100 but absent from g10: {extra}")

    # ── 3. contrast ──
    def ratio(fg_name, bg_name, theme):
        overrides = g10_map if theme == "g10" else {**g10_map, **g100_map}
        fg = to_rgb(resolve(fg_name, base, overrides))
        bg = to_rgb(resolve(bg_name, base, overrides))
        if not fg or not bg:
            return None
        return contrast(fg, bg)

    def report(fg_name, bg_name, threshold):
        r10 = ratio(fg_name, bg_name, "g10")
        r100 = ratio(fg_name, bg_name, "g100")
        label = f"{fg_name.replace('--cds-', '')} on {bg_name.replace('--cds-', '')}"
        cells = ""
        for r in (r10, r100):
            cells += f"{r:>9.2f}{'v' if r >= threshold else 'X'}" if r else f"{'n/a':>10}"
        print(f"  {label:<44}{cells}")

        for theme, r in (("g10", r10), ("g100", r100)):
            if r is None or r >= threshold:
                continue
            if fg_name in KNOWN_EXCEPTIONS:
                notes.append(f"{label} [{theme}] = {r:.2f}, below {threshold} — {KNOWN_EXCEPTIONS[fg_name]}")
            else:
                failures.append(f"contrast {label} [{theme}] = {r:.2f}, below the {threshold} required")

    print(f"  {'':<44}{'g10':>10}{'g100':>10}")

    print("\n  Body text (AA 4.5:1)")
    for fg, surfaces in TEXT_AA:
        for bg in surfaces:
            report(fg, bg, AA_TEXT)

    print("\n  Non-text / UI (3:1)")
    for fg, surfaces in UI_AA:
        for bg in surfaces:
            report(fg, bg, AA_UI)

    print("\n  Foreground on fills (AA 4.5:1)")
    for fg, bg in ON_COLOR:
        report(fg, bg, AA_TEXT)

    print("\n  Known Carbon exceptions (reported, not enforced)")
    for fg in KNOWN_EXCEPTIONS:
        if fg in g10_map:
            report(fg, "--cds-layer-01", AA_TEXT)

    # ── summary ──
    print(f"\n  N1 primitives : {len(n1)}")
    print(f"  g10 semantics : {len(g10)}")
    print(f"  g100 semantics: {len(g100)}")

    if notes:
        print("\nNOTES")
        for n in notes:
            print(f"  - {n}")

    if failures:
        print("\nFAIL")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("\nOK — structure, theme parity and contrast all pass")
    return 0


if __name__ == "__main__":
    sys.exit(main())
