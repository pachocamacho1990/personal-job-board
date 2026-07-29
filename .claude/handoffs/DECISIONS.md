# Decisiones duraderas

Registro que solo crece. Aquí va lo que sigue siendo cierto después de que el
`CURRENT.md` que lo originó se haya reescrito veinte veces: decisiones de
arquitectura, convenciones y —sobre todo— caminos descartados con su porqué,
para no volver a recorrerlos.

Formato: fecha · decisión · motivo · alternativas descartadas.

---

## 2026-07-29 · Sistema de diseño: IBM Carbon con tokens propios

Migrar toda la UI a IBM Carbon **sin** `@carbon/react` ni Sass, re-skineando los
componentes React 19 existentes mediante una capa de tokens de 2 niveles
(primitivos Carbon → semánticos `--cds-*` temáticos).

**Motivo**: lo que se necesita de Carbon es el lenguaje visual (paleta, escalas,
tipografía, planitud), no su árbol de componentes. Adoptar la librería obligaría a
reescribir los componentes actuales y a arrastrar Sass en un build de Vite que hoy
no lo tiene.

**Descartado**: adoptar `@carbon/react`. Coste de migración desproporcionado para
el beneficio, y pérdida de control sobre componentes ya funcionando.

## 2026-07-29 · Theming vía `data-carbon-theme` sobre semánticos

Claro g10 y oscuro g100. El atributo va en `<html>`; el tema oscuro **solo**
redefine la capa de semánticos (N2), nunca los primitivos (N1). Regla dura: todo
color de la app pasa por un token semántico.

**Descartado**: `@layer` de CSS para gestionar la cascada. Rompe el orden de
especificidad que ya asume `agent-console.css`.

## 2026-07-29 · Tracking en Linear sin Initiatives

Jerarquía **Team → Project → Milestone → Issue**. El team
`personal-job-board-app` (prefijo `PJBA`) es el paraguas del producto; cada
esfuerzo grande es un proyecto hermano dentro de él.

**Motivo**: el MCP de Linear no expone ninguna tool para crear Initiatives
(`save_project.addInitiatives` solo resuelve las existentes y se ignora en
silencio si no existe). Con un solo team, la Initiative no aportaba nada que el
team no diera ya.

## 2026-07-29 · Continuidad entre sesiones: repo + Linear

El handoff narrativo vive en `.claude/handoffs/CURRENT.md` (versionado); el
progreso se refleja en Linear (estados + comentarios). Checkpoint a cada issue
cerrado, no por tiempo ni por presión de contexto.

**Motivo**: el modelo no tiene forma de medir cuánto contexto le queda, así que
anclar los guardados a un hito objetivo del proyecto es lo único fiable. El issue
cerrado es el punto de corte natural.

**Descartado**: depender de `PreCompact` como disparador principal. Ese hook no
puede inyectar contexto ni hacer que el modelo escriba nada — solo sirve como
volcado mecánico de emergencia.
