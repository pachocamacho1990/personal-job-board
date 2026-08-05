# Antigravity (`agy`) — continuidad de sesión con Claude Code

Este repo se trabaja indistintamente con **Claude Code** y con **Antigravity
(`agy`)**. Los dos comparten un único estado en `.claude/handoffs/CURRENT.md`.

`agy` es el CLI de respaldo: si Claude Code se cae o se degrada, se sigue desde
aquí sin perder el hilo. El `gemini` CLI está instalado pero **deprecado por
Google**; no se usa y su auth está roto (declara `gemini-api-key` sin key).

---

## Cómo arrancar una sesión en `agy`

Escribe una de estas frases. Activan la skill `handoff` en modo resume:

> **retomemos el trabajo de la sesión pasada**

> dónde quedamos · continuemos donde lo dejamos

La skill hace el protocolo entero: lee el handoff, lo **verifica** contra el
repo y contra Linear, reporta divergencias, y espera confirmación antes de
tocar código.

Al cerrar: **"cerremos"** o **"guarda el contexto"** → modo save.
Tras cerrar un issue de Linear: modo checkpoint.

---

## Qué está verificado y qué no

Esto se comprobó empíricamente el 2026-08-05, no se dio por bueno leyendo docs.
La documentación que trae el propio binario de `agy` es **incorrecta en dos
puntos**, y los dos costaron tiempo:

| Pieza | Estado | Detalle |
|---|---|---|
| Skill `handoff` desde `agy` | ✅ funciona | `.agents/skills/handoff` es un **symlink** a `.claude/skills/handoff` |
| Handoff cruzado Claude → `agy` | ✅ verificado | `agy` reconstruyó el estado correctamente al pedírselo |
| Linear MCP en `agy` | ✅ conectado | `~/.gemini/antigravity-cli/mcp/linear-mcp-server/` |
| Arranque **automático** al abrir sesión | ⚠️ no fiable | ver abajo |

### 1. Las reglas (`GEMINI.md`, `AGENTS.md`) son perezosas

No se cargan al abrir la sesión. La doc de `agy` lo dice de pasada: *"as you
open or edit files, the agent walks up from the file's directory to the
repository root, loading all rules it finds"*. Es decir: **este archivo no
existe para el modelo hasta que toca algún archivo del repo.**

Verificado con un canario de comportamiento ("añade la línea MARCA-X a toda
respuesta") en `GEMINI.md`, `AGENTS.md` y `.agents/rules/*.md` a la vez:
preguntando "¿cuánto es 2+2?" respondió `4` y nada más, con las tres puestas y
con dos modelos distintos. **Cero marcas.**

Por eso no hay ninguna instrucción operativa en este archivo: sería una promesa
que no se cumple. El protocolo real vive en la skill, que sí se activa por su
`description`.

### 2. Los hooks del workspace no se cargan

`.agents/hooks.json` **se ignora** en este build, aunque la doc lo documente.
El log dice literalmente `loaded 0 named hooks from 0 hooks.json file(s)`.
Poniendo el mismo archivo en `~/.gemini/config/hooks.json` pasa a `loaded 1`.

Por eso el hook de arranque es **global y vive fuera del repo**, en
`~/.gemini/config/hooks/handoff-session-start.sh`. Como se ejecuta en todos los
proyectos, el opt-in es por presencia de archivo: solo actúa si el workspace
tiene `.claude/hooks/handoff-context.sh`.

Ese hook **sí se dispara y sí inyecta** el handoff (verificado capturando su
salida real). Lo que no está garantizado es que el modelo *actúe* sobre él:
`ephemeralMessage` se trata como recordatorio, no como mandato, y en modo `-p`
lo ignoró tanto Flash como Pro. **Por eso la frase de arranque manual sigue
siendo la vía fiable.** El hook es red de seguridad, no el mecanismo principal.

---

## Cómo se mantienen sincronizados los dos CLIs

Por construcción, no por disciplina. No hay ningún texto duplicado:

```
.claude/skills/handoff/SKILL.md      ← el protocolo, UNA vez
        ▲
        └── .agents/skills/handoff   symlink (misma inode)

.claude/hooks/handoff-context.sh     ← el texto de arranque, UNA vez
        ▲                    ▲
        │                    └── ~/.gemini/config/hooks/…  (envoltorio agy)
        └── .claude/hooks/session-start.sh (envoltorio Claude Code)
```

Cada CLI aporta **solo su sobre JSON**: Claude Code envuelve en
`hookSpecificOutput.additionalContext`, `agy` en `injectSteps[].ephemeralMessage`.

Regla al tocar esto: **si te encuentras copiando texto de protocolo de un
archivo a otro, algo va mal.** Cambia la fuente y ambos lo heredan.

Consecuencia práctica: `.claude/` es la fuente de verdad **también para
`agy`**. No crees un protocolo paralelo bajo `.agents/`.

---

## Detalles de entorno

- **Modelo por defecto**: `Gemini 3.6 Flash (Medium)`. Para trabajo serio en este
  repo, sube a `gemini-3.1-pro-high` (`--model` o `/model`). `agy` también
  ofrece `claude-opus-4-6-thinking`, que es una segunda vía a Claude.
- **`AGY_WORKSPACE`**: `~/.zshrc` define una función `agy` que exporta el `$PWD`.
  El hook global la necesita porque este build manda `workspacePaths` vacío y el
  working dir del hook es `~/.gemini/config`, no el repo. Si invocas el binario
  saltándote la función (`command agy`), el hook no encontrará el workspace.
