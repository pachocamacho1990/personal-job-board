---
updated: 2026-07-30T18:16
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0 y M1 COMPLETOS · siguiente M2 · CSS por página
in_flight: ninguno
next: PJBA-16 — migrar src/styles/agent-console.css a Carbon (el mayor ofensor: ~12 tokens --agent-* propios, glassmorphism, 6 tokens indefinidos)
branch: feature/carbon-migration (pusheada, sincronizada)
verified: check-tokens.py OK · tsc limpio · vite build OK · capturas del board en g10 y g100 revisadas
---

## Dónde quedamos

M0 y M1 cerrados: 8 issues. El motor de tokens existe, tiene tema oscuro, y **`styles.css`
ya lo consume de verdad** — el board renderiza en oscuro y no queda ni un literal de color en
ese archivo. Lo que sigue en la capa legacy son las **hojas por página**, que es M2.

## Siguiente paso

**PJBA-16** — `src/styles/agent-console.css` a Carbon. Es el archivo más grande (20 KB) y el
que más deuda tiene:

- ~12 tokens propios `--agent-*` que duplican semánticos que ya existen.
- **6 tokens indefinidos** que hoy no pintan nada: `--color-text-primary` (4 usos),
  `--color-text-secondary`, `--color-canvas-subtle`. Verificar con
  `python3 <scratchpad>/audit_undefined.py` — o mejor, mover ese script a `scripts/`.
- `backdrop-filter: blur`, hover-lift con sombra, gradiente shimmer → fuera.
- Purgar `#EF4444`, `#DC2626`, `#F59E0B`, `#10B981`, `#A855F7`, `#8B5CF6`, `#4f46e5`.
- Mono → `--cds-font-mono`.

Herramientas ya escritas y reutilizables (están en el scratchpad de la sesión, conviene
moverlas a `scripts/` en PJBA-16):
- `find_colors.py <archivo.css>` — lista literales y marca los que no son Carbon.
- `audit_undefined.py` — `var()` que no resuelven, con y sin fallback.
- `audit_tokens.py` — quién consume cada token del `:root` de `styles.css`.

Y en el repo: `python3 scripts/check-tokens.py` tras cada cambio.

## Hecho en esta sesión

Antes de Carbon: **PR #33 mergeado a `main`** (tool `browse_url` del agente, v3.12.0).

**M0** — PJBA-8 `da9aa1f`, PJBA-9 `9851e02`, PJBA-10 `cc42396`, PJBA-12 `e555b0c`,
PJBA-11 `63f0333`.

**M1** — PJBA-13 `162acdb`, PJBA-14 `97ccb08`, PJBA-15 `1645fe3`.

Cada issue tiene comentario detallado en Linear con sus desviaciones.

## En vuelo / a medias

Nada. Working tree limpio, rama pusheada.

## Decisiones tomadas

Las duraderas en `DECISIONS.md`. De M1:

- **La capa de alias de `styles.css` sobrevive a propósito.** 34 nombres se leen desde 6 hojas
  y 9 componentes sin migrar. Un `var()` indefinido no da error: apaga la regla en silencio.
  La borra **PJBA-21**, no antes.
- **Los colores de estado son semánticos, no literales.** 12 estados × 3 tokens × 2 temas.
  `pending` era el único sin tokens (tres slates de Tailwind incrustados) y ahora es teal.
- **Los acentos de estado en tema claro van en hue-70, no hue-60.** A 60 sobre relleno 20 dan
  3.79 y no pasan AA. Era un bug preexistente, no algo que introdujera la migración.
- **`--color-primary` → `--cds-button-primary`**, no `--cds-interactive`: interactive baja a
  Blue 50 en g100 y falla bajo texto blanco de botón.
- **Los overlays conservan sombra** (`--cds-shadow-overlay`); todo lo que está en flujo la
  pierde.

## Trampas descubiertas

- **Un `var()` indefinido no da error.** El navegador descarta la declaración entera y la regla
  no hace nada. Es el modo de fallo dominante de esta migración: hoy quedan **13 tokens
  indefinidos en 37 referencias**, todas en archivos de M2/M3.
- **El contenedor `jobboard-agent` puede ser recreado** entre pasos (pasó esta sesión, exit 0,
  sin OOM). Eso borra cualquier `pip install` manual; las deps de la imagen sobreviven.
- **Un gris sólido no sustituye a un negro con alfa muy baja.** Apuntar el grid del `body` a
  `--cds-border-subtle-00` lo convirtió en papel milimetrado. Las texturas al borde de lo
  perceptible necesitan alfa, o sea un triplete RGB.
- **Un triplete `-rgb` que no cuadre con su hex es invisible.** El checker ya lo vigila.
- **Cuidado con los espacios finales al hacer replace exacto en CSS**:
  `background-image: ` tenía uno y rompió el primer intento de sustitución.
- **`document.documentElement` no existe** cuando corre un init script de Playwright; para
  medir cuándo se aplica un atributo hay que interceptar `Element.prototype.setAttribute`.
- **`document.fonts.check()` da `false` para fuentes declaradas pero sin usar** — descarga
  perezosa, no ausencia.
- **Los merges de este repo son rebase merges.**

## Preguntas abiertas para el usuario

Ninguna. M2 (PJBA-16 → 21) no depende de decisiones pendientes.
