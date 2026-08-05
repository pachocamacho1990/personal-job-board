---
updated: 2026-08-05T13:35
project: ninguno en curso — los dos proyectos del team están cerrados
linear: https://linear.app/personal-pacho/team/personal-job-board-app
milestone: ninguno
in_flight: ninguno
next: Abrir el PR de chore/continuidad-multimodelo-agy contra main y mergearlo (rebase merge). Tras el merge: git checkout main && git pull antes de cortar cualquier rama nueva. No hay más trabajo en curso.
branch: chore/continuidad-multimodelo-agy, pusheada · pendiente de PR y merge a main
verified: hooks de handoff 4/4 (generador claude + variante agy + JSON de Claude Code + sintaxis del hook global) · tests de la app NO corridos, no se tocó código de la app
---

## Dónde quedamos

Cerrado el proyecto **Continuidad multimodelo: Claude Code ↔ Antigravity**, sus 9
issues (PJBA-49→57) en `Done`. El repo se puede trabajar indistintamente con
Claude Code y con Antigravity (`agy`): ambos leen y escriben el mismo estado en
`.claude/handoffs/CURRENT.md`, y el protocolo vive una sola vez en
`.claude/skills/handoff/SKILL.md`, del que `.agents/skills/handoff` es un symlink.
El usuario verificó a mano que `agy` funciona en modo interactivo — arranque,
carga del protocolo y conexión al MCP de Linear.

Con esto quedan cerrados los dos proyectos del team: la migración a IBM Carbon y
la continuidad multimodelo. No hay trabajo en curso.

## Siguiente paso

Abrir el PR de `chore/continuidad-multimodelo-agy` contra `main` y mergearlo.
Los merges de este repo son **rebase merges**, así que en cuanto entre hay que
hacer `git checkout main && git pull` antes de cortar ninguna rama nueva, o la
siguiente PR replicará commits que ya están arriba.

Después de eso no queda nada pendiente. Si el usuario abre trabajo nuevo, crear
primero el proyecto y los issues en Linear (team `personal-job-board-app`,
prefijo `PJBA`, asignados a él) y luego cortar rama desde un `main` recién
actualizado.

## Hecho en esta sesión

- **PJBA-56** — Cerrado. El usuario verificó `agy` en interactivo: arranca, carga
  el protocolo de handoff y responde el MCP de Linear.
- **Corrección de rutas obsoletas** — `.claude/hooks/handoff-context.sh` y
  `.claude/hooks/session-start.sh` documentaban `.agents/hooks/session-start.sh`
  como envoltorio de Antigravity. Esa ruta no existe y no puede existir: PJBA-54
  ya había establecido que los hooks de proyecto se ignoran allí. Ahora ambos
  comentarios apuntan al hook global real,
  `~/.gemini/config/hooks/handoff-session-start.sh`.
- **Commit de la configuración** — Los archivos de configuración y documentación
  de agentes, que llevaban toda la sesión anterior sin commitear, están
  commiteados en la rama `chore/continuidad-multimodelo-agy` y pusheados. **No
  van directos a `main`**: el usuario pidió expresamente rama y PR.

## En vuelo / a medias

- **El PR de `chore/continuidad-multimodelo-agy`** — la rama está pusheada pero
  sin mergear. No hay código de la app en el diff: solo hooks de shell, el symlink
  de skills y markdown.

## Decisiones tomadas

- **El envoltorio de Antigravity vive fuera del repo, a propósito.** Está en
  `~/.gemini/config/hooks/handoff-session-start.sh` porque `.agents/hooks.json`
  se ignora (PJBA-54). Es la única pieza del protocolo que no se puede versionar:
  si se clona el repo en otra máquina, hay que replicarla a mano. El texto que
  inyecta sí está versionado, en `.claude/hooks/handoff-context.sh`.
- **Mantener la URL remota del MCP de Linear** (`https://mcp.linear.app/mcp`) en
  los dos entornos de Antigravity, para paridad total con Claude Code.

## Trampas descubiertas

- **Los comentarios de los hooks se desincronizan en silencio.** Los dos que se
  corrigieron aquí describían una arquitectura que un issue anterior ya había
  descartado, y nada lo detecta: los hooks funcionan igual con el comentario
  equivocado. Al tocar el protocolo, releer los comentarios de cabecera de
  `session-start.sh` y `handoff-context.sh` — son la documentación real de cómo
  encajan los dos CLIs.
- Heredada de la sesión anterior: las reglas (`GEMINI.md`, `AGENTS.md`) en `agy`
  cargan de forma perezosa, solo al abrir un archivo del repo, así que no sirven
  para disparar el protocolo al arrancar. Por eso hace falta el hook global.

## Estado de verificación

- Hooks de handoff, **4/4 tras la corrección**: el generador emite el texto para
  `claude`; la variante `agy` cita correctamente `.agents/skills/handoff/SKILL.md`;
  el envoltorio de Claude Code produce JSON válido (1861 caracteres de contexto);
  el hook global de `agy` pasa `bash -n`.
- Modo interactivo de `agy`: **verificado a mano por el usuario**.
- Tests y build de la aplicación: **no corridos**. No se tocó código de la app en
  esta sesión — el diff son hooks de shell y markdown.

## Preguntas abiertas para el usuario

Ninguna.
