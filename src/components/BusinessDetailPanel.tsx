import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { BusinessEntity, FileAttachment } from '../types';
import { getFileIcon, formatFileSize } from '../utils';
import { marked } from 'marked';

interface BusinessDetailPanelProps {
  entityId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any, files: File[]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const BusinessDetailPanel: React.FC<BusinessDetailPanelProps> = ({
  entityId,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'connection' | 'investor' | 'vc' | 'accelerator'>('connection');
  const [status, setStatus] = useState<string>('researching');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Files
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [filesQueue, setFilesQueue] = useState<File[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [fileToDeleteId, setFileToDeleteId] = useState<number | null>(null);
  const [fileToPreview, setFileToPreview] = useState<FileAttachment | null>(null);

  // Modal deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsPreviewMode(false);
      setFilesQueue([]);
      if (entityId) {
        loadEntityDetails(entityId);
      } else {
        setName('');
        setType('connection');
        setStatus('researching');
        setContactPerson('');
        setEmail('');
        setWebsite('');
        setLocation('');
        setNotes('');
        setFiles([]);
      }
    }
  }, [entityId, isOpen]);

  const loadEntityDetails = async (id: number) => {
    try {
      const entity = await api.business.update(id, {}); // Read details via GET mock or update with empty body
      // Wait, in api client:
      // business has getAll, create, update, delete.
      // Wait, in original business.js, it fetched all entities and found the one to edit from the local list!
      // `openPanel(entity)` was called directly with the entity object from the list!
      // That means we don't even need to fetch details, we can just find it in our jobs state!
      // But wait, what about the files? We fetch files for this entity via `api.business.files.getAll(id)`.
      // Let's get files and set fields.
      const list = await api.business.files.getAll(id);
      setFiles(list);
    } catch (error) {
      console.error('Failed to load entity files', error);
    }
  };

  // If entity details are passed, sync them
  useEffect(() => {
    if (isOpen && entityId) {
      // Find entity in api client list or load details
      api.business.getAll().then((list: BusinessEntity[]) => {
        const found = list.find((e) => e.id === entityId);
        if (found) {
          setName(found.name || '');
          setType(found.type || 'connection');
          setStatus(found.status || 'researching');
          setContactPerson(found.contact_person || '');
          setEmail(found.email || '');
          setWebsite(found.website || '');
          setLocation(found.location || '');
          setNotes(found.notes || '');
        }
      });
    }
  }, [entityId, isOpen]);

  // Esc key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showDeleteConfirm && !fileToDeleteId && !fileToPreview) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showDeleteConfirm, fileToDeleteId, fileToPreview]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      type,
      status,
      contact_person: contactPerson,
      email,
      website,
      location,
      notes,
    };
    await onSave(data, filesQueue);
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!entityId) {
      setFilesQueue((prev) => [...prev, file]);
    } else {
      setLoadingFiles(true);
      try {
        const uploaded = await api.business.files.upload(entityId, file);
        setFiles((prev) => [uploaded, ...prev]);
      } catch (err: any) {
        alert('Failed to upload file: ' + err.message);
      } finally {
        setLoadingFiles(false);
      }
    }
    e.target.value = '';
  };

  const handleRemoveQueuedFile = (index: number) => {
    setFilesQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileDeleteConfirm = async () => {
    if (!fileToDeleteId || !entityId) return;
    try {
      await api.business.files.delete(entityId, fileToDeleteId);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDeleteId));
    } catch (error: any) {
      alert('Failed to delete file: ' + error.message);
    } finally {
      setFileToDeleteId(null);
    }
  };

  const token = localStorage.getItem('authToken') || '';

  return (
    <>
      <aside
        id="detailPanel"
        className={`detail-panel ${isOpen ? 'open' : ''}`}
        style={{ position: 'fixed', right: 0, top: 0, height: '100vh', zIndex: 200 }}
      >
        <div className="panel-content">
          <div className="panel-header">
            <h2 id="panelTitle">{entityId ? 'Edit Entity' : 'New Entity'}</h2>
            <button id="closePanel" className="btn-icon" aria-label="Close panel" onClick={onClose}>
              &times;
            </button>
          </div>

          <form id="entityForm" className="job-form" onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label>Type</label>
              <div className="type-selector">
                <label className="type-option">
                  <input
                    type="radio"
                    name="type"
                    value="connection"
                    checked={type === 'connection'}
                    onChange={() => setType('connection')}
                  />
                  <span>🤝 Connection</span>
                </label>
                <label className="type-option">
                  <input
                    type="radio"
                    name="type"
                    value="investor"
                    checked={type === 'investor'}
                    onChange={() => setType('investor')}
                  />
                  <span>💸 Investor</span>
                </label>
                <label className="type-option">
                  <input
                    type="radio"
                    name="type"
                    value="vc"
                    checked={type === 'vc'}
                    onChange={() => setType('vc')}
                  />
                  <span>🏛️ VC Fund</span>
                </label>
                <label className="type-option">
                  <input
                    type="radio"
                    name="type"
                    value="accelerator"
                    checked={type === 'accelerator'}
                    onChange={() => setType('accelerator')}
                  />
                  <span>🚀 Accelerator</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="entityName">Name / Brand</label>
              <input
                type="text"
                id="entityName"
                required
                placeholder="e.g. Acme Ventures"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="contactPerson">Contact Person</label>
              <input
                type="text"
                id="contactPerson"
                placeholder="e.g. John Doe"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input
                type="url"
                id="website"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="researching">Researching</option>
                <option value="contacted">Contacted</option>
                <option value="meeting">Meeting</option>
                <option value="negotiation">Negotiation</option>
                <option value="signed">Signed / Agreed</option>
                <option value="rejected">Rejected / Passed</option>
              </select>
            </div>

            {/* Attachments Section */}
            <div className="form-group attachments-section" id="attachmentsSection" style={{ display: 'block' }}>
              <label>Attachments</label>
              <div id="filesList" className="files-list">
                {loadingFiles ? (
                  <div className="loading-files">Loading files...</div>
                ) : files.length === 0 && filesQueue.length === 0 ? (
                  <div className="no-files">No files attached</div>
                ) : (
                  <>
                    {/* Queued files */}
                    {filesQueue.map((file, idx) => (
                      <div key={`queued-${idx}`} className="file-item pending-upload">
                        <span className="file-icon">{getFileIcon(file.type)}</span>
                        <span className="file-name">{file.name} (Pending)</span>
                        <div className="file-actions">
                          <button
                            type="button"
                            className="btn-icon btn-delete-file"
                            title="Remove"
                            onClick={() => handleRemoveQueuedFile(idx)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Saved files */}
                    {files.map((file) => {
                      const isPreviewable =
                        file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
                      const downloadUrl = entityId ? api.business.files.getDownloadUrl(entityId, file.id) : '#';
                      const authedDownloadUrl = `${downloadUrl}?token=${encodeURIComponent(token)}`;

                      return (
                        <div key={file.id} className="file-item" data-file-id={file.id}>
                          <span className="file-icon">{getFileIcon(file.mimetype)}</span>
                          <span className="file-name">{file.original_name || file.filename}</span>
                          <div className="file-actions">
                            {isPreviewable && (
                              <button
                                type="button"
                                className="btn-icon btn-view"
                                title="View"
                                onClick={() => setFileToPreview(file)}
                              >
                                👁
                              </button>
                            )}
                            <a
                              href={authedDownloadUrl}
                              className="btn-icon btn-download"
                              title="Download"
                              download={file.original_name}
                              onClick={(e) => e.stopPropagation()}
                            >
                              ⬇
                            </a>
                            <button
                              type="button"
                              className="btn-icon btn-delete-file"
                              title="Delete"
                              onClick={() => setFileToDeleteId(file.id)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="file-upload-area">
                <input
                  type="file"
                  id="fileInput"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.txt"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  id="addFileBtn"
                  className="btn-secondary btn-sm"
                  onClick={handleFileUploadClick}
                >
                  + Add File
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="comments-header">
                <label htmlFor="notes">Notes</label>
                <button
                  type="button"
                  id="togglePreview"
                  className={`btn-preview ${isPreviewMode ? 'active' : ''}`}
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                >
                  {isPreviewMode ? 'Edit' : 'Preview'}
                </button>
              </div>
              {isPreviewMode ? (
                <div
                  id="commentsPreview"
                  className="markdown-preview"
                  style={{ display: 'block' }}
                  dangerouslySetInnerHTML={{
                    __html: notes
                      ? marked.parse(notes)
                      : '<p style="color: var(--text-tertiary);">No comments yet...</p>',
                  }}
                />
              ) : (
                <textarea
                  id="notes"
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Save</button>
              {entityId && (
                <button
                  type="button"
                  id="deleteBtn"
                  className="btn-danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </button>
              )}
            </div>
          </form>
        </div>
      </aside>

      {/* Delete Entity Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Delete this Entity?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this entity? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={async () => {
                  if (entityId) {
                    await onDelete(entityId);
                    setShowDeleteConfirm(false);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Delete Confirmation Modal */}
      {fileToDeleteId && (
        <div id="fileDeleteConfirmModal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Delete File?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this file? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                id="cancelFileDelete"
                className="btn-secondary"
                onClick={() => setFileToDeleteId(null)}
              >
                Cancel
              </button>
              <button id="confirmFileDelete" className="btn-danger" onClick={handleFileDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {fileToPreview && (
        <div id="filePreviewModal" className="center-peek-overlay open" style={{ display: 'flex' }}>
          <div className="center-peek-container glass-panel file-preview-container">
            <div className="file-preview-header">
              <h3 id="previewFileName">{fileToPreview.original_name || fileToPreview.filename}</h3>
              <div className="file-preview-actions">
                <a
                  id="previewDownloadBtn"
                  href={`${entityId ? api.business.files.getDownloadUrl(entityId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                    token
                  )}`}
                  className="btn-secondary btn-sm"
                  download={fileToPreview.original_name}
                >
                  Download
                </a>
                <button
                  id="closeFilePreview"
                  className="btn-icon close-peek"
                  title="Close"
                  onClick={() => setFileToPreview(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div id="filePreviewContent" className="file-preview-body" style={{ height: '500px' }}>
              {fileToPreview.mimetype === 'application/pdf' ? (
                <embed
                  src={`${entityId ? api.business.files.getDownloadUrl(entityId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                    token
                  )}&preview=true`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                />
              ) : fileToPreview.mimetype.startsWith('image/') ? (
                <img
                  src={`${entityId ? api.business.files.getDownloadUrl(entityId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                    token
                  )}&preview=true`}
                  alt={fileToPreview.original_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="preview-fallback">
                  <p>Preview not available for this file type.</p>
                  <a
                    href={`${entityId ? api.business.files.getDownloadUrl(entityId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                      token
                    )}`}
                    className="btn-primary"
                    download
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
