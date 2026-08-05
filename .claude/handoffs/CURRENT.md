---
updated: 2026-08-05T21:45
project: Desacoplar Business Board
linear: https://linear.app/personal-pacho/project/desacoplar-business-board-42e305fd48e2
milestone: ninguno
in_flight: ninguno — PJBA-58, 59 y 60 cerrados
next: dos decisiones del usuario, ninguna ejecutable sin él. (1) Mergear feature/split-business-board a main. (2) Ejecutar la parte 2 de migrations/migration_v4_0_split_business.sql, que hace DROP TABLE business_entities — precondiciones cumplidas, es el punto sin retorno.
branch: feature/split-business-board, commiteada en d376332, SIN mergear y SIN pushear
verified: 61 tests backend · 16 specs Playwright · gate 8/8 · tsc y build limpios · puente probado extremo a extremo contra CMC corriendo, incluido el camino de fallo
---

## Dónde quedamos

Este repositorio contenía dos productos. El Business Board se fue a su propio
repositorio — **Cassimir Management Center**, `~/cassimir-management-center`,
ya en GitHub como `casimir-systems/cassimir-management-center` — y aquí queda
solo la plataforma de perfilamiento profesional y búsqueda de empleo con Zenith.

La amputación y el puente están hechos, verificados y commiteados en una rama.
Lo único que falta son dos cosas que no se hacen sin autorización explícita: el
merge y el `DROP TABLE`.

Nota: el PR #37 que mencionaba el handoff anterior ya está mergeado; `main` estaba
en `aeec109` al cortar esta rama.

## Siguiente paso

No hay ninguno ejecutable sin decidir antes. Las dos decisiones pendientes:

1. **Mergear** `feature/split-business-board` (commit `d376332`) a `main`.
2. **Ejecutar la parte 2** de `migrations/migration_v4_0_split_business.sql`:

   ```bash
   docker exec -i jobboard-db psql -U jobboard_user -d jobboard \
     -c "DROP TABLE IF EXISTS business_entity_files; DROP TABLE IF EXISTS business_entities;"
   ```

   Las tres precondiciones se cumplen: el `pg_dump` está en
   `~/backups/business-2026-08-05.sql`, los cinco registros reales están
   verificados a ojo dentro de CMC, y `grep -ri business src server --include="*.ts*"`
   solo devuelve dos comentarios históricos.

   **Es el punto sin retorno.** Hasta entonces la tabla sigue ahí sin que nada la
   lea: inofensiva, pero el desacople no está cerrado del todo.

La parte 1 de esa migración (`ALTER TABLE jobs ADD COLUMN external_opportunity_url`)
**ya está aplicada** en la base local.

## Hecho en esta sesión

- **PJBA-58** — rescate de datos. `pg_dump` de las dos tablas y
  `scripts/export-business.js`, que exporta las filas de `user_id = 1` con
  checksum de los adjuntos. De 90 filas en `business_entities`, **5 eran reales**;
  las otras 85 las siembra `scripts/contrast-sweep.py` en cuentas de prueba.
- **PJBA-59** — amputación. 8 ficheros borrados, 37 tocados, −1.785/+619 líneas.
- **PJBA-60** — el puente. `transformJobToEntity` reescrito como llamada HTTP.
- Versión subida a **v4.0.0** en `CLAUDE.md` y `CHANGELOG.md`.

En el otro repositorio (team `Cassimir-tech`): CAS-1 a CAS-5, todos cerrados.

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

Corrido sobre `feature/split-business-board` en `d376332`:

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

## Preguntas abiertas para el usuario

1. ¿Mergear `feature/split-business-board` a `main`?
2. ¿Ejecutar el `DROP TABLE`?
3. La organización de GitHub es `casimir-systems` con **una** s y la app se llama
   `cassimir` con **dos**. ¿Es a propósito? Corregirlo ahora es barato.
