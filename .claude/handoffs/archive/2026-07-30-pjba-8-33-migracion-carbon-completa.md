---
updated: 2026-07-30T22:52
project: Migración a IBM Carbon (g10/g100) — COMPLETA
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: los 6 completos · 26/26 issues en Done
in_flight: ninguno
next: abrir el PR de feature/carbon-migration a main y revisarlo
branch: feature/carbon-migration (32 commits, pusheada y sincronizada)
verified: gate de conformidad 5/5 · 0 texto bajo AA en 12 combinaciones página/tema · 75 tests backend · 8 tests E2E del toggle · tsc y build limpios
---

## Dónde quedamos

**La migración está terminada.** Los 26 issues cerrados, cada uno con su comentario en Linear
explicando qué se hizo y en qué se desvió de la descripción original.

Lo único pendiente es **abrir el PR** — decisión tomada al principio: un solo PR al terminar
los 6 milestones, no uno por issue ni por milestone.

## Siguiente paso

```bash
gh pr create --base main --head feature/carbon-migration
```

El cuerpo debería liderar con para qué era el trabajo (que dejara de haber colores sueltos,
no repintar) y listar los bugs preexistentes que destapó, porque son la parte que un revisor
no espera. Están todos en la entrada `[3.13.0]` de `CHANGELOG.md`.

Tras el merge, seguir la rutina: `checkout main` → `pull` → rama nueva. Los merges de este
repo son rebase merges.

## Cómo verificar que sigue sano

```bash
npm run check:design      # gate de conformidad, 5 checks
npm test                  # 75 tests de backend (desde la raíz)
npx playwright test tests/theme-toggle.spec.js   # 8 tests del toggle
```

## Hecho

- **M0** tokens y theming — PJBA-8 `da9aa1f`, 9 `9851e02`, 10 `cc42396`, 12 `e555b0c`, 11 `63f0333`
- **M1** núcleo styles.css — PJBA-13 `162acdb`, 14 `97ccb08`, 15 `1645fe3`
- **M2** CSS por página — PJBA-16 `b63b33f`, 17 `ced3799`, 18 `e0e63dc`, 19 `3035ca4`, 20 `59e92af`, 21 `5018fae`
- **M3** componentes — PJBA-22 `69fa2a2`, 23 `62b1b4c`, 24 `38626c6`, 25 `ea0515e`, 26 `65d6599`, 27 `09bf2c9`
- **M4** documentación — PJBA-30 `87f66cf`, 28+29 `3059e7c` (tres agentes en paralelo)
- **M5** QA y release — PJBA-32 `c88a39f`, 33 `f286b22`, 31 `d369121`

## Deuda conocida, fuera del alcance de esta migración

Los agentes de M4 la encontraron al revisar la documentación. No es Carbon, así que no se tocó:

1. **Las cuatro recetas "Adding New…" de `CLAUDE.md`** apuntan todas a la estructura
   pre-React: `public/js/app.js`, `shared/journey-map.js`, controladores `.js`. Ninguna de
   esas rutas existe. Es lo más engañoso que queda en el archivo.
2. `CLAUDE.md` dice "Global arrays: `jobs[]` / `entities[]`", contradiciendo su propia tabla
   de deuda técnica, y menciona un `sidebar.js` que no existe.
3. `TESTING.md` lista 5 archivos de test cuando hay 8, y dice `.js` cuando son `.ts`.
4. `DESIGN.md:99` dice rate limit "5 req/15min"; el real es 15 intentos fallidos por 15 min.
5. **Emoji supervivientes** al commit que decía haberlos eliminado todos: `🤝` en
   `DetailPanel.tsx:877` y `content: '💡'` / `'⚠️'` en las alertas de `docs.css`.
6. Los **11 estilos tipográficos compuestos** tienen solo 3 call sites: la escala está
   definida pero apenas adoptada.

## Decisiones duraderas

En `DECISIONS.md`. Las que más condicionaron el trabajo:

- **Los componentes consumen N2, nunca N1.** Un primitivo no puede seguir un cambio de tema.
  El gate lo vigila.
- **Un relleno que lleva texto encima necesita un token que se quede en el stop 60 en ambos
  temas** (`button-primary`, `button-danger-primary`), no uno que aclare en oscuro
  (`interactive`, `support-error`). Este error se cometió dos veces.
- **El color nunca va inline.** Un color inline gana en silencio a la regla CSS y es invisible
  para cualquier barrido que lea hojas de estilo. Por eso los tipos de `InlineNotification` y
  de los tags son clases modificadoras.
- **Las superficies siempre-oscuras** (salida de terminal, bloques de código, panel showcase
  del login) fijan tokens con scope; no pueden leer los semánticos temáticos.

## Trampas descubiertas

- **Un `var()` indefinido no da error.** El navegador descarta la declaración entera. Mordió
  cuatro veces: un input sin indicador de foco, los títulos de docs en fallback, `Sidebar.tsx`
  roto por una limpieza mía, y 37 referencias muertas en componentes.
- **Un barrido que solo busca hex y `rgba()` deja pasar los colores con nombre.** `color: white`
  sobrevivió seis milestones porque `find-non-carbon-colors.py` nunca los miró. Un gate sin
  probar es peor que no tener gate: el primero que escribió el agente estaba verde y
  equivocado.
- **Vite bundlea todo el CSS en un archivo que cargan las 6 páginas.** Un selector de elemento
  a nivel raíz en cualquier hoja aplica en toda la app.
- **Medir el contraste encuentra lo que mirar capturas no.** 57 fallos AA, ninguno evidente a
  ojo.
- **El contenedor `jobboard-agent` se recrea solo** cada cierto tiempo: borra `/tmp` y
  cualquier `pip install`. Volver a copiar los scripts con `docker cp`.
- **`document.documentElement` no existe** cuando corre un init script de Playwright.
- **Los merges de este repo son rebase merges.**

## Preguntas abiertas

Ninguna. Solo queda abrir el PR.
