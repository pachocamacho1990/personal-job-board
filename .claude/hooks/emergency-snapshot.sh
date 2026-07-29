#!/usr/bin/env bash
# Red de seguridad mecánica. Se dispara en PreCompact (la ventana de contexto se
# está llenando) y en SessionEnd (la sesión termina).
#
# PreCompact NO puede inyectar contexto ni hacer que el modelo escriba nada, así
# que este script vuelca solo lo objetivo y verificable. La narrativa la escribe
# el modelo vía el skill `handoff`; esto es el paracaídas de emergencia.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
SNAPDIR="$PROJECT_DIR/.claude/handoffs/snapshots"
mkdir -p "$SNAPDIR"

INPUT=$(cat 2>/dev/null || echo '{}')
EVENT=$(printf '%s' "$INPUT" | jq -r '.hook_event_name // "desconocido"' 2>/dev/null)
TRIGGER=$(printf '%s' "$INPUT" | jq -r '.trigger // .reason // "n/a"' 2>/dev/null)
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // "n/a"' 2>/dev/null)
SESSION=$(printf '%s' "$INPUT" | jq -r '.session_id // "n/a"' 2>/dev/null)

STAMP=$(date +%Y-%m-%dT%H-%M-%S)
OUT="$SNAPDIR/${STAMP}-${EVENT}.md"

{
  echo "# Snapshot mecánico — $EVENT ($TRIGGER)"
  echo
  echo "- Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "- Sesión: $SESSION"
  echo "- Transcript completo: $TRANSCRIPT"
  echo "- Rama: $(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
  echo
  echo "> Generado sin intervención del modelo. Es estado objetivo, no narrativa."
  echo "> El transcript de arriba tiene la conversación completa si hace falta reconstruir el porqué."
  echo
  echo "## Archivos sin commitear"
  echo '```'
  git -C "$PROJECT_DIR" status --porcelain 2>/dev/null || echo "(sin git)"
  echo '```'
  echo
  echo "## Diff acumulado"
  echo '```'
  git -C "$PROJECT_DIR" diff --stat 2>/dev/null | tail -40 || true
  echo '```'
  echo
  echo "## Últimos commits"
  echo '```'
  git -C "$PROJECT_DIR" log --oneline -8 2>/dev/null || true
  echo '```'
  echo
  echo "## Archivos tocados en las últimas 3 horas"
  echo '```'
  find "$PROJECT_DIR/src" "$PROJECT_DIR/server" "$PROJECT_DIR/agent-service" \
       -type f -mmin -180 -not -path '*/node_modules/*' -not -path '*/.git/*' \
       2>/dev/null | head -40 || true
  echo '```'
} > "$OUT"

# Visible para el usuario en el terminal.
if [ "$EVENT" = "PreCompact" ]; then
  echo "⚠ Contexto llenándose — snapshot de emergencia guardado en ${OUT#"$PROJECT_DIR"/}" >&2
  echo "  Tras la compactación, pide '/handoff save' para un cierre narrativo completo." >&2
else
  echo "Snapshot de fin de sesión: ${OUT#"$PROJECT_DIR"/}" >&2
fi

exit 0
