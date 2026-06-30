import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { BusinessEntity } from '../../types';
import { Sidebar } from '../../components/Sidebar';
import { BusinessDetailPanel } from '../../components/BusinessDetailPanel';
import { capitalize } from '../../utils';
import { navigateTo } from '../../router';
import '../../styles/styles.css';
import '../../styles/layout.css';
import '../../styles/sidebar.css';

const columnsConfig = [
  { id: 'researching', title: 'Researching' },
  { id: 'contacted', title: 'Contacted' },
  { id: 'meeting', title: 'Meeting' },
  { id: 'negotiation', title: 'Negotiation' },
  { id: 'signed', title: 'Signed / Agreed' },
  { id: 'rejected', title: 'Rejected / Passed' },
];

export const BusinessPage: React.FC = () => {
  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Preference
  const [isCompactView, setIsCompactView] = useState<boolean>(false);

  // Selected Entity / Detail Panel State
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);

  // Drag and drop state
  const [draggedEntityId, setDraggedEntityId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    // Check auth
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigateTo('/jobboard/login.html');
      return;
    }

    try {
      const savedView = localStorage.getItem('businessBoardCompactView') === 'compact';
      setIsCompactView(savedView);
    } catch (e) {
      console.error(e);
    }

    fetchEntities();
  }, []);

  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      fetchEntities();
    };
    window.addEventListener('workspace-updated', handleWorkspaceUpdate);
    return () => {
      window.removeEventListener('workspace-updated', handleWorkspaceUpdate);
    };
  }, []);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const list = await api.business.getAll();
      setEntities(list);
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleViewMode = () => {
    const newVal = !isCompactView;
    setIsCompactView(newVal);
    localStorage.setItem('businessBoardCompactView', newVal ? 'compact' : 'comfortable');
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedEntityId(id);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedEntityId(null);
    setDragOverColumn(null);
  };

  const handleDragEnter = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedEntityId !== null) {
      try {
        await api.business.update(draggedEntityId, { status: newStatus });
        setEntities((prev) =>
          prev.map((ent) => (ent.id === draggedEntityId ? { ...ent, status: newStatus as any } : ent))
        );
      } catch (error) {
        console.error('Failed to move business entity status', error);
      }
    }
  };

  // CRUD actions from detail panel
  const handleSaveEntity = async (formData: any, filesQueue: File[]) => {
    try {
      if (selectedEntityId) {
        // Edit mode
        const updated = await api.business.update(selectedEntityId, formData);
        setEntities((prev) => prev.map((e) => (e.id === selectedEntityId ? updated : e)));
      } else {
        // Add mode
        const created = await api.business.create(formData);
        setEntities((prev) => [...prev, created]);

        // Process queued files
        if (filesQueue.length > 0) {
          for (const file of filesQueue) {
            try {
              await api.business.files.upload(created.id, file);
            } catch (err) {
              console.error('Failed to upload queued file:', err);
            }
          }
        }
      }
      setIsPanelOpen(false);
      setSelectedEntityId(null);
    } catch (error: any) {
      alert('Failed to save entity: ' + error.message);
    }
  };

  const handleDeleteEntity = async (id: number) => {
    try {
      await api.business.delete(id);
      setEntities((prev) => prev.filter((e) => e.id !== id));
      setIsPanelOpen(false);
      setSelectedEntityId(null);
    } catch (error: any) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const getTypeEmoji = (type: string) => {
    if (type === 'investor') return '💸';
    if (type === 'vc') return '🏛️';
    if (type === 'accelerator') return '🚀';
    return '🤝';
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar activePage="business" />

      <div className="main-content">
        <main className="board-section">
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Business Connections
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Manage investors, partners, and key professional relations.
              </p>
            </div>
            <div className="header-actions">
              <button
                id="viewToggle"
                className="btn-icon"
                title="Toggle compact view"
                onClick={toggleViewMode}
              >
                <span id="viewIcon">{isCompactView ? '⊟' : '⊞'}</span>
              </button>
              <button
                id="addBtn"
                className="btn-primary"
                onClick={() => {
                  setSelectedEntityId(null);
                  setIsPanelOpen(true);
                }}
              >
                + Add Entity
              </button>
            </div>
          </div>

          <div className="kanban-board">
            {columnsConfig.map((col) => {
              const columnEntities = entities.filter((e) => e.status === col.id);
              return (
                <div key={col.id} className="column" data-status={col.id}>
                  <div className="column-header">
                    <h2>{col.title}</h2>
                    <span className="count-badge">{columnEntities.length}</span>
                  </div>
                  <div
                    className={`cards-container ${dragOverColumn === col.id ? 'drag-over' : ''}`}
                    data-status={col.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {columnEntities.map((entity) => {
                      const typeEmoji = getTypeEmoji(entity.type);
                      return (
                        <div
                          key={entity.id}
                          className={`job-card ${isCompactView ? 'compact' : ''}`}
                          draggable
                          data-id={entity.id}
                          onDragStart={(e) => handleDragStart(e, entity.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setSelectedEntityId(entity.id);
                            setIsPanelOpen(true);
                          }}
                        >
                          {isCompactView ? (
                            <div className="compact-row">
                              <span className="type-emoji">{typeEmoji}</span>
                              <h3>{entity.name}</h3>
                            </div>
                          ) : (
                            <>
                              <div className="card-header">
                                <span className="type-badge">
                                  {typeEmoji} {capitalize(entity.type)}
                                </span>
                              </div>
                              <h3>{entity.name}</h3>
                              <p className="company">{entity.contact_person || 'No Contact'}</p>
                              {entity.location && <p>{entity.location}</p>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      <BusinessDetailPanel
        entityId={selectedEntityId}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedEntityId(null);
        }}
        onSave={handleSaveEntity}
        onDelete={handleDeleteEntity}
      />
    </div>
  );
};
