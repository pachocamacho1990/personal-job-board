---
updated: 2026-07-29T22:06
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0 · Fundación de tokens y theming
in_flight: ninguno
next: PJBA-9 — añadir el bloque [data-carbon-theme="g100"] en src/styles/theme.css redefiniendo SOLO los 93 semánticos N2
branch: feature/carbon-migration (sin push todavía; 1 commit propio, da9aa1f)
verified: tsc limpio · vite build OK · 6/6 páginas 200 por nginx · check estático de tokens OK · 22/22 tests de agent-service
---

## Dónde quedamos

Dos cosas cerradas. Primero se saldó la deuda de `feature/agent-web-browsing`, que llevaba
semanas sin commitear: la tool `browse_url` del agente Zenith quedó terminada, testeada y
mergeada a `main` en el **PR #33** (rebase merge, commits `59dbba4` y `04a3db1`). Después
arrancó de verdad la migración Carbon con **PJBA-8 cerrado**: el motor de tokens de 2 niveles.

## Siguiente paso

**PJBA-9** — tema oscuro g100. Añadir un bloque `[data-carbon-theme="g100"]` al final de
`src/styles/theme.css`, después del bloque `:root` de semánticos (que arranca en el banner
`N2 · SEMANTICS`, línea ~140). Ese bloque redefine **solo** los 93 semánticos N2; los
primitivos N1 no se tocan nunca — es la regla que hace que el theming sea un único bloque de
override en vez de una segunda paleta que mantener sincronizada.

Valores g100 de referencia: `background` #161616, `layer-01` #262626, `layer-02` #393939,
`layer-03` #4c4c4c, `text-primary` #f4f4f4, `text-secondary` #c6c6c6, `border-subtle-01`
#393939, `interactive` #4589ff, `link-primary` #78a9ff, `support-error` #fa4d56,
`support-success` #42be65, `support-info` #4589ff, `field-01` #262626. Expresarlos siempre
como `var(--cds-gray-90)` y compañía, nunca como hex.

El issue pide verificar contraste AA. Ojo: el bloque no se podrá probar en el navegador hasta
PJBA-11, que es el que pone `data-carbon-theme` en el `<html>`. Hasta entonces la
verificación es el check estático más el cálculo de ratios de contraste.

Herramienta ya escrita para verificar: `python3 <scratchpad>/check_tokens.py` desde la raíz
del repo. Comprueba que todo `var(--cds-*)` resuelve, que no hay tokens duplicados y que N2
no lleva hex literales. Vale la pena extenderla para exigir que g100 redefina exactamente el
mismo conjunto de claves que `:root` — un semántico olvidado en g100 hereda silenciosamente
el valor claro, y ese es el fallo más probable de esta tarea.

## Hecho en esta sesión

- **PR #33 mergeado a `main`** — tool `browse_url` (Playwright headless + BeautifulSoup →
  markdown), fix de la fuga de Chromium en el lifespan de FastAPI, 18 tests nuevos,
  `requirements-dev.txt`, CHANGELOG `[3.12.0]`. También versionó `.claude/` entero.
- **PJBA-8 cerrado** (`da9aa1f`) — `src/styles/theme.css` con 79 primitivos N1 y 93
  semánticos N2 para g10, importado una sola vez desde `src/main.tsx` antes de `./App`.
- **Convención de ramas** documentada en `CLAUDE.md` (sección "Branching After a Merge"):
  tras un merge, siempre `checkout main` → `pull` → `checkout -b`.
- **PJBA-33 corregido** en Linear: el bump objetivo es **v3.13.0**, no v3.11.0.

## En vuelo / a medias

Nada. Working tree limpio, `feature/carbon-migration` con 1 commit sin pushear.

## Decisiones tomadas

Las duraderas están en `DECISIONS.md`. De esta sesión:

- Los estados hover/active de Carbon (#e8e8e8, #4c4c4c, #0353e9, #b81921) no caen en ningún
  stop publicado de la paleta, así que viven como **primitivos N1** en vez de como literales
  dentro de N2. Meterlos en N2 rompería la regla de que N2 solo referencia N1.
- Los semánticos translúcidos de Carbon (`overlay`, `text-disabled`, `background-hover/
  active/selected`) se componen desde tripletas de canales RGB (`--cds-gray-100-rgb`), porque
  CSS no puede extraer los canales de un `var()` hexadecimal.
- La rutina post-merge se documentó en `CLAUDE.md` en vez de crear un skill: tres comandos
  mecánicos sin criterio no lo justifican, y en `CLAUDE.md` queda versionado.
- Playwright vuelve a las dependencias del agente **a propósito**, revirtiendo la limpieza de
  la 3.11.0. Anotado en el CHANGELOG para que nadie lo "limpie" de nuevo.

## Trampas descubiertas

- **`src/main.tsx` sí es el entry único.** Los 6 HTML cargan `/src/main.tsx`, y `App.tsx`
  enruta por `pathname`. Los `src/pages/*/main.tsx` **no** son entries de Vite, aunque cada
  uno importe su propio CSS. Un import en `main.tsx` cubre la app entera.
- **Vite eleva los `@import` de CSS al inicio del bundle.** `styles.css` abre con un `@import`
  de IBM Plex; al meter `theme.css` antes, ese `@import` dejaría de estar al principio y el
  navegador lo ignoraría. Vite lo eleva solo — verificado en el bundle, byte 0. No fiarse de
  esto al reordenar imports sin volver a comprobarlo.
- **`pytest` no está instalado en ninguna parte**, ni en el contenedor `jobboard-agent` ni en
  el host, pese a que `DEPLOYMENT.md:205` documenta cómo correrlo. Ahora hay
  `agent-service/requirements-dev.txt`; instalarlo en el contenedor antes de correr tests
  (`docker exec jobboard-agent pip install -r requirements-dev.txt`). La instalación se pierde
  al recrear el contenedor.
- **El agente no recarga código solo**: el `CMD` de uvicorn no lleva `--reload`. Tras tocar
  `agent-service/`, `docker restart jobboard-agent` para que cargue (el volumen ya monta
  `/app`).
- **Los merges de este repo son rebase merges**: los SHAs en `main` no coinciden con los de la
  rama. Nunca ramificar desde una rama ya mergeada.

## Preguntas abiertas para el usuario

1. **¿Push de `feature/carbon-migration` ahora o al cerrar M0?** Tiene 1 commit sin pushear.
2. **¿Dónde va el toggle de tema g10/g100** — Sidebar o header de cada página? Lo pide
   PJBA-11, dos issues más adelante.
