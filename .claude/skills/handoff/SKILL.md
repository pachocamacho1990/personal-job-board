---
name: handoff
description: Guarda y retoma el estado de trabajo entre sesiones de Claude Code para proyectos de largo aliento. Modo resume reconstruye dónde quedó la sesión anterior; modo checkpoint actualiza el estado tras cerrar un issue; modo save escribe el cierre narrativo completo. Mantiene .claude/handoffs/CURRENT.md sincronizado con el backlog de Linear del team personal-job-board-app.
when_to_use: Al arrancar una sesión cuando existe un handoff abierto; al terminar un issue de Linear; cuando el usuario dice "cerremos", "guarda el contexto", "hasta aquí llegamos", "retomemos", "dónde quedamos", "continuemos donde lo dejamos"; o cuando detectes presión de contexto (respuestas truncadas, sesión muy larga, compactación reciente).
argument-hint: [resume|checkpoint|save]
allowed-tools: Read, Write, Edit, Glob, Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git rev-parse:*), Bash(ls:*), Bash(date:*), mcp__linear__list_issues, mcp__linear__get_issue, mcp__linear__save_issue, mcp__linear__save_comment, mcp__linear__list_issue_statuses
---

Protocolo de continuidad entre sesiones. Modo pedido: `$ARGUMENTS` (si viene vacío, decide según el contexto: al inicio de sesión → `resume`; tras cerrar un issue → `checkpoint`; al cerrar → `save`).

**Rutas**: estado vivo en `.claude/handoffs/CURRENT.md` · histórico en `.claude/handoffs/archive/` · snapshots mecánicos en `.claude/handoffs/snapshots/` (no versionados) · plantilla en `${CLAUDE_SKILL_DIR}/TEMPLATE.md`.

**Linear**: team `personal-job-board-app` (prefijo `PJBA`). Proyecto activo: Migración a IBM Carbon (g10/g100), 26 issues PJBA-8→33 en 6 milestones M0–M5.

---

## Modo `resume`

1. Lee `.claude/handoffs/CURRENT.md` completo.
2. Comprueba si hay snapshots mecánicos en `.claude/handoffs/snapshots/` más recientes que `CURRENT.md`. Si los hay, la sesión anterior murió sin cierre limpio: léelos y trátalos como la fuente más actual, avisando de ello.
3. Verifica que el estado descrito sigue siendo real, no lo des por bueno:
   - `git rev-parse --abbrev-ref HEAD` y `git status --porcelain` — ¿la rama y los archivos sucios coinciden con lo que dice el handoff?
   - Si el handoff menciona archivos concretos, léelos antes de afirmar nada sobre ellos.
   - Consulta el estado real del issue en vuelo en Linear (`list_issues` filtrando por el proyecto).
4. **Reporta al usuario en 3–5 líneas**: dónde quedamos, qué está a medias, cuál es el siguiente paso concreto. Señala explícitamente cualquier divergencia entre el handoff y el estado real del repo.
5. **Espera confirmación antes de escribir código.** El usuario puede querer cambiar de rumbo.

## Modo `checkpoint`

Disparador: acabas de cerrar un issue de Linear. Es barato y va sin ceremonia — no interrumpas el flujo de trabajo con esto.

1. Actualiza `CURRENT.md`: mueve el issue de "en vuelo" a "hecho en esta sesión", reescribe el frontmatter (`in_flight`, `next`) y la sección **Siguiente paso**.
2. En Linear: mueve el issue a `Done` y añade un comentario de una o dos frases con qué se hizo realmente y cualquier desviación respecto a la descripción del issue.
3. Si el siguiente issue ya está empezado, muévelo a `In Progress`.
4. Dilo en una línea al usuario: `✓ PJBA-N cerrado · handoff actualizado`.

## Modo `save`

Disparador: cierre de sesión, presión de contexto, o petición explícita.

1. Escribe `CURRENT.md` completo siguiendo `${CLAUDE_SKILL_DIR}/TEMPLATE.md`. Rellena **todas** las secciones; si una no aplica, escribe "nada" en vez de borrarla.
2. Copia la versión anterior a `archive/AAAA-MM-DD-<issue>-<slug>.md` antes de sobrescribir, para que quede el rastro.
3. Sincroniza Linear: estados de los issues tocados + un comentario en el issue en vuelo con el punto exacto de corte.
4. Ejecuta y registra el estado de verificación (`npm test`, build, o lo que aplique). **Si algo está roto, dilo en el handoff.** Un handoff que oculta que el build falla es peor que no tener handoff.
5. **Avisa al usuario** con un resumen de qué se guardó y la frase exacta con la que puede retomar.

---

## Reglas que hacen que esto funcione

**Escribe para alguien que no estuvo aquí.** El próximo lector no tiene la conversación, solo el archivo. Nada de "como discutimos", "el problema de antes", "el archivo ese". Nombres de archivo con ruta, números de línea, IDs de issue.

**El siguiente paso debe ser ejecutable, no una intención.** Mal: "seguir con los tokens". Bien: "en `src/styles/theme.css:47` faltan los semánticos de `support-*`; copiar el patrón de `--cds-interactive` de la línea 31".

**Registra los callejones sin salida.** Lo que se intentó y no funcionó vale tanto como lo que funcionó — evita que la próxima sesión repita el error. Igual con las decisiones descartadas y su porqué.

**No inventes progreso.** El handoff refleja lo verificado, no lo intencionado. Si no corriste los tests, el estado de verificación es "sin verificar", no "OK".

**Un handoff obsoleto es un pasivo.** Si al retomar detectas que `CURRENT.md` no cuadra con el repo, corrígelo antes de seguir trabajando y avisa al usuario.

**Contexto acumulado del proyecto**: lo duradero (decisiones de arquitectura, convenciones) va a `.claude/handoffs/DECISIONS.md`, no a `CURRENT.md`. `CURRENT.md` es efímero y se reescribe; `DECISIONS.md` solo crece.
