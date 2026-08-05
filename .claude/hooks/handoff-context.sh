#!/usr/bin/env bash
# Fuente única del texto de arranque de sesión.
#
# NO emite JSON: escribe el contexto en texto plano por stdout. Cada CLI lo
# envuelve en su propio formato:
#   - Claude Code  → .claude/hooks/session-start.sh            (hookSpecificOutput.additionalContext)
#   - Antigravity  → ~/.gemini/config/hooks/handoff-session-start.sh (injectSteps[].ephemeralMessage)
#
# El envoltorio de Antigravity vive FUERA del repo, en la config global del
# usuario: `.agents/hooks.json` se ignora (PJBA-54), así que un hook dentro del
# proyecto no llega a dispararse. Ese hook global localiza el workspace y
# ejecuta este archivo.
#
# Ese reparto es lo que impide que los dos CLIs se desincronicen: el contenido
# vive aquí una sola vez. Si cambias el protocolo, cambia este archivo y ambos
# lo heredan. No dupliques este texto en el envoltorio de ningún CLI.
#
# Argumento 1 (opcional): nombre del CLI que invoca, para adaptar el paso 1 de
# las instrucciones ("claude" | "agy"). Por defecto "claude".
set -uo pipefail

CLI="${1:-claude}"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
HANDOFF="$PROJECT_DIR/.claude/handoffs/CURRENT.md"
SNAPDIR="$PROJECT_DIR/.claude/handoffs/snapshots"

if [ ! -f "$HANDOFF" ]; then
  printf 'No hay handoff de sesión abierto (.claude/handoffs/CURRENT.md no existe). Si esta sesión arranca trabajo de largo aliento, invoca el skill `handoff` en modo checkpoint al cerrar el primer issue.\n'
  exit 0
fi

BRANCH=$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "desconocida")
DIRTY=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
HEADER=$(awk '/^---$/{n++; next} n==1' "$HANDOFF")

# ¿Murió la sesión anterior sin cierre limpio? Un snapshot más nuevo que el
# handoff significa que hubo compactación o cierre abrupto después del último save.
SNAP_WARN=""
if [ -d "$SNAPDIR" ]; then
  NEWER=$(find "$SNAPDIR" -name '*.md' -newer "$HANDOFF" 2>/dev/null | sort | tail -3)
  if [ -n "$NEWER" ]; then
    SNAP_WARN=$(printf '\n\n⚠ CIERRE SUCIO DETECTADO: hay snapshots mecánicos MÁS RECIENTES que el handoff.\nLa sesión anterior se compactó o murió sin cierre limpio, así que CURRENT.md está incompleto.\nLee estos archivos y trátalos como el estado más actual:\n%s' "$NEWER")
  fi
fi

# El único fragmento que difiere entre CLIs: cómo se invoca la skill.
if [ "$CLI" = "agy" ]; then
  INVOKE='1. Activa la skill `handoff` en modo resume (está en .agents/skills/handoff/SKILL.md,
   que es un enlace al original en .claude/skills/handoff/ — mismo protocolo que usa Claude Code).'
else
  INVOKE='1. Invoca el skill `handoff` en modo resume (Skill tool, skill: "handoff", args: "resume").'
fi

cat <<EOF
=== HANDOFF DE SESIÓN ABIERTO ===

Este proyecto usa continuidad entre sesiones y se trabaja indistintamente con
Claude Code y con Antigravity (agy). Ambos leen y escriben el MISMO estado en
.claude/handoffs/CURRENT.md. Resumen del estado guardado:

$HEADER

Estado real del repo ahora mismo: rama '$BRANCH', $DIRTY archivo(s) sin commitear.$SNAP_WARN

ACCIÓN REQUERIDA antes de responder al usuario:
$INVOKE
2. Sigue su protocolo: leer el handoff completo, VERIFICAR contra el estado real
   del repo y de Linear, y reportar divergencias.
3. Resume al usuario en 3-5 líneas dónde quedó el trabajo y cuál es el siguiente
   paso. Espera su confirmación antes de escribir código.

No asumas que el handoff es correcto: verifícalo.
EOF
