---
updated: 2026-07-31T13:50
project: Migración a IBM Carbon (g10/g100) — COMPLETA, incluido el refinamiento M6
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M6 · Refinamiento premium — 8/9 cerrados; solo queda PJBA-41, bloqueado en el usuario
in_flight: ninguno
next: no hay trabajo pendiente asignable. Si se retoma, el primer movimiento es "git checkout main && git pull && git checkout -b feature/<lo-nuevo>" — main YA tiene todo mergeado. Ver "Preguntas abiertas" para las tres cosas que quedaron fuera de alcance.
branch: main (limpia, sincronizada con origin). feature/carbon-migration mergeada y ya no se usa.
verified: gate 7/7 · contraste 0 fallos en 12 combinaciones sobre boards poblados · 75 tests backend · 8 E2E del toggle · tsc y build limpios · PR #34 mergeado
---

## Dónde quedamos

El proyecto está **cerrado y en `main`**. La migración a Carbon (v3.13.0) y el
refinamiento visual posterior (v3.14.0) se mergearon juntos en el PR #34, rebase merge,
commit `15cf044`.

El refinamiento existió porque el usuario desplegó el resultado de la migración y no le
convenció: demasiado cuadrada, sin respuesta al puntero, columnas del tablero demasiado
cargadas de color. Tres de esas cuatro cosas eran decisiones tomadas de más **durante** la
migración, no deuda heredada, así que lo primero fue comprobar la premisa en vez de
defenderla.

La investigación fue al código fuente de `carbon-design-system/carbon`, no a la memoria, y
la desmintió: el **default** de Carbon es cuadrado y plano, su **vocabulario** no lo es.

## Siguiente paso

**No hay ninguno pendiente que dependa de nosotros.** M6 está cerrado y mergeado.

Si se abre trabajo nuevo, empezar obligatoriamente por:

```bash
git checkout main && git pull && git checkout -b feature/<lo-nuevo>
```

`main` ya contiene todo. Cortar de `feature/carbon-migration` replicaría 43 commits que
ya están arriba.

## Hecho en esta sesión

- **PJBA-34** — Sistema de motion de Carbon. 12 tokens en `src/styles/theme.css` (6
  duraciones 70–700ms, 6 curvas de easing). ~60 transiciones migradas, cero
  `transition: all`. `@media (prefers-reduced-motion: reduce)` colapsa las duraciones.
  Commit `1c467bc`.
- **PJBA-35** — Página de comparación de variantes (borrada en PJBA-40, cumplió su
  función). El usuario eligió mirando: radio 8px en contenedores, hover con sombra +
  `translateY(-2px)`. Commit `0e1d338`.
- **PJBA-36 + PJBA-37** — Escala de radio (0 / 2 / 4 / 8 / pill) y elevación. Commit
  `3d81d5e`.
- **PJBA-42** — Vocabulario de interacción en tres roles aplicado a las 78 reglas de hover
  de la app, más el rediseño del panel del agente. Commit `4623eb2`.
- **PJBA-38** — Las columnas del tablero pierden el relleno de hue. Commit `f5ab8be`.
- **PJBA-39** — Registro Carbon for AI en los cinco sitios con IA real. Commit `8e089a2`.
- **PJBA-40** — Documentación, limpieza, v3.14.0 y merge del PR #34. Commit `e8d3c96`.

## En vuelo / a medias

Nada.

## Decisiones tomadas

Las tres entradas nuevas están en `DECISIONS.md`. Resumen de las que más condicionan
trabajo futuro:

- **La afirmación "Carbon es cuadrado por principio" queda retirada.** Era mía, de
  PJBA-10/15, y es falsa: `$button-border-radius` está declarado `!default`, popover
  expone `--cds-popover-border-radius`, content-switcher usa 4px nativo y existe
  `tile--decorator-rounded` con 8px.
- **La profundidad se construye en tres mecanismos y en este orden**: color de capa →
  motion → la única sombra. La sombra es el último recurso. **Nada en reposo lleva
  sombra** — marca un estado, nunca una jerarquía.
- **`--cds-shadow-color` es temático porque es medible**: negro al 0.3 da 2.09:1 sobre
  `#f4f4f4` y 1.06:1 sobre `#161616`. En g100 no hay alpha que rescate una sombra oscura.
- **Carbon for AI se adopta en morado, no en azul.** El azul de Carbon ya está ocupado
  aquí por `button-primary` y `status-applied`. Estructura idéntica, hue distinto.
- **Descartado**: bajar el acento de estado a hue-60. Sigue siendo primer plano sobre los
  chips tintados, donde 60 no pasa AA — es exactamente por lo que PJBA-13 lo subió a 70.
- **Descartado**: redefinir los tokens `-header` / `-surface` a grises. Los consumen los
  skill chips y los bloques del agente, donde el tinte es correcto. Lo que cambió es
  **quién los consume**, no su valor.

## Trampas descubiertas

Las de la migración siguen vigentes (ver
`archive/2026-07-30-pjba-8-33-migracion-carbon-completa.md`). Nuevas de esta sesión:

- **`carbondesignsystem.com` es un Gatsby SPA**: WebFetch devuelve contenido truncado. Ir
  siempre al `.mdx` en
  `raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/<ruta>.mdx`,
  y usar `gh api "repos/carbon-design-system/carbon/git/trees/main?recursive=1"` para
  localizar ficheros.
- **El `!default` de Sass en Carbon marca los puntos de override sancionados.** Es la señal
  a buscar antes de declarar que algo no se puede cambiar sin salirse del sistema.
- **El barrido de contraste llevaba seis milestones escaneando un tablero vacío.** Se
  registra con una cuenta nueva, y una cuenta nueva no tiene tarjetas. Ya siembra 7
  trabajos y 5 entidades antes de escanear. Cualquier script de QA que cree su propia
  cuenta tiene este problema por defecto.
- **Un stop de hover usado como estado en reposo baja el contraste sin que se note.** Usé
  `ai-aura-hover-start` (alfa 0.32) permanentemente y tiñó la tarjeta lo justo para bajar
  las estrellas de 4.99:1 a 4.49:1.
- **`check-tokens.py` lee un bloque `@media (prefers-reduced-motion)` como tokens
  duplicados** si no se extrae antes. Ya lo hace, y a cambio verifica que ahí dentro solo
  se sobrescriban duraciones que ya existen.
- **El `package.json` raíz no tiene campo `version`** — nunca lo tuvo. La versión vive en
  `CLAUDE.md` y `CHANGELOG.md`.
- **El contenedor `jobboard-agent` se recrea solo** y pierde `/tmp`: volver a copiar los
  scripts con `docker cp` antes de cada uso.
- **Los merges de este repo son rebase merges.**

## Estado de verificación

Corrido al cierre, sobre el árbol que se mergeó:

```
npm run check:design                        PASS — 7/7 checks
python3 scripts/check-tokens.py             PASS
python3 scripts/audit-undefined-tokens.py   0 referencias sin fallback
python3 scripts/contrast-sweep.py           0 fallos · 12 combinaciones · boards poblados
cd server && npm test                       75 passed, 1 skipped
npx playwright test tests/theme-toggle.spec.js   8 passed
npx tsc --noEmit && npm run build           limpios
```

El gate pasó de 5 a 7 checks: se añadieron `Duration and easing literals` y
`Corner radius literals`, y ambos encontraron violaciones reales en su primera ejecución.

## Preguntas abiertas para el usuario

1. **PJBA-41 — el alta del Carbon MCP está bloqueada en él.** Requiere OAuth con IBMid en
   <https://mcp.carbondesignsystem.com/mcp/auth/ibmid/web>; los no-IBMers tienen que
   solicitar acceso y esperar un correo. Verificado: sin credenciales el endpoint devuelve
   401. No desbloquea nada.
2. **15 cuentas de prueba en la base** (`test-qa-*`, `shot-*`, `ai-*`). El barrido deja una
   por ejecución y ahora además siembra 12 filas cada vez. Merece un flag `--cleanup` en
   `scripts/contrast-sweep.py`. No se borró nada sin pedirlo.
3. **El acento de `forgotten` es gris**, así que su barra de cabecera se lee como un borde
   oscuro normal y no como un color de estado. Es coherente — es el estado neutro — pero
   se le preguntó y no contestó.
4. **Componente AI label con popover de explicabilidad** (punto 3 de PJBA-39): quedó fuera
   porque es un componente nuevo, no un cambio de estilo.
