---
updated: 2026-07-30T23:50
project: M6 · Refinamiento premium sobre Carbon — investigación cerrada, issues escritos
linear: PJBA-34→41 en el milestone "M6 · Refinamiento premium" del proyecto Migración a IBM Carbon
milestone: M6 (0/8) · los milestones M0–M5 de la migración están al 100%
in_flight: PJBA-34 (tokens de motion) — arrancando
next: añadir los 12 tokens de motion a la sección N1 de src/styles/theme.css (junto a spacing/radio, alrededor de la línea 292) y migrar las 57 transiciones a mano
branch: feature/carbon-migration (33 commits, pusheada; PR #34 abierto A PROPÓSITO, no se mergea hasta cerrar M6)
verified: sin cambios de código todavía en esta sesión · último estado verificado: gate 5/5, contraste 0 fallos, 75 tests backend, 8 E2E, tsc y build limpios
---

## Dónde quedamos

La migración a Carbon está cerrada (26/26). El PR #34 sigue abierto **a propósito**: el usuario no
quiere mandarlo a `main` hasta resolver sus objeciones visuales.

Esta sesión hizo la investigación que faltaba y la convirtió en 8 issues. **No se ha tocado código
todavía.**

## Lo que la investigación estableció

Fuentes primarias: el código fuente de `carbon-design-system/carbon` (rama `main`) y los `.mdx` de
`carbon-website`, no la web renderizada — el sitio es un Gatsby SPA y WebFetch lo trunca. La ruta
que funciona es `raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/<ruta>.mdx`
y `gh api "repos/carbon-design-system/carbon/git/trees/main?recursive=1"` para localizar ficheros.

**Tres de las cuatro objeciones del usuario son válidas y Carbon las soporta.** La postura "Carbon
es cuadrado y plano por principio" que se aplicó en M0–M5 fue una lectura demasiado rígida:

1. **Radio** — `$button-border-radius: 0 !default` (el `!default` es un override sancionado);
   popover expone `--cds-popover-border-radius`; content-switcher usa 4px nativo; y existe
   `tile--decorator-rounded` con 8px (`$spacing-03`). El default es 0, el vocabulario no.
2. **Elevación** — existe el token `$shadow` (negro @ 0.3 alpha) y el mixin oficial
   `box-shadow: 0 2px 6px $shadow` en `packages/styles/scss/utilities/_box-shadow.scss`. Lo que no
   existe es una rampa multinivel.
3. **Columnas** — el modelo de layering dice superficies en gris (`layer-01/02/03`) y hue solo
   como acento. Suavizar aquí **sube** el margen de contraste, no lo baja.
4. **Motion** — hueco total, no decisión. Carbon define 6 duraciones y 6 easings exactos.

**Hallazgo extra: Carbon for AI.** Estable, con tokens reales (`ai-aura-*`, `ai-border-start/end`,
`ai-drop-shadow`, `ai-inner-shadow`). Prohibido como decoración, permitido para marcar IA — y esta
app tiene IA de verdad (Zenith, `origin='agent'`, widget de AI matches).

**Carbon MCP**: existe en `https://mcp.carbondesignsystem.com/mcp`, requiere token + session ID vía
IBMid. Probado: **401 sin credenciales**. No desbloquea nada de M6 y no debe bloquearlo.

## Los issues de M6

| Issue | Qué | Bloqueado por |
|-------|-----|---------------|
| PJBA-34 | Tokens de motion + migrar las 57 transiciones | — |
| PJBA-35 | Página de comparación de variantes (gate de decisión) | — |
| PJBA-36 | Escala de radio, revertir el radio 0 absoluto | PJBA-35 |
| PJBA-37 | Profundidad en hover/click | PJBA-34, PJBA-35 |
| PJBA-38 | Suavizar columnas: superficies grises, hue como acento | — |
| PJBA-39 | Registro Carbon for AI | PJBA-36 |
| PJBA-40 | Re-verificación y cierre de M6 + merge del PR #34 | todos |
| PJBA-41 | Conectar Carbon MCP (bloqueado por alta manual del usuario) | — |

## Siguiente paso

**PJBA-34.** Añadir a `src/styles/theme.css`, en la sección N1 de escalas (junto al bloque de radio
de la línea 292), doce custom properties en `:root` — **no** duplicadas en el bloque
`[data-carbon-theme='g100']`, porque son independientes del tema:

- `--cds-duration-fast-01: 70ms`, `-fast-02: 110ms`, `-moderate-01: 150ms`,
  `-moderate-02: 240ms`, `-slow-01: 400ms`, `-slow-02: 700ms`
- `--cds-easing-standard-productive: cubic-bezier(0.2, 0, 0.38, 0.9)`
- `--cds-easing-standard-expressive: cubic-bezier(0.4, 0.14, 0.3, 1)`
- `--cds-easing-entrance-productive: cubic-bezier(0, 0, 0.38, 0.9)`
- `--cds-easing-entrance-expressive: cubic-bezier(0, 0, 0.3, 1)`
- `--cds-easing-exit-productive: cubic-bezier(0.2, 0, 1, 0.9)`
- `--cds-easing-exit-expressive: cubic-bezier(0.4, 0.14, 1, 1)`

Luego migrar las 57 `transition:` (7 en `dashboard.css`, la variable local
`--agent-transition` en `agent-console.css:16`, resto repartido), sustituir los `transition: all`
por listas explícitas de propiedad, y añadir el bloque `@media (prefers-reduced-motion: reduce)`.

## Decisiones tomadas

En `DECISIONS.md`. **Pendiente**: la entrada de PJBA-15 que declara radio 0 y ausencia de elevación
ya no está "en revisión" — está **desmentida** por la investigación y hay que reescribirla, no
matizarla. Eso lo hace PJBA-36.

## Herramientas de verificación

```bash
npm run check:design                             # gate: 5 checks
python3 scripts/check-tokens.py                  # estructura, paridad g10/g100, WCAG
python3 scripts/audit-undefined-tokens.py        # var() que no resuelven
python3 scripts/contrast-sweep.py                # 0 fallos, 6 páginas × 2 temas
npm test                                         # 75 tests backend
npx playwright test tests/theme-toggle.spec.js   # 8 E2E del toggle
```

El barrido de contraste **sí está en el repo** (`scripts/contrast-sweep.py`, commit `49d45ea`) —
el handoff anterior decía lo contrario y era información obsoleta.

## Trampas descubiertas

Las de la migración siguen vigentes (ver `archive/2026-07-30-pjba-8-33-migracion-carbon-completa.md`):

- **Un `var()` indefinido no da error**: el navegador descarta la declaración entera.
- **Un barrido que solo busca hex y `rgba()` deja pasar `color: white`.** Sobrevivió seis milestones.
- **Medir el contraste encuentra lo que mirar capturas no.** 57 fallos invisibles.
- **El contenedor `jobboard-agent` se recrea solo** y borra `/tmp`: volver a copiar los scripts de
  Playwright con `docker cp` antes de usarlos.
- **Los merges de este repo son rebase merges.**

Nuevas de esta sesión:

- **`carbondesignsystem.com` es un Gatsby SPA**: WebFetch devuelve contenido truncado. Ir siempre
  al `.mdx` en `raw.githubusercontent.com`.
- **El `!default` de Sass en Carbon marca los puntos de override sancionados.** Es la señal a
  buscar antes de declarar que algo "no se puede cambiar sin salirse del sistema".

## Preguntas abiertas para el usuario

1. Los valores concretos de radio y el tratamiento de hover salen de PJBA-35, no están decididos.
2. El alta de Carbon MCP (PJBA-41) requiere que él entre con IBMid; nadie más puede hacerlo.
