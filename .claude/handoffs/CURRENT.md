---
updated: 2026-08-05T22:15
project: ninguno en curso — «Desacoplar Business Board» cerrado al 100 %
linear: https://linear.app/personal-pacho/team/personal-job-board-app
milestone: ninguno
in_flight: ninguno
next: no hay trabajo pendiente. Para empezar algo nuevo: git checkout main && git pull && git checkout -b feature/<lo-nuevo> — son rebase merges, cortar de una rama vieja replica commits que ya están arriba.
branch: main, limpia y sincronizada
verified: 61 tests backend · 16 specs Playwright · gate 8/8 · tsc y build limpios · puente probado extremo a extremo contra CMC corriendo, incluido el camino de fallo
---

## Dónde quedamos

Este repositorio contenía dos productos. El Business Board se fue a su propio
repositorio — **Cassimir Management Center**, `~/cassimir-management-center`,
ya en GitHub como `casimir-systems/cassimir-management-center` — y aquí queda
solo la plataforma de perfilamiento profesional y búsqueda de empleo con Zenith.

**Terminado.** Tres PRs mergeados — #38 (la separación y el puente), #39 (dos
ficheros que se quedaron fuera por un cruce de tiempos) — y el `DROP TABLE`
ejecutado a las 22:08 dentro de una transacción. Este repositorio ya no tiene ni
código ni datos de negocio.

## Siguiente paso

Ninguno. Para trabajo nuevo:

```bash
git checkout main && git pull && git checkout -b feature/<lo-nuevo>
```

Los merges de este repo son **rebase merges**: cortar de una rama vieja replica
commits que ya están arriba y produce conflictos en el siguiente PR.

Las dos partes de `migrations/migration_v4_0_split_business.sql` están aplicadas.

## Hecho en esta sesión

- **PJBA-58** — rescate de datos. `pg_dump` de las dos tablas y
  `scripts/export-business.js`, que exporta las filas de `user_id = 1` con
  checksum de los adjuntos. De 90 filas en `business_entities`, **5 eran reales**;
  las otras 85 las siembra `scripts/contrast-sweep.py` en cuentas de prueba.
- **PJBA-59** — amputación. 8 ficheros borrados, 37 tocados, −1.785/+619 líneas.
- **PJBA-60** — el puente. `transformJobToEntity` reescrito como llamada HTTP.
- Versión subida a **v4.0.0** en `CLAUDE.md` y `CHANGELOG.md`.
- **PR #38 mergeado** a `main`.
- `AI-GUIDE.md` corregido: se me había escapado en la amputación y seguía
  describiendo `business.html`, `/api/business` y el esquema de
  `business_entities`. Es el fichero que leen los CLIs de agentes, así que dejarlo
  obsoleto habría dirigido a cualquier asistente hacia endpoints inexistentes.
- **`DROP TABLE` ejecutado.** Dump fresco antes
  (`~/backups/business-pre-drop-2026-08-05T170808.sql`, 91 filas, idéntico al de
  la Fase 0). Verificado contra la base ya sin las tablas: `/api/boards`,
  `/api/jobs` y `/api/dashboard/summary` a 200, `/api/business` a 404, logs de
  `jobboard-api` sin un solo `relation does not exist`, 61 tests y 16 specs
  verdes.

En el otro repositorio (team `Cassimir-tech`): CAS-1 a CAS-5, todos cerrados. Y
su andamiaje de agentes completado — `settings.json` (los hooks estaban copiados
pero **sin cablear**), el symlink de `.agents/skills/handoff` para Antigravity,
`GEMINI.md`, `AI-GUIDE.md` y `DECISIONS.md`.

## En vuelo / a medias

Nada a medias en el código. Solo las dos decisiones de arriba.

## Decisiones tomadas

- **Aislamiento total, no SSO.** Base, tabla `users` y `JWT_SECRET` propios en
  cada app. Descartado compartir usuarios: era cómodo hoy y era exactamente el
  acoplamiento que se estaba rompiendo.
- **El transform se mantiene, como integración HTTP.** El usuario eligió
  conservarlo frente a eliminarlo o degradarlo a exportar JSON.
- **Autenticación del puente por token de integración hasheado**, no por
  `JWT_SECRET` compartido. Compartirlo dejaría que un token de sesión de una app
  autenticara contra la otra.
- **Descartado el rollback distribuido** porque no existe. Lo sustituyen el orden
  (crear remoto → bloquear local) y la idempotencia por `external_ref`.
- **`BusinessIcon` renombrado a `ConnectionIcon`, no borrado.** Lo usan las
  tarjetas de `type: 'connection'`, que es un concepto del Job Board.

## Trampas descubiertas

- **`UPLOADS_DIR` derivado de `__dirname` está mal y no da error.** Significa
  `server/uploads/` bajo ts-node y `server/dist/uploads/` una vez compilado,
  porque el fichero compilado queda un nivel más abajo. El directorio se crea a
  demanda, así que las subidas nuevas funcionan y **solo fallan los adjuntos
  anteriores al último despliegue**. Corregido: ahora se ancla a `process.cwd()`.
- **`await client.query('ROLLBACK').catch(...)` cuelga Jest.** Si la query lanza,
  queda una promesa rechazada sin manejar; no se ve como test rojo sino como un
  Jest que nunca sale. Costó cinco minutos de timeout aislarlo.
- **Un mock encolado con `mockResolvedValueOnce` es frágil si hay una llamada
  *fire-and-forget* de por medio** — se come un valor de la cola. Despachar por
  el texto del SQL es más robusto.
- **El puente necesita `host.docker.internal`** para que el contenedor del Job
  Board alcance el nginx de CMC en el host. `localhost` desde dentro del
  contenedor no llega.
- Las cuentas de prueba en la base siguen creciendo: `scripts/contrast-sweep.py`
  deja 12 filas por ejecución y no tiene `--cleanup`.

## Estado de verificación

Corrido sobre la rama antes del merge (`d376332`, ahora `8ab154c` en `main`):

```
npm test                                    61 tests (1 skipped) — verde
npx playwright test                         16 passed
npm run check:design                        PASS 8/8
python3 scripts/check-tokens.py             PASS
python3 scripts/audit-undefined-tokens.py   0 referencias sin fallback
npx tsc --noEmit && npm run build           limpios
```

Puente contra un CMC real, no mockeado:

```
transform                        → 200, oportunidad en CMC con external_ref jobboard:597
transform otra vez               → 400, sin segunda llamada
CMC apagado, transform           → 503, is_locked = false, url nula
CMC de vuelta, reintento         → 200
```

Los datos de prueba generados en esa comprobación ya están borrados de las dos
bases; CMC vuelve a tener exactamente sus 5 registros reales.

## Deuda conocida, por si buscas por dónde seguir

Ordenada por lo que más probablemente moleste primero.

1. **Colisión de azules.** Una tarjeta creada por el agente en la columna
   *Applied* lleva borde azul de estado y aura azul de IA a la vez. Se distinguen,
   pero es el punto más débil del sistema. Dos salidas en `DESIGN_SYSTEM.md` §9b.
2. **~20 cuentas de prueba en la base** (`test-qa-*`, `shot-*`, `ai-*`, `m7-*`,
   `probe-*`, `dlg-*`). `scripts/contrast-sweep.py` deja una por ejecución y
   siembra 12 filas cada vez. Merece un flag `--cleanup`.
3. **La capa puente de `src/styles/styles.css`**: 17 alias legacy que sobreviven
   porque los leen estilos inline en TSX. Se van con la migración de estilos
   inline. No añadir nada a ese bloque. (En CMC esta deuda no existe: no se
   copió el fichero.)
4. **Una fuga N1**: `styles.css` mapea `--color-accent` directo a
   `--cds-purple-60`. Un primitivo no sigue el cambio de tema.
5. **Idiomas mezclados**: login en inglés, documentación en español, dashboard con
   títulos de ambos. Decisión de producto, no de estilo.

## Preguntas abiertas para el usuario

Ninguna.

> Nota de nomenclatura, para no volver a plantearla: la organización de GitHub del
> otro repo es `casimir-systems` con **una** s y la app se llama `cassimir` con
> **dos**. Es **intencional**. No "corregirlo".
