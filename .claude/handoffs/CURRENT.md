---
updated: 2026-07-29T11:55
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0 · Fundación de tokens y theming
in_flight: ninguno
next: Decidir rama (ver Preguntas abiertas) y arrancar PJBA-8 — crear src/styles/theme.css con primitivos Carbon (N1) + semánticos g10 (N2)
branch: feature/agent-web-browsing
verified: hooks probados (4/4) · código de la app sin tocar, nada que compilar
---

## Dónde quedamos

Sesión de infraestructura, cero código de la aplicación. Se hicieron dos cosas: montar en
Linear todo el tracking de la migración a IBM Carbon (26 issues repartidos en 6 milestones,
82 puntos) y construir este propio sistema de continuidad entre sesiones (skill `handoff` +
hooks de `SessionStart`/`PreCompact`/`SessionEnd`). El rediseño Carbon en sí **no ha
empezado**: los 26 issues están en Backlog y ni un archivo de `src/` fue tocado.

## Siguiente paso

Antes de nada, resolver la pregunta de la rama (abajo). Después, **PJBA-8**: crear
`src/styles/theme.css` con la paleta oficial Carbon como primitivos (N1:
Blue/Purple/Teal/Green/Yellow/Red/Gray) y encima los semánticos g10 (N2:
`--cds-background`, `--cds-layer-01`, `--cds-text-primary`, `--cds-border-subtle`,
`--cds-interactive`, `--cds-support-*`). Importarlo **una sola vez** desde `src/main.tsx`.

Referencia del alcance completo de la fase: los issues PJBA-8 → PJBA-12 en Linear.

## Hecho en esta sesión

- **Tracking en Linear** — proyecto "Migración a IBM Carbon Design System (g10/g100)" en el
  team `personal-job-board-app`, con 9 labels, 6 milestones (M0–M5) y 26 issues
  (PJBA-8 → PJBA-33) con priority/estimate/labels. Todos en Backlog.
- **Sistema de continuidad** — skill `handoff` (3 modos: resume/checkpoint/save) en
  `.claude/skills/handoff/`, hooks en `.claude/hooks/`, config en `.claude/settings.json`,
  estado en `.claude/handoffs/`, sección nueva en `CLAUDE.md`.

## En vuelo / a medias

Nada del rediseño Carbon.

**Trabajo ajeno a medias en esta rama**: `feature/agent-web-browsing` tiene cambios sin
commitear que **no** pertenecen a esta migración — `agent-service/Dockerfile`,
`requirements.txt`, `src/tools/workspace_tools.py` modificados y `src/tools/browser.py`
nuevo sin trackear. Ese esfuerzo quedó incompleto y no se tocó en esta sesión.

`CLAUDE.md` sí está modificado por esta sesión (sección Session Continuity), y `.claude/`
entero está sin trackear.

## Decisiones tomadas

Las de arquitectura están en `DECISIONS.md`. Resumen de esta sesión:

- Tokens fieles a Carbon **sin** `@carbon/react` ni Sass; motor de 2 niveles N1→N2.
- Theming g10/g100 vía `data-carbon-theme`; el tema oscuro solo redefine N2.
- Linear sin Initiatives: jerarquía Team → Project → Milestone → Issue.
- El handoff se ancla a **issue cerrado**, no a presión de contexto (no hay forma fiable de
  medir el contexto restante, y `PreCompact` no puede inyectar contexto ni forzar escritura).

## Trampas descubiertas

- **MCP de Linear escapa entidades HTML** en títulos y nombres: `&` se guarda como `&amp;`,
  `<html>` como `&lt;html&gt;`. Escribir siempre caracteres literales. (Mordió 3 veces.)
- **`save_project` rechaza casi cualquier `icon`** con `"icon is not a valid icon"`. Omitirlo.
- **MCP conectado a mitad de sesión** → sus tools no entran en el registro hasta reiniciar.
  Lo mismo aplica a los skills nuevos: `handoff` no es invocable hasta el próximo arranque.
- **`echo` en zsh interpreta los `\n` literales** y rompe un JSON de una línea al pasarlo por
  pipe. Usar `printf '%s'` al testear la salida de los hooks. (Me dio un falso negativo.)

## Estado de verificación

- Hooks: 4/4 tests pasando — JSON válido e inyectable, degradación limpia sin handoff,
  snapshot de emergencia, y detección de cierre sucio.
- Código de la app: **sin tocar**, nada que compilar ni testear en esta sesión.
- Los hooks **no están activos todavía**: requieren reiniciar Claude Code, y al arrancar
  pedirá confirmar que se confía en los hooks nuevos de `settings.json`.

## Preguntas abiertas para el usuario

1. **¿Rama para la migración?** Estamos en `feature/agent-web-browsing` con trabajo ajeno
   sin commitear. Propongo salir a una rama limpia desde `main` (`feature/carbon-migration`)
   antes de tocar `theme.css`. Hay que decidir también qué hacer con lo de `agent-service/`.
2. **¿Commiteamos `.claude/`?** Está sin trackear. No se commiteó para no mezclarlo con el
   trabajo a medias de `agent-service/`.
3. **¿Dónde va el toggle de tema g10/g100** — Sidebar o header de cada página? Lo pide
   PJBA-11.
