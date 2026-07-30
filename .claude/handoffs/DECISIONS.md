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

## 2026-07-30 · Rama de larga vida y un único PR para la migración Carbon

Toda la migración vive en `feature/carbon-migration` y se abre **un solo PR al
terminar los 6 milestones**, no uno por issue ni por milestone.

**Motivo**: decisión explícita del usuario. Los milestones intermedios dejan la
app en estados incoherentes — M0 define tokens que nadie consume, M1 repunta
`styles.css` mientras las hojas por página siguen en la capa legacy. Un PR por
milestone pediría revisar estados que nunca se pretende desplegar.

**Consecuencia**: la rama se aleja de `main` durante toda la migración. Si
`main` recibe trabajo ajeno mientras tanto, hay que rebasar antes del PR final.

## 2026-07-30 · El control del tema y la aplicación del tema son cosas separadas

El atributo `data-carbon-theme` se pone en `<html>` desde `main.tsx`, que es el
entry único de las 6 páginas. El **control** vive solo al pie de la Sidebar,
que login y docs no renderizan.

**Motivo**: una página sin toggle sigue respetando la preferencia guardada. No
hace falta un control en cada página para que el tema sea correcto en todas, y
duplicar el control en cinco sitios era el coste de creer lo contrario.

**Además**: persistir es opt-in, no efecto secundario de aplicar. Escribir el
tema resuelto al arrancar guardaría una preferencia que el usuario nunca
expresó y congelaría lo que el SO tuviera en ese momento.

## 2026-07-30 · Los tokens fuera de stop son primitivos, no semánticos

Carbon usa valores intermedios para hover/active (#e8e8e8, #4c4c4c, #333333,
#474747, #606060, #636363, #0353e9, #b81921) que no caen en ningún stop
publicado. Viven en N1 con nombres de posición interpolada
(`--cds-gray-15`, `-64`, `-65`, `-72`, `-74`, `-83`, `--cds-blue-65`,
`--cds-red-65`).

**Motivo**: el valor no cambia entre temas — #4c4c4c es #4c4c4c en g10 y g100.
Lo que cambia es qué semántico lo referencia, que es justo la división N1/N2.
Meterlos en N2 rompería la regla de que N2 solo contiene referencias.

**Descartado**: nombrarlos por rol (`--cds-gray-hover-light/dark`). Se agota en
cuanto g100 necesita cinco más y dos valores distintos caen "entre Gray 70 y
Gray 80".
