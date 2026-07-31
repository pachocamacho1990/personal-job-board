"""The Carbon conformance gate — one command that fails if non-Carbon colour returns.

    python3 scripts/conformance-gate.py          # gate the working tree
    npm run check:design                         # same thing, discoverable

Exits 0 when the codebase conforms, non-zero otherwise, so CI can gate on it.

WHAT IT ENFORCES

  1. No colour literal in any src/styles/*.css.
  2. No colour literal in any src/**/*.tsx.
  3. No raw duration or inline cubic-bezier outside theme.css. A hand-written
     0.15s is the motion equivalent of a hex: it renders, it looks fine, and it
     quietly opts out of the system.
  4. No corner-radius literal outside theme.css. 50% and 100% are exempt,
     because a circle is a shape rather than a radius choice.
  5. No N1 primitive consumed outside theme.css. Components and page stylesheets
     read N2 semantics only: a primitive is the same value in both themes, so a
     component that reaches for --cds-gray-70 cannot follow a theme switch. That
     is the single rule the whole two-level structure exists to protect.
  6. No var() reference that resolves to nothing. These do not raise — the
     browser drops the whole declaration and the rule silently does nothing.
  7. The token engine itself, by delegating to scripts/check-tokens.py:
     N1/N2 structure, g10/g100 key parity, WCAG contrast, spacing monotonicity,
     -rgb triplets matching their hex twin.

"Colour literal" means hex (#rgb/#rgba/#rrggbb/#rrggbbaa), rgb()/rgba(),
hsl()/hsla(), and the CSS named colours. A translucent indigo is still indigo,
and `color: white` is still a literal — it does not follow a theme any more
than #ffffff does.

Every exception is declared below with its reason, and every exception that is
actually exercised gets printed in the output. An allowance nobody can see is
an allowance that grows.
"""
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# theme.css IS the palette — it is the one file whose job is to hold literals.
# Its contents are not unchecked: check-tokens.py verifies them in depth.
THEME_FILE = "theme.css"

# The N1 palette ends where the non-colour scales begin. Everything defined
# above this banner is a primitive; spacing/type/radius below it are scales,
# which every stylesheet is meant to consume freely.
SCALES_MARKER = "N1 · SCALES"


# ── sanctioned exceptions ────────────────────────────────
#
# Each entry carries the reason it exists, not just the value. A future reader
# has to be able to judge whether the reason still holds.

# Check 2. Three literals, one file, one element.
TRAFFIC_LIGHT_DOTS = {"#ff5f56", "#ffbd2e", "#27c93f"}
TRAFFIC_LIGHT_FILE = "src/pages/login/main.tsx"
TRAFFIC_LIGHT_REASON = (
    "The macOS window-control dots inside the login showcase SVG. They quote a "
    "real interface the way a logo quotes a brand: theming them would break the "
    "reference, because the point is that the viewer recognises a macOS window. "
    "Not a colour decision, so not a token."
)

# Check 3. A scoped-token block is the sanctioned way to pin on-dark values.
#
# The rule is "consume N2 only" because N2 is what follows the theme. A surface
# that is dark in BOTH themes is the one case where that breaks down: themed
# semantics resolve to their light values there, which are wrong on it. Such a
# surface pins its own scoped tokens from the palette, once, in CSS where a
# reviewer sees the decision — instead of the markup inside it typing literals.
#
# The allowance is deliberately narrow: only a custom-property DEFINITION, only
# inside the named selector block. A primitive used directly on a real property
# (color:, background:) inside the same block still fails.
N1_PIN_BLOCKS = {
    ("login.css", ".login-showcase-pane"): (
        "The login showcase panel is the dark half of a split screen — dark in "
        "g10 and g100 alike by design. It cannot read themed semantics, so it "
        "pins --showcase-* from the palette and the SVG inside reads those."
    ),
}

# Check 4. Not tokens at all.
RUNTIME_VARS = {"--hover-x", "--hover-y"}
RUNTIME_VARS_REASON = (
    "Set by JS at runtime for cursor tracking on the login blueprint, not by "
    "any stylesheet. Both are referenced with a fallback, so they render "
    "correctly before the first mousemove."
)


# ── colour literal detection ─────────────────────────────

HEX = re.compile(r"#([0-9a-fA-F]{3,8})(?![0-9a-zA-Z_-])")
FUNCTIONAL = re.compile(r"\b(?:rgba?|hsla?)\(\s*[\d.]", re.I)
FUNCTIONAL_FULL = re.compile(r"\b(?:rgba?|hsla?)\([^)]*\)", re.I)

# The CSS named colours. `transparent` and `currentColor` are excluded on
# purpose: neither names a colour, they defer to context.
NAMED_COLORS = {
    "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque",
    "black", "blanchedalmond", "blue", "blueviolet", "brown", "burlywood",
    "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue", "cornsilk",
    "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray",
    "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen",
    "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
    "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
    "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue",
    "firebrick", "floralwhite", "forestgreen", "fuchsia", "gainsboro",
    "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow", "grey",
    "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
    "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
    "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightgrey",
    "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
    "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen",
    "linen", "magenta", "maroon", "mediumaquamarine", "mediumblue",
    "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
    "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue",
    "mintcream", "mistyrose", "moccasin", "navajowhite", "navy", "oldlace",
    "olive", "olivedrab", "orange", "orangered", "orchid", "palegoldenrod",
    "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff",
    "peru", "pink", "plum", "powderblue", "purple", "rebeccapurple", "red",
    "rosybrown", "royalblue", "saddlebrown", "salmon", "sandybrown", "seagreen",
    "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray",
    "slategrey", "snow", "springgreen", "steelblue", "tan", "teal", "thistle",
    "tomato", "turquoise", "violet", "wheat", "white", "whitesmoke", "yellow",
    "yellowgreen",
}
NAMED_RE = re.compile(r"\b(" + "|".join(sorted(NAMED_COLORS, key=len, reverse=True)) + r")\b", re.I)

# Properties whose values legitimately contain colour-like words that are not
# colours: font stacks name families, content: holds prose.
NON_COLOR_PROPS = re.compile(r"^\s*(font|font-family|content|--cds-font[a-z0-9-]*|grid-[a-z-]+)\s*$", re.I)

# In TSX, a named colour only counts inside a prop that actually paints.
TSX_COLOR_PROP = re.compile(
    r"\b(fill|stroke|stopColor|color|backgroundColor|background|borderColor|"
    r"borderTopColor|borderBottomColor|borderLeftColor|borderRightColor|"
    r"outlineColor|boxShadow|textShadow|caretColor|floodColor)\s*[:=]\s*"
    r"['\"]?([A-Za-z]+)\b"
)


def strip_comments(text):
    """Blank out /* */ and // comments, preserving line count and offsets."""
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    text = re.sub(r"/\*.*?\*/", blank, text, flags=re.S)
    # Only whole-line // comments, so a URL in a string is not mangled.
    text = re.sub(r"^\s*//[^\n]*", blank, text, flags=re.M)
    return text


def strip_strings(value):
    """Drop quoted substrings from a CSS value, so prose is not scanned."""
    return re.sub(r"'[^']*'|\"[^\"]*\"", "", value)


def literals_in_line(line, named_scan):
    """Every colour literal on one line: [(literal, kind)]."""
    found = []
    for m in HEX.finditer(line):
        if len(m.group(1)) in (3, 4, 6, 8):
            found.append((m.group(0), "hex"))
    for m in FUNCTIONAL_FULL.finditer(line):
        if FUNCTIONAL.match(m.group(0)):
            found.append((m.group(0), "functional"))
    found.extend(named_scan(line))
    return found


DECLARATION = re.compile(r"((?:--)?[a-zA-Z][-a-zA-Z0-9]*)\s*:\s*([^;{}]*)")


def css_inside_rule(text):
    """Yield (line_no, segment) for the parts of each line inside a rule block.

    Selectors are excluded, because `:not(.red)` is not a colour and `a:hover`
    is not a declaration. Brace-tracked rather than line-matched, so a one-line
    rule or a minified file is scanned the same as pretty-printed CSS.
    """
    depth = 0
    for i, line in enumerate(text.splitlines(), 1):
        parts, pos = [], 0
        for m in re.finditer(r"[{}]", line):
            if depth > 0:
                parts.append(line[pos:m.start()])
            depth = max(0, depth + (1 if m.group(0) == "{" else -1))
            pos = m.end()
        if depth > 0:
            parts.append(line[pos:])
        yield i, " ".join(parts)


def css_named_scan(segment):
    """Named colours in CSS declaration VALUES only.

    Scanning raw text would flag `white-space: nowrap`, where `white` is part of
    a property name and paints nothing. Every declaration on the segment is
    checked, not just the first — `{ color: red; border: 1px solid lime; }` is
    one line and both are violations.
    """
    found = []
    for m in DECLARATION.finditer(segment):
        prop, value = m.group(1), strip_strings(m.group(2))
        if NON_COLOR_PROPS.match(prop):
            continue
        # var(--cds-blue-60) names a token, not a literal; check 3 owns those.
        value = re.sub(r"var\([^)]*\)", "", value)
        found.extend((hit.group(0), "named") for hit in NAMED_RE.finditer(value))
    return found


def tsx_named_scan(line):
    return [(m.group(2), "named") for m in TSX_COLOR_PROP.finditer(line)
            if m.group(2).lower() in NAMED_COLORS]


# ── the checks ───────────────────────────────────────────

class Result:
    def __init__(self, title, detail=""):
        self.title = title
        self.detail = detail
        self.violations = []   # (path, line_no, message)
        self.allowances = []   # (label, count, reason)

    @property
    def ok(self):
        return not self.violations


def check_css_literals(root):
    r = Result("Colour literals in src/styles/*.css",
               "every stylesheet but theme.css, which is the palette itself")
    files = sorted((root / "src/styles").glob("*.css"))
    scanned = 0
    for path in files:
        if path.name == THEME_FILE:
            continue
        scanned += 1
        text = strip_comments(path.read_text())
        # Hex and rgb()/hsl() are unambiguous anywhere; named colours are only
        # colours inside a declaration value, so they get the narrower scan.
        segments = dict(css_inside_rule(text))
        for i, line in enumerate(text.splitlines(), 1):
            hits = literals_in_line(line, lambda _: [])
            hits += css_named_scan(segments.get(i, ""))
            for value, kind in hits:
                r.violations.append(
                    (path, i, f"{kind} literal {value!r} — must be an --cds-* semantic"))
    r.detail = f"{scanned} stylesheets scanned; {THEME_FILE} excluded (it is the palette)"
    return r


def check_tsx_literals(root):
    r = Result("Colour literals in src/**/*.tsx")
    files = sorted((root / "src").rglob("*.tsx"))
    allowed_path = (root / TRAFFIC_LIGHT_FILE).resolve()
    used_dots = set()
    for path in files:
        for i, line in enumerate(strip_comments(path.read_text()).splitlines(), 1):
            for value, kind in literals_in_line(line, tsx_named_scan):
                if (path.resolve() == allowed_path
                        and value.lower() in TRAFFIC_LIGHT_DOTS):
                    used_dots.add(value.lower())
                    continue
                r.violations.append(
                    (path, i, f"{kind} literal {value!r} — must be an --cds-* semantic"))
    if used_dots:
        r.allowances.append(
            (f"{TRAFFIC_LIGHT_FILE}: {', '.join(sorted(used_dots))}",
             len(used_dots), TRAFFIC_LIGHT_REASON))
    r.detail = f"{len(files)} components scanned"
    return r


def n1_primitives(root):
    """Every token defined in theme.css above the SCALES banner."""
    text = (root / "src/styles" / THEME_FILE).read_text()
    if SCALES_MARKER not in text:
        raise SystemExit(f"conformance-gate: {SCALES_MARKER!r} banner not found in "
                         f"{THEME_FILE}; the N1/N2 split cannot be located.")
    palette = text.split(SCALES_MARKER, 1)[0]
    return set(re.findall(r"^\s*(--cds-[a-z0-9-]+)\s*:", palette, re.M))


def pin_block_ranges(path, text):
    """Line ranges of the allowlisted scoped-token blocks in this file.

    Brace-counted from the selector, so a nested block or a media-query copy of
    the same selector is handled without hardcoding line numbers.
    """
    ranges = []
    lines = text.splitlines()
    for (fname, selector), _ in N1_PIN_BLOCKS.items():
        if path.name != fname:
            continue
        for i, line in enumerate(lines, 1):
            if not re.match(rf"^\s*{re.escape(selector)}\s*(,[^{{]*)?\{{", line):
                continue
            depth, end = 0, i
            for j in range(i - 1, len(lines)):
                depth += lines[j].count("{") - lines[j].count("}")
                if depth == 0:
                    end = j + 1
                    break
            ranges.append((selector, i, end))
    return ranges


def check_n1_leakage(root):
    r = Result("N1 primitives consumed outside theme.css",
               "components and page stylesheets must read N2 semantics only")
    n1 = n1_primitives(root)
    pinned = {}

    def scan(path, text, label):
        text = strip_comments(text)
        ranges = pin_block_ranges(path, text)
        for i, line in enumerate(text.splitlines(), 1):
            for m in re.finditer(r"var\((--cds-[a-z0-9-]+)", line):
                token = m.group(1)
                if token not in n1:
                    continue
                # Allowed only as a scoped-token DEFINITION inside a pin block.
                is_definition = re.match(r"^\s*--[a-z0-9-]+\s*:", line)
                block = next((sel for sel, start, end in ranges if start <= i <= end), None)
                if block and is_definition:
                    pinned.setdefault((path.name, block), []).append(token)
                    continue
                why = ("N1 is theme-independent, so this cannot follow a theme "
                       "switch — use the N2 semantic for what it is FOR")
                if block and not is_definition:
                    why = (f"inside {block}, but used directly rather than pinned "
                           f"to a scoped token — pin it, then read the scoped token")
                r.violations.append((path, i, f"{label} reads N1 {token} — {why}"))

    for path in sorted((root / "src/styles").glob("*.css")):
        if path.name == THEME_FILE:
            continue
        scan(path, path.read_text(), "stylesheet")
    for path in sorted((root / "src").rglob("*.tsx")):
        scan(path, path.read_text(), "component")

    for (fname, selector), tokens in sorted(pinned.items()):
        reason = N1_PIN_BLOCKS.get((fname, selector), "")
        r.allowances.append(
            (f"{fname} {selector} pins {len(tokens)} primitives: "
             f"{', '.join(sorted(set(tokens)))}", len(tokens), reason))

    r.detail = f"{len(n1)} primitives defined in {THEME_FILE}"
    return r


def check_undefined_vars(root):
    r = Result("var() references that resolve to nothing",
               "an undefined var() drops the whole declaration, silently")
    defined = set()
    css_files = sorted((root / "src/styles").glob("*.css"))
    tsx_files = sorted((root / "src").rglob("*.tsx"))

    for path in css_files:
        defined |= set(re.findall(r"^\s*(--[a-z0-9-]+)\s*:", path.read_text(), re.M))
    for path in tsx_files:
        # Inline style objects can define custom properties too.
        defined |= set(re.findall(r"['\"](--[a-z0-9-]+)['\"]\s*:", path.read_text()))

    runtime_hits = 0
    for path in css_files + tsx_files:
        for i, line in enumerate(strip_comments(path.read_text()).splitlines(), 1):
            for m in re.finditer(r"var\((--[a-z0-9-]+)\s*(,)?", line):
                token, fallback = m.group(1), m.group(2)
                if token in defined:
                    continue
                if token in RUNTIME_VARS:
                    runtime_hits += 1
                    continue
                note = "" if fallback else " and carries NO fallback, so the rule renders nothing"
                r.violations.append((path, i, f"var({token}) is never defined{note}"))

    if runtime_hits:
        r.allowances.append(
            (f"{', '.join(sorted(RUNTIME_VARS))} — {runtime_hits} references",
             runtime_hits, RUNTIME_VARS_REASON))
    r.detail = f"{len(defined)} custom properties defined across CSS and TSX"
    return r


MOTION_DECL = re.compile(r"\b(?:transition|animation)(?:-duration|-delay|-timing-function)?\s*:")
TIME_LITERAL = re.compile(r"(?<![\w-])\d*\.?\d+m?s(?![\w-])")
BEZIER_LITERAL = re.compile(r"cubic-bezier\s*\(")


def check_motion_literals(root):
    """A hand-written 0.15s is the motion equivalent of a hex: it renders, it
    looks fine, and it quietly opts out of the system. Keyword easings survive
    the scan — `linear` on a spinner and `ease-in-out` on an idle pulse describe
    ambient loops, which Carbon's interaction scale does not cover."""
    r = Result("Duration and easing literals",
               "src/styles/*.css and src/**/*.tsx; theme.css holds the scale")
    files = [p for p in sorted((root / "src/styles").glob("*.css"))
             if p.name != THEME_FILE]
    files += sorted((root / "src").rglob("*.tsx"))
    for path in files:
        for i, line in enumerate(strip_comments(path.read_text()).splitlines(), 1):
            if not MOTION_DECL.search(line):
                continue
            for m in TIME_LITERAL.finditer(line):
                r.violations.append(
                    (path, i, f"duration literal {m.group(0)!r} — must be a "
                              "--cds-duration-* or --app-duration-* token"))
            if BEZIER_LITERAL.search(line):
                r.violations.append(
                    (path, i, "inline cubic-bezier() — must be a --cds-easing-* token"))
    r.detail = f"{len(files)} files scanned; {THEME_FILE} excluded (it is the scale)"
    return r


RADIUS_DECL = re.compile(r"\b(?:border(?:-(?:top|bottom)-(?:left|right))?-radius|borderRadius)\b\s*:\s*([^;,}]+)")
RADIUS_OK = re.compile(r"var\(--cds-radius-|^\s*'?(?:50%|100%)'?\s*$")


def check_radius_literals(root):
    """A corner is a system decision, the same as a colour. 50% and 100% survive
    because a circle is a shape, not a radius choice."""
    r = Result("Corner radius literals",
               "src/styles/*.css and src/**/*.tsx; theme.css holds the scale")
    files = [p for p in sorted((root / "src/styles").glob("*.css"))
             if p.name != THEME_FILE]
    files += sorted((root / "src").rglob("*.tsx"))
    for path in files:
        for i, line in enumerate(strip_comments(path.read_text()).splitlines(), 1):
            for m in RADIUS_DECL.finditer(line):
                value = m.group(1).strip()
                if not RADIUS_OK.search(value):
                    r.violations.append(
                        (path, i, f"radius literal {value!r} — must be a --cds-radius-* token"))
    r.detail = f"{len(files)} files scanned; {THEME_FILE} excluded (it is the scale)"
    return r


def check_token_engine(root):
    r = Result("Token engine (delegated to scripts/check-tokens.py)",
               "N1/N2 structure, g10/g100 parity, WCAG contrast, spacing, -rgb twins")
    proc = subprocess.run([sys.executable, "scripts/check-tokens.py"],
                          cwd=root, capture_output=True, text=True)
    r.engine_output = proc.stdout + proc.stderr
    if proc.returncode != 0:
        for line in r.engine_output.splitlines():
            if line.strip().startswith("- "):
                r.violations.append((root / "src/styles" / THEME_FILE, None,
                                     line.strip()[2:]))
        if not r.violations:
            r.violations.append((root / "src/styles" / THEME_FILE, None,
                                 f"check-tokens.py exited {proc.returncode}"))
    return r


CHECKS = [check_css_literals, check_tsx_literals, check_motion_literals,
          check_radius_literals, check_n1_leakage, check_undefined_vars,
          check_token_engine]


# ── output ───────────────────────────────────────────────

def main(argv):
    root = REPO_ROOT
    if "--root" in argv:
        root = Path(argv[argv.index("--root") + 1]).resolve()

    print("Carbon conformance gate")
    print(f"root: {root}")
    print("=" * 78)

    results = []
    for n, check in enumerate(CHECKS, 1):
        result = check(root)
        results.append(result)
        status = "PASS" if result.ok else f"FAIL ({len(result.violations)})"
        print(f"\n[{n}/{len(CHECKS)}] {result.title}")
        if result.detail:
            print(f"        {result.detail}")
        print(f"        {status}")
        for path, line_no, message in result.violations:
            where = path.relative_to(root) if path.is_relative_to(root) else path
            loc = f"{where}:{line_no}" if line_no else str(where)
            print(f"          {loc}")
            print(f"            {message}")

    allowed = [(r, a) for r in results for a in r.allowances]
    if allowed:
        print("\n" + "-" * 78)
        print("SANCTIONED EXCEPTIONS APPLIED")
        print("-" * 78)
        for result, (label, _count, reason) in allowed:
            print(f"  {label}")
            for line in wrap(reason, 72):
                print(f"      {line}")
    else:
        print("\n  (no exceptions were needed)")

    failed = [r for r in results if not r.ok]
    total = sum(len(r.violations) for r in results)

    print("\n" + "=" * 78)
    if failed:
        engine = next((r for r in failed if hasattr(r, "engine_output")), None)
        if engine:
            print("\ncheck-tokens.py output:")
            print(engine.engine_output.rstrip())
            print()
        print(f"FAIL — {total} violation(s) across {len(failed)} of {len(CHECKS)} checks:")
        for r in failed:
            print(f"  - {r.title} ({len(r.violations)})")
        return 1

    print(f"PASS — all {len(CHECKS)} checks clean. No non-Carbon colour in the tree.")
    return 0


def wrap(text, width):
    words, lines, current = text.split(), [], ""
    for word in words:
        if len(current) + len(word) + 1 > width:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
