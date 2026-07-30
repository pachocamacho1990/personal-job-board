---
updated: 2026-07-30T23:05
project: Refinamiento "premium" sobre Carbon — NUEVO, sin arrancar
linear: sin issues todavía (ver Siguiente paso: hay que investigar antes de poder escribirlos)
milestone: ninguno · la migración Carbon anterior está COMPLETA (26/26, PR #34 abierto)
in_flight: ninguno
next: estudiar https://carbondesignsystem.com a fondo — qué permite Carbon de verdad en radios, elevación y motion — y solo entonces escribir los issues en Linear
branch: feature/carbon-migration (33 commits, pusheada; el PR #34 sigue sin mergear)
verified: gate 5/5 · 0 texto bajo AA en 12 combinaciones · 75 tests backend · 8 E2E del toggle · tsc y build limpios
---

## Dónde quedamos

La migración a Carbon está **terminada y verificada** (26/26 issues, PR #34 abierto y sin
mergear). Pero el usuario desplegó la app, la miró, y **no le convence el resultado visual**.

Esa reacción es el punto de partida del trabajo nuevo. No es un bug: es una crítica de diseño
sobre decisiones que tomé yo, y hay que tratarla como tal.

## El encargo, en sus palabras

Cito casi literal porque es subjetivo y se pierde al parafrasear:

> "veo componentes que no necesariamente deben tener esquinas rectas, personalmente me gustan
> más las esquinas redondeadas y que haya un efecto de profundidad al click o hover"
>
> "quiero algo un poco más premium pero es que honestamente no sé cómo definirlo"
>
> "los colores de las columnas del job board me parecen demasiado fuertes, me gustaría algo un
> poco más suave"
>
> "siento que la aplicación se ve demasiado cuadrada"
>
> "creo que hay detalles sutiles que sin perder el esquema carbon podemos implementar para que
> se vea mucho más saludable y un poco más con animaciones"

Y una hipótesis suya que hay que verificar, no descartar:

> "Yo entiendo que el Design System Carbon de IBM como que tiene varias maneras de usarse"

Pidió explícitamente: **entrar a https://carbondesignsystem.com y estudiar la documentación**,
con Playwright si hace falta.

## Contexto crítico: esto revisa decisiones mías, no deuda heredada

Tres de las cuatro quejas apuntan a cosas que **implementé a propósito** durante la migración,
y están registradas en `DECISIONS.md` y en los comentarios de Linear:

1. **Radio 0 en todo** (PJBA-10, PJBA-15). Lo justifiqué como "las esquinas son estructura, no
   decoración" y dije que redondearlas es lo que más hace que una UI deje de leerse como
   Carbon. **Hay que comprobar si eso es cierto en la documentación real de Carbon v11**, o si
   fue una lectura mía demasiado rígida. La única excepción que dejé es
   `--cds-radius-pill` para tags.
2. **Sin sombras salvo overlays** (PJBA-15). Quité 8 declaraciones de elevación y el hover-lift
   de la consola del agente. Carbon separa superficies por color de capa, no por elevación —
   pero **Carbon sí tiene tokens de elevación**, y no los estudié a fondo.
3. **Colores de columna en hue-20 / hue-10** (PJBA-13). Los subí de acento hue-60 a hue-70
   porque a 60 no pasaban AA sobre relleno hue-20. Pero **el relleno en sí no lo cuestioné**, y
   la queja del usuario es sobre el relleno, no sobre el texto. Rellenos más suaves
   (`--cds-layer-*` con un borde de color, en vez de un tinte de hue) probablemente resuelven
   esto **y** mantienen el contraste.

Lo cuarto es una **omisión limpia, no una decisión**: nunca implementé **nada del sistema de
motion de Carbon**. Carbon tiene tokens de duración y curvas de easing documentadas, y en la
app no hay ninguno. Es la palanca más grande y más barata para lo que él llama "premium", y no
entra en conflicto con nada de lo hecho.

## Siguiente paso

**Investigar antes de escribir issues.** No se pueden redactar issues útiles sin saber qué
permite Carbon de verdad. Páginas a estudiar como mínimo:

- `/elements/motion/overview/` — duraciones, easings, cuándo animar (el hueco más claro)
- `/elements/color/overview/` y `/elements/color/usage/` — cómo se usan los tintes de hue
- `/guidelines/styling/` y lo que haya de elevación / sombras
- `/elements/themes/overview/` — si hay variantes más allá de g10/g100
- Componentes concretos con radio: tags, botones, cards
- Buscar si existe algo tipo "expressive", "fluid" o variantes de producto que relajen el radio

Es trabajo de lectura, **paralelizable** (varias páginas, cero conflicto de ficheros): lanzar
agentes por área y sintetizar. Ver la memoria `parallel-agents-when-no-conflicts`.

**Producto de la investigación**: un informe honesto que diga, para cada queja, si Carbon lo
permite, lo desaconseja o es indiferente. Si Carbon de verdad es cuadrado por principio, hay
que decírselo claramente y ofrecerle la alternativa (una desviación consciente y documentada
del sistema), no fingir que la documentación respalda lo que él quiere.

**Solo después**: escribir los issues en Linear y proponerle el plan.

## Herramientas que ya existen y hay que respetar

Cualquier cambio visual tiene que seguir pasando esto:

```bash
npm run check:design                             # gate: 5 checks, 0 color no-Carbon
npm test                                         # 75 tests backend
npx playwright test tests/theme-toggle.spec.js   # 8 tests del toggle
```

Y el barrido de contraste, que **no está en el repo** — vive en el scratchpad de la sesión
anterior. **Merece moverse a `scripts/`**: recorre cada nodo de texto de las 6 páginas en
ambos temas y mide contraste real resolviendo el fondo efectivo. Encontró 57 fallos que no se
veían en ninguna captura. Si se tocan colores de columna o se añaden sombras, hay que volver a
correrlo — y ahora mismo habría que reescribirlo.

**Ojo**: bajar el contraste es exactamente el riesgo de "colores más suaves". El barrido está
en 0 y tiene que seguir en 0.

## Decisiones tomadas

En `DECISIONS.md`. La entrada nueva de esta sesión registra que **radio 0 y ausencia de
elevación quedan formalmente en revisión** — no revertidas, en revisión pendiente de la
investigación.

## Trampas descubiertas

Las de la migración siguen vigentes y están en el archivo
`archive/2026-07-30-pjba-8-33-migracion-carbon-completa.md`. Las que más importan aquí:

- **Un `var()` indefinido no da error**: el navegador descarta la declaración entera.
- **Un barrido que solo busca hex y `rgba()` deja pasar `color: white`.** Sobrevivió seis
  milestones.
- **Medir el contraste encuentra lo que mirar capturas no.**
- **El contenedor `jobboard-agent` se recrea solo** y borra `/tmp`: volver a copiar los
  scripts de Playwright con `docker cp` antes de usarlos.
- **Los merges de este repo son rebase merges.**

## Preguntas abiertas para el usuario

1. **¿El PR #34 se mergea antes de empezar esto, o el refinamiento va en la misma rama?**
   Recomiendo mergear primero: la migración está verificada y cerrada, y mezclarla con un
   cambio de dirección visual hace el PR irrevisable.
2. **¿Proyecto nuevo en Linear o issues sueltos?** Depende del tamaño que salga de la
   investigación.
3. Él mismo dijo "honestamente no sé cómo definirlo". Puede ayudar **enseñarle dos o tres
   variantes construidas** (radio 4px vs 8px, con y sin elevación al hover) en vez de pedirle
   que lo especifique con palabras.
