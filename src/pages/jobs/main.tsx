import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { api, apiRequest } from '../../api';
import { Board, Job } from '../../types';
import { Sidebar } from '../../components/Sidebar';
import { DetailPanel } from '../../components/DetailPanel';
import { CenterPeek } from '../../components/CenterPeek';
import { ArchiveVault } from '../../components/ArchiveVault';
import { formatRelativeTime } from '../../utils';
import '../../styles/styles.css';
import '../../styles/layout.css';
import '../../styles/sidebar.css';

const columnsConfig = [
  { id: 'interested', title: 'Interested' },
  { id: 'applied', title: 'Applied' },
  { id: 'forgotten', title: 'Forgotten', isForgotten: true },
  { id: 'interview', title: 'Interview' },
  { id: 'pending', title: 'Pending Next Step' },
  { id: 'offer', title: 'Offer' },
  { id: 'rejected', title: 'Rejected' },
];

const JobsPage: React.FC = () => {
  const [boards, setBoards] = useState<(Board & { jobCount?: number })[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Layout Preferences
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);

  // Selected Jobs / Panel states
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState<boolean>(false);
  const [isCenterPeekOpen, setIsCenterPeekOpen] = useState<boolean>(false);
  const [isArchiveVaultOpen, setIsArchiveVaultOpen] = useState<boolean>(false);
  const [initialStatusForAdd, setInitialStatusForAdd] = useState<string>('interested');

  // Drag and drop internal state
  const [draggedJobId, setDraggedJobId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = '/jobboard/login.html';
      return;
    }

    // Load initial preferences
    try {
      const savedFocus = localStorage.getItem('focusModePreference') === 'true';
      setIsFocusMode(savedFocus);

      const savedView = localStorage.getItem('viewPreference') === 'compact';
      setIsCompactView(savedView);
    } catch (e) {
      console.error(e);
    }

    // Fetch initial board and jobs
    initializeBoards();
  }, []);

  // Sync focus-mode class with body
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add('focus-mode');
    } else {
      document.body.classList.remove('focus-mode');
    }
  }, [isFocusMode]);

  const initializeBoards = async () => {
    setLoading(true);
    try {
      const list = await api.boards.getAll();
      setBoards(list);

      let initialBoardId: number | null = null;
      const savedBoardId = localStorage.getItem('activeBoardId');
      if (savedBoardId && list.some((b: Board) => b.id === parseInt(savedBoardId))) {
        initialBoardId = parseInt(savedBoardId);
      } else if (list.length > 0) {
        initialBoardId = list[0].id;
      }

      setActiveBoardId(initialBoardId);
      if (initialBoardId) {
        localStorage.setItem('activeBoardId', String(initialBoardId));
        await loadJobs(initialBoardId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to initialize boards', error);
      setLoading(false);
    }
  };

  const loadJobs = async (boardId: number) => {
    setLoading(true);
    try {
      const list = await api.jobs.getAll({ boardId });
      setJobs(list);

      // Check URL for openJobId parameter
      const urlParams = new URLSearchParams(window.location.search);
      const openJobId = urlParams.get('openJobId');
      if (openJobId) {
        const job = list.find((j: Job) => j.id === parseInt(openJobId));
        if (job) {
          setSelectedJobId(job.id);
          setIsCenterPeekOpen(true);
          // Clean the query parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (error) {
      console.error('Failed to load jobs', error);
    } finally {
      // Hide loading spinner
      const loader = document.getElementById('appLoading');
      if (loader) loader.style.display = 'none';
      setLoading(false);
    }
  };

  const selectBoard = async (boardId: number) => {
    setActiveBoardId(boardId);
    localStorage.setItem('activeBoardId', String(boardId));
    await loadJobs(boardId);
  };

  const createBoard = async () => {
    const boardName = window.prompt('Ingrese el nombre del nuevo tablero:');
    if (!boardName || !boardName.trim()) return;

    try {
      const newBoard = await api.boards.create({ name: boardName.trim() });
      setBoards((prev) => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
      localStorage.setItem('activeBoardId', String(newBoard.id));
      await loadJobs(newBoard.id);
    } catch (error: any) {
      alert('Failed to create board: ' + error.message);
    }
  };

  const editBoard = async (boardId: number, currentName: string) => {
    const boardName = window.prompt('Ingrese el nuevo nombre para el tablero:', currentName);
    if (!boardName || !boardName.trim() || boardName.trim() === currentName) return;

    try {
      await api.boards.update(boardId, { name: boardName.trim() });
      setBoards((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, name: boardName.trim() } : b))
      );
    } catch (error: any) {
      alert('Failed to rename board: ' + error.message);
    }
  };

  const deleteBoard = async (boardId: number) => {
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;

    if (
      !window.confirm(
        `¿Está seguro de que desea eliminar el tablero "${board.name}"? Se eliminarán todas las vacantes asociadas.`
      )
    ) {
      return;
    }

    try {
      await api.boards.delete(boardId);
      const remainingBoards = boards.filter((b) => b.id !== boardId);
      setBoards(remainingBoards);

      let nextBoardId: number | null = null;
      if (activeBoardId === boardId) {
        nextBoardId = remainingBoards.length > 0 ? remainingBoards[0].id : null;
        setActiveBoardId(nextBoardId);
        if (nextBoardId) {
          localStorage.setItem('activeBoardId', String(nextBoardId));
        } else {
          localStorage.removeItem('activeBoardId');
          setJobs([]);
        }
      }
      if (nextBoardId) {
        await loadJobs(nextBoardId);
      }
    } catch (error: any) {
      alert('Failed to delete board: ' + error.message);
    }
  };

  // Preference Handlers
  const toggleFocusMode = () => {
    const newVal = !isFocusMode;
    setIsFocusMode(newVal);
    localStorage.setItem('focusModePreference', String(newVal));
  };

  const toggleViewMode = () => {
    const newVal = !isCompactView;
    setIsCompactView(newVal);
    localStorage.setItem('viewPreference', newVal ? 'compact' : 'comfortable');
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedJobId(id);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedJobId(null);
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
    if (draggedJobId !== null) {
      // Find the job to verify it's not locked
      const targetJob = jobs.find((j) => j.id === draggedJobId);
      if (targetJob && targetJob.is_locked) return;

      try {
        await api.jobs.update(draggedJobId, { status: newStatus });
        // Update local jobs status
        setJobs((prev) =>
          prev.map((j) => (j.id === draggedJobId ? { ...j, status: newStatus as any } : j))
        );
      } catch (error: any) {
        console.error('Failed to move job status', error);
      }
    }
  };

  // CRUD actions from detail panel
  const handleSaveJob = async (jobData: any, filesQueue: File[]) => {
    try {
      if (selectedJobId) {
        // Edit mode
        await api.jobs.update(selectedJobId, jobData);
        // Reload details & jobs list
        if (activeBoardId) await loadJobs(activeBoardId);
      } else {
        // Add mode
        const newJob = await api.jobs.create(jobData);
        // Upload queued files if any
        if (filesQueue.length > 0) {
          for (const file of filesQueue) {
            try {
              await api.files.upload(newJob.id, file);
            } catch (err) {
              console.error('Failed to upload queued file:', err);
            }
          }
        }
        if (activeBoardId) await loadJobs(activeBoardId);
      }
      setIsEditPanelOpen(false);
      setSelectedJobId(null);
    } catch (error: any) {
      alert('Failed to save job card: ' + error.message);
    }
  };

  const handleDeleteJob = async (id: number) => {
    try {
      await api.jobs.delete(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      setIsEditPanelOpen(false);
      setSelectedJobId(null);
    } catch (error: any) {
      alert('Failed to delete job card: ' + error.message);
    }
  };

  const handleArchiveJob = async (id: number) => {
    try {
      await api.jobs.update(id, { status: 'archived' });
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'archived' } : j)));
      setIsEditPanelOpen(false);
      setSelectedJobId(null);
    } catch (error: any) {
      alert('Failed to archive job card: ' + error.message);
    }
  };

  const handleTransformJob = async (id: number) => {
    try {
      await api.jobs.transform(id);
      alert('Job transformed successfully! Check the Business Board for the new connection.');
      if (activeBoardId) await loadJobs(activeBoardId);
      setIsEditPanelOpen(false);
      setSelectedJobId(null);
    } catch (error: any) {
      alert('Failed to transform job: ' + error.message);
    }
  };

  const handleRestoreJob = async (id: number, newStatus: string) => {
    try {
      await api.jobs.update(id, { status: newStatus });
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus as any } : j)));
    } catch (error: any) {
      alert('Failed to restore job: ' + error.message);
    }
  };

  const activeBoard = boards.find((b) => b.id === activeBoardId);
  const pageHeaderTitle = activeBoard ? `Job Applications - ${activeBoard.name}` : 'Job Applications';

  // Filtered jobs according to focus mode
  const filteredJobs = isFocusMode
    ? jobs.filter((job) => {
        const isHighRated = (job.rating ?? 3) >= 3;
        const isRelevantStatus = !['rejected', 'forgotten', 'archived'].includes(job.status);
        return isHighRated && isRelevantStatus;
      })
    : jobs.filter((job) => job.status !== 'archived');

  const getRatingStars = (rating: number | null) => {
    const r = rating ?? 3;
    return (
      <span className="rating-stars">
        {'★'.repeat(r)}
        {'☆'.repeat(5 - r)}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        activePage="jobs"
        boards={boards}
        activeBoardId={activeBoardId}
        onBoardSelect={selectBoard}
        onBoardCreate={createBoard}
        onBoardEdit={editBoard}
        onBoardDelete={deleteBoard}
      />

      <div className="main-content">
        <main className="board-section">
          <div className="page-header">
            <h1 className="page-title">{pageHeaderTitle}</h1>
            <div className="header-actions">
              <button
                id="focusToggle"
                className={`btn-icon ${isFocusMode ? 'active' : ''}`}
                title="Toggle Focus Mode 🎯"
                onClick={toggleFocusMode}
              >
                <span>🎯</span>
              </button>
              <button
                id="viewToggle"
                className="btn-icon"
                title="Toggle compact view"
                onClick={toggleViewMode}
              >
                <span id="viewIcon">{isCompactView ? '⊟' : '⊞'}</span>
              </button>
              <button
                id="archiveBtn"
                className="btn-icon"
                title="View Archive 📦"
                style={{ fontSize: '1.2rem' }}
                onClick={() => setIsArchiveVaultOpen(true)}
              >
                📦
              </button>
              <button
                id="addJobBtn"
                className="btn-primary"
                disabled={activeBoardId === null}
                onClick={() => {
                  setSelectedJobId(null);
                  setInitialStatusForAdd('interested');
                  setIsEditPanelOpen(true);
                }}
              >
                + Add Card
              </button>
            </div>
          </div>

          <div className="kanban-board">
            {columnsConfig.map((col) => {
              const columnJobs = filteredJobs.filter((j) => j.status === col.id);
              const count = columnJobs.length;

              return (
                <div
                  key={col.id}
                  className={`column ${col.isForgotten ? 'forgotten' : ''}`}
                  data-status={col.id}
                >
                  <div className="column-header">
                    <h2>{col.title}</h2>
                    <span className="count-badge">{count}</span>
                  </div>
                  <div
                    className={`cards-container ${dragOverColumn === col.id ? 'drag-over' : ''}`}
                    data-status={col.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, col.id)}
                  >
                    {columnJobs.map((job) => {
                      const isConnection = job.type === 'connection';
                      const title = isConnection
                        ? job.contact_name || job.position || 'Untitled'
                        : job.position || 'Untitled';
                      const subtitle = isConnection
                        ? job.organization || job.company || ''
                        : job.company || '';

                      const typeEmoji = isConnection ? '🤝' : '💼';
                      const typeName = isConnection ? 'Connection' : 'Job';
                      const isAgent = job.origin === 'agent';
                      const originClass = isAgent ? 'origin-agent' : 'origin-human';
                      const originEmoji = isAgent ? '🤖' : '👤';

                      const relativeTime = formatRelativeTime(job.updated_at);
                      const metadataItems = [];
                      if (subtitle) metadataItems.push(subtitle);
                      if (job.location) metadataItems.push(job.location);
                      if (job.salary) metadataItems.push(job.salary);

                      return (
                        <div
                          key={job.id}
                          className={`job-card ${isCompactView ? 'compact' : ''} ${
                            job.is_unseen ? 'shining' : ''
                          } ${job.is_locked ? 'locked' : ''}`}
                          draggable={!job.is_locked}
                          data-job-id={job.id}
                          data-type={job.type}
                          onDragStart={(e) => handleDragStart(e, job.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setIsCenterPeekOpen(true);
                          }}
                        >
                          {isCompactView ? (
                            <>
                              <div className="card-header">
                                {getRatingStars(job.rating)}
                                <h3>{title}</h3>
                                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                                  <span className={`type-badge ${job.type}`}>
                                    <span className="type-emoji">{typeEmoji}</span>
                                    {typeName}
                                  </span>
                                  <span
                                    className={`type-badge ${originClass}`}
                                    title={`Created by ${isAgent ? 'AI Agent' : 'Human'}`}
                                  >
                                    <span className="type-emoji">{originEmoji}</span>
                                  </span>
                                </div>
                              </div>
                              <div className="card-footer">
                                {metadataItems.length > 0 && (
                                  <span className="metadata">{metadataItems.join(' • ')}</span>
                                )}
                                {relativeTime && <span className="timestamp">{relativeTime}</span>}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="card-header">
                                {getRatingStars(job.rating)}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <span className={`type-badge ${job.type}`}>
                                    <span className="type-emoji">{typeEmoji}</span>
                                    {typeName}
                                  </span>
                                  <span
                                    className={`type-badge ${originClass}`}
                                    title={`Created by ${isAgent ? 'AI Agent' : 'Human'}`}
                                  >
                                    <span className="type-emoji">{originEmoji}</span>
                                  </span>
                                </div>
                              </div>
                              <h3>{title}</h3>
                              <p className="company">{subtitle}</p>
                              {job.location && <p>{job.location}</p>}
                              {job.salary && <p>{job.salary}</p>}
                              {relativeTime && <p className="timestamp">Updated {relativeTime}</p>}
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

      {/* Edit Details Sidebar Panel */}
      <DetailPanel
        jobId={selectedJobId}
        isOpen={isEditPanelOpen}
        onClose={() => {
          setIsEditPanelOpen(false);
          setSelectedJobId(null);
        }}
        onSave={handleSaveJob}
        onDelete={handleDeleteJob}
        onArchive={handleArchiveJob}
        onTransform={handleTransformJob}
        boardId={activeBoardId || 0}
        initialStatus={initialStatusForAdd}
      />

      {/* Center Peek Details Modal */}
      <CenterPeek
        jobId={selectedJobId}
        isOpen={isCenterPeekOpen}
        onClose={() => {
          setIsCenterPeekOpen(false);
          setSelectedJobId(null);
          if (activeBoardId) loadJobs(activeBoardId); // Reload to clear shining state
        }}
        onEdit={() => {
          setIsCenterPeekOpen(false);
          setIsEditPanelOpen(true);
        }}
      />

      {/* Archive Vault Modal */}
      <ArchiveVault
        isOpen={isArchiveVaultOpen}
        onClose={() => setIsArchiveVaultOpen(false)}
        jobs={jobs}
        onRestore={handleRestoreJob}
      />
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<JobsPage />);
}
