---
updated: 2026-07-31T17:10
project: ninguno en curso — el de Carbon está cerrado y mergeado
linear: proyecto "Migración a IBM Carbon (g10/g100)" cerrado, 8 milestones al 100 %
milestone: ninguno
in_flight: ninguno
next: no hay trabajo pendiente. Al empezar algo nuevo, arrancar con "git checkout main && git pull && git checkout -b feature/<lo-nuevo>" — main ya tiene todo. Si buscas por dónde seguir, ver "Deuda conocida" abajo.
branch: main, limpia y sincronizada con origin en 1b3b846 (v3.15.0)
verified: gate 8/8 · contraste 0 fallos en 12 combinaciones sobre tableros poblados · 75 tests backend · 9 E2E · tsc y build limpios
---

## Dónde quedamos

Nada en curso. El rediseño a Carbon terminó y está en `main`: PR #34 (v3.13.0 + v3.14.0)
y PR #35 (v3.15.0), mergeados.

Empezó como una migración y acabó siendo tres cosas. Cada fase salió de desplegar la
anterior y mirarla: la migración produjo el refinamiento, y el refinamiento produjo la
segunda pasada de bugs. Ese ciclo encontró más que cualquiera de las fases planificadas.

## Siguiente paso

No hay ninguno pendiente. Para trabajo nuevo:

```bash
git checkout main && git pull && git checkout -b feature/<lo-nuevo>
```

Los merges de este repo son **rebase merges**: cortar de una rama vieja replica commits
que ya están arriba.

## Deuda conocida, por si buscas por dónde seguir

Ordenada por lo que más probablemente moleste primero.

1. **Colisión de azules.** Una tarjeta creada por el agente en la columna *Applied* lleva
   borde azul de estado y aura azul de IA a la vez. Verificado sobre datos: se
   distinguen, pero es el punto más débil del sistema. Dos salidas escritas en
   `DESIGN_SYSTEM.md` §9b — mover `status-applied` a otro hue, o separar el stop de IA
   del de estado.
2. **~20 cuentas de prueba en la base** (`test-qa-*`, `shot-*`, `ai-*`, `m7-*`,
   `probe-*`, `dlg-*`). `scripts/contrast-sweep.py` deja una por ejecución y ahora
   siembra 12 filas cada vez. Merece un flag `--cleanup`.
3. **La capa puente** de `src/styles/styles.css`: 17 alias legacy (`--color-primary`,
   `--canvas`, …) que sobreviven porque los leen estilos inline en TSX. Se van con la
   migración de estilos inline. No añadir nada a ese bloque.
4. **Una fuga N1**: `styles.css` línea 28 mapea `--color-accent` directo a
   `--cds-purple-60`. Un primitivo no sigue el cambio de tema.
5. **Idiomas mezclados** en toda la app: login en inglés, documentación en español,
   dashboard con títulos de ambos. Decisión de producto, no de estilo.
6. **Componente AI label** de Carbon con popover de explicabilidad — quedó fuera de M6
   por ser componente nuevo, no cambio de estilo.

## Cómo verificar cualquier cambio visual

```bash
npm run check:design                             # gate: 8 checks
python3 scripts/check-tokens.py                  # estructura, paridad g10/g100, WCAG
python3 scripts/audit-undefined-tokens.py        # var() que no resuelven
cd server && npm test                            # 75 tests backend
npx playwright test tests/                       # 9 E2E

# El barrido de contraste vive en el contenedor del agente, que pierde /tmp:
docker cp scripts/contrast-sweep.py jobboard-agent:/tmp/sweep.py
docker exec jobboard-agent python /tmp/sweep.py  # 0 fallos, 12 combinaciones
```

El gate son **8 checks**: literales de color en CSS y en TSX, duraciones y easings,
radios, tokens de estado del board fuera del board, primitivos N1 filtrados, `var()`
colgantes, y el motor de tokens. Cada uno de los nuevos encontró violaciones reales en
su primera ejecución.

## Lo que hay que saber para no repetir errores

Las decisiones de arquitectura están en `DECISIONS.md` y el sistema visual completo en
`DESIGN_SYSTEM.md`. Esto es lo que costó caro y no vive en ninguno de los dos:

- **Verificar sobre cuentas vacías no verifica nada.** El barrido de contraste llevaba
  seis milestones escaneando un tablero sin tarjetas, porque se registra con una cuenta
  nueva. Nunca midió un timestamp, una valoración ni un tag. El mismo punto ciego
  escondía el Dashboard a una sola columna: dos paneles vacíos apilados se ven igual que
  dos paneles en pantalla estrecha. **Sembrar datos antes de mirar.**
- **Reproducir por la ruta equivocada da un falso negativo limpio.** El solape del panel
  del agente no aparece con `page.goto()` — eso recarga y remonta todo. Solo sale
  haciendo clic en el sidebar, que es como navega una persona. Esta app **es una SPA**
  aunque tenga seis entradas HTML: `src/router.ts` hace `pushState` y `App.tsx`
  intercambia el componente de página.
- **Medir la pila de ancestros antes de leer CSS.** El "fondo gris plano" que se veía
  detrás de las tarjetas no era la tarjeta ni la cuadrícula: era `.kanban-board`
  pintando el mismo color que ya pinta `body`. Invisible al leer, obvio al recorrer los
  `backgroundColor` computados en la app corriendo.
- **Una premisa puede estar entera equivocada.** Se montó un experimento preguntando
  "¿está mal el relleno de la tarjeta?" cuando la respuesta era "hay una lámina
  redundante encima". El usuario dio la respuesta correcta a la pregunta equivocada.
- **Escribir una decisión con confianza no la hace cierta.** `DESIGN_SYSTEM.md` afirmaba
  que Carbon es cuadrado por principio y que la elevación es ninguna. Ambas falsas:
  `$button-border-radius` está declarado `!default` y el token `$shadow` con su mixin
  llevaban ahí desde siempre.
- **`carbondesignsystem.com` es un Gatsby SPA** y WebFetch devuelve contenido truncado.
  Ir al `.mdx` en `raw.githubusercontent.com/carbon-design-system/carbon-website/main/src/pages/<ruta>.mdx`
  y usar `gh api "repos/carbon-design-system/carbon/git/trees/main?recursive=1"` para
  localizar ficheros. El `!default` de Sass marca los puntos de override sancionados.
- **Un `var()` indefinido no da error**: el navegador descarta la declaración entera.
- **El contenedor `jobboard-agent` se recrea solo** y pierde `/tmp`: volver a copiar los
  scripts con `docker cp` antes de cada uso.
- **El `package.json` raíz no tiene campo `version`.** La versión vive en `CLAUDE.md` y
  `CHANGELOG.md`.
- **No mergear sin autorización explícita del usuario para ese merge concreto.** Se dio
  por implícito una vez a partir de un "ejecuta lo que depende de ti" y no lo era.

## Estado de verificación

Corrido sobre `main` en `1b3b846`, antes del merge del PR #35:

```
npm run check:design                        PASS — 8/8
python3 scripts/check-tokens.py             PASS
python3 scripts/audit-undefined-tokens.py   0 referencias sin fallback
python3 scripts/contrast-sweep.py           0 fallos · 12 combinaciones · tableros poblados
cd server && npm test                       75 passed, 1 skipped
npx playwright test                         9 passed
npx tsc --noEmit && npm run build           limpios
```

## Preguntas abiertas para el usuario

Ninguna. El proyecto de Carbon está cerrado y no hay decisiones pendientes.
