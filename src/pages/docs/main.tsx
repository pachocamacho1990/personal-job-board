import React, { useState } from 'react';
import { navigateTo } from '../../router';
import '../../styles/styles.css';
import '../../styles/docs.css';
import { RocketIcon, SearchIcon, ProfileIcon, BrainIcon, ClipboardIcon, JobBoardIcon, HandshakeIcon, ContrastIcon } from '../../components/icons';


export const DocsPage: React.FC = () => {
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
    { id: 'transform', label: 'Transformación de Vacante' },
    { id: 'files', label: 'Gestión de Archivos' },
    { id: 'theming', label: 'Temas y Apariencia' },
  ];

  const agentNavLinks = [
    { id: 'agent-intro', label: 'Integración de Agentes' },
    { id: 'agent-auth', label: 'Flujo de Autenticación' },
    { id: 'agent-boards', label: 'API de Tableros' },
    { id: 'agent-jobs', label: 'API de Vacantes' },
    { id: 'agent-dash', label: 'API de Dashboard' },
    { id: 'agent-tools', label: 'Herramientas de Zenith' },
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
    <div className="docs-app-container">
      {/* Documentation Sidebar */}
      <aside className="docs-sidebar">
        <div className="sidebar-header">
          <span className="logo-icon inline-icon" ><RocketIcon size={20} /></span>
          <span className="logo-text">Docs & APIs</span>
        </div>

        <div className="search-box">
          <span className="search-icon inline-icon" ><SearchIcon size={14} /></span>
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
              <span className="inline-icon-label"><ProfileIcon size={14} /> Guía de Usuario</span>
            </button>
            <button
              className={`mode-tab ${activeMode === 'agent' ? 'active' : ''}`}
              id="tabAgentBtn"
              onClick={() => handleTabChange('agent')}
            >
              <span className="inline-icon-label"><BrainIcon size={14} /> Guía de Agentes (API)</span>
            </button>
          </div>
          <a
            href="/jobboard/index.html"
            className="back-link"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/index.html');
            }}
          >
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
                    fill="var(--cds-status-applied-surface)"
                    fillOpacity="0.2"
                    stroke="var(--cds-status-applied)"
                    strokeWidth="2"
                  />
                  <text
                    x="70"
                    y="85"
                    fill="var(--cds-text-primary)"
                    fontFamily="var(--cds-font-sans)"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Navegador
                  </text>

                  <path d="M130 80 H210" stroke="var(--cds-border-strong-01)" strokeWidth="2" strokeDasharray="4 4" />
                  <polygon points="210,80 200,75 200,85" fill="var(--cds-border-strong-01)" />

                  <rect
                    x="220"
                    y="50"
                    width="140"
                    height="60"
                    rx="8"
                    fill="var(--cds-status-interested-surface)"
                    fillOpacity="0.2"
                    stroke="var(--cds-status-interested)"
                    strokeWidth="2"
                  />
                  <text
                    x="290"
                    y="78"
                    fill="var(--cds-text-primary)"
                    fontFamily="var(--cds-font-sans)"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Nginx Proxy
                  </text>
                  <text
                    x="290"
                    y="98"
                    fill="var(--cds-text-secondary)"
                    fontFamily="var(--cds-font-sans)"
                    fontSize="11"
                    textAnchor="middle"
                  >
                    y Node.js API
                  </text>

                  <path d="M360 80 H440" stroke="var(--cds-border-strong-01)" strokeWidth="2" strokeDasharray="4 4" />
                  <polygon points="440,80 430,75 430,85" fill="var(--cds-border-strong-01)" />

                  <rect
                    x="450"
                    y="50"
                    width="140"
                    height="60"
                    rx="8"
                    fill="var(--cds-status-offer-surface)"
                    fillOpacity="0.2"
                    stroke="var(--cds-status-offer)"
                    strokeWidth="2"
                  />
                  <text
                    x="520"
                    y="78"
                    fill="var(--cds-text-primary)"
                    fontFamily="var(--cds-font-sans)"
                    fontSize="14"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    Base de Datos
                  </text>
                  <text
                    x="520"
                    y="98"
                    fill="var(--cds-text-secondary)"
                    fontFamily="var(--cds-font-sans)"
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
                  <span className="feature-icon inline-icon-center" ><ClipboardIcon size={24} /></span>
                  <h3>Multi-tableros</h3>
                  <p>
                    Crea instancias independientes de tableros. Separa procesos por semestres, años,
                    o tipos de roles de manera aislada.
                  </p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon inline-icon-center" ><JobBoardIcon size={24} /></span>
                  <h3>Job Board (Kanban)</h3>
                  <p>
                    Arrastra tus aplicaciones de empleo a través de columnas de estado desde
                    "Interesado" hasta "Archivado".
                  </p>
                </div>
                <div className="feature-card">
                  <span className="feature-icon inline-icon-center" ><HandshakeIcon size={24} /></span>
                  <h3>Perfil profesional</h3>
                  <p>
                    Experiencia, competencias e idiomas. Es lo que lee Zenith para buscar
                    vacantes y redactar tus cartas de presentación.
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
                  menú lateral, haz clic en el icono de lápiz para renombrarlo al instante.
                </li>
                <li>
                  <strong>Eliminación Segura</strong>: Haz clic en el icono de papelera para eliminar un tablero
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
                    Se crea una <strong>oportunidad en Cassimir Management Center</strong> con toda la información (organización, contacto, notas). Es otra aplicación: si no está levantada, la operación devuelve 503 y la vacante queda intacta.
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

            {/* Section: Theming */}
            <section
              id="theming"
              className={`doc-section ${activeSection === 'theming' ? 'active' : ''}`}
            >
              <h1>Temas y Apariencia</h1>
              <p>
                Toda la interfaz está construida sobre el <strong>IBM Carbon Design System</strong>{' '}
                y se distribuye en dos temas oficiales. No son dos hojas de estilo distintas: es el
                mismo conjunto de tokens semánticos resuelto con dos paletas, de modo que cualquier
                pantalla (tableros, paneles de detalle, consola del agente o esta misma
                documentación) responde al cambio de forma simultánea.
              </p>

              <table>
                <thead>
                  <tr>
                    <th>Tema</th>
                    <th>Identificador de Carbon</th>
                    <th>Uso recomendado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Claro</strong>
                    </td>
                    <td>
                      <code>g10</code>
                    </td>
                    <td>Entornos con luz ambiental alta; es el tema por defecto.</td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Oscuro</strong>
                    </td>
                    <td>
                      <code>g100</code>
                    </td>
                    <td>Sesiones largas o de noche; reduce la fatiga visual.</td>
                  </tr>
                </tbody>
              </table>

              <h3>Cómo cambiar de tema</h3>
              <p>
                El control vive al pie de la barra lateral, justo encima de tu perfil de usuario.
                Es un botón de alternancia que muestra el tema activo:{' '}
                <span className="inline-icon-label">
                  <ContrastIcon size={14} /> Tema claro
                </span>{' '}
                o{' '}
                <span className="inline-icon-label">
                  <ContrastIcon size={14} /> Tema oscuro
                </span>
                . Un solo clic conmuta entre ambos y el cambio se aplica de inmediato, sin recargar
                la página.
              </p>

              <h3>Cómo se decide el tema inicial</h3>
              <ol>
                <li>
                  <strong>Tu elección previa manda</strong>: si alguna vez pulsaste el botón, esa
                  preferencia queda guardada en <code>localStorage</code> bajo la clave{' '}
                  <code>carbonTheme</code> y es la que se aplica al abrir la app.
                </li>
                <li>
                  <strong>Si nunca elegiste</strong>: la app sigue la preferencia del sistema
                  operativo mediante la media query <code>prefers-color-scheme</code>. Si tu equipo
                  está en modo oscuro, la primera visita arranca en <code>g100</code>.
                </li>
              </ol>

              <div className="alert alert-info">
                Una vez que eliges un tema de forma explícita, el sistema operativo deja de
                consultarse. Cambiar el portátil a modo oscuro no revertirá silenciosamente tu
                decisión; para volver a otro tema basta con pulsar de nuevo el botón de la barra
                lateral.
              </div>

              <h3>El lenguaje visual</h3>
              <p>
                Las superficies de la aplicación tienen esquinas redondeadas: 8px en contenedores
                (tarjetas, columnas, paneles) y 4px en controles (botones, campos). Son los mismos
                valores que Carbon usa en su propia librería de componentes.
              </p>
              <p>
                Los elementos responden al puntero de tres formas distintas según lo que sean. Una{' '}
                <strong>tarjeta</strong> se eleva ligeramente al pasar por encima y se hunde al
                pulsarla. Una <strong>fila de una lista</strong> solo cambia de fondo, porque
                levantar una fila de una pila se vería roto. Un <strong>botón</strong> cambia de
                color y baja un píxel al pulsarse. Todas las transiciones usan las duraciones y
                curvas de Carbon.
              </p>
              <p>
                Las columnas de los tableros <strong>no llevan relleno de color</strong>. El estado
                se identifica por la barra de acento sobre la cabecera, el título y el borde
                izquierdo de cada tarjeta. Es una decisión deliberada del modelo de capas de
                Carbon: las superficies van en gris y el color queda reservado para el acento.
              </p>

              <h3>Editar una tarjeta</h3>
              <p>
                Al pulsar una tarjeta se abre primero una vista de solo lectura con su
                historial. Desde ahí, <strong>Edit Details</strong> abre el formulario en un
                diálogo centrado, sobre el resto de la aplicación. Se cierra con{' '}
                <code>Esc</code> o pulsando fuera, y las acciones de guardar, archivar y
                borrar quedan siempre visibles al pie aunque el formulario sea largo.
              </p>

              <h3>Cómo se marca el contenido generado por IA</h3>
              <p>
                Las oportunidades que crea el agente Zenith llevan un{' '}
                <strong>halo azul</strong> que asciende desde el borde inferior de la tarjeta,
                más un borde del mismo tono. Las que aún no has abierto lo llevan algo más marcado.
                El mismo tratamiento aparece en el widget de coincidencias del panel de inicio, en
                los mensajes del propio agente, y en el panel de Zenith mientras está generando una
                respuesta.
              </p>
              <div className="alert alert-info">
                Ese halo es la extensión <strong>Carbon for AI</strong> de IBM y no es decorativo:
                marca exclusivamente contenido generado por inteligencia artificial. Si una tarjeta
                lo lleva, la escribió el agente; si no lo lleva, la escribiste tú.
              </div>
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

            {/* Section: Agent Tools */}
            <section
              id="agent-tools"
              className={`doc-section ${activeSection === 'agent-tools' ? 'active' : ''}`}
            >
              <h1>Herramientas del Agente Zenith</h1>
              <p>
                Además de la API REST descrita arriba, la plataforma incluye a{' '}
                <strong>Zenith</strong>, el agente conversacional propio. Zenith no consume la API a
                ciegas: dispone de un catálogo de herramientas declaradas que el modelo puede
                invocar durante la conversación, siempre en nombre del usuario autenticado y con su
                mismo token.
              </p>

              <h3>Catálogo de herramientas</h3>
              <table>
                <thead>
                  <tr>
                    <th>Herramienta</th>
                    <th>Qué hace</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>browse_url</code>
                    </td>
                    <td>
                      Abre una URL en un navegador integrado y devuelve su contenido legible.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>list_boards</code> / <code>create_board</code>
                    </td>
                    <td>Consulta los tableros del usuario (con su conteo) o crea uno nuevo.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>list_jobs</code> / <code>create_job_card</code>
                    </td>
                    <td>
                      Lista tarjetas de un tablero (filtrando por estado o texto) y crea vacantes
                      nuevas.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>update_job_status</code>
                    </td>
                    <td>Mueve una tarjeta entre columnas del Kanban.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>archive_job</code> / <code>delete_job</code>
                    </td>
                    <td>Archiva una tarjeta o la elimina de forma permanente.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>save_preference</code> / <code>delete_preference</code>
                    </td>
                    <td>
                      Memoria de largo plazo: guarda o retira criterios y hechos del usuario.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>save_skill</code>
                    </td>
                    <td>Registra una receta reutilizable para automatizar tareas repetitivas.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>save_career_strategy</code>
                    </td>
                    <td>
                      Persiste el ancla de carrera, los roles objetivo y el prompt de búsqueda
                      activa al cerrar la entrevista.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>navigate_to</code>
                    </td>
                    <td>Lleva la interfaz del usuario a una vista concreta de la aplicación.</td>
                  </tr>
                </tbody>
              </table>

              <h3>
                Navegación web: <code>browse_url</code>
              </h3>
              <p>
                Resuelve el caso de "pásale esta oferta al agente": en lugar de copiar y pegar la
                descripción a mano, basta con darle el enlace de la vacante para que extraiga los
                requisitos por su cuenta. Internamente levanta un Chromium headless de forma
                perezosa, abre un contexto aislado por petición, espera a que la red quede en reposo
                (para que las SPA alcancen a renderizar) y convierte el DOM resultante a markdown
                compacto, descartando antes el ruido estructural (<code>script</code>,{' '}
                <code>style</code>, <code>nav</code>, <code>footer</code>, <code>header</code>,{' '}
                <code>form</code>, <code>svg</code> e <code>iframe</code>).
              </p>

              <div className="code-block-wrapper">
                <div className="code-block-header">
                  <span>tool call: browse_url</span>
                  <button
                    className="copy-btn"
                    onClick={() =>
                      handleCopyCode(
                        `{\n  "name": "browse_url",\n  "arguments": {\n    "url": "https://ejemplo.com/vacante/backend-engineer"\n  }\n}`,
                        6
                      )
                    }
                  >
                    {copiedIndex === 6 ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <pre>
                  <code>
                    {`// Invocación
{
  "name": "browse_url",
  "arguments": {
    "url": "https://ejemplo.com/vacante/backend-engineer"
  }
}

// Resultado exitoso
{
  "success": true,
  "url": "https://ejemplo.com/vacante/backend-engineer",
  "title": "Backend Engineer - Ejemplo S.A.",
  "content": "# Backend Engineer\\n\\nBuscamos una persona con..."
}

// Resultado fallido
{
  "success": false,
  "error": "HTTP Error 404 when accessing https://ejemplo.com/vacante/backend-engineer."
}`}
                  </code>
                </pre>
              </div>

              <div className="alert alert-info">
                <strong>Límites operativos:</strong> la carga de la página caduca a los{' '}
                <strong>15 segundos</strong> y el contenido devuelto se trunca a{' '}
                <strong>15.000 caracteres</strong> para no desbordar la ventana de contexto del
                modelo. Si la lectura falla, la herramienta responde con{' '}
                <code>success: false</code> y un mensaje de error en lugar de interrumpir la
                conversación.
              </div>

              <div className="alert alert-warning">
                <code>browse_url</code> lee páginas públicas: no inicia sesión ni rellena
                formularios. Los portales que exigen autenticación o que bloquean el tráfico
                automatizado devolverán un error HTTP o una página vacía.
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
