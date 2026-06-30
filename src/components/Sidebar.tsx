import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Board } from '../types';
import { navigateTo } from '../router';
interface SidebarProps {
  activePage: 'dashboard' | 'jobs' | 'business' | 'docs';
  boards?: (Board & { jobCount?: number })[];
  activeBoardId?: number | null;
  onBoardSelect?: (id: number) => void;
  onBoardEdit?: (id: number, currentName: string) => void;
  onBoardDelete?: (id: number) => void;
  onBoardCreate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  boards = [],
  activeBoardId = null,
  onBoardSelect,
  onBoardEdit,
  onBoardDelete,
  onBoardCreate,
}) => {
  const [userEmail, setUserEmail] = useState<string>('');
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (userObj.email) {
          setUserEmail(userObj.email);
        }
      }
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
    }
  }, []);

  const handleLogout = () => {
    api.auth.logout();
  };

  const emailPrefix = userEmail ? userEmail.split('@')[0] : 'Usuario';
  const avatarChar = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <a
            href="/jobboard/index.html"
            className="sidebar-brand"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/index.html');
            }}
          >
            <span className="brand-icon">🚀</span>
            <span className="brand-text">Zenith</span>
          </a>
        </div>
        <nav className="sidebar-nav">
          <a
            href="/jobboard/index.html"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/index.html');
            }}
          >
            <span>🏠</span> Dashboard
          </a>
          <a
            href="/jobboard/jobs.html"
            className={`nav-item ${activePage === 'jobs' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/jobs.html');
            }}
          >
            <span>💼</span> Job Board
          </a>

          {activePage === 'jobs' && (
            <>
              <div id="boardsSubnav" className="boards-subnav">
                {boards.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', padding: '0.5rem 0.75rem' }}>
                    Sin tableros
                  </div>
                ) : (
                  boards.map((board) => (
                    <div
                      key={board.id}
                      className={`board-nav-item ${board.id === activeBoardId ? 'active' : ''}`}
                      data-board-id={board.id}
                      onClick={() => onBoardSelect && onBoardSelect(board.id)}
                    >
                      <span className="board-name" title={board.name}>
                        📋 {board.name} ({board.jobCount || 0})
                      </span>
                      <div className="board-actions">
                        <button
                          className="board-action-btn edit"
                          title="Renombrar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBoardEdit && onBoardEdit(board.id, board.name);
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          className="board-action-btn delete"
                          title="Eliminar"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBoardDelete && onBoardDelete(board.id);
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button id="newBoardBtn" className="new-board-btn" onClick={onBoardCreate}>
                <span>+</span> Nuevo Tablero
              </button>
            </>
          )}

          <a
            href="/jobboard/business.html"
            className={`nav-item ${activePage === 'business' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/business.html');
            }}
          >
            <span>🤝</span> Business Board
          </a>
          <a
            href="/jobboard/docs.html"
            className={`nav-item ${activePage === 'docs' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/jobboard/docs.html');
            }}
          >
            <span>📖</span> Documentación
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{avatarChar}</div>
            <div className="user-info">
              <div className="user-name">{emailPrefix}</div>
            </div>
            <button
              className="logout-trigger"
              title="Logout"
              onClick={() => setShowLogoutModal(true)}
            >
              ↪
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div id="logoutModal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Confirm Logout</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to log out?</p>
            </div>
            <div className="modal-footer">
              <button
                id="cancelLogout"
                className="btn-secondary"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button id="confirmLogout" className="btn-danger" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
