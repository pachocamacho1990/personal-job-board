#!/usr/bin/env bash
# SessionStart hook (Claude Code) — inyecta el handoff abierto en el contexto.
#
# Envoltorio fino: el TEXTO vive en .claude/hooks/handoff-context.sh, compartido
# con el hook equivalente de Antigravity, que es GLOBAL y vive en
# ~/.gemini/config/hooks/handoff-session-start.sh (los hooks de proyecto se
# ignoran allí, PJBA-54). Aquí solo se le pone el sobre JSON que espera Claude
# Code. No metas texto de protocolo en este archivo o los dos CLIs divergirán.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CTX=$("$PROJECT_DIR/.claude/hooks/handoff-context.sh" claude)

jq -nc --arg c "$CTX" \
  '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
