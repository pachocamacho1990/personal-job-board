# Changelog

All notable changes to this project will be documented in this file.

## [3.15.0] - 2026-07-31

### 🔧 Segunda pasada visual (M7)

Lo que salió de mirar la v3.14.0 desplegada. Cuatro bugs, dos de ellos anteriores a
la migración, y un diagrama de login que prometía funcionalidad inexistente.

#### Fixed
- **El Dashboard llevaba desde la migración a una sola columna.** `.dashboard-grid`
  estaba declarada en `layout.css` con la rejilla real y en `dashboard.css` con solo un
  margen; el commit `3035ca4` borró la primera razonando que la segunda la reemplazaba,
  pero esa **nunca tuvo `display: grid`**. Invisible en QA porque un dashboard vacío
  renderiza dos tarjetas apiladas, que es exactamente como se ve el bug.
- **El contenido no se contraía para el panel del agente al navegar.** `AgentConsole`
  ponía una clase sobre `.main-content` desde un efecto atado a `[isPanelOpen]`. Esto es
  una SPA: el router cambia la página sin recargar, el efecto no vuelve a correr, y el
  nuevo `.main-content` nunca se enteraba — 400px de solape permanente. El estado vive
  ahora en `<html>` como `data-agent-open`, el único nodo que el router no recrea.
- **Una lámina opaca tapaba la cuadrícula de fondo.** `.kanban-board` pintaba
  `--cds-background`, el mismo color que ya pinta `body`: no cambiaba nada visualmente y
  por eso nadie lo cuestionó, mientras cubría la textura en toda el área del tablero.
- **El detalle de tarjeta era inalcanzable con el agente abierto.** Los dos ocupaban la
  misma franja de 400px en el mismo `z-index`. Ahora es un diálogo centrado.

#### Changed
- **La consola del agente pasa de seis hues a uno.** La burbuja del usuario va neutra —
  `button-primary` significa "acción primaria de la app" y un mensaje escrito por una
  persona no es eso — y la maquinaria del agente deja de tomar prestado el azul
  interactivo. De paso se corrigen dos fugas semánticas: los bloques de *thinking* y
  *suggestion* usaban tokens de estado del Job Board, elegidos por cómo se veían.
- **El registro Carbon for AI vuelve al azul de Carbon**, sin la sustitución a morado.
  Cero desviación que explicar; a cambio, una tarjeta de agente en la columna *Applied*
  lleva ahora borde azul de estado y aura azul de IA. Verificado sobre datos: se
  distinguen, pero es el punto más débil del sistema y queda documentado.
- **La cuadrícula de fondo sube de 2,5 % a 8 %** en claro y de 4 % a 10 % en oscuro.
  Estaba por debajo del umbral en que se registra como textura.
- **El diagrama del login, rehecho.** El anterior anunciaba un "ATS Match Optimizador"
  con un 82 % de coincidencia y generación de cartas de presentación con IA. Nada de eso
  existe. Ahora muestra el agente, tres etapas reales con los colores reales del board,
  y el business board.

#### Added
- Octavo check en el gate de conformidad: ningún `--cds-status-*` dentro de
  `agent-console.css`.

#### Verification
Gate 8/8 · barrido de contraste 0 fallos en 12 combinaciones sobre tableros poblados ·
75 tests de backend · 9 E2E · `tsc` y build limpios. Los dos bugs de layout reproducidos
en Playwright antes del arreglo y vueltos a medir después.

## [3.14.0] - 2026-07-31

### ✨ Refinamiento visual sobre Carbon (M6)

La migración de la v3.13.0 dejó la app correcta y plana. Se desplegó, se miró, y no
convencía: demasiado cuadrada, sin respuesta al puntero, con las columnas del tablero
demasiado cargadas de color. Tres de esas cuatro cosas eran decisiones tomadas de más
durante la migración, no deuda heredada.

La investigación fue al código fuente de `carbon-design-system/carbon`, no a la
memoria, y desmintió la premisa: el **default** de Carbon es cuadrado y plano, su
**vocabulario** no lo es. Ship 2/4/8/12/16/24px de radio en sus propios componentes,
`$button-border-radius` está declarado `!default`, existe un token `$shadow` con su
mixin, y hay un sistema de motion completo que esta app nunca había implementado.

#### Added
- **Sistema de motion de Carbon**: seis duraciones (70–700ms) y seis curvas de easing,
  con la distinción *productive* / *expressive*. Las 60 transiciones escritas a mano
  con `0.15s ease` inventado se migraron; cero `transition: all` en el árbol.
  `prefers-reduced-motion` colapsa las duraciones en vez de eliminar las reglas.
- **Escala de radio** de cuatro pasos, elegida de lo que Carbon ya usa: 2px en chips,
  4px en controles, 8px en contenedores, 0 en lo que de verdad es estructura.
- **Elevación**: `--cds-shadow-raised` y un `--cds-shadow-color` **temático**. Sobre
  `#f4f4f4` el negro al 30 % de Carbon da 2.09:1; sobre `#161616` da 1.06:1 y ni el
  negro puro pasa de 1.11:1 — en oscuro la profundidad la llevan la capa y el
  desplazamiento, no la sombra.
- **Vocabulario de interacción** en tres roles (`raised` / `row` / `control`), aplicado
  a las 78 reglas de hover de la app en vez de a un puñado de selectores elegidos a
  mano. Todo botón responde al pulsarse.
- **Carbon for AI** en los cinco sitios donde hay IA de verdad: tarjetas con
  `origin='agent'`, tarjetas sin ver, el widget de coincidencias, las burbujas del
  agente y el panel de Zenith mientras genera. Con el hue movido a morado, porque el
  azul de Carbon ya está ocupado aquí por `button-primary` y `status-applied`.

#### Changed
- **Las columnas del tablero pierden el relleno de color.** La cabecera es una capa
  neutra con una barra de acento de 3px y el cuerpo no tiene relleno. Suavizarlo
  **subió** el margen de contraste: los doce acentos pasan de medirse contra un tinte
  a medirse contra `layer-01`, donde dan entre 6.36:1 y 11.55:1.
- El panel del agente: burbujas con la esquina de su propio lado achatada, sombra de
  overlay en el panel, `:focus-within` en el compositor y botón de enviar circular.
- Dos animaciones infinitas eliminadas (`pulseAgent`, `shine`). Una tarjeta sin ver
  puede estar días en el tablero, y un pulso que dura días es ruido.

#### Fixed
- **El barrido de contraste llevaba seis milestones escaneando un tablero vacío.** Se
  registraba con una cuenta nueva y nunca sembraba datos, así que ni un timestamp, ni
  una valoración, ni un tag de estado se había medido jamás. Ahora siembra 7 trabajos
  y 5 entidades antes de escanear, y resuelve gradientes además de colores sólidos.
- `.job-card .timestamp` estaba en **2.15:1**: usaba `--cds-text-placeholder`, el token
  que Carbon documenta como sub-AA precisamente porque nada informativo debe usarlo,
  con `opacity: 0.7` encima.
- Las estrellas de valoración se anunciaban a los lectores de pantalla como
  `"★★★★☆"`, que no significa nada. Ahora van `aria-hidden` con un equivalente hablado.
- `--cds-shadow-overlay` estaba en alpha 0.2; Carbon usa 0.3.

#### Verification
Gate de conformidad ampliado a **7 checks** (nuevos: literales de duración/easing y de
radio). Barrido de contraste en **0 fallos** sobre 12 combinaciones página/tema y ahora
con tableros poblados. 75 tests de backend, 8 E2E del toggle, `tsc` y build limpios.

## [3.13.0] - 2026-07-30

### 🎨 Migración completa a IBM Carbon Design System (g10/g100)

Toda la interfaz pasa a IBM Carbon, con tema claro y oscuro. El punto no era repintar: era que dejara de haber colores sueltos. Antes, cambiar un gris significaba buscarlo en ocho hojas de estilo y en los estilos inline de una docena de componentes. Ahora hay **un solo sitio** donde vive cada decisión de color.

#### Added
- **Motor de tokens de dos niveles** (`src/styles/theme.css`): primitivos N1 con la paleta oficial de Carbon, y semánticos N2 nombrados por propósito que apuntan a ellos. Cambiar de tema **solo** redefine N2. Regla dura: los componentes consumen N2, nunca N1 — un primitivo no puede seguir un cambio de tema.
- **Tema oscuro g100** completo, con toggle persistente al pie de la Sidebar. La preferencia guardada gana a `prefers-color-scheme`, y persistir es opcional: aplicar el tema al arrancar **no** guarda una preferencia que el usuario nunca expresó.
- **Escalas Carbon**: spacing 01–13, escala tipográfica con 11 estilos compuestos, radio 0 y elevación solo en overlays.
- **Colores de estado como semánticos**: 12 estados × 3 tokens × 2 temas. `pending` era el único sin tokens — eran tres slates de Tailwind incrustados — y ahora es teal.
- **Componentes compartidos**: `Drawer` (los dos paneles de detalle duplicaban la misma carcasa) e `InlineNotification` (tres banners que eran el mismo componente escrito tres veces). Ninguno acepta color por prop: el tipo es una clase modificadora, así que nadie puede inventarse una variante que se salte los checks de contraste.
- **Scripts de conformidad** en `scripts/`: `check-tokens.py` (estructura, paridad g10/g100, contraste WCAG calculado), `audit-undefined-tokens.py` y `find-non-carbon-colors.py`.
- **`tests/theme-toggle.spec.js`**: 8 tests E2E del contrato del toggle. Cada aserción mide un `background` computado junto al atributo, así que un cambio sin estilos detrás falla.

#### Fixed
- **Un input sin ningún indicador de foco.** El anillo del buscador del archivo apuntaba a `--color-primary-soft`, que ninguna hoja definía. Un `var()` indefinido descarta la declaración entera, así que quien navegara por teclado no veía dónde estaba.
- **`docs.css` estilaba toda la aplicación.** Declaraba `h1`, `code`, `table` y otros a nivel raíz, y como Vite bundlea todo el CSS en un archivo que cargan las seis páginas, esas reglas se aplicaban en todas. En la página de login, un `h1` computaba 40px/700 y un `code` salía magenta sobre slate.
- **La página de docs llevaba meses cayendo al fallback tipográfico**: su `<link>` de fuentes estaba malformado (`family=Outfit:Outfit:wght@…`), así que Google Fonts no servía nada.
- **57 fallos de contraste AA**, encontrados midiendo cada nodo de texto en las seis páginas por ambos temas, no mirando capturas. Ahora son **0**. Entre ellos, los colores de estado ya incumplían AA **antes** de la migración: acento hue-60 sobre relleno hue-20 da 3.79, y `interview` daba 2.48.
- **Tokens que no pintaban nada**: 14 referencias `var()` sin definir en 37 usos, la mayoría colores de texto que por tanto se heredaban en vez de aplicarse. Quedan 0.
- **Reglas duplicadas y muertas**: el bloque `.dashboard-*` estaba declarado en dos hojas, y un alias de la sidebar se referenciaba a sí mismo, lo que lo hacía inválido y sin efecto desde siempre.

#### Changed
- IBM Plex se carga desde el `<head>` de cada HTML en vez de por `@import` en CSS, que el preload scanner no puede ver.
- Estética aplanada: sin sombras fuera de los overlays, sin `backdrop-filter`, sin gradientes decorativos, radios a 0.
- Estilos inline reducidos de 207 a 137; los que quedan son valores de un solo uso.
- `DESIGN_SYSTEM.md` reescrito como fuente única; `DESIGN.md`, `CLAUDE.md` y `TESTING.md` actualizados; la página de docs in-app documenta ahora el theming y las 13 herramientas del agente.

#### Notes
- Los tres puntos de "semáforo" de macOS en el panel del login siguen siendo literales a propósito: citan una interfaz real, como haría un logo.
- El panel showcase del login es oscuro en ambos temas por diseño, así que fija sus propios tokens con scope en vez de leer los semánticos temáticos.

---

## [3.12.0] - 2026-07-29

### 🌐 Navegación web para el agente Zenith

El agente puede ahora abrir una URL y leerla. Resuelve el caso de "pásale esta oferta al agente": pegar el enlace de una vacante y que extraiga los requisitos sin copiar y pegar a mano.

#### Added
- **Herramienta `browse_url`**: expuesta al LLM en `WORKSPACE_TOOLS_SCHEMAS` y despachada en `execute_tool` (`agent-service/src/tools/workspace_tools.py`). Recibe una URL y devuelve `{success, url, title, content}`.
- **`agent-service/src/tools/browser.py`**: `BrowserManager`, singleton que mantiene un Chromium headless en background y arranca de forma perezosa en la primera navegación. Cada petición usa un contexto aislado, con user-agent de escritorio y espera a `networkidle` (timeout 15 s) para que carguen las SPAs.
- **`html_to_markdown()`**: capa de parseo pura y sin I/O. Elimina `script`, `style`, `noscript`, `nav`, `footer`, `header`, `form`, `svg` e `iframe`, convierte a markdown ATX, compacta los saltos de línea repetidos y trunca a 15.000 caracteres para no desbordar la ventana de contexto del LLM.
- **`agent-service/requirements-dev.txt`**: dependencias solo de test (`pytest`), fuera de la imagen de runtime. `DEPLOYMENT.md` documentaba cómo correr `pytest` en el contenedor, pero `pytest` no estaba instalado en ninguna parte y el suite era inejecutable.
- **18 tests** en `agent-service/tests/test_browser.py` cubriendo el parseo (limpieza de ruido, headings ATX, enlaces y listas, truncado, fragmentos sin `<body>`, HTML malformado) y la orquestación con dobles de Playwright (éxito, respuesta nula, error HTTP, excepción de navegación, cierre del contexto en todos los casos).

#### Fixed
- **Fuga de Chromium al apagar**: el lifespan de FastAPI (`agent-service/src/main.py`) solo cerraba el pool de PostgreSQL, así que el navegador quedaba huérfano. Ahora también llama a `browser_manager.shutdown()`, que es seguro aunque nunca se haya navegado.

#### Changed
- **Imagen base del agente**: de `python:3.11-slim` a `mcr.microsoft.com/playwright/python:v1.44.0-jammy`, que ya trae los navegadores y sus dependencias de sistema.
- **Dependencias**: `+playwright==1.44.0`, `+beautifulsoup4==4.12.3`, `+markdownify==0.12.1`.

> **Nota sobre la 3.11.0**: aquella versión eliminó `playwright` y `browser-use` para aligerar la imagen del agente. Esto lo revierte **a propósito** — el coste (~2,9 GB de imagen) se acepta a cambio de que el agente pueda leer las ofertas por sí mismo. No volver a "limpiar" estas dependencias sin retirar antes la herramienta `browse_url`.

---

## [3.11.0] - 2026-07-07

### 🚀 Onboarding laboral conversacional y búsqueda activa descentralizada (Fases 3, 4 y 5)

Reemplazado el sistema heredado de scraping automático de LinkedIn en el backend por un onboarding interactivo en React, un entrevistador dinámico basado en anclas de carrera y un panel superior para búsqueda activa delegada en la extensión local Claude for Chrome.

#### Added
- **Formulario de Perfil (`/profile.html`)**: Formulario React moderno para recopilar datos de perfil (`profile_data`) e integrarse mediante WebSockets con el agente Zenith.
- **Estrategia y Prompt de Búsqueda**: Nuevas columnas `career_strategy` y `search_prompt` en `agent_profiles` Postgres, con migración `v3_11`.
- **Entrevista Interactiva de Schein/STAR/OARS**: Diálogo interactivo determinista en el agente y herramienta `save_career_strategy` para guardar la estrategia al completar.
- **Modo de Prueba (`TEST_MODE=true`)**: Modo de simulación rápida y determinista en Python para pruebas unitarias y de integración E2E.
- **Widget de Búsqueda Activa**: Componente en `AgentConsole.tsx` para visualizar la estrategia y copiar el prompt dinámico de búsqueda activa inyectando el ID del tablero destino seleccionado.
- **Pruebas de Integración**: Pruebas Playwright ampliadas y exitosas cubriendo la simulación completa de onboarding, copia de prompt y guardado de tarjetas desde Claude for Chrome.

#### Removed
- Dependencias obsoletas del sistema (`playwright`, `browser-use`) e instalación de Chromium en la imagen de Docker del agente para una construcción más eficiente.

---

## [3.10.0] - 2026-02-09

### 🚀 Feature: Job to Business Connection Transformation

Transform job applications into business connections when a networking opportunity emerges. This creates a linked Connection card on the Business Board while preserving the original job history.

### Added

#### Transformation Flow
- **Transform Button**: New "Transform to Connection 🚀" button in the Job Detail panel.
- **Confirmation Modal**: Custom modal explains consequences (locking, creating, copying) before proceeding.
- **File Migration**: All attachments are automatically copied to the new Business Connection.

#### Locked State
- **Visual Indicator**: Transformed jobs appear "ghosted" (grayscale, reduced opacity) with a lock icon overlay.
- **Non-Draggable**: Locked cards cannot be moved between columns.
- **Read-Only**: Opening a locked job shows a banner and disables all form inputs.

### Technical Details

#### Database Schema
```sql
-- Added to jobs table
ALTER TABLE jobs ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
```

#### New Backend Endpoint
```
POST /api/jobs/:id/transform
```

#### New Tests
- Added 4 tests to `jobs.test.js` for transformation endpoint (success, not found, already locked, rollback).

---

## [3.9.0] - 2026-02-06

### Refactored
- **Shared Board Helpers**: Extract shared board behaviors into `createBoardHelpers()` factory.
  - Drag-and-drop, view toggle, markdown preview, panel close, file queue, ESC key handling.
  - `app.js`: 700 → 573 lines; `business.js`: 350 → 256 lines.
- **Bug Fix**: Business Board markdown preview now references correct id (`notes` vs `comments`).

---

## [3.8.0] - 2026-02-06

### Refactored
- **Module Extraction**: Split `app.js` into focused shared modules (36% reduction).
  - `shared/journey-map.js`: SVG status timeline rendering.
  - `shared/center-peek.js`: Read-only job detail modal with init pattern.
  - `shared/archive-vault.js`: Archive/restore modal with init pattern.
- **Bug Fix**: `updateColumnCounts` now includes all 8 statuses (pending, archived).
- **Deep Links**: Now open Center Peek (consistent with card clicks).

---

## [3.7.0] - 2026-02-06

### Refactored
- **DRY API Client**: Replace duplicated CRUD methods with `createCrudApi` and `createFilesApi` factories.
  - `api.js` reduced from 296 → 141 lines with zero consumer changes.

---

## [3.6.0] - 2026-02-06

### Changed
- **Version Correction**: Documentation version bump to align with release tags.

---

## [3.5.1] - 2026-02-05

### Changed
- **File Upload Limit**: Increased from 10MB to 20MB.
  - `nginx.conf`: Added `client_max_body_size 20M`.
  - `upload.js`: Increased `MAX_FILE_SIZE` constant.

---

## [3.5.0] - 2026-02-05

### 🚀 Feature: Business Entity Attachments & Unified File Queueing

This release extends file attachment capabilities to the Business Board and standardizes the experience across the application. It also introduces a "Queue & Upload" feature for smoother item creation.

### Added

#### Business Board Attachments
- **File Support**: Attach PDFs, Images, and Docs to Investors, VCs, and Connections.
- **Full Lifecycle**: Upload, Preview (Modal), Download, and Delete.
- **Queueing Engine**: Upload files *while* creating a new entity; they are queued and uploaded automatically upon save.

#### Job Board Enhancements
- **Connection Attachments**: Parity feature allowing "Connection" type cards to have attachments.
- **Creation Queue**: "Add File" button is now available immediately when creating a new job; files are queued and uploaded after the job is created.

### Technical Details

#### Database Schema
- New `business_entity_files` table mirroring `job_files` structure.

#### Backend
- `business-files.controller.js`: dedicated controller for business file operations.
- `business.routes.js`: updated routes to support file endpoints.

#### Testing
- Added `server/tests/business-files.test.js` for full coverage of the new endpoints.

### 🚀 Feature: Deep Linking from Dashboard

Clicking on a job card in the Dashboard (Upcoming Interviews or New Matches) now directly opens the Job Board with the **Center Peek** details modal automatically activated for that specific job.

### Changed
- **Dashboard**: "View" and "Review" buttons now use `?openJobId={id}` for direct navigation.
- **Job Board**: startup logic now checks for `openJobId` parameter and auto-opens the details panel.

## [3.4.0] - 2026-02-04

### 🚀 Feature: File Attachments & Secure Downloads

This release introduces full support for attaching files to job cards, with a focus on cross-browser compatibility and security. Users can now upload resumes, cover letters, and other documents directly to the board.

### Added

#### File Management
- **Uploads**: Attach PDFs, DOCX, and Images (up to 10MB) to any job card.
- **Inline Preview**: View PDFs and Images instantly in a dedicated modal without downloading.
- **Management**: Easy delete workflow with confirmation modals.

#### Secure & Robust Downloads
- **Safari Support**: Optimized download behavior (same-tab navigation) to comply with strict popup policies.
- **Chrome Support**: Explicit filename enforcement to prevent internal server paths from leaking.

### Technical Details

#### New Backend Files
- `server/controllers/files.controller.js` - Handles upload, download, and delete operations.
- `server/middleware/upload.js` - Multer configuration with UUID-based filename generation.
- `server/tests/files.test.js` - Comprehensive integration tests for file endpoints.

#### Database Schema
New `job_files` table to track attachments:
```sql
CREATE TABLE job_files (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documentation
- **WIREFRAMING_GUIDE.md**: Added new standard protocol for AI-generated UI wireframes.
- **AI-GUIDE.md**: Updated with "Browser Quirks" section for file handling.

---

## [3.4.1] - 2026-02-05

### Changed
- **Documentation**: Updated AI-GUIDE with deep linking patterns.

---

## [3.1.3] - 2026-01-29

### Fixed
- **Status Dropdown**: Added missing 'Pending Next Step' option to the job edit form.

---

## [3.1.2] - 2026-01-28

### Fixed
- **Journey Map Visualization**: Corrected an issue where the first status change (e.g., Interview → Pending) was missing the starting node in the visualization. Now correctly displays the full path.

## [3.1.1] - 2026-01-28

### Fixed
- **Login Rate Limiter**: Improved logic to only count failed attempts (`4xx/5xx`) against the quota.
- **Increased Limits**: Raised limit from 5 to 15 failed attempts per 15 minutes to prevent lockout during normal use.

## [3.1.0] - 2026-01-28

### 🚀 Advanced Job Tracking & Journey Map

This release adds non-linear job tracking with the new "Pending Next Step" status and a visual Journey Map to see how jobs progress through different stages over time.

### Added

#### Pending Next Step Status
- **New Kanban Column**: "Pending Next Step" between Interview and Offer
- **Non-Linear Workflow**: Jobs can move back and forth (e.g., Interview → Pending → Interview)
- **Database Update**: Added 'pending' to job status enum

#### Job History Tracking
- **History Table**: New `job_history` table logs all status changes
- **Database Trigger**: Automatic logging on INSERT/UPDATE via PostgreSQL trigger
- **API Endpoint**: `GET /api/jobs/:id/history` returns status change history

#### Center Peek Modal
- **Journey Map Visualization**: Interactive SVG diagram showing job progression
- **Horizontal Scroll**: Spacious column layout with full status names
- **Visual Path**: Indigo line connecting status changes over time
- **Timeline Labels**: Relative timestamps (e.g., "2h ago") at each node
- **Quick Edit**: "Edit Details" button opens the full edit panel

### Changed
- **Card Click Behavior**: Clicking a job card now opens Center Peek (view mode)
- **Add Job**: "Add Job" button still opens the edit panel directly

### Technical Details

#### New Database Objects
```sql
-- History tracking table
CREATE TABLE job_history (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automatic trigger
CREATE TRIGGER trigger_log_job_status_change
AFTER INSERT OR UPDATE OF status ON jobs
FOR EACH ROW EXECUTE FUNCTION log_job_status_change();
```

#### New Test Cases (5 added)
- History endpoint returns data for valid job
- History endpoint returns 404 for non-existent job
- History endpoint returns empty array for no history
- Create job with 'pending' status
- Update job to 'pending' status

---

## [3.0.0] - 2026-01-27

### 🚀 Major Release: Business Board & Dashboard

This release introduces a complete navigation overhaul with a new Home Dashboard, Business Board for tracking professional connections, and unified sidebar navigation across all pages.

### Added

#### Home Dashboard
- **New Entry Point**: Dashboard replaces Job Board as the default view after login
- **Upcoming Interviews Widget**: Shows jobs with "Interview" status for quick reference
- **New AI Matches Widget**: Displays unseen jobs created by AI agent (`origin='agent'`)
- **Quick Actions**: View and Review links for rapid navigation

#### Business Board
- **New Kanban Board**: Dedicated board for tracking business relationships
- **Entity Types**: Investors 💸, VCs 🏛️, Accelerators 🚀, Connections 🤝
- **Status Columns**: Researching → Contacted → Meeting → Negotiation → Signed/Rejected
- **Color-Coded Columns**: Each status has distinct visual styling (Indigo, Cyan, Violet, Orange, Green)
- **Drag & Drop**: Move entities between stages just like job applications
- **Compact/Comfortable View**: Toggle between dense and detailed card layouts (persisted)
- **Full CRUD**: Create, Read, Update, Delete operations with ownership verification

#### Unified Navigation
- **Left Sidebar**: Consistent navigation across all pages (Dashboard, Job Board, Business Board)
- **User Profile**: Displays logged-in user info in sidebar footer
- **Logout Modal**: Confirmation dialog before logging out
- **Active Page Highlighting**: Current page indicated in navigation

### Changed
- **Job Board moved to /jobs.html**: Original Kanban board now at dedicated URL
- **Index.html repurposed**: Now serves as the Dashboard home page
- **API paths**: Standardized to use `/jobboard/api/` prefix for nginx proxy

### Technical Details

#### New Backend Files
- `server/controllers/business.controller.js` - Business entity CRUD operations
- `server/controllers/dashboard.controller.js` - Summary data aggregation
- `server/routes/business.routes.js` - API endpoints for `/api/business`
- `server/routes/dashboard.routes.js` - API endpoint for `/api/dashboard/summary`

#### New Frontend Files
- `public/jobs.html` - Job Board (original Kanban)
- `public/business.html` - Business Board
- `public/js/dashboard.js` - Dashboard widget logic
- `public/js/business.js` - Business board + view toggle
- `public/js/sidebar.js` - Navigation highlighting
- `public/css/layout.css` - Dashboard grid layout
- `public/css/sidebar.css` - Navigation styles

#### Database Schema
```sql
CREATE TABLE business_entities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'connection',
    status VARCHAR(50) DEFAULT 'researching',
    contact_person VARCHAR(255),
    email VARCHAR(255),
    website VARCHAR(255),
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Test Coverage
- Expanded from 17 to 26 tests
- Added `business.test.js` - Full CRUD + validation tests
- Added `dashboard.test.js` - Summary endpoint + error handling

### Fixed
- Auth token key mismatch (`token` → `authToken`)
- Missing script includes in HTML files
- Dashboard API URL path for nginx proxy
- Redirect path consistency (absolute paths)

---

## [3.2.0] - 2026-02-02

### Added
- **Archive Vault 📦**:
    - **Archived Status**: New status for jobs to keep them off the main board but preserved in history.
    - **Archive Modal**: Dedicated view for archived jobs with list layout and "Restore" functionality.
    - **One-Click Archiving**: "Archive 📦" button added to the Job Detail panel.
    - **Journey Map Update**: Now includes 'Archived' as the final stage in the visualization.
- **UI Enhancements**:
    - **Custom Confirmation Modal**: Replaced native browser confirm dialogs with styled HTML/CSS modals for Archiving.
    - **Status Dropdown**: Added missing "Pending Next Step" option to Archive Modal and Detail Panel.
    - **Refined Styles**: Consistent glassmorphism styling for new modals.

---

## [2.3.0] - 2026-01-23

### Added
- **Job Origin Indicator**:
    - **Created By Field**: Distinguish between jobs created by human 👤 vs AI Agent 🤖.
    - **Visual Badges**: New icons in standard and compact views.
    - **Unseen Shine Effect**: Agent-created jobs glow purple until clicked/seen.
    - **Database**: Added `origin` (enum) and `is_unseen` (bool) columns.

## [2.2.0] - 2026-01-22

### Added
- **Aurora Design System**: A complete visual overhaul of the application.
    - **Color Palette**: New Indigo & Slate theme for a cleaner, more professional look.
    - **Typography**: Standardized on Inter/System UI font stack.
    - **Components**: New "Frozen Glass" card style, refined buttons, and inputs.
    - **Login & Modals**: Redesigned authentication screens and dialogs.
- **Documentation**: Added `DESIGN_SYSTEM.md` and updated README screenshots.

## [2.1.0] - 2026-01-22

### Added
- **Focus Mode 🎯**: A new feature to filter the board for high-priority items.
    - Toggle button in the header.
    - Hides columns "Rejected" and "Forgotten".
    - Hides job cards with less than 3 stars.
    - Persists user reference between sessions via LocalStorage.

### Changed
- Updated UI styles for Focus Mode active state.

## [2.0.0] - 2026-01-20

### Added
- **Multi-User Architecture**: Full migration to a client-server model.
- **PostgreSQL Database**: Replaced localStorage with robust SQL persistence.
- **Authentication**: Secure Signup/Login flows with JWT and password hashing.
- **Docker Support**: Full Docker Compose setup for API, DB, and Nginx.

## [1.0.0] - 2026-01-19

### Added
- **Forgotten Column**: New column for tracking stalled applications.
- **Timestamps**: Added created/updated timestamps to job cards.
- **Sorting**: Added ability to sort cards by rating and updated date.
- **Basic Board**: Original Kanban board implementation with localStorage.
