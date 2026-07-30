---
updated: 2026-07-30T20:30
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0, M1 y M2 COMPLETOS (14/26 issues) · siguiente M3 · Componentes y primitivas
in_flight: ninguno
next: PJBA-22 — matar los literales de color en TSX y arreglar los 9 tokens indefinidos, todos en estilos inline de componentes
branch: feature/carbon-migration (18 commits, pusheada y sincronizada)
verified: check-tokens.py OK · tsc limpio · vite build OK · las 6 páginas capturadas en g10 y g100
---

## Dónde quedamos

**Toda la capa CSS está migrada.** Las ocho hojas de `src/styles/` no contienen ni un literal
de color y leen solo semánticos `--cds-*`. El tema oscuro funciona de verdad en board,
dashboard, perfil, login, docs y consola del agente.

Lo que queda de deuda está **en los componentes**: estilos inline en TSX con hex crudos y
tokens que no resuelven. Eso es M3.

## Siguiente paso

**PJBA-22** — literales de color en TSX. El trabajo concreto, ya medido:

`python3 scripts/audit-undefined-tokens.py` devuelve **9 tokens indefinidos en 28
referencias**, todas en componentes y todas preexistentes (nunca estuvieron definidas en
ningún `:root`):

- `--primary` — 8 usos en `src/pages/index/main.tsx`, 1 en `AgentMessage.tsx`
- `--border-radius-sm` — 8 usos en `index/main.tsx`
- `--bg-card-hover` — 6 usos en `index/main.tsx` (4 con fallback, 2 sin)
- `--text-main` — 2 usos en `DetailPanel.tsx`
- `--color-bg-card`, `--bg-input` — `AgentMessage.tsx`
- `--color-primary-light` — `index/main.tsx`

**No tocar `--hover-x` ni `--hover-y`** (`login.css`): los pone el JS para el seguimiento del
cursor, no son tokens.

Además, buscar hex crudos en TSX:
`grep -rniE "#[0-9a-f]{3,8}\b" src/components src/pages --include="*.tsx"`

**Cuando PJBA-22 termine**, el bloque BRIDGE LAYER de `src/styles/styles.css` debe
desaparecer entero. Ahora tiene 17 tokens y el comentario del bloque explica que 16 existen
solo para esos estilos inline. El único que sobreviviría es `--font-weight-medium` (peso 500,
fuera de la escala de Carbon) — decidir entonces si se estrecha a 400/600.

Herramientas en el repo, correr tras **cada** cambio:
- `python3 scripts/check-tokens.py` — estructura, paridad g10/g100, contraste WCAG
- `python3 scripts/audit-undefined-tokens.py` — `var()` que no resuelven
- `python3 scripts/find-non-carbon-colors.py <archivo.css>` — literales fuera de paleta

## Hecho en esta sesión

Antes de Carbon: **PR #33 mergeado a `main`** (tool `browse_url` del agente, v3.12.0).

- **M0** — PJBA-8 `da9aa1f`, PJBA-9 `9851e02`, PJBA-10 `cc42396`, PJBA-12 `e555b0c`,
  PJBA-11 `63f0333`
- **M1** — PJBA-13 `162acdb`, PJBA-14 `97ccb08`, PJBA-15 `1645fe3`
- **M2** — PJBA-16 `b63b33f`, PJBA-17 `ced3799`, PJBA-18 `e0e63dc`, PJBA-19 `3035ca4`,
  PJBA-20 `59e92af`, PJBA-21 `5018fae`

Cada issue tiene comentario detallado en Linear con sus desviaciones.

## En vuelo / a medias

Nada. Working tree limpio, rama pusheada.

## Decisiones tomadas

Las duraderas en `DECISIONS.md`. Resumen:

- **Un solo PR al terminar los 6 milestones.** Decisión explícita del usuario.
- **Los colores de estado son semánticos**, 12 estados × 3 tokens × 2 temas. `pending` era el
  único sin tokens y ahora es teal.
- **Los acentos de estado en claro van en hue-70, no hue-60** — a 60 sobre relleno 20 dan 3.79
  y no pasan AA. Bug preexistente.
- **`--cds-terminal-*` significa "superficie que sigue oscura en ambos temas"**, no solo
  terminal: la usan la salida de herramientas, los bloques de código de docs y el panel
  showcase del login.
- **Los overlays conservan sombra**; todo lo que está en flujo la pierde.
- **`--color-primary` → `--cds-button-primary`**, no `--cds-interactive`.

## Trampas descubiertas

- **Un `var()` indefinido no da error.** El navegador descarta la declaración entera y la regla
  no hace nada. Es el modo de fallo dominante de esta migración y ya ha mordido tres veces:
  `--color-primary-soft` dejaba un input **sin ningún indicador de foco**; `--font-title` (8
  usos) hacía que los títulos de docs cayeran al fallback; y quitar los alias locales de la
  sidebar en PJBA-19 **rompió `Sidebar.tsx`** hasta que el audit lo destapó en PJBA-21.
  **Correr el audit después de cada eliminación, no al final.**
- **Vite bundlea todo el CSS en un archivo que cargan las 6 páginas.** Un selector de elemento
  a nivel raíz en cualquier hoja aplica en toda la app: `docs.css` estilaba los `h1` y `code`
  de la app entera. Verificado en la página de login antes y después.
- **El contenedor `jobboard-agent` se recrea solo cada cierto tiempo** (pasó dos veces esta
  sesión, exit 0 sin OOM). Borra `/tmp` y cualquier `pip install` manual; las deps de la imagen
  sobreviven. Volver a copiar los scripts con `docker cp` antes de usarlos.
- **Un gris sólido no sustituye a un negro con alfa muy baja.** El grid del `body` apuntado a
  `--cds-border-subtle-00` quedó como papel milimetrado. Texturas al borde de lo perceptible
  necesitan alfa, o sea un triplete RGB.
- **Un triplete `-rgb` que no cuadre con su hex es invisible.** El checker ya lo vigila.
- **Cuidado con los espacios finales al hacer replace exacto en CSS.**
- **`document.documentElement` no existe** cuando corre un init script de Playwright; para
  medir cuándo se aplica un atributo hay que interceptar `Element.prototype.setAttribute`.
- **`document.fonts.check()` da `false` para fuentes declaradas pero sin usar** — descarga
  perezosa, no ausencia.
- **Los merges de este repo son rebase merges.**

## Preguntas abiertas para el usuario

Ninguna. M3 (PJBA-22 → 27) no depende de decisiones pendientes.
