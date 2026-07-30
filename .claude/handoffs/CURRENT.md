---
updated: 2026-07-30T17:05
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0 COMPLETO (5/5) · siguiente M1 · Núcleo styles.css
in_flight: ninguno
next: PJBA-13 — repointar el :root de src/styles/styles.css (líneas 10–126) a los semánticos --cds-* y borrar la capa de alias legacy
branch: feature/carbon-migration (pusheada, sincronizada con origin)
verified: check-tokens.py OK · tsc limpio · vite build OK · 17/17 checks E2E del toggle en navegador real
---

## Dónde quedamos

**M0 cerrado entero.** El motor de tokens Carbon existe, tiene tema oscuro, escalas
completas, fuentes bien cargadas y un toggle funcional y persistente. Lo que **todavía no
pasa** es que la app consuma nada de eso: `styles.css` y las hojas por página siguen sobre la
capa `--color-*` heredada. Por eso la app se ve exactamente igual que antes y el tema oscuro,
aunque funcione a nivel de atributo y tokens, no cambia ni un píxel visible. Eso es M1.

## Siguiente paso

**PJBA-13** — repointar `src/styles/styles.css` a los semánticos. El bloque `:root` ocupa las
líneas 10–126 (empieza justo tras el comentario que dejó PJBA-12 donde estaba el `@import`).
Sustituir esas definiciones por referencias a `--cds-*` y eliminar la capa de alias legacy
(`--bg-primary`, `--text-primary`, `--accent`, `--border`, `--surface`, `--canvas`, `--radius`,
`--shadow`…).

Tres avisos concretos, ya verificados:

1. **El spacing no es un mapeo 1:1.** La escala vieja (`--spacing-xs…2xl` = 4/8/16/24/32/48)
   no tiene paso de 12px ni nada por encima de 48px. Algunos call sites tendrán que moverse un
   escalón de Carbon, no traducirse directo.
2. **En g100, `layer-03` es Gray 70** y no admite tokens de baja énfasis: `text-helper` da
   3.29 y `link-primary` 3.32, bajo AA. Solo `text-primary`, `text-secondary` y los iconos son
   seguros a ese nivel de anidamiento.
3. **`border-strong-01` va sobre `layer-01`, `border-strong-02` sobre `layer-02`.** El sufijo
   es un contrato de emparejamiento, no un ranking.

Tras cada cambio: `python3 scripts/check-tokens.py` (estructura, paridad de temas, contraste
AA) y `npm run build`.

## Hecho en esta sesión

Antes de Carbon: **PR #33 mergeado a `main`** — tool `browse_url` del agente Zenith terminada,
testeada y documentada. Ver `CHANGELOG.md` `[3.12.0]`.

M0 completo, cada issue con su comentario detallado en Linear:

- **PJBA-8** (`da9aa1f`) — `src/styles/theme.css`: 94 primitivos N1 + 93 semánticos N2 g10.
- **PJBA-9** (`9851e02`) — bloque `[data-carbon-theme='g100']`; familia Orange añadida a N1;
  primitivos fuera de stop renombrados a escala interpolada (`--cds-gray-15/-64/-65/-72/-74/-83`).
- **PJBA-10** (`cc42396`) — 83 tokens de escala: spacing 01–13, type scale (10 tamaños + 11
  estilos compuestos), radio 0, elevación solo overlay.
- **PJBA-12** (`e555b0c`) — IBM Plex al `<head>` de los 6 HTML, fuera el `@import`.
- **PJBA-11** (`63f0333`) — `src/theme.ts`, atributo en `<html>` desde `main.tsx`, toggle al
  pie de la Sidebar.

## En vuelo / a medias

Nada. Working tree limpio y rama pusheada.

## Decisiones tomadas

Las duraderas están en `DECISIONS.md`. De esta sesión:

- **Un solo PR al final de TODOS los milestones**, no uno por issue ni por milestone. Decisión
  explícita del usuario. `feature/carbon-migration` es una rama de larga vida.
- El toggle vive **al pie de la Sidebar**. Login y docs no la renderizan, pero sí respetan el
  tema guardado: ubicación del control y aplicación del tema son cosas separadas.
- Persistir el tema es **opt-in**, no efecto secundario de aplicarlo. Guardar el tema resuelto
  al arrancar registraría una preferencia que el usuario nunca expresó.
- Los pesos de fuente 500 y 700 **se mantienen** pese a que Carbon solo quiere 300/400/600:
  hay 28 declaraciones vivas usándolos. Estrecharlos va con M1/M2.

## Trampas descubiertas

- **`document.documentElement` no existe** cuando corre un init script de Playwright, así que
  un `MutationObserver` sobre él nunca llega a instalarse y devuelve un falso negativo. Para
  medir cuándo se aplica un atributo hay que interceptar `Element.prototype.setAttribute`.
- **`document.fonts.check()` devuelve `false` para fuentes declaradas pero no usadas.** No es
  que falten: el navegador descarga el archivo en el primer uso. Se confirma añadiendo un
  elemento que la use y volviendo a comprobar.
- **`src/main.tsx` es el entry único.** Los 6 HTML lo cargan y `App.tsx` enruta por
  `pathname`; los `src/pages/*/main.tsx` no son entries de Vite.
- **Vite eleva los `@import` de CSS al inicio del bundle** — ya no aplica al de fuentes
  (PJBA-12 lo eliminó), pero conviene recordarlo si se vuelve a añadir alguno.
- **`pytest` no está instalado** en el contenedor `jobboard-agent` ni en el host, pese a lo que
  dice `DEPLOYMENT.md:205`. Hay `agent-service/requirements-dev.txt`; instalarlo dentro del
  contenedor, y se pierde al recrearlo.
- **El agente no recarga código solo** (uvicorn sin `--reload`): `docker restart jobboard-agent`.
- **Los merges de este repo son rebase merges**: los SHAs de `main` no coinciden con los de la
  rama.

## Preguntas abiertas para el usuario

Ninguna. M1 (PJBA-13, 14, 15) no depende de ninguna decisión pendiente.
