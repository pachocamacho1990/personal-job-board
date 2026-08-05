---
updated: 2026-08-05T16:10
project: Continuidad multimodelo: Claude Code ↔ Antigravity
linear: https://linear.app/personal-pacho/project/continuidad-multimodelo-claude-code-antigravity-2918c9f9bf4e
milestone: ninguno (proyecto sin milestones, 8 issues planos)
in_flight: PJBA-56 — verificación manual de agy en modo interactivo, en manos del usuario
next: El usuario está probando agy a mano ahora mismo. Al retomar, PREGÚNTALE cómo fue antes de tocar nada. Si las 5 pruebas de PJBA-56 pasan, cerrar el issue y commitear los 6 archivos. Si alguna falla, arreglarla antes de commitear.
branch: main, con 6 archivos sin commitear (nada del código de la app)
verified: 6/6 checks de los hooks y el symlink · tests de la app NO corridos (no se tocó código de la app) · modo interactivo de agy SIN VERIFICAR, es justo lo que se está probando
---

## Dónde quedamos

Se montó **Antigravity (`agy`) como CLI de respaldo** de Claude Code, después de que
una degradación del servicio dejara al usuario bloqueado. El objetivo no era solo que
`agy` funcione, sino que los dos CLIs **no puedan desincronizarse**: comparten el
protocolo por symlink y el texto de arranque por un generador común, así que no existe
texto duplicado que alguien pueda editar en un sitio y olvidar en el otro.

La sesión fue casi toda diagnóstico. Dos afirmaciones de la documentación del propio
binario de `agy` resultaron **falsas**, y ambas habrían dejado la configuración
silenciosamente inerte. Todo lo que quedó escrito está verificado con canarios de
comportamiento, no deducido de la doc.

Queda un solo cabo: el modo **interactivo** de `agy` no se puede probar desde una sesión
de agente, y es justo el modo en que el usuario lo va a usar. Está probándolo a mano
ahora.

## Siguiente paso

**Preguntar al usuario cómo le fue la prueba manual de PJBA-56.** No asumir el
resultado ni empezar a arreglar nada antes de saberlo.

Según lo que conteste:

- **Si las 5 pruebas pasan** → cerrar PJBA-56 en Linear con un comentario de lo que
  funcionó, y commitear los 6 archivos (ver "En vuelo" para la lista exacta).
- **Si falla la prueba 2** (el hook automático) → es el resultado esperado, no un bug.
  Documentarlo en `GEMINI.md` y cerrar igual: la frase de arranque es el mecanismo
  principal y esa es la prueba 1.
- **Si falla la prueba 1 o la 4** → eso sí es un problema real. La 1 significa que la
  skill no se activa por su `description`; la 4, que `agy` no sabe escribir el handoff.
  Ambas requieren rediseño, no un parche.

## Hecho en esta sesión

Proyecto Linear **Continuidad multimodelo**, 8 issues, todos asignados al usuario:

- **PJBA-49** — Auditado `agy`: OAuth `consumer` válido, repo en `trustedWorkspaces`,
  Linear MCP conectado. Modelo por defecto `Gemini 3.6 Flash (Medium)`, flojo.
- **PJBA-50** — Descartado el CLI `gemini`: deprecado por Google y sin API key en
  ninguna parte. Habría fallado el día que se necesitara.
- **PJBA-51** — 🔍 Las reglas (`GEMINI.md`, `AGENTS.md`, `.agents/rules/`) son
  **perezosas**: cargan al tocar un archivo del repo, no al abrir sesión.
- **PJBA-52** — `.agents/skills/handoff` → symlink a `.claude/skills/handoff`.
  Verificado por inode compartida (`69209633`).
- **PJBA-53** — Extraído `.claude/hooks/handoff-context.sh`, generador único del texto
  de arranque para ambos CLIs.
- **PJBA-54** — 🔍 `.agents/hooks.json` **se ignora**; el hook tiene que ser global.
- **PJBA-55** — Función `agy()` en `~/.zshrc` que exporta `AGY_WORKSPACE`.
- **PJBA-57** — `GEMINI.md` reescrito entero y sección de `AI-GUIDE.md` rehecha.

También: corregido el proyecto **Migración a IBM Carbon** en Linear, que seguía en
`Backlog` con sus 41 issues cerrados desde julio. Ahora `Completed`.

## En vuelo / a medias

**PJBA-56** — en manos del usuario, no del agente. Las 5 pruebas están escritas en el
issue.

**6 archivos sin commitear**, ninguno de código de la app:

```
 M .claude/hooks/session-start.sh          envoltorio fino, ya no lleva el texto
 M .claude/skills/handoff/SKILL.md         rutas portables + description para ambos CLIs
 M AI-GUIDE.md                             sección de continuidad multimodelo rehecha
?? .claude/hooks/handoff-context.sh        generador compartido (NUEVO)
?? .agents/                                solo skills/handoff, que es el symlink
?? GEMINI.md                               reescrito entero
```

Fuera del repo y por tanto **fuera de git** — si se reinstala la máquina, esto se pierde
y hay que rehacerlo:

```
~/.gemini/config/hooks.json                     declara el hook PreInvocation
~/.gemini/config/hooks/handoff-session-start.sh el hook global
~/.zshrc                                        función agy() con AGY_WORKSPACE
```

## Decisiones tomadas

- **Symlink, no copia.** Dos copias divergen en cuanto alguien edita una. La sincronía
  tenía que ser estructural, no depender de la disciplina de nadie.
- **`.claude/` es la fuente de verdad también para `agy`.** No se crea un protocolo
  paralelo bajo `.agents/`.
- **El hook global, no en el workspace** — forzado por PJBA-54. Opt-in por presencia de
  `.claude/hooks/handoff-context.sh`, para no dispararse en los otros ocho repos.
- **`GEMINI.md` no contiene instrucciones operativas.** Descartado dejarlas "por si
  acaso": el archivo no carga a tiempo, así que serían una promesa incumplida que da
  falsa confianza. Mismo motivo por el que se **borró** `.agents/hooks.json` en vez de
  dejarlo esperando a que un build futuro lo soporte.
- **Descartado el CLI `gemini`** — deprecado. No se arregla.

## Trampas descubiertas

- **La doc del binario de `agy` miente en dos puntos.** Dice que `.agents/hooks.json`
  se carga (`loaded 0 named hooks from 0 hooks.json file(s)`; el mismo archivo en
  `~/.gemini/config/hooks.json` da `loaded 1`) y presenta las reglas como si estuvieran
  siempre activas, cuando son perezosas. **Verificar antes de construir encima.**
- **Preguntarle al modelo "¿ves tus instrucciones?" da falsos negativos limpios.** Usar
  un **canario de comportamiento**: inyectar "añade la línea MARCA-X a toda respuesta"
  y mirar si el comportamiento cambia. Ese método destapó los dos hallazgos.
- **`workspacePaths` llega vacío** en modo `-p`, y `$PWD` no vale de recambio: el
  working dir del hook es `~/.gemini/config`. De ahí `AGY_WORKSPACE`.
- **`ephemeralMessage` es un recordatorio, no un mandato.** El hook inyecta el handoff
  completo —verificado capturando su salida real— y aun así el modelo no actuó sobre
  él, ni con Flash ni con Pro.
- **Hay dos binarios de Google y es fácil confundirlos.** Media hora se fue auditando
  `gemini` antes de saber que el comando real es `agy`. Confirmar qué binario se usa
  antes de auditar su configuración.
- **Si se invoca `command agy`** saltándose la función de `~/.zshrc`, el hook no
  encuentra el workspace y no inyecta. Falla en silencio, de forma segura.

## Estado de verificación

Corrido sobre `main` con los 6 archivos sin commitear:

```
hook Claude Code · JSON con additionalContext        PASS
hook agy · inyecta en turno 1                        PASS
hook agy · se calla en turno 3                       PASS
hook agy · se calla en repo sin el protocolo         PASS
symlink de la skill · misma inode                    PASS
agy carga hooks.json                                 loaded 1 named hooks from 1 file(s)
```

**No corrido, y por qué**: `npm test`, el gate de diseño y los E2E **no se ejecutaron**.
No se tocó una sola línea de código de la app — los 6 archivos son configuración de
agentes y documentación. El último estado conocido de la app es el del handoff anterior
(75 tests backend, 9 E2E, gate 8/8, sobre `1b3b846`).

**Sin verificar**: el modo interactivo de `agy` — PJBA-56, en curso por el usuario.

## Preguntas abiertas para el usuario

- ¿Cómo fue la prueba manual de PJBA-56? Es lo primero que hay que preguntar.
- ¿Se commitean los 6 archivos en `main` directamente, o en una rama? Son configuración
  y documentación, no código de la app, pero `main` está limpia y la convención del repo
  es cortar rama.
- Lo que vive fuera del repo (`~/.gemini/config/`, `~/.zshrc`) no está versionado.
  ¿Merece un script de bootstrap en el repo para poder rehacerlo tras un formateo?
