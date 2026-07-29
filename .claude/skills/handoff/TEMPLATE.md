# Plantilla de handoff (`CURRENT.md`)

Copia esta estructura tal cual. El bloque de frontmatter lo parsea el hook de arranque, así que **respeta los nombres de campo**.

```markdown
---
updated: AAAA-MM-DDTHH:MM
project: Migración a IBM Carbon (g10/g100)
linear: https://linear.app/personal-pacho/project/migracion-a-ibm-carbon-design-system-g10g100-ce956a924d8d
milestone: M0 · Fundación de tokens y theming
in_flight: PJBA-13
next: Sustituir el bloque :root de src/styles.css (L10-126) por refs a theme.css
branch: feature/carbon-migration
verified: build OK · tests 42/42 · lint limpio
---

## Dónde quedamos

Tres a cinco líneas en prosa. Qué se estaba haciendo y por qué, en un nivel que
alguien sin la conversación entienda. No un listado — una narración corta.

## Siguiente paso

El primer movimiento concreto de la próxima sesión, con ruta de archivo y línea.
Debe poder ejecutarse sin decidir nada más. Si hay que decidir algo antes, eso
va en "Preguntas abiertas" y aquí se dice cuál es la decisión pendiente.

## Hecho en esta sesión

- **PJBA-8** — `src/styles/theme.css` creado con primitivos N1 + semánticos g10. Verificado: build OK.
- **PJBA-9** — g100 añadido. Contraste AA comprobado salvo en `--cds-support-warning` (ver Trampas).

## En vuelo / a medias

- **PJBA-13** — `src/styles.css`: migradas las L10-87 del `:root`. Faltan L88-126
  (los alias `--border`, `--text-primary`, `--accent`). El archivo **compila pero
  la sidebar se ve rota** porque `sidebar.css` aún referencia los alias viejos:
  hay que hacer los dos a la vez o revertir.

## Decisiones tomadas

- **Los semánticos viven en `theme.css`, no en `styles.css`** — para que el toggle
  de tema solo tenga que tocar un archivo.
- **Descartado**: usar `@layer` de CSS para la cascada. Motivo: rompe el orden de
  especificidad que ya asume `agent-console.css` y no compensa el refactor ahora.

## Trampas descubiertas

- `--cds-support-warning` sobre `layer-01` en g100 da 3.9:1 — **no pasa AA**.
  Carbon usa un token distinto (`support-warning-inverse`) para ese caso.
- Vite no recarga `theme.css` en caliente si se importa desde `main.tsx`; hay que
  reiniciar el dev server tras cada cambio de tokens.

## Estado de verificación

Lo que **realmente** se corrió, con su resultado. "Sin verificar" es una respuesta
válida y honesta; inventar un OK no lo es.

## Preguntas abiertas para el usuario

- ¿El toggle de tema va en la Sidebar o en el header de cada página?
```

## Sobre el frontmatter

| Campo | Para qué |
|---|---|
| `updated` | El hook compara contra los snapshots para detectar cierres sucios |
| `in_flight` | ID del issue de Linear a medias, o `ninguno` |
| `next` | Se inyecta literal en el arranque de la próxima sesión — que sea legible por sí solo |
| `branch` | Si no coincide con la rama real al retomar, se avisa antes de tocar nada |
| `verified` | Estado de build/tests **en el momento del cierre** |
