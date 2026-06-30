import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/styles.css';
import '../../styles/docs.css';


const DocsPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'user' | 'agent'>('user');
  const [activeSection, setActiveSection] = useState<string>('quickstart');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText.trim()).then(() => {
      setCopiedIndex(index);
      setTimeout(() => {
        setCopiedIndex(null);
      }, 2000);
    });
  };

  const handleNavClick = (sectionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection(sectionId);
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTabChange = (mode: 'user' | 'agent') => {
    setActiveMode(mode);
    if (mode === 'user') {
      setActiveSection('quickstart');
    } else {
      setActiveSection('agent-intro');
    }
  };

  // Nav links definitions
  const userNavLinks = [
    { id: 'quickstart', label: 'Primeros Pasos' },
    { id: 'boards', label: 'Separación de Tableros' },
    { id: 'kanban', label: 'Job Board Kanban' },
    { id: 'business', label: 'Business Board' },
    { id: 'transform', label: 'Transformación de Vacante' },
    { id: 'files', label: 'Gestión de Archivos' },
  ];

  const agentNavLinks = [
    { id: 'agent-intro', label: 'Integración de Agentes' },
    { id: 'agent-auth', label: 'Flujo de Autenticación' },
    { id: 'agent-boards', label: 'API de Tableros' },
    { id: 'agent-jobs', label: 'API de Vacantes' },
    { id: 'agent-biz', label: 'API de Business Board' },
    { id: 'agent-dash', label: 'API de Dashboard' },
  ];

  const currentNavLinks = activeMode === 'user' ? userNavLinks : agentNavLinks;

  // Filter links by search query
  const filteredNavLinks = currentNavLinks.filter((link) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesLabel = link.label.toLowerCase().includes(query);

    // Also match if section text matches query
    const sectionElement = document.getElementById(link.id);
    const matchesContent = sectionElement?.textContent?.toLowerCase().includes(query) ?? false;

    return matchesLabel || matchesContent;
  });

  return (
    <div className="app-container">
      {/* Documentation Sidebar */}
      <aside className="docs-sidebar">
        <div className="sidebar-header">
          <span className="logo-icon">🚀</span>
          <span className="logo-text">Docs & APIs</span>
        </div>

        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            id="docsSearch"
            placeholder="Buscar funcionalidad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sidebar Nav */}
        <div className="docs-nav" id={activeMode === 'user' ? 'sidebarUserNav' : 'sidebarAgentNav'}>
          <div>
            <div className="nav-section-title">
              {activeMode === 'user' ? 'Manual de Usuario' : 'Guía de Agentes'}
            </div>
            {filteredNavLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`nav-link ${activeSection === link.id ? 'active' : ''}`}
                onClick={(e) => handleNavClick(link.id, e)}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content Panel */}
      <main className="docs-content">
        <div className="tabs-header">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${activeMode === 'user' ? 'active' : ''}`}
              id="tabUserBtn"
              onClick={() => handleTabChange('user')}
            >
              👤 Guía de Usuario
            </button>
            <button
              className={`mode-tab ${activeMode === 'agent' ? 'active' : ''}`}
              id="tabAgentBtn"
              onClick={() => handleTabChange('agent')}
            >
              🤖 Guía de Agentes (API)
            </button>
          </div>
          <a href="index.html" className="back-link">
            Volver a la App ➔
          </a>
        </div>

        {/* User Docs Container */}
        {activeMode === 'user' && (
          <div className="user-docs-container">
            {/* Section: Quickstart */}
            <section
              id="quickstart"
              className={`doc-section ${activeSection === 'quickstart' ? 'active' : ''}`}
            >
              <h1>Documentación del Producto</h1>
              <p>
                Bienvenido al <strong>Career Tracker & Network Board</strong>. Esta aplicación está
                diseñada como una herramienta unificada para gestionar de forma activa tu proceso
                de búsqueda de empleo y el cultivo de relaciones profesionales clave (inversionistas,
                VCs, aceleradoras o contactos de negocio).
              </p>

              <div className="diagram-container">
                <svg
                  className="arch-diagram"
                  width="600"
                  height="200"
                  viewBox="0 0 600 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="10"
                    y="50"
                    width="120"
                    height="60"
                    rx="8"
                    fill="#4F46E5"
                    fillOpacity="0.2"
                    stroke="#818CF8"
                    strokeWidth="2"
                  />
                  <text
                    x="70"
                    y="85"
                    fill="#0F172A"
                    fontFamily="Plus Jakarta Sans"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Navegador
                  </text>

                  <path d="M130 80 H210" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
                  <polygon points="210,80 200,75 200,85" fill="#94A3B8" />

                  <rect
                    x="220"
                    y="50"
                    width="140"
                    height="60"
                    rx="8"
                    fill="#A855F7"
                    fillOpacity="0.2"
                    stroke="#C084FC"
                    strokeWidth="2"
                  />
                  <text
                    x="290"
                    y="78"
                    fill="#0F172A"
                    fontFamily="Plus Jakarta Sans"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Nginx Proxy
                  </text>
                  <text
                    x="290"
                    y="98"
                    fill="#94A3B8"
                    fontFamily="Plus Jakarta Sans"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    y Node.js API
                  </text>

                  <path d="M360 80 H440" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" />
                  <polygon points="440,80 430,75 430,85" fill="#94A3B8" />

                  <rect
                    x="450"
                    y="50"
                    width="140"
                    height="60"
                    rx="8"
                    fill="#10B981"
                    fillOpacity="0.2"
                    stroke="#34D399"
                    strokeWidth="2"
                  />
                  <text
                    x="520"
                    y="78"
                    fill="#0F172A"
                    fontFamily="Plus Jakarta Sans"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Base de Datos
                  </text>
                  <text
                    x="520"
                    y="98"
                    fill="#94A3B8"
                    fontFamily="Plus Jakarta Sans"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    PostgreSQL
                  </text>
                </svg>
              </div>

              <h2>Módulos Principales</h2>
              <div className="feature-grid">
                <div className="feature-card">
                  <span className="feature-icon">📋</span>
                  <h3>Multi-tableros</h3>
                  <p>
                    Crea instancias independientes de tableros. Separa procesos por semestres, años,
                    o tipos de roles de manera aislada.
                  </p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">💼</span>
                  <h3>Job Board (Kanban)</h3>
                  <p>
                    Arrastra tus aplicaciones de empleo a través de columnas de estado desde
                    "Interesado" hasta "Archivado".
                  </p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon">🤝</span>
                  <h3>Business Board</h3>
                  <p>
                    Organiza relaciones de red como inversionistas y aceleradoras usando estados y
                    procesos optimizados.
                  </p>
                </div>
              </div>
            </section>

            {/* Section: Boards */}
            <section
              id="boards"
              className={`doc-section ${activeSection === 'boards' ? 'active' : ''}`}
            >
              <h1>Separación de Tableros</h1>
              <p>
                El sistema soporta múltiples instancias de tableros, lo que te permite archivar e
                independizar diferentes búsquedas de trabajo (por ejemplo, "Búsqueda Q1 2026", "Roles
                Tech", etc.) de la misma forma en que ChatGPT maneja su historial de conversaciones.
              </p>

              <h3>Funcionalidades clave:</h3>
              <ul>
                <li>
                  <strong>Creación Interactiva</strong>: Usa el botón "+ Nuevo Tablero" en la barra
                  lateral para crear un tablero limpio.
                </li>
                <li>
                  <strong>Renombrar Tableros</strong>: Al pasar el cursor sobre cualquier tablero en el
                  menú lateral, haz clic en el icono ✏️ para renombrarlo al instante.
                </li>
                <li>
                  <strong>Eliminación Segura</strong>: Haz clic en el icono 🗑️ para eliminar un tablero
                  obsoleto. El sistema protege tu cuenta impidiendo que elimines tu único tablero activo
                  y solicita confirmación expresa para evitar pérdidas de datos.
                </li>
                <li>
                  <strong>Contador de Vacantes</strong>: Cada item del submenú lateral muestra el total de
                  aplicaciones vigentes en ese tablero.
                </li>
              </ul>

              <div className="alert alert-info">
                El sistema guarda tu preferencia de tablero activo en el almacenamiento local del
                navegador (<code>localStorage</code>), de manera que al recargar la app continuarás
                exactamente donde la dejaste.
              </div>
            </section>

            {/* Section: Kanban */}
            <section
              id="kanban"
              className={`doc-section ${activeSection === 'kanban' ? 'active' : ''}`}
            >
              <h1>Job Board Kanban</h1>
              <p>
                El Job Board es un tablero visual con 8 columnas que representan el ciclo de vida
                completo de un proceso de reclutamiento:
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Columna</th>
                    <th>Significado / Uso</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Interesado</strong>
                    </td>
                    <td>Vacantes que has visto pero en las que aún no te postulas.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Postulado (Applied)</strong>
                    </td>
                    <td>Hiciste la aplicación formal (enviaste CV/Portafolio).</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Olvidado</strong>
                    </td>
                    <td>Postulaciones antiguas sin respuesta tras varias semanas.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Entrevista</strong>
                    </td>
                    <td>Procesos activos con videollamadas o pruebas técnicas.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Pendiente Siguiente Paso</strong>
                    </td>
                    <td>Hiciste entrevistas y esperas respuesta directa o feedback.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Oferta</strong>
                    </td>
                    <td>¡Éxito! Recibiste propuesta formal de contrato.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Rechazado</strong>
                    </td>
                    <td>El proceso finalizó sin oferta por decisión de la empresa.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Archivado</strong>
                    </td>
                    <td>
                      Histórico de procesos que deseas sacar del tablero de control visual.
                    </td>
                  </tr>
                </tbody>
              </table>

              <h3>Modo Enfoque (Focus Mode 🎯)</h3>
              <p>
                Al hacer clic en el icono de Diana/Blanco (🎯) en la cabecera, se activa el modo enfoque.
                Esto colapsa el menú lateral izquierdo para dar el 100% del ancho de pantalla al
                tablero Kanban, facilitando la navegación cómoda en ordenadores portátiles o pantallas
                más pequeñas.
              </p>
            </section>

            {/* Section: Business */}
            <section
              id="business"
              className={`doc-section ${activeSection === 'business' ? 'active' : ''}`}
            >
              <h1>Business Board (Mesa de Negocios)</h1>
              <p>
                A diferencia de las ofertas de empleo tradicionales, el <strong>Business Board</strong>{' '}
                te permite gestionar contactos comerciales, socios de inversión o aceleradoras. El
                tablero cuenta con estados adaptados para negocios:
              </p>
              <ul>
                <li>
                  <strong>Investigando (Researching)</strong>: Listado de posibles aceleradoras o VCs de
                  interés.
                </li>
                <li>
                  <strong>Contactado</strong>: Mensajes enviados (outreach) a través de LinkedIn, correo
                  o plataformas.
                </li>
                <li>
                  <strong>Reunión (Meeting)</strong>: Primera o sucesivas llamadas de alineación o
                  pitch.
                </li>
                <li>
                  <strong>Negociación</strong>: Discusión activa de términos (Term Sheets, valuación,
                  contratos).
                </li>
                <li>
                  <strong>Firmado (Signed)</strong>: ¡Relación formalizada!
                </li>
              </ul>
            </section>

            {/* Section: Transform */}
            <section
              id="transform"
              className={`doc-section ${activeSection === 'transform' ? 'active' : ''}`}
            >
              <h1>Transformación de Vacante a Conexión</h1>
              <p>
                Uno de los flujos más potentes de la plataforma es la <strong>Transformación</strong>.
                Si entraste en un proceso con una empresa como vacante de empleo, pero el proceso
                finalizó o derivó en una relación comercial o de asesoría, puedes transformar esa
                vacante en una Conexión de Negocio:
              </p>

              <div className="alert alert-warning">
                <strong>Efectos del proceso de transformación:</strong>
                <ol>
                  <li>La vacante original se archiva automáticamente en el Job Board.</li>
                  <li>
                    La vacante queda bloqueada (bloqueo visual tipo "Ghost" y desactivación de edición) con un candado (🔒) que previene modificaciones accidentales pero permite auditar el historial.
                  </li>
                  <li>
                    Se crea un nuevo registro en el Business Board con toda la información (Compañía, Contacto, Notas).
                  </li>
                  <li>
                    Todos los archivos adjuntos de la vacante (como CVs o cartas de presentación) se copian automáticamente a la nueva entidad comercial.
                  </li>
                </ol>
              </div>
            </section>

            {/* Section: Files */}
            <section
              id="files"
              className={`doc-section ${activeSection === 'files' ? 'active' : ''}`}
            >
              <h1>Gestión de Archivos</h1>
              <p>
                La aplicación te permite adjuntar documentos individuales (PDF, imágenes, hojas de
                vida) a cada tarjeta en el panel de detalles. Los archivos se suben al servidor
                mediante una cola asíncrona robusta.
              </p>

              <h3>Compatibilidad Avanzada de Navegadores:</h3>
              <ul>
                <li>
                  <strong>Safari</strong>: Para evitar bloqueos de seguridad del motor WebKit al
                  descargar archivos mediante enlaces JS, implementamos navegación en la misma pestaña
                  con la cabecera HTTP <code>Content-Disposition: attachment</code>.
                </li>
                <li>
                  <strong>Chrome / Firefox</strong>: Soportan descargas directas respetando nombres
                  personalizados mediante el atributo <code>download</code> de HTML5.
                </li>
              </ul>
            </section>
          </div>
        )}

        {/* Agent Docs Container */}
        {activeMode === 'agent' && (
          <div className="agent-docs-container">
            {/* Section: Agent Intro */}
            <section
              id="agent-intro"
              className={`doc-section ${activeSection === 'agent-intro' ? 'active' : ''}`}
            >
              <h1>Integración de Agentes de IA</h1>
              <p>
                Esta sección está específicamente estructurada para ser analizada e interpretada por{' '}
                <strong>Agentes Autónomos de IA</strong> (como Antigravity, Claude Code, etc.) que
                requieran interactuar programáticamente con esta aplicación.
              </p>
              <p>
                La API de backend se comunica a través de respuestas en formato <strong>JSON</strong>{' '}
                estándar. Todas las rutas, exceptuando el registro y el inicio de sesión, requieren la
                cabecera <code>Authorization: Bearer &lt;token&gt;</code> para proteger la información
                de cada usuario (Aislamiento de Datos).
              </p>
            </section>

            {/* Section: Agent Auth */}
            <section
              id="agent-auth"
              className={`doc-section ${activeSection === 'agent-auth' ? 'active' : ''}`}
            >
              <h1>Flujo de Autenticación</h1>
              <p>
                Para realizar peticiones, el agente debe registrarse o iniciar sesión para obtener el
                JSON Web Token (JWT).
              </p>

              <h3>1. Login de Agente</h3>
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>POST /api/auth/login</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(
                        `{\n  "email": "pachocamacho@gmail.com",\n  "password": "mi_password_seguro"\n}`,
                        1
                      )
                    }
                  >
                    {copiedIndex === 1 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Solicitud (Headers: Content-Type: application/json)
{
  "email": "pachocamacho@gmail.com",
  "password": "mi_password_seguro"
}

// Respuesta Exitosa (200 OK)
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "pachocamacho@gmail.com"
  }
}`}
                  </code>
                </pre>
              </div>

              <div className="alert alert-info">
                El token devuelto expira automáticamente en <strong>7 días</strong>. Los agentes deben
                almacenar este token y enviar la cabecera correspondiente en solicitudes subsiguientes.
              </div>
            </section>

            {/* Section: Agent Boards */}
            <section
              id="agent-boards"
              className={`doc-section ${activeSection === 'agent-boards' ? 'active' : ''}`}
            >
              <h1>API de Tableros (Boards)</h1>
              <p>Permite crear e interactuar con las instancias de tableros del usuario.</p>

              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Endpoint</th>
                    <th>Cuerpo / Parámetros</th>
                    <th>Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>GET</code>
                    </td>
                    <td>
                      <code>/api/boards</code>
                    </td>
                    <td>Ninguno</td>
                    <td>Retorna arreglo de tableros con <code>jobCount</code> de cada uno.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>POST</code>
                    </td>
                    <td>
                      <code>/api/boards</code>
                    </td>
                    <td>
                      <code>{`{ "name": "Búsqueda Q2" }`}</code>
                    </td>
                    <td>Objeto de tablero creado con su <code>id</code>.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>PUT</code>
                    </td>
                    <td>
                      <code>/api/boards/:id</code>
                    </td>
                    <td>
                      <code>{`{ "name": "Nuevo Nombre" }`}</code>
                    </td>
                    <td>Objeto de tablero modificado.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>DELETE</code>
                    </td>
                    <td>
                      <code>/api/boards/:id</code>
                    </td>
                    <td>ID en URL</td>
                    <td>Confirmación de eliminación (No válido si es el último).</td>
                  </tr>
                </tbody>
              </table>

              <h3>Ejemplo de Creación de Tablero</h3>
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>POST /api/boards</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(`{\n  "name": "Especialistas Tech 2026"\n}`, 2)
                    }
                  >
                    {copiedIndex === 2 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Headers
// Authorization: Bearer <token>
// Content-Type: application/json

// Body
{
  "name": "Especialistas Tech 2026"
}

// Response (201 Created)
{
  "id": 4,
  "name": "Especialistas Tech 2026",
  "createdAt": "2026-06-26T21:00:00.000Z",
  "updatedAt": "2026-06-26T21:00:00.000Z"
}`}
                  </code>
                </pre>
              </div>
            </section>

            {/* Section: Agent Jobs */}
            <section
              id="agent-jobs"
              className={`doc-section ${activeSection === 'agent-jobs' ? 'active' : ''}`}
            >
              <h1>API de Vacantes (Jobs)</h1>
              <p>
                Permite manipular las vacantes del tablero activo. Las peticiones de listado y creación
                deben incluir el <code>boardId</code> para asegurar la segmentación.
              </p>

              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>GET /api/jobs?boardId=1</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(
                        `[\n  {\n    "id": 105,\n    "boardId": 1,\n    "type": "job",\n    "company": "Google",\n    "position": "Software Engineer",\n    "status": "applied",\n    "rating": 5,\n    "origin": "human",\n    "comments": "Primer contacto por recruiter.",\n    "created_at": "2026-06-26T21:10:00.000Z"\n  }\n]`,
                        3
                      )
                    }
                  >
                    {copiedIndex === 3 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Response (200 OK)
[
  {
    "id": 105,
    "boardId": 1,
    "type": "job",
    "company": "Google",
    "position": "Software Engineer",
    "status": "applied",
    "rating": 5,
    "origin": "human",
    "comments": "Primer contacto por recruiter.",
    "created_at": "2026-06-26T21:10:00.000Z"
  }
]`}
                  </code>
                </pre>
              </div>

              <h3>Parámetros de Creación de Tarjetas (<code>POST /api/jobs</code>)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Campo</th>
                    <th>Tipo</th>
                    <th>Descripción / Requerido</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>boardId</code>
                    </td>
                    <td>Integer</td>
                    <td>
                      <strong>Requerido</strong>. ID del tablero donde irá la vacante.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>type</code>
                    </td>
                    <td>String</td>
                    <td>
                      <code>'job'</code> (Vacante de empleo) o <code>'connection'</code> (Contacto de
                      networking).
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>company</code>
                    </td>
                    <td>String</td>
                    <td>Nombre de la empresa.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>position</code>
                    </td>
                    <td>String</td>
                    <td>Título del cargo a postular.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>status</code>
                    </td>
                    <td>String</td>
                    <td>
                      <strong>Requerido</strong>. Uno de: <code>interested</code>,{' '}
                      <code>applied</code>, <code>forgotten</code>, <code>interview</code>,{' '}
                      <code>pending</code>, <code>offer</code>, <code>rejected</code>,{' '}
                      <code>archived</code>.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>rating</code>
                    </td>
                    <td>Integer</td>
                    <td>Prioridad de 1 a 5 (Estrellas). Defectos: 3.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>origin</code>
                    </td>
                    <td>String</td>
                    <td>
                      <code>'human'</code> o <code>'agent'</code>. Si es creado por agentes de IA, se
                      activa el brillo de notificación visual.
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Section: Agent Biz */}
            <section
              id="agent-biz"
              className={`doc-section ${activeSection === 'agent-biz' ? 'active' : ''}`}
            >
              <h1>API de Business Board</h1>
              <p>
                Gestión de entidades comerciales (no segmentados por tablero Kanban ordinario):
              </p>
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>POST /api/business</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(
                        `{\n  "name": "Y Combinator",\n  "type": "accelerator",\n  "status": "researching",\n  "contact_person": "Garry Tan",\n  "email": "garry@yc.com",\n  "website": "https://ycombinator.com",\n  "location": "Mountain View, CA",\n  "notes": "Postular en lote S26."\n}`,
                        4
                      )
                    }
                  >
                    {copiedIndex === 4 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Headers
// Authorization: Bearer <token>
// Content-Type: application/json

// Body
{
  "name": "Y Combinator",
  "type": "accelerator",
  "status": "researching",
  "contact_person": "Garry Tan",
  "email": "garry@yc.com",
  "website": "https://ycombinator.com",
  "location": "Mountain View, CA",
  "notes": "Postular en lote S26."
}`}
                  </code>
                </pre>
              </div>
            </section>

            {/* Section: Agent Dash */}
            <section
              id="agent-dash"
              className={`doc-section ${activeSection === 'agent-dash' ? 'active' : ''}`}
            >
              <h1>API de Dashboard</h1>
              <p>Obtención de métricas agregadas del tablero de control principal:</p>
              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>GET /api/dashboard/summary?boardId=1</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(
                        `// Response (200 OK)\n{\n  "interviews": [\n    {\n      "id": 42,\n      "company": "Stripe",\n      "position": "Backend Developer",\n      "status": "interview",\n      "updated_at": "2026-06-26T16:00:00.000Z"\n    }\n  ],\n  "newMatches": []\n}`,
                        5
                      )
                    }
                  >
                    {copiedIndex === 5 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Response (200 OK)
{
  "interviews": [
    {
      "id": 42,
      "company": "Stripe",
      "position": "Backend Developer",
      "status": "interview",
      "updated_at": "2026-06-26T16:00:00.000Z"
    }
  ],
  "newMatches": []
}`}
                  </code>
                </pre>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<DocsPage />);
}
