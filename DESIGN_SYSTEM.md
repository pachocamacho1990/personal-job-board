# Design System — IBM Carbon

This is the single source of truth for how the UI is coloured, spaced and typeset.
The previous "Aurora" system is gone: no indigo, no glassmorphism, no rounded cards.

Everything described here is implemented in **`src/styles/theme.css`**, which is
imported exactly once, from `src/main.tsx`, before `./App` and before the first
render. That single import serves all page entries, so no page stylesheet should
ever import it again.

The verification script for all of it is `python3 scripts/check-tokens.py`.

---

## 1. The two levels

The engine has two levels, and keeping them apart is the whole point.

**N1 — primitives.** The official Carbon palette as raw hex, named after the
palette itself (`--cds-blue-60`, `--cds-gray-90`), never after a purpose. These
are identical in both themes: Blue 60 is `#0f62fe` in g10 and in g100 alike.
98 tokens.

**N2 — semantics.** What a colour is *for* (`--cds-text-primary`, `--cds-layer-01`,
`--cds-status-applied`), each expressed as a `var()` reference into N1. Switching
theme redefines only this level. 147 tokens, defined twice — once per theme.

> **Hard rule: components and page stylesheets consume N2 only.**
> A component that reaches for `--cds-gray-70` directly cannot follow a theme
> switch. That is the exact bug this structure exists to prevent, and
> `check-tokens.py` enforces the inverse half of it (no N2 token may hardcode a
> hex; every N2 token must point at a primitive).

Alongside the colour levels sit the non-colour scales — spacing, type, radius,
elevation. They are theme-independent, so they live with the primitives rather
than inside either theme block. 83 tokens.

---

## 2. Themes

Two themes: **g10** (light) and **g100** (dark).

g10 is defined on `:root`. g100 is defined on `[data-carbon-theme='g100']`. The
attribute goes on `<html>` — not `<body>` — so tokens are in scope for everything,
including elements portalled outside the React root.

Resolution lives in **`src/theme.ts`** and runs from `main.tsx` before first
render, so the tree never paints against the wrong theme:

1. A stored choice in `localStorage` under the key `carbonTheme` wins. An explicit
   user decision outranks a system default.
2. Only when there is none do we follow `prefers-color-scheme`.
3. After startup the OS is not consulted again. Flipping the laptop to dark must
   not silently undo a deliberate choice.

Persisting is **opt-in** (`applyTheme(theme, persist = false)`). `initTheme()`
applies the resolved theme without writing anything, so the first page load does
not freeze whatever the OS happened to be set to into a preference the user never
expressed. Only `toggleTheme()` — wired to the toggle in `Sidebar.tsx` — persists.
All `localStorage` access is wrapped in `try/catch`, because Safari in private
mode throws.

Every key defined in the g10 block **must** reappear in the g100 block. A semantic
left out silently inherits its light value and produces, say, near-black text on a
near-black layer — invisible in review, obvious to a user. Parity is checked in
both directions.

---

## 3. The palette (N1)

Eight hue families at the ten standard Carbon stops (10 → 100), plus the two
absolutes:

| Family | Role |
|---|---|
| Blue | primary interactive colour |
| Purple | AI / agent surfaces, visited links |
| Teal | business-board and pending statuses |
| Green | success |
| Yellow | warning / caution-minor |
| Red | error / danger |
| Orange | caution-major (Carbon maps `support-caution-major` to Orange 40 in both themes) |
| Gray | the structural neutrals |
| `--cds-white`, `--cds-black` | absolutes |

### Interpolated stops

Carbon's hover and active states use values that fall *between* published palette
stops, hardcoded inside its theme definitions. They live at N1 because the value
itself never changes between themes — `#4c4c4c` is `#4c4c4c` in g10 and g100 alike.
What changes is which semantic reaches for it, and that is precisely the N1/N2 split.

They are named by interpolated position so the scale stays sortable:

| Token | Value | Serves |
|---|---|---|
| `--cds-gray-15` | `#e8e8e8` | hover on white / Gray 10 surfaces (g10) |
| `--cds-gray-64` | `#636363` | hover on Gray 70 layers (g100 `layer-03`) |
| `--cds-gray-65` | `#606060` | secondary button hover (g100) |
| `--cds-gray-72` | `#4c4c4c` | secondary button and inverse hover (g10) |
| `--cds-gray-74` | `#474747` | hover on Gray 80 layers (g100 `layer-02`) |
| `--cds-gray-83` | `#333333` | hover on Gray 90 layers (g100 `layer-01`) |
| `--cds-blue-65` | `#0353e9` | primary button hover |
| `--cds-red-65` | `#b81921` | danger button hover |

### RGB channel triplets

A handful of semantics are translucent, and CSS cannot recover the channels back
out of a hex `var()`. So those semantics compose from a channel triplet instead of
hardcoding numbers: `--cds-gray-10-rgb`, `--cds-gray-50-rgb`, `--cds-gray-100-rgb`,
`--cds-purple-40-rgb`, `--cds-purple-60-rgb`, `--cds-red-40-rgb`, `--cds-red-60-rgb`,
`--cds-white-rgb`.

A triplet that drifts from its hex twin is invisible — the colour just renders
slightly wrong wherever alpha is involved — so the check script compares each
`*-rgb` against its hex twin.

Two of these are re-exported at N2 for consumers that need alpha and must still
follow the theme: `--cds-agent-accent-rgb` and `--cds-support-error-rgb`.

---

## 4. The semantic layer (N2)

Grouped as they appear in the file; both theme blocks are kept in the same order so
they can be read side by side.

**Backgrounds** — the page shell. `--cds-background` (Gray 10 in g10, Gray 100 in
g100), `--cds-background-inverse`, `--cds-background-brand`, plus the
hover/active/selected states, which are translucent grays rather than solid stops.

**Layers** — containers stacked on the background. In g10 they alternate
white / Gray 10 / white as they nest; in g100 they *climb* the gray scale,
90 → 80 → 70. Same idea, opposite direction. This is what gives Carbon its
flat-but-legible depth without shadows. Each level has its own hover, active and
selected variants (`--cds-layer-hover-01` … `-03`, `--cds-layer-active-01/-02`,
`--cds-layer-selected-*`) — **use the state token that matches the level of the
layer you put the component on.**

**Fields** — input backgrounds: `--cds-field-01`, `--cds-field-02`, their hovers,
and `--cds-field-disabled`.

**Borders** — `--cds-border-subtle-00/-01/-02` for structure,
`--cds-border-strong-01/-02` for definition, plus `--cds-border-interactive`,
`--cds-border-inverse`, `--cds-border-disabled`. `--cds-border-subtle` is a
convenience alias for `-01`; the overwhelmingly common case is a subtle border on
a layer and spelling it that way keeps call sites readable.

**Text** — `--cds-text-primary`, `-secondary`, `-placeholder`, `-helper`, `-error`,
`-inverse`, `-on-color`, `-on-color-disabled`, `-disabled`. Note `--cds-text-error`
lightens from Red 60 to Red 40 in g100: Red 60 on a Gray 90 layer fails contrast, so
Carbon does not simply reuse the light value.

**Icons** — tracked separately from text, because Carbon lets an icon read stronger
than its adjacent label: `--cds-icon-primary`, `-secondary`, `-inverse`,
`-on-color`, `-interactive`, `-disabled`.

**Links** — `--cds-link-primary` (+ `-hover`), `--cds-link-secondary`,
`--cds-link-inverse`, `--cds-link-visited`.

**Interactive & focus** — `--cds-interactive`, `--cds-focus`, `--cds-focus-inset`,
`--cds-focus-inverse`, `--cds-highlight`. Focus goes **white** in g100, so the ring
stays visible against every layer.

**Buttons** — primary / secondary / tertiary / danger, each with hover and active,
plus `--cds-button-disabled` and `--cds-button-separator`. Tertiary inverts
completely between themes (Blue 60 in g10, white in g100).

**Support** — status and notification semantics: `--cds-support-error`, `-success`,
`-warning`, `-info`, `-caution-minor`, `-caution-major`, `-caution-undefined`, and
the four `*-inverse` variants. Note the asymmetry: warning is Yellow 30 in **both**
themes because darker yellows read as brown, while error, success and info all
lighten in g100 since their g10 stops were chosen for contrast against white.

**Subtle support fills** — four fill/border pairs for notifications and danger
buttons: `--cds-support-{error,success,info,warning}-subtle` and each one's
`-subtle-border`. In g10 they are the hue-10/hue-20 tints; in g100 the hue-90/hue-80
darks.

**Overlay & skeleton** — `--cds-overlay` (0.5 alpha in g10, deepened to 0.7 in g100,
because at 0.5 a dark modal does not separate from an already dark page),
`--cds-skeleton-background`, `--cds-skeleton-element`.

**Miscellaneous** — `--cds-toggle-off`.

**Agent identity** — `--cds-agent-accent` marks anything the AI produced: the border
on an agent-created card, the pulse on an unseen one, the connection badge. Purple 60
in g10; Purple 40 in g100, because Purple 60 is a mid tone that all but disappears
against Gray 90 and Gray 100 layers. `--cds-agent-accent-rgb` is its channel twin,
for the keyframes that need it at partial alpha.

**Star rating** — `--cds-rating-filled` / `--cds-rating-empty`. The light theme uses
Yellow 50 rather than a brighter gold: the filled/empty distinction *is* the
information being conveyed, so it has to clear 3:1 against the card, and the lighter
yellows do not. g100 can afford Yellow 30, which reads far better there.

**Page grid** — `--cds-grid-line`, the faint 24px lattice on `body`. It needs alpha
rather than a palette stop: the nearest solid gray reads as graph paper, and the
point of the texture is to sit just at the edge of perception. 2.5% dark-on-light in
g10, 4% light-on-dark in g100 (the same 2.5% disappears entirely against Gray 100).

---

## 5. Board status colours

Twelve statuses, three tokens each — 36 tokens per theme, matching how a column is
actually built:

| Token | Where it goes |
|---|---|
| `--cds-status-X` | the accent: heading text and the header border |
| `--cds-status-X-header` | fills the column header |
| `--cds-status-X-surface` | fills the column body behind the cards |

The two fills are deliberately close, with `-header` the stronger of the pair, so the
header reads as part of the column rather than as a stripe.

The statuses are `interested`, `applied`, `interview`, `offer`, `rejected`,
`forgotten`, `pending` (job board) and `researching`, `contacted`, `meeting`,
`negotiation`, `signed` (business board). `archived` and `passed` have no column
tokens — they are not rendered as columns.

**The light-theme accent is hue-70, not hue-60.** This is the non-obvious part. At
hue-60 on a hue-20 fill the accent measures between 3.71 and 3.84 depending on hue
(purple lands at 3.79) and fails AA for text. At hue-70 the same pairs land between
5.81 and 5.94. The accent carries heading text, so it is held to the 4.5:1 text
threshold, not the 3:1 UI one. In g100 the fills go to the dark end of each hue
(header = hue-80, surface = hue-90) and the accent climbs to hue-30, the stop that
stays legible both on its own fill and on a gray layer.

Two deliberate exceptions: `rejected` and `forgotten` are the two neutral columns,
and `forgotten` sits one step darker in g10 (Gray 80 accent on Gray 30/Gray 20 fills)
and one step lighter in g100, so the two stay distinguishable from each other.

`pending` is **teal**. It was the one status with no tokens at all — three Tailwind
slates inlined in `styles.css` — and teal was free because every other hue on the job
board was taken and teal is otherwise only used by the business board.

These have to be semantic rather than raw hex because the tints only work in one
theme: a pale lilac column body over a dark page is exactly the bug this layer
prevents.

---

## 6. Always-dark surfaces

`--cds-terminal-bg`, `--cds-terminal-border`, `--cds-terminal-text`,
`--cds-terminal-text-secondary`.

Named for their first use — tool output — but the concept is broader: **a surface
that stays dark in both themes because reading it as a console is the point.** In
practice that means agent tool output (`agent-console.css`), the code blocks in the
docs page (`docs.css`) and the login showcase panel (`login.css`). The dark theme
only widens the border (Gray 80 → Gray 70), which needs more separation there.

If you build something that must stay dark regardless of theme, reach for these
rather than hardcoding Gray 100.

---

## 7. Spacing

Carbon's 01–13 scale. **It is not a doubling scale** — it is dense at the bottom,
where component padding lives, and coarse at the top, where page composition happens:

| Token | 01 | 02 | 03 | 04 | 05 | 06 | 07 | 08 | 09 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| px | 2 | 4 | 8 | 12 | 16 | 24 | 32 | 40 | 48 | 64 | 80 | 96 | 160 |

Declared in `rem`. The check script asserts all thirteen exist, are in `rem`, and
climb monotonically — a transposed pair still renders, just wrong.

---

## 8. Type

Two families: `--cds-font-sans` (IBM Plex Sans) and `--cds-font-mono` (IBM Plex Mono).
IBM Plex is loaded from the `<head>` of each HTML entry, not via `@import`, because
an `@import` is invisible to the preload scanner.

Three weights: `--cds-font-weight-light` (300), `-regular` (400), `-semibold` (600).
**Carbon carries emphasis with 600 and never 700** — heavier than semibold reads as
shouting in this type system.

Ten sizes, `--cds-type-size-01` … `-10`: 12, 14, 16, 18, 20, 24, 28, 32, 42, 54 px.

Four line heights, separate atoms rather than one global multiplier because type gets
tighter as it grows: `--cds-line-height-01` 1.28572, `-02` 1.5, `-03` 1.4, `-04` 1.25.

Three letter spacings — Carbon opens up small type and lets large type sit at zero:
`--cds-letter-spacing-01` 0.32px (12px type), `-02` 0.16px (14px type), `-03` 0
(16px and up).

Eleven **composed styles** sit on top. The atoms are the vocabulary; these are the
sentences the UI actually speaks. Each is four tokens (`-font-size`, `-line-height`,
`-letter-spacing`, `-font-weight`), 44 in all:

| Style | Size | Line height | Weight |
|---|---|---|---|
| `label-01` | 12px | 1.28572 | 400 |
| `helper-text-01` | 12px | 1.28572 | 400 |
| `body-01` | 14px | 1.28572 | 400 |
| `body-02` | 16px | 1.5 | 400 |
| `code-01` | 12px | 1.28572 | 400 |
| `code-02` | 14px | 1.28572 | 400 |
| `heading-01` | 14px | 1.28572 | 600 |
| `heading-02` | 16px | 1.4 | 600 |
| `heading-03` | 20px | 1.4 | 400 |
| `heading-04` | 28px | 1.25 | 400 |
| `heading-05` | 32px | 1.25 | 400 |

Prefer a composed style over hand-assembling atoms — it is the difference between
"14px semibold" and "a heading". The check script asserts every composed token is
built from an atom rather than a raw value.

---

## 9. Radius and elevation

**Radius is 0.** `--cds-radius-00` everywhere. Carbon is square: corners are
structure, not decoration, and rounding them is the single change that most makes a
UI stop reading as Carbon. The one exception is `--cds-radius-pill` (62.5rem), which
exists only for tags, which are pill-shaped by spec.

**Elevation is none.** Carbon separates surfaces with layer colour, not shadow.
`--cds-shadow-none` is the default for anything sitting in the page flow. The one
sanctioned shadow is `--cds-shadow-overlay` (`0 2px 6px rgba(0,0,0,0.2)`), for things
that float above the page and must be dismissible — menus, popovers, modals.

---

## 10. Accessibility

`check-tokens.py` measures WCAG ratios for the pairs that matter, in both themes:
body text at 4.5:1, non-text UI at 3:1, board status accents at 4.5:1 (they carry
heading text), and specific foreground-on-fill pairs. Everything currently passes.

### Known exceptions — documented, not hidden

These are below threshold in Carbon's own palette. The script reports the real
numbers as NOTES rather than quietly choosing a threshold they would pass:

| Token | g10 | g100 | Why it is allowed |
|---|---|---|---|
| `--cds-text-placeholder` | 2.38 | 3.01 | Carbon uses Gray 40 and documents it as not meeting AA. **Never rely on a placeholder to convey information.** |
| `--cds-support-warning` | 1.68 | 8.99 | Yellow 30 is a fill carrying a dark glyph, not text. |
| `--cds-support-caution-minor` | 1.68 | 8.99 | Fill, not text. |
| `--cds-support-caution-major` | 2.46 | 6.15 | Fill, not text. |

### Two real pairing constraints

**1. In g100, `layer-03` is Gray 70 and cannot host low-emphasis content.** It is a
mid gray that leaves too little headroom: `text-helper` lands at 3.29 there,
`link-primary` at 3.32, `text-error` at 3.30, `interactive` at 2.33. Carbon calibrates
its low-emphasis tokens against the page background and the first two layers only —
it never promised them on `layer-03`. So: a third-level container must not host
helper text, links, error text or an interactive fill. Only `text-primary`,
`text-secondary` and the icon tokens are safe that deep.

**2. The numbered suffix on `border-strong-*` is a pairing contract, not a ranking.**
`-01` goes on `layer-01` (and `background`, `field-01`); `-02` goes on `layer-02`.
Crossing the levels fails by construction — `border-strong-01` on `layer-02` in g100
measures 2.30. The script checks each one only against the surfaces it is actually
for, which is a statement of intent, not a way of dodging red output.

---

## 11. How to add a new component

1. **Pick a surface first.** Sitting directly on the page? `--cds-background`. A card
   or panel on the page? `--cds-layer-01`. Nested inside something that is already
   `layer-01`? `--cds-layer-02`. Deeper than that, re-read constraint 1 above.
2. **Take the states that match the level you chose.** A `layer-01` component hovers
   to `--cds-layer-hover-01`, not `-02`. Same for `field-01` → `--cds-field-hover-01`
   and `border-strong-01`.
3. **Text and icons** are `--cds-text-primary` / `--cds-text-secondary` and
   `--cds-icon-primary` / `--cds-icon-secondary`. Helper copy uses
   `--cds-text-helper`, and only on `background`, `layer-01`, `layer-02` or `field-01`.
4. **Borders** are `--cds-border-subtle` (or `-00` for the lightest hairline);
   `--cds-border-strong-0N` only when the boundary needs to be a definition rather
   than a division.
5. **Spacing** comes off the 01–13 scale. Do not write a raw `px` or `rem` value.
6. **Type** uses a composed style where one fits, atoms otherwise. Never weight 700.
7. **Corners are `--cds-radius-00`.** Shadow is `--cds-shadow-none` unless the thing
   floats and is dismissible, in which case `--cds-shadow-overlay`.
8. **Focus** is `--cds-focus` (plus `--cds-focus-inset` where a ring needs an inner
   contrast line). Do not roll your own outline colour.
9. **Never reference an N1 token.** If you find yourself wanting `--cds-gray-70`, what
   you actually want is a semantic that does not exist yet — add it to *both* theme
   blocks, in the same position, with a comment saying why.
10. **Board columns** use the `--cds-status-*` triplet; anything the agent produced
    uses `--cds-agent-accent`; anything that must stay dark uses `--cds-terminal-*`.

---

## 12. How to verify

```bash
python3 scripts/check-tokens.py     # run from the repo root
```

It checks, and exits non-zero on any failure:

- **Structure** — every `var(--cds-*)` reference resolves; no token defined twice
  within a scope; no N2 semantic hardcodes a hex literal; every N2 semantic points
  at a primitive; every `*-rgb` triplet matches its hex twin.
- **Parity** — g100 redefines exactly the same key set as g10, in both directions.
- **Contrast** — the full ratio table above, per theme, against the level each pair
  is held to. Known Carbon exceptions print as NOTES instead of failures.
- **Scales** — the thirteen spacing steps exist, are in `rem` and climb monotonically;
  every composed type style is built from atoms.

Two supporting scripts exist for spot checks:
`scripts/audit-undefined-tokens.py` and `scripts/find-non-carbon-colors.py`.

---

## 13. Known remaining debt

Recorded here so nobody mistakes it for the intended pattern:

- **The bridge layer.** `src/styles/styles.css` still opens with a `:root` block of
  17 legacy aliases (`--color-primary`, `--canvas`, `--border`, …) forwarding to
  Carbon semantics. They survive only because they are read from inline styles in
  TSX. Nothing may be added to that block, and it goes away with the inline-style
  migration. `--font-weight-medium: 500` is the odd one out: it is off the Carbon
  scale (400 then 600, nothing between) and still appears in live declarations.
- **Two N1 leaks.** `styles.css` line 28 maps the legacy `--color-accent` straight to
  `--cds-purple-60`, and the login showcase SVG in `src/pages/login/main.tsx`
  references `--cds-teal-50` directly alongside a few hardcoded hex and `rgba()`
  values. The SVG sits on an always-dark panel so it does not visibly break under a
  theme switch, but it is still a violation of the hard rule in section 1.
- **`--cds-white-rgb`** is defined at N1 but currently has no consumer.
- **The composed type styles are underused.** Most call sites still assemble
  `--cds-type-size-0N` plus a weight by hand. New code should prefer the composed
  style.
