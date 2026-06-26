# Plan de Migración a TypeScript & React y Diseño de Pruebas

Este documento detalla el plan estratégico para migrar de forma progresiva la aplicación **Career Tracker & Network Board** a **TypeScript** en el servidor y cliente, y a **React** en la interfaz de usuario, garantizando la compatibilidad hacia atrás y la ausencia de regresiones mediante un diseño de pruebas estructurado.

---

## 📋 1. Resumen de la Migración

La migración tiene como objetivo reemplazar el flujo actual (Vanilla JS con manipulación directa del DOM en cliente, y CommonJS con tipos implícitos en servidor) por un stack moderno, seguro y estructurado:

* **Backend**: Express + Javascript (CommonJS) ➔ Express + TypeScript (ESModules) con tipado seguro en peticiones, base de datos y JWT.
* **Frontend**: HTML/CSS/JS Vanilla ➔ React + TypeScript (TSX) + Vite para un empaquetado de alta velocidad y componentes interactivos modulares.

---

## 🗺️ 2. Fases de Ejecución Paso a Paso

Para evitar interrumpir la funcionalidad en producción, la migración se ejecutará en 3 etapas incrementales:

### Etapa 1: Servidor en TypeScript
1. **Configuración de Herramientas**:
   * Instalar `typescript`, `@types/express`, `@types/node`, `@types/pg`, `ts-node-dev` en `/server`.
   * Crear el archivo `server/tsconfig.json` con tipado estricto habilitado (`strict: true`).
2. **Reorganización**:
   * Mover el código actual a `/server/src/`.
   * Cambiar extensiones de archivos a `.ts` y migrar la sintaxis de `require` a `import/export` (ESModules).
3. **Tipado Estricto de Entidades**:
   * Crear interfaces para la base de datos: `User`, `Board`, `Job`, `JobHistory`, `BusinessConnection`, `FileAttachment`.
   * Extender la interfaz `Request` de Express para soportar las propiedades agregadas por el middleware de sesión (`req.userId`, `req.email`).

### Etapa 2: Configuración del Frontend con Vite
1. **Estructura del Proyecto**:
   * Unificar el `package.json` de la raíz del proyecto para gestionar las dependencias del frontend.
   * Instalar `vite`, `typescript`, `@types/react`, y `@types/react-dom`.
   * Crear un archivo de configuración de TypeScript para el cliente: `tsconfig.json` en la raíz.
2. **Vite Proxy**:
   * Configurar `vite.config.ts` para redireccionar las llamadas `/api/*` al servidor Node.js en desarrollo (puerto 3000).
3. **Punto de Entrada**:
   * Mover los archivos de `public/` a `/src` en el frontend, renombrando los archivos `.js` a `.ts`.
   * Usar Vite para servir la aplicación Vanilla JS con compilación rápida en tiempo de desarrollo.

### Etapa 3: Refactorización Completa de Vistas a React (TSX)
1. **Instalación de Librerías Core**:
   * Instalar `react`, `react-dom`, y `@tanstack/react-query` (para gestión eficiente de peticiones y caché de API).
2. **Estructura de Componentes**:
   * Crear un punto de entrada React (`main.tsx`) que monte el componente principal `<App />`.
   * **Layout general**: `<Sidebar />`, `<Header />`, y contenedor principal reactivo.
   * **Dashboard**: `<DashboardSummary />` con gráficos de avance y estadísticas.
   * **Tablero Kanban**: `<KanbanBoard />` compuesto por columnas (`<Column />`) y tarjetas (`<JobCard />`), usando drag-and-drop nativo o librerías seguras como `@hello-pangea/dnd`.
   * **Business Connections**: `<BusinessBoard />` con columnas para gestionar contactos profesionales.
   * **Panel de Detalle**: `<DetailPanel />` para ver y editar registros y subir archivos de forma asíncrona.
   * **Documentación**: `<DocsPage />` que conserve el buscador interactivo y el visor de API en tiempo real.

---

## 🧪 3. Diseño de Pruebas de Regresión y Validación

Para asegurar que la funcionalidad actual se mantiene idéntica durante todo el proceso, se propone el siguiente diseño de pruebas multinivel (Unitarias, Integración, Componentes y E2E):

```
       ▲  ┌──────────────────────────────┐
      ╱█  │     Pruebas E2E (Playwright)  │ <-- Caja negra: Valida flujos completos de usuario
     ╱██  ├──────────────────────────────┤
    ╱███  │  Pruebas de Componente (RTL) │ <-- Valida la lógica aislada de React (UI)
   ╱████  ├──────────────────────────────┤
  ╱█████  │ Pruebas de API (Supertest)   │ <-- Valida rutas, respuestas y código de estado
 ╱██████  ├──────────────────────────────┤
/███████  │   Pruebas Unitarias (Jest)   │ <-- Valida la lógica de negocio del backend
----------└──────────────────────────────┘
```

### 3.1. Pruebas de API Backend (Supertest + Jest)
Se migrarán las pruebas unitarias y de integración de backend a TypeScript. Estas validarán:
* **Autenticación**: Registro de usuario, inicio de sesión (emisión de JWT), y validación de tokens en rutas protegidas.
* **CRUD de Tableros**: Creación de tableros, listado de tableros por usuario, edición de nombres, y eliminación (validando que las vacantes asociadas se eliminen en cascada o queden huérfanas controladas).
* **CRUD de Vacantes y Conexiones**: Inserción de campos requeridos, cambio de estados en el flujo Kanban, registro automático en el historial de transiciones, y transformación exitosa de un empleo a un contacto de negocio.
* **Archivos Adjuntos**: Envío de archivos binarios en el backend y persistencia correcta en disco y DB.

### 3.2. Pruebas de Componentes Frontend (React Testing Library + Vitest)
Para garantizar la robustez individual de cada componente de React:
* **`<Sidebar />`**: Validar que renderice la lista de tableros del usuario y marque el tablero seleccionado actualmente como activo.
* **`<KanbanBoard />`**: Simular el arrastre de una tarjeta entre columnas y verificar que se dispare la llamada a la API para actualizar el estado del empleo.
* **`<DetailPanel />`**: Validar el envío de formularios, formateo de fechas y renderizado dinámico de archivos adjuntos.
* **`<DocsPage />`**: Probar el buscador en tiempo real ingresando palabras clave y verificando que filtre las rutas de la API en la interfaz.

### 3.3. Pruebas End-to-End (Playwright)
Esta es la capa más importante para garantizar la retrocompatibilidad:
1. **Mantener la Suite de Pruebas Existente**:
   * La prueba actual `tests/boards-ui.spec.js` valida que la creación de tableros y vacantes esté aislada. **Esta prueba no se modificará**. Su ejecución exitosa contra el nuevo frontend de React será la validación definitiva de que no existen regresiones funcionales en la interfaz.
2. **Nuevos Escenarios E2E a Implementar**:
   * **Flujo de Archivos**: Iniciar sesión, entrar al detalle de una vacante, subir un PDF, recargar la página y verificar que el archivo siga visible y descargable.
   * **Flujo de Transformación**: Crear una vacante, moverla a oferta, transformarla en contacto de negocio y verificar que aparezca en el Business Board y que la vacante original quede bloqueada.

---

## 🚀 4. Criterios de Aceptación para Producción

Un paso de producción o combinación a `main` requiere cumplir estrictamente con los siguientes requisitos:
1. **Compilación sin errores**: El backend y frontend en TypeScript deben compilar al 100% sin advertencias de tipo `any` implícitos.
2. **Cobertura de Pruebas del Backend**: Mantener al menos el **80% de cobertura** en los controladores clave de la API.
3. **Pruebas E2E exitosas**: Todas las pruebas de Playwright (existentes y nuevas) deben ejecutarse en modo *headless* sin fallos.
4. **Validación de Performance**: El build de producción de Vite debe pesar menos de 1.5MB sin compresión gzip.
