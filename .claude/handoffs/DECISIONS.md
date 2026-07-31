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

## 2026-07-30 · Radio 0 y ausencia de elevación quedan EN REVISIÓN

Durante la migración (PJBA-10, PJBA-15) decidí radio 0 en todo salvo tags, y
elevación solo en overlays, razonando que "las esquinas son estructura, no
decoración" y que redondearlas es lo que más hace que una UI deje de leerse
como Carbon.

**El usuario ha visto el resultado desplegado y no le convence**: pide esquinas
redondeadas, profundidad al hover y al click, y rellenos de columna más suaves.
Su palabra fue que la app "se ve demasiado cuadrada".

**Estado**: no revertidas, en revisión. La siguiente sesión debe estudiar la
documentación real de Carbon antes de cambiar nada, porque hay dos respuestas
legítimas y opuestas:

- Si Carbon v11 es cuadrado por principio, el camino honesto es decírselo y
  ofrecerle una **desviación consciente y documentada** del sistema — no fingir
  que la documentación respalda lo que quiere.
- Si mi lectura fue más rígida que la del propio Carbon, hay margen dentro del
  sistema y se corrige sin más.

**Lo que no está en revisión y es una omisión limpia**: nunca implementé el
sistema de motion de Carbon. Tiene tokens de duración y easing documentados, y
en la app no hay ninguno. Es la palanca más grande para lo que el usuario llama
"premium" y no entra en conflicto con ninguna decisión anterior.

**Restricción dura sobre cualquier cambio de color**: el barrido de contraste
está en 0 elementos bajo AA en 12 combinaciones página/tema, y tiene que seguir
en 0. "Colores más suaves" es exactamente el cambio que puede romperlo.

## 2026-07-31 · La revisión se resuelve: mi lectura fue más rígida que Carbon

Cierra la entrada anterior. De las dos respuestas posibles que dejaba abiertas,
gana la segunda: **hay margen dentro del sistema y no hace falta desviarse**.

Evidencia, toda del código fuente de `carbon-design-system/carbon` en `main`:

- `packages/styles/scss/components/button/_vars.scss:23` —
  `$button-border-radius: 0 !default`. El `!default` es un punto de override
  sancionado por Carbon, no un valor cerrado.
- `components/popover/_popover.scss:63` — expone
  `--cds-popover-border-radius`, por defecto 2px.
- `components/content-switcher/_content-switcher.scss:28` — 4px nativo.
- `components/tile/_tile.scss:630` — `tile--decorator-rounded` a `$spacing-03`
  (8px). Carbon v11 **ya trae una variante de tile redondeada**.
- `tag` 16px, `chat-button` 16–24px, `toggle` 12/16px, `badge-indicator` 100px.

El **default** de Carbon es 0. Su **vocabulario** no lo es. La frase que escribí
en `theme.css` — "redondear las esquinas es el cambio que más hace que una UI
deje de leerse como Carbon" — es falsa como principio y se retira.

Lo mismo con la elevación: existe el token de tema `$shadow` (negro al 0.3) y el
mixin oficial `box-shadow: 0 2px 6px $shadow` en
`packages/styles/scss/utilities/_box-shadow.scss`. Lo que Carbon no tiene es una
rampa multinivel tipo Material. La profundidad se construye con **tres
mecanismos, en orden de preferencia: color de capa → motion → la única sombra**.
Ese orden es la parte que importa; la sombra es el último recurso.

**Lo decidido** (el usuario eligió mirando la matriz de PJBA-35, no describiendo):

- **Contenedores — 8px.** Tarjetas, columnas, paneles, modales. Es
  `$spacing-03`, el mismo valor de la tile redondeada de Carbon.
- **Controles — 4px.** Botones, inputs, selects, tags no-pill. Decisión mía, no
  suya: no la pidió y no bloquea. 8px en un botón de 32px de alto se lee hinchado,
  y 4px es lo que usa el content-switcher de Carbon.
- **Popovers y tooltips — 2px**, igualando el default de Carbon.
- **Radio 0 sobrevive** donde la esquina de verdad es estructura: divisores,
  bordes de tabla, el shell de la aplicación.
- **Hover — color de capa + sombra + `translateY(-2px)`**, con la duración y la
  curva de Carbon. Al hacer click el elemento se hunde: `layer-active`, sin
  sombra y sin lift.
- **Ningún elemento estático lleva sombra.** La sombra marca un estado —
  elevado, flotando, arrastrándose — nunca una jerarquía permanente. Esa regla
  es lo que separa "premium" de "cargado", y es la que hay que defender en
  revisión cuando alguien quiera ponerle sombra a una tarjeta en reposo.

**Sin resolver**: si el negro al 30 % de Carbon se ve sobre el fondo de g100. Se
mide en PJBA-37; si no se ve, el token de sombra en oscuro toma otro valor en
lugar de copiar el de g10.

**La restricción de contraste sigue en pie**: 0 elementos bajo AA en 12
combinaciones, y tiene que seguir en 0.

## 2026-07-31 · Carbon for AI se adopta en morado, no en azul

Carbon construye su registro de IA — aura en gradiente, borde en gradiente,
glow — enteramente sobre **azul**. Aquí el azul ya es `--cds-button-primary` y
`--cds-status-applied`, así que un aura azul se leería como "interactivo" o como
"aplicado", no como "generado por IA". Y este repo ya tenía el morado reservado
para el agente desde antes de la migración (`--cds-agent-accent: purple-60`, y el
comentario del bloque morado en `theme.css` lo dice).

**Decisión**: se adopta la *estructura* de Carbon literalmente — mismos stops,
mismos alfas, mismos nombres de token (`--cds-ai-aura-*`, `--cds-ai-border-*`,
`--cds-ai-drop-shadow`, `--cds-ai-inner-shadow`, `--cds-ai-skeleton-*`) — y se
sustituye únicamente el hue por morado.

**Descartado**: usar el azul de Carbon tal cual. Sería más fiel a la letra y peor
en la práctica: haría el marcado de IA ilegible por colisión con dos semánticos
que ya ocupan ese hue.

**La restricción que hace legítimo todo esto**: la documentación de Carbon dice
que este estilo *"no es decoración; identifica instancias de uso de IA"*. Se
aplica solo a: tarjetas con `origin='agent'`, tarjetas `is_unseen`, el widget de
AI matches del dashboard, el panel de Zenith **mientras genera**, y las burbujas
del propio agente. En ningún otro sitio. Un `grep` de `--cds-ai-` fuera de esos
puntos es un fallo de revisión.

**Dos animaciones infinitas eliminadas**: `pulseAgent` y `shine` pulsaban para
siempre en las tarjetas de agente. Una animación sin estado final pide atención
que no devuelve, y el propio checklist de motion de Carbon dice que el motion que
el usuario nota con frecuencia debe reducirse o quitarse. El aura dice lo mismo
sin moverse.

**Y una trampa que costó un fallo real**: usé `ai-aura-hover-start` (alfa 0.32)
como estado *en reposo* para las tarjetas sin ver. Eso tiñó la tarjeta lo
suficiente para bajar las estrellas de valoración de 4.99:1 a 4.49:1. El stop de
hover es para el hover. El mismo error que una animación que no acaba, cometido
con opacidad en vez de con tiempo.
