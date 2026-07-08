import React, { useState, useEffect } from 'react';
import { api, apiRequest } from '../../api';
import { Sidebar } from '../../components/Sidebar';
import { navigateTo } from '../../router';
import '../../styles/styles.css';
import '../../styles/layout.css';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

interface DashboardSummary {
  interviews: any[];
  newMatches: any[];
}

interface CareerStrategy {
  dominant_anchor?: string;
  target_roles?: string[];
  salary_preferences?: {
    min?: number;
    target?: number;
    currency?: string;
  };
  work_mode?: {
    preference?: string;
  };
  geography?: {
    allowed?: string[];
  };
  exclusions?: {
    companies?: string[];
    industries?: string[];
  };
  strategy_summary?: string;
}

interface Memory {
  id: number;
  category: string;
  content: string;
  createdAt: string;
}

export const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'activity' | 'strategy' | 'search'>('activity');
  const [summary, setSummary] = useState<DashboardSummary>({ interviews: [], newMatches: [] });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  // Strategy & Memories states
  const [strategy, setStrategy] = useState<CareerStrategy>({});
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingStrategy, setLoadingStrategy] = useState<boolean>(false);

  // Active Search config states
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('');
  const [searchPrompt, setSearchPrompt] = useState<string>('');
  const [editedPrompt, setEditedPrompt] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigateTo('/jobboard/login.html');
      return;
    }

    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (userObj.email) {
          setUserEmail(userObj.email);
        }
      }
    } catch (e) {
      console.error('Error reading user', e);
    }

    loadDashboard();
    loadStrategyData();
  }, []);

  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      loadDashboard();
      loadStrategyData();
    };
    window.addEventListener('workspace-updated', handleWorkspaceUpdate);
    return () => {
      window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'strategy' || activeTab === 'search') {
      loadStrategyData();
    }
  }, [activeTab]);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const activeBoardId = localStorage.getItem('activeBoardId');
      const endpoint = activeBoardId 
        ? `/dashboard/summary?boardId=${activeBoardId}`
        : '/dashboard/summary';

      const data = await apiRequest<DashboardSummary>(endpoint);
      setSummary(data);
    } catch (err: any) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStrategyData = async () => {
    setLoadingStrategy(true);
    try {
      const profileData = await apiRequest<any>('/profile');
      setStrategy(profileData.career_strategy || {});
      setSearchPrompt(profileData.search_prompt || '');
      // Only set editedPrompt if it was empty, to prevent overwriting user edits in progress
      setEditedPrompt(prev => prev || profileData.search_prompt || '');

      const memoriesData = await apiRequest<Memory[]>('/profile/memories');
      setMemories(memoriesData || []);

      const boardsData = await apiRequest<any[]>('/boards');
      setBoards(boardsData || []);
      if (boardsData && boardsData.length > 0 && !selectedBoardId) {
        setSelectedBoardId(boardsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load strategy or memories data', err);
    } finally {
      setLoadingStrategy(false);
    }
  };

  const handleSavePrompt = async () => {
    try {
      setSaveSuccess('');
      await api.profile.updateSearchPrompt(editedPrompt);
      setSearchPrompt(editedPrompt);
      setSaveSuccess('¡Prompt de búsqueda guardado correctamente!');
      setTimeout(() => setSaveSuccess(''), 3000);
      
      // Notify other components (like Agent Console) to refresh
      window.dispatchEvent(new CustomEvent('workspace-updated'));
    } catch (err: any) {
      console.error('Failed to save search prompt', err);
      alert('Error al guardar el prompt de búsqueda: ' + (err.message || err));
    }
  };

  const handleCopyPrompt = () => {
    const finalPrompt = editedPrompt.replace('{board_id}', String(selectedBoardId || ''));
    navigator.clipboard.writeText(finalPrompt)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy prompt:', err);
        alert('No se pudo copiar el prompt.');
      });
  };

  const handleDeleteMemory = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta preferencia? Tu agente la olvidará de inmediato.')) {
      return;
    }
    try {
      await apiRequest<any>(`/profile/memories/${id}`, { method: 'DELETE' });
      setMemories((prev) => prev.filter((m) => m.id !== id));
      // Notify other components (like Agent Console) to refresh
      window.dispatchEvent(new CustomEvent('workspace-updated'));
    } catch (err) {
      console.error('Failed to delete memory', err);
      alert('Error al borrar la preferencia');
    }
  };

  const username = userEmail ? userEmail.split('@')[0] : 'User';
  const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1);

  // Schein Anchors scoring helper
  const dominant = strategy.dominant_anchor || '';
  const anchors = [
    { name: 'Estilo de Vida (Lifestyle)', key: 'Lifestyle', val: dominant === 'Lifestyle' ? 95 : 75, desc: 'Busca balance entre la vida personal y laboral.' },
    { name: 'Autonomía / Independencia', key: 'Autonomía', val: dominant === 'Autonomía' ? 95 : 70, desc: 'Desea definir su propio ritmo y dirección.' },
    { name: 'Competencia Técnico-Funcional', key: 'Technical/Functional', val: dominant === 'Technical/Functional' ? 95 : 65, desc: 'Enfocado en dominar habilidades específicas y profundas.' },
    { name: 'Desafío Puro', key: 'Pure Challenge', val: dominant === 'Pure Challenge' ? 95 : 60, desc: 'Busca resolver problemas complejos e intelectuales.' },
    { name: 'Creatividad Emprendedora', key: 'Entrepreneurial', val: dominant === 'Entrepreneurial' ? 95 : 45, desc: 'Motivado por crear nuevos productos o startups.' },
    { name: 'Seguridad / Estabilidad', key: 'Security/Stability', val: dominant === 'Security/Stability' ? 95 : 40, desc: 'Valora la estabilidad y permanencia laboral.' },
    { name: 'Servicio / Dedicación', key: 'Service/Dedication', val: dominant === 'Service/Dedication' ? 95 : 35, desc: 'Desea realizar trabajo con un fin ético o social.' },
    { name: 'Dirección General', key: 'General Managerial', val: dominant === 'General Managerial' ? 95 : 20, desc: 'Busca liderar equipos y coordinar funciones.' }
  ].sort((a, b) => b.val - a.val);

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar activePage="dashboard" />
      <div className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title" id="welcomeTitle" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Welcome back, {formattedUsername}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Here is what's happening with your Zenith Career Command Center.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`dashboard-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📊 Resumen de Actividad
          </button>
          <button 
            className={`dashboard-tab-btn ${activeTab === 'strategy' ? 'active' : ''}`}
            onClick={() => setActiveTab('strategy')}
            id="strategyTabBtn"
          >
            🎯 Mi Estrategia Profesional
          </button>
          {(strategy.dominant_anchor || searchPrompt) && (
            <button 
              className={`dashboard-tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
              id="searchPromptTabBtn"
            >
              ⚙️ Búsqueda Activa (Claude)
            </button>
          )}
        </div>

        {activeTab === 'activity' && (
          <div className="dashboard-grid">
            {/* Upcoming Interviews */}
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-title">
                  <span>📅</span> Upcoming Interviews
                </div>
              </div>
              <div id="interviewsList">
                {loading ? (
                  <div className="loading-spinner">Loading...</div>
                ) : error ? (
                  <div className="error-message">{error}</div>
                ) : summary.interviews.length === 0 ? (
                  <div className="empty-state">No upcoming interviews scheduled.</div>
                ) : (
                  summary.interviews.map((job) => (
                    <div
                      key={job.id}
                      className="list-item"
                      onClick={() => {
                        navigateTo(`/jobboard/jobs.html?openJobId=${job.id}`);
                      }}
                    >
                      <div className="item-icon interview-icon">📅</div>
                      <div className="item-content">
                        <div className="item-title">{job.company}</div>
                        <div className="item-subtitle">{job.position}</div>
                      </div>
                      <div className="item-action">View</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* New AI Matches */}
            <div className="dashboard-card">
              <div className="card-header">
                <div className="card-title">
                  <span>🤖</span> New AI Matches
                </div>
              </div>
              <div id="newMatchesList">
                {loading ? (
                  <div className="loading-spinner">Loading...</div>
                ) : error ? (
                  <div className="error-message">{error}</div>
                ) : summary.newMatches.length === 0 ? (
                  <div className="empty-state">No new AI job matches found.</div>
                ) : (
                  summary.newMatches.map((job) => (
                    <div
                      key={job.id}
                      className="list-item"
                      onClick={() => {
                        navigateTo(`/jobboard/jobs.html?openJobId=${job.id}`);
                      }}
                    >
                      <div className="item-icon match-icon">🤖</div>
                      <div className="item-content">
                        <div className="item-title">{job.company}</div>
                        <div className="item-subtitle">{job.position}</div>
                      </div>
                      <div className="item-action">Review</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="strategy-container">
            {loadingStrategy ? (
              <div className="loading-spinner">Cargando estrategia de carrera...</div>
            ) : !strategy.dominant_anchor ? (
              <div className="empty-state" id="noStrategyState">
                Aún no has completado la entrevista profesional con tu Zenith Agent. Completa tu perfil en la consola lateral para ver tu estrategia.
              </div>
            ) : (
              <div className="strategy-card-grid" id="strategyCardGrid">
                {/* Radar Bar Schein anchors Card */}
                <div className="dashboard-card" style={{ padding: '1.5rem' }}>
                  <h3 className="strategy-section-title">🧭 Anclas de Carrera (Schein)</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    Tus motivaciones profesionales predominantes inferidas en la entrevista.
                  </p>
                  <div className="anchors-list">
                    {anchors.map((anchor) => (
                      <div key={anchor.key} className="anchor-bar-item">
                        <div className="anchor-label-row">
                          <span>{anchor.name}</span>
                          <span>{anchor.key === dominant ? '★ Dominante' : `${anchor.val}%`}</span>
                        </div>
                        <div className="anchor-bar-outer">
                          <div 
                            className="anchor-bar-inner" 
                            style={{ 
                              width: `${anchor.val}%`,
                              background: anchor.key === dominant ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'var(--text-secondary)'
                            }} 
                          />
                        </div>
                        <div className="anchor-bar-description">{anchor.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strategy fields Card */}
                <div>
                  <div className="strategy-info-card">
                    <h3 className="strategy-section-title" style={{ marginBottom: 0 }}>📋 Estrategia de Búsqueda</h3>
                    
                    <div className="strategy-field">
                      <div className="strategy-field-label">Resumen de Estrategia</div>
                      <div className="strategy-field-val" id="strategySummaryVal">
                        {strategy.strategy_summary || 'No especificado'}
                      </div>
                    </div>

                    <div className="strategy-field">
                      <div className="strategy-field-label">Roles Objetivo</div>
                      <div className="strategy-field-val" id="strategyRolesVal">
                        {strategy.target_roles && strategy.target_roles.length > 0 ? (
                          strategy.target_roles.map((r, i) => (
                            <span key={i} className="strategy-tag">{r}</span>
                          ))
                        ) : 'No especificado'}
                      </div>
                    </div>

                    <div className="strategy-field">
                      <div className="strategy-field-label">Preferencia Salarial</div>
                      <div className="strategy-field-val" id="strategySalaryVal">
                        {strategy.salary_preferences?.target 
                          ? `${strategy.salary_preferences.target.toLocaleString()} ${strategy.salary_preferences.currency || 'USD'} (Meta)` 
                          : 'No especificado'}
                      </div>
                    </div>

                    <div className="strategy-field">
                      <div className="strategy-field-label">Modalidad & Geografía</div>
                      <div className="strategy-field-val" id="strategyGeoVal">
                        <span className="strategy-tag">{strategy.work_mode?.preference || 'Remoto/Híbrido'}</span>
                        {strategy.geography?.allowed && strategy.geography.allowed.map((g, i) => (
                          <span key={i} className="strategy-tag">{g}</span>
                        ))}
                      </div>
                    </div>

                    <div className="strategy-field">
                      <div className="strategy-field-label">Exclusiones (Deal Breakers)</div>
                      <div className="strategy-field-val" id="strategyExclusionsVal">
                        {strategy.exclusions?.companies && strategy.exclusions.companies.length > 0 ? (
                          strategy.exclusions.companies.map((c, i) => (
                            <span key={i} className="strategy-tag" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                              🚫 Excluir: {c}
                            </span>
                          ))
                        ) : 'Ninguna'}
                      </div>
                    </div>
                  </div>

                  {/* Memories / Preference learning console */}
                  <div className="memories-manager">
                    <h3 className="strategy-section-title" style={{ marginBottom: '0.25rem' }}>🧠 Directivas de Aprendizaje</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Filtros y reglas dinámicas que tu agente ha aprendido a lo largo de tus conversaciones.
                    </p>
                    <div className="memory-list" id="memoriesList">
                      {memories.length === 0 ? (
                        <div className="empty-state">Tu agente aún no ha memorizado directivas explícitas de filtrado.</div>
                      ) : (
                        memories.map((m) => (
                          <div key={m.id} className="memory-item" data-memory-id={m.id}>
                            <div className="memory-content">{m.content}</div>
                            <button 
                              type="button" 
                              className="memory-delete-btn"
                              title="Olvidar regla"
                              onClick={() => handleDeleteMemory(m.id)}
                            >
                              🗑 Olvidar
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="strategy-container">
            {loadingStrategy ? (
              <div className="loading-spinner">Cargando configuración de búsqueda...</div>
            ) : (
              <div className="dashboard-card" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
                <h3 className="strategy-section-title">⚙️ Prompt de Búsqueda Activa (Claude for Chrome)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  Este prompt es generado automáticamente por tu Zenith Agent según tu perfil y anclas de carrera. 
                  Puedes editarlo aquí, guardar los cambios y copiarlo para pegarlo en Claude for Chrome.
                </p>

                <div className="strategy-field" style={{ marginBottom: '1.5rem' }}>
                  <label className="strategy-field-label" htmlFor="dashboard-board-select" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Tablero de destino para las vacantes encontradas:
                  </label>
                  <select
                    id="dashboard-board-select"
                    className="agent-board-select"
                    style={{ 
                      width: '100%', 
                      padding: '0.75rem', 
                      borderRadius: 'var(--border-radius-sm)', 
                      backgroundColor: 'var(--bg-card-hover)', 
                      color: 'var(--text-primary)', 
                      border: '1px solid var(--border-color)',
                      fontSize: '0.9rem'
                    }}
                    value={selectedBoardId}
                    onChange={(e) => setSelectedBoardId(Number(e.target.value))}
                  >
                    {boards.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="strategy-field" style={{ marginBottom: '1.5rem' }}>
                  <label className="strategy-field-label" htmlFor="dashboard-prompt-editor" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Prompt de Búsqueda Personalizado:
                  </label>
                  <textarea
                    id="dashboard-prompt-editor"
                    className="agent-prompt-box"
                    style={{ 
                      width: '100%', 
                      height: '220px', 
                      padding: '1rem', 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem', 
                      lineHeight: '1.4', 
                      borderRadius: 'var(--border-radius-sm)', 
                      backgroundColor: 'var(--bg-card-hover)', 
                      color: 'var(--text-primary)', 
                      border: '1px solid var(--border-color)',
                      resize: 'vertical'
                    }}
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                  />
                </div>

                {saveSuccess && (
                  <div className="success-message" style={{ color: 'var(--color-success)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                    ✅ {saveSuccess}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="dashboard-tab-btn active"
                    style={{ 
                      flex: 1, 
                      padding: '0.75rem 1.5rem', 
                      backgroundColor: 'var(--color-primary)', 
                      color: '#ffffff', 
                      borderRadius: 'var(--border-radius-sm)', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      textAlign: 'center'
                    }}
                    id="dashboard-copy-prompt-btn"
                    onClick={handleCopyPrompt}
                  >
                    {copySuccess ? '✓ ¡Prompt Copiado!' : '📋 Copiar Prompt para Claude'}
                  </button>

                  <button
                    type="button"
                    className="dashboard-tab-btn"
                    style={{ 
                      flex: 1, 
                      padding: '0.75rem 1.5rem', 
                      borderRadius: 'var(--border-radius-sm)', 
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      textAlign: 'center'
                    }}
                    id="dashboard-save-prompt-btn"
                    onClick={handleSavePrompt}
                  >
                    💾 Guardar Cambios
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

