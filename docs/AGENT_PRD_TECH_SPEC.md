# Especificación Técnica y Requerimientos de Producto (PRD) — Zenith AI Agent

## 🎯 1. Resumen Ejecutivo y Objetivos

El **Zenith AI Agent** es un microservicio inteligente de automatización de carrera diseñado para integrarse de forma nativa en la plataforma **Zenith Job Board**. A diferencia de los chatbots tradicionales de preguntas y respuestas, Zenith Agent opera como un sistema cognitivo autónomo estructurado en **tres bucles de ejecución (loops)** que recopila información, perfila profesionalmente al usuario y orquesta de forma proactiva la búsqueda y catalogación de ofertas de empleo.

### Objetivos Principales:
*   **Onboarding Autónomo**: Eliminar los formularios estáticos de registro de perfil. El agente debe auto-construir el contexto profesional del usuario investigando fuentes públicas (LinkedIn) y realizando entrevistas adaptativas basadas en mejores prácticas de reclutamiento.
*   **Orquestación Proactiva (Loop 3)**: Automatizar la búsqueda de empleo en múltiples portales web y poblar de forma autónoma el Kanban del usuario con recomendaciones puntuadas por compatibilidad (Match Rate).
*   **Bucle de Aprendizaje Continuo**: Extraer preferencias y directrices en caliente de las conversaciones diarias para adaptar el prompt de sistema del agente en tiempo real.

---

## 👥 2. Requerimientos de Producto (PRD)

### 2.1. El Flujo de Onboarding en 3 Bucles

El ciclo de vida del agente se divide en tres fases funcionales obligatorias:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZENITH AGENT LIFECYCLE                        │
│                                                                  │
│   Loop 1: Investigador de LinkedIn (Background, autónomo)        │
│           ↓ Output: raw_profile (Historial, habilidades, cursos) │
│                                                                  │
│   Loop 2: Entrevistador Dinámico   (Conversacional, interactivo) │
│           ↓ Output: enriched_profile + Parámetros de búsqueda    │
│                                                                  │
│   Loop 3: Orquestador de Búsqueda  (Background, automatizado)    │
│           ↓ Output: Tarjetas de empleo en columna "Interested"   │
└─────────────────────────────────────────────────────────────────┘
```

#### Loop 1: Investigador de LinkedIn (Extracción Asíncrona)
*   **Gatillo (Trigger)**: El agente detecta que el usuario no tiene perfil cargado y muestra un mensaje de acción en la consola: `"¿Quieres que investigue tu LinkedIn?"`.
*   **Comportamiento**: 100% en segundo plano. El usuario debe poder seguir navegando en el Kanban, Dashboard y Business Board.
*   **Visualización**: El panel lateral del agente y una barra de estado inferior muestran el progreso asíncrono en tiempo real (ej: *Step 1: Navigating*, *Step 2: Extracting Experience*, *Step 3: Indexing Skills*) con porcentaje de completitud.
*   **Output**: Un objeto JSON crudo guardado en la base de datos (`linkedin_raw`).

#### Loop 2: Entrevistador Dinámico (Perfilado Conversacional)
*   **Trigger**: Cambio de estado a `interview_pending`. El agente inicia el diálogo saludando y preguntando si está listo para comenzar.
*   **Comportamiento**: Un chat de entrevista dinámico donde el LLM evalúa lo que LinkedIn no dice:
    *   *Objetivos profesionales* (Tech Lead vs. IC, sector preferido).
    *   *Expectativas salariales* y *Modalidad* (Remoto, híbrido, relocalización).
    *   *Deal breakers* (Factores de rechazo inmediato como empresas Web3 o cryptos).
*   **Sugerencias Proactivas**: El LLM analiza el perfil y sugiere alternativas (ej: *"Tienes bases fuertes en infraestructura e IA. Roles de MLOps están pagando un 20% más que ML Engineer puro. ¿Busco también en esa dirección?"*).
*   **Output**: Generación de `enriched_profile` y actualización de estado a `ready`.

#### Loop 3: Orquestador de Búsqueda (Búsqueda Activa y Carga)
*   **Trigger**: El usuario pulsa `"🔍 Iniciar búsqueda"` o se dispara por medio de una tarea programada (cron).
*   **Comportamiento**: El agente busca vacantes reales en la web (LinkedIn Jobs, Indeed, Wellfound, etc.) usando los parámetros refinados del perfil.
*   **Clasificación**: Cada vacante encontrada se compara vectorialmente y semánticamente contra el perfil del usuario.
*   **Población del Kanban**: Las vacantes que superan el umbral de compatibilidad se insertan en la columna `interested` del tablero activo con la bandera `is_unseen = true` y `origin = 'agent'`.
*   **Output**: Notificaciones de nuevos matches y refresco en tiempo real de la UI mediante eventos del navegador.

---

## 🏗️ 3. Especificación Técnica

### 3.1. Arquitectura de Estado del Agente (State Machine)

El estado del perfil del usuario se rige por la siguiente máquina de estados controlada desde la base de datos PostgreSQL (`agent_profiles.onboarding_status`):

```mermaid
stateDiagram-v2
    direction LR
    UNINITIALIZED --> LINKEDIN_PENDING: Registro de usuario sin perfil
    LINKEDIN_PENDING --> LINKEDIN_INVESTIGATING: Usuario autoriza búsqueda en LinkedIn
    LINKEDIN_INVESTIGATING --> INTERVIEW_PENDING: Extracción finalizada con éxito
    INTERVIEW_PENDING --> INTERVIEWING: Usuario inicia entrevista en consola
    INTERVIEWING --> READY: Entrevista finalizada y perfil compilado
    READY --> SEARCHING: Se inicia la búsqueda activa de empleo
    SEARCHING --> READY: Búsqueda completada e inserción en Kanban
    
    note right of LINKEDIN_INVESTIGATING: Proceso asíncrono. No bloquea navegación.
    note right of INTERVIEWING: Bucle conversacional turno a turno.
    note right of SEARCHING: Ejecución programada o manual en segundo plano.
```

### 3.2. Arquitectura de Microservicios

La solución consta de la API Gateway en Express (Node.js) que maneja las sesiones de usuario y sirve la SPA en React, comunicada por WebSockets con el microservicio de IA en Python (FastAPI).

```mermaid
graph TB
    subgraph "Frontend (React SPA)"
        UI["Visual Dashboard & Kanban"]
        AC["Agent Console (Panel Lateral)"]
        WSC["WebSocket Client"]
    end

    subgraph "Gateway (Express API)"
        EXP["Servidor Express (Puerto 3000)"]
        AUTH["Auth Middleware (JWT)"]
    end

    subgraph "Agent Service (Python FastAPI)"
        APP["FastAPI Server (Puerto 8000)"]
        WS_HANDLER["WebSocket Router"]
        RE_LOOP["Reasoning Loop (ReAct)"]
        
        subgraph "Estructura de Herramientas (Tools)"
            WT["Workspace Tools (list, move, create, delete cards)"]
            MT["Memory Tools (save_preference, save_skill)"]
            BT["Browser / Search Tools (Playwright & Aggregators)"]
        end
    end

    subgraph "Base de Datos (PostgreSQL)"
        DB[("PostgreSQL DB")]
    end

    WSC <-->|WebSocket Connection| EXP
    EXP <-->|Nginx Reverse Proxy /ws| APP
    APP <--> WS_HANDLER
    WS_HANDLER --> RE_LOOP
    RE_LOOP --> WT
    RE_LOOP --> MT
    RE_LOOP --> BT
    WT <-->|REST API Calls| EXP
    APP <-->|Asyncpg| DB
    EXP <-->|Node-PG| DB
```

---

## 💾 4. Esquema de Base de Datos y Datos Persistentes

Las tablas del agente persisten el historial de mensajes, estados de onboarding, ejecuciones secundarias y directrices de aprendizaje:

### 4.1. Perfiles de Onboarding (`agent_profiles`)
Mantiene el estado y la metadata estructurada del perfil profesional.
```sql
CREATE TABLE agent_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    onboarding_status VARCHAR(50) DEFAULT 'uninitialized'
        CHECK (onboarding_status IN (
            'uninitialized',
            'linkedin_pending',
            'linkedin_investigating',
            'interview_pending',
            'interviewing',
            'ready',
            'searching'
        )),
    linkedin_raw JSONB DEFAULT '{}'::jsonb,      -- Data cruda extraída de LinkedIn
    profile_data JSONB DEFAULT '{}'::jsonb,      -- Preferencias validadas
    career_strategy JSONB DEFAULT '{}'::jsonb,   -- Estrategia recomendada por la IA
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2. Mensajes del Agente (`agent_messages`)
Registra la conversación enriquecida con metadatos de progreso y ejecución de herramientas.
```sql
CREATE TABLE agent_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'agent', 'system', 'tool'
    type VARCHAR(50) NOT NULL, -- 'chat', 'thinking', 'tool_call', 'tool_result', 'progress', 'action'
    content TEXT NOT NULL,
    tool_name VARCHAR(255),
    tool_input JSONB,
    tool_output JSONB,
    progress_pct INTEGER,
    progress_steps JSONB,
    actions JSONB,             -- Botones de acción incrustados
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3. Memorias y Preferencias (`agent_memories`)
Guarda directrices y deal-breakers aprendidos dinámicamente del diálogo con el usuario.
```sql
CREATE TABLE agent_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'preference' (filtros), 'fact' (datos del usuario)
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.4. Skills Aprendidos (`agent_skills`)
Colección de flujos de trabajo (workflows) personalizados enseñados por el usuario.
```sql
CREATE TABLE agent_skills (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    recipe JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## ⚙️ 5. Protocolo de Comunicación (Eventos WebSocket)

La comunicación interactiva y en tiempo real a través de WebSockets utiliza el siguiente catálogo de eventos JSON:

### 5.1. Eventos del Cliente al Servidor (Inbound)
*   **Seleccionar Conversación**:
    ```json
    { "event": "select_conversation", "conversation_id": 12 }
    ```
*   **Nueva Conversación**:
    ```json
    { "event": "new_conversation" }
    ```
*   **Ejecutar Acción / Botón**:
    ```json
    { "event": "action", "action": "start_linkedin", "label": "✅ Sí, investiga mi LinkedIn" }
    ```
*   **Detener Inferencia (Cancelación)**:
    ```json
    { "event": "stop_generation" }
    ```

### 5.2. Eventos del Servidor al Cliente (Outbound)
*   **Historial de Mensajes**:
    ```json
    {
      "event": "history",
      "messages": [...],
      "onboardingStatus": "uninitialized",
      "conversationId": 12
    }
    ```
*   **Actualización de Mensajes (Stream)**:
    ```json
    { "event": "messages_update", "messages": [...] }
    ```
*   **Cambio de Estado de Onboarding**:
    ```json
    { "event": "onboarding_status_update", "status": "interview_pending" }
    ```
*   **Inferencia Iniciada / Detenida**:
    ```json
    { "event": "generation_started" }
    { "event": "generation_stopped" }
    ```

---

## 🏁 6. Hoja de Ruta de Implementación (Roadmap)

### [x] STAGE 1 — Consola Lateral UI y Mocks
*   Diseño responsivo del panel lateral derecho.
*   Chat interactivo con renderizado de burbujas (usuario, agente, herramientas, progress steps).
*   Visualización de barra de progreso y status bar global inferior.
*   Simulación de WebSockets y flujos de onboarding en React.

### [x] STAGE 2 — Microservicio Python e Integración de Herramientas
*   Conexión e infraestructura de FastAPI en Docker Compose.
*   Conexión a PostgreSQL y autenticación segura por JWT.
*   Bucle ReAct básico y ejecución de herramientas del espacio de trabajo (`list_jobs`, `update_job_status`, `archive_job`, `delete_job`).
*   Sincronización del Kanban mediante dispatch del evento `'workspace-updated'`.
*   Botón de stop en el frontend que cancela de forma asíncrona la tarea activa de Python (`asyncio.Task`).
*   Selector de historial de chats múltiples, borrado de conversaciones y títulos automáticos generados por IA.
*   Paginador y buscador dinámico integrados en el Archivo de tarjetas modal.
*   Auto-visto de recomendaciones de IA (`is_unseen = false`) al cambiar su columna o estado.

### [ ] STAGE 3 — Agente Investigador de LinkedIn (Loop 1)
*   Integración del motor de Playwright o mocks de scraping en Python.
*   Algoritmo para extraer el perfil y mapearlo a `linkedin_raw` en base de datos.
*   Transición de estados y progress steps asíncronos en el frontend del panel lateral.
*   Guardado del perfil preliminar y actualización de estado a `interview_pending`.

### [ ] STAGE 4 — Entrevistador Conversacional Inteligente (Loop 2)
*   Prompt del sistema para el LLM en modo Entrevistador.
*   Interacción estructurada pregunta-respuesta en tiempo real en la consola de chat.
*   Mecanismo del LLM para determinar la finalización de la entrevista mediante la marca `ENTREVISTA_COMPLETA` y salida estructurada JSON.
*   Guardado de `enriched_profile` en base de datos y transición a estado `ready`.

### [ ] STAGE 5 — Orquestador de Búsqueda y Automatización (Loop 3)
*   Motor de scraping para portales de empleo (LinkedIn Jobs, Indeed).
*   Algoritmo de scoring semántico (Match Rate) entre el perfil enriquecido y los job postings.
*   Creación automatizada de tarjetas en la columna `interested` a través de llamadas asíncronas seguras a la API Express.
*   Notificaciones push en tiempo real en la UI del panel lateral.
*   Planificador de tareas (cron programado) para búsquedas recurrentes en background.
