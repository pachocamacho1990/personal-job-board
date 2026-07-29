#!/usr/bin/env bash
# SessionStart hook — inyecta el handoff abierto en el contexto del modelo.
# Salida: JSON con hookSpecificOutput.additionalContext (lo lee Claude Code).
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
HANDOFF="$PROJECT_DIR/.claude/handoffs/CURRENT.md"
SNAPDIR="$PROJECT_DIR/.claude/handoffs/snapshots"

emit() {
  jq -nc --arg c "$1" \
    '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
  exit 0
}

if [ ! -f "$HANDOFF" ]; then
  emit "No hay handoff de sesión abierto (.claude/handoffs/CURRENT.md no existe). Si esta sesión arranca trabajo de largo aliento, invoca el skill \`handoff\` en modo checkpoint al cerrar el primer issue."
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

read -r -d '' CTX <<EOF || true
=== HANDOFF DE SESIÓN ABIERTO ===

Este proyecto usa continuidad entre sesiones. Hay trabajo previo registrado en
.claude/handoffs/CURRENT.md. Resumen del estado guardado:

$HEADER

Estado real del repo ahora mismo: rama '$BRANCH', $DIRTY archivo(s) sin commitear.$SNAP_WARN

ACCIÓN REQUERIDA antes de responder al usuario:
1. Invoca el skill \`handoff\` en modo resume (Skill tool, skill: "handoff", args: "resume").
2. Sigue su protocolo: leer el handoff completo, VERIFICAR contra el estado real
   del repo y de Linear, y reportar divergencias.
3. Resume al usuario en 3-5 líneas dónde quedó el trabajo y cuál es el siguiente
   paso. Espera su confirmación antes de escribir código.

No asumas que el handoff es correcto: verifícalo.
EOF

emit "$CTX"
