import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Job, FileAttachment, JobHistory } from '../types';
import { getFileIcon, formatFileSize, formatFullDate } from '../utils';
import { marked } from 'marked';
import { BrainIcon, JobBoardIcon, LinkIcon, CopyIcon, TargetIcon, SettingsIcon, RocketLaunchIcon, ArchiveIcon, HandshakeIcon, ProfileIcon } from './icons';

interface DetailPanelProps {
  jobId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobData: any, files: File[]) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onArchive: (id: number) => Promise<void>;
  onTransform: (id: number) => Promise<void>;
  boardId: number;
  initialStatus: string;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  jobId,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onTransform,
  boardId,
  initialStatus,
}) => {
  // Form fields
  const [type, setType] = useState<'job' | 'connection'>('job');
  const [origin, setOrigin] = useState<string>('human');
  const [company, setCompany] = useState<string>('');
  const [position, setPosition] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [salary, setSalary] = useState<string>('');
  const [url, setUrl] = useState<string>('');
  const [rating, setRating] = useState<number>(3);
  const [status, setStatus] = useState<string>('interested');
  const [comments, setComments] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [createdAt, setCreatedAt] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string>('');

  // Markdown Comments Preview State
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  // Files State
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [filesQueue, setFilesQueue] = useState<File[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [fileToDeleteId, setFileToDeleteId] = useState<number | null>(null);
  const [fileToPreview, setFileToPreview] = useState<FileAttachment | null>(null);

  // Modals state
  const [showArchiveConfirm, setShowArchiveConfirm] = useState<boolean>(false);
  const [showTransformConfirm, setShowTransformConfirm] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Copilot State
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [docType, setDocType] = useState<'cover_letter' | 'resume_bullets'>('cover_letter');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState<boolean>(false);
  const [generatedDocContent, setGeneratedDocContent] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [copyDocSuccess, setCopyDocSuccess] = useState<boolean>(false);


  // Load Job details if jobId is provided
  useEffect(() => {
    if (isOpen) {
      setIsPreviewMode(false);
      setFilesQueue([]);
      if (jobId) {
        loadJobDetails(jobId);
      } else {
        // Reset to default
        setType('job');
        setOrigin('human');
        setCompany('');
        setPosition('');
        setLocation('');
        setSalary('');
        setUrl('');
        setRating(3);
        setStatus(initialStatus || 'interested');
        setComments('');
        setContactName('');
        setOrganization('');
        setIsLocked(false);
        setCreatedAt('');
        setUpdatedAt('');
        setFiles([]);
        setGeneratedDocContent('');
        setDocuments([]);
      }
    }
  }, [jobId, isOpen, initialStatus]);

  const loadJobDetails = async (id: number) => {
    try {
      const job = await api.jobs.getOne(id);
      setType(job.type || 'job');
      setOrigin(job.origin || 'human');
      setCompany(job.company || '');
      setPosition(job.position || '');
      setLocation(job.location || '');
      setSalary(job.salary || '');
      setUrl(job.url || '');
      setRating(job.rating || 3);
      setStatus(job.status || 'interested');
      setComments(job.comments || '');
      setContactName(job.contactName || '');
      setOrganization(job.organization || '');
      setIsLocked(job.is_locked || false);
      setCreatedAt(job.created_at || '');
      setUpdatedAt(job.updated_at || '');

      loadAttachedFiles(id);
      loadJobDocuments(id);
    } catch (error) {
      console.error('Failed to load job details', error);
    }
  };


  const loadAttachedFiles = async (id: number) => {
    setLoadingFiles(true);
    try {
      const list = await api.files.getAll(id);
      setFiles(list);
    } catch (error) {
      console.error('Failed to load files', error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadJobDocuments = async (id: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/jobboard/api/jobs/${id}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const list = await response.json();
        setDocuments(list || []);
        // Match current docType
        const found = list.find((d: any) => d.documentType === docType);
        setGeneratedDocContent(found ? found.content : '');
      }
    } catch (error) {
      console.error('Failed to load job documents', error);
    }
  };

  const handleDocTypeChange = (type: 'cover_letter' | 'resume_bullets') => {
    setDocType(type);
    const found = documents.find((d: any) => d.documentType === type);
    setGeneratedDocContent(found ? found.content : '');
  };

  const handleGenerateCopilotDocument = async () => {
    if (!jobId) return;
    setIsGeneratingDoc(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/jobboard/api/jobs/${jobId}/copilot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ documentType: docType })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate');
      }
      const newDoc = await response.json();
      setGeneratedDocContent(newDoc.content);
      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.documentType !== docType);
        return [...filtered, newDoc];
      });
    } catch (error: any) {
      console.error('Copilot generation failed', error);
      alert('Error al generar: ' + error.message);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleCopyDocToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocContent);
      setCopyDocSuccess(true);
      setTimeout(() => setCopyDocSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy document content:', err);
    }
  };


  // Esc key closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !showArchiveConfirm && !showTransformConfirm && !showDeleteConfirm && !fileToDeleteId && !fileToPreview) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showArchiveConfirm, showTransformConfirm, showDeleteConfirm, fileToDeleteId, fileToPreview]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobData: any = {
      boardId: boardId,
      type,
      origin,
      company,
      position,
      location,
      salary,
      url: url || null,
      rating,
      status,
      comments,
      contact_name: type === 'connection' ? contactName : null,
      organization: type === 'connection' ? organization : null,
    };

    await onSave(jobData, filesQueue);
  };

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!jobId) {
      // New Job: queue it
      setFilesQueue((prev) => [...prev, file]);
    } else {
      // Existing Job: upload immediately
      setLoadingFiles(true);
      try {
        const uploaded = await api.files.upload(jobId, file);
        setFiles((prev) => [uploaded, ...prev]);
      } catch (error: any) {
        alert('Failed to upload file: ' + error.message);
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
    if (!fileToDeleteId || !jobId) return;
    try {
      await api.files.delete(jobId, fileToDeleteId);
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
            <h2 id="panelTitle">{jobId ? 'Job Details' : 'Add New Card'}</h2>
            <button id="closePanel" className="btn-icon" aria-label="Close panel" onClick={onClose}>
              &times;
            </button>
          </div>

          <form id="jobForm" className="job-form" onSubmit={handleFormSubmit}>
            {isLocked && (
              <div
                id="lockedBanner"
                style={{
                  display: 'block',
                  background: '#f3f4f6',
                  color: '#4b5563',
                  padding: '1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  textAlign: 'center',
                  border: '1px dashed #d1d5db',
                }}
              >
                🔒 <strong>Locked</strong>
                <br />
                This job has been transformed into a Business Connection.
              </div>
            )}

            {jobId && createdAt && (
              <div
                id="timestampInfo"
                className="timestamp-info"
                style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}
              >
                Created: {formatFullDate(createdAt)}
                {updatedAt && updatedAt !== createdAt && ` | Updated: ${formatFullDate(updatedAt)}`}
              </div>
            )}

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
                    disabled={isLocked}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><HandshakeIcon size={14} /> Connection</span>
                </label>
                <label className="type-option">
                  <input
                    type="radio"
                    name="type"
                    value="job"
                    checked={type === 'job'}
                    onChange={() => setType('job')}
                    disabled={isLocked}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><JobBoardIcon size={14} /> Job Application</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Created By</label>
              <div className="type-selector">
                <label className="type-option">
                  <input
                    type="radio"
                    name="origin"
                    value="human"
                    checked={origin === 'human'}
                    onChange={() => setOrigin('human')}
                    disabled={isLocked}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ProfileIcon size={14} /> Human</span>
                </label>
                <label className="type-option">
                  <input
                    type="radio"
                    name="origin"
                    value="agent"
                    checked={origin === 'agent'}
                    onChange={() => setOrigin('agent')}
                    disabled={isLocked}
                  />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><BrainIcon size={14} /> AI Agent</span>
                </label>
              </div>
            </div>

            {type === 'connection' && (
              <div className="connection-fields" style={{ display: 'block' }}>
                <div className="form-group">
                  <label htmlFor="contactName">Contact Name</label>
                  <input
                    type="text"
                    id="contactName"
                    placeholder="Person's name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="organization">Organization</label>
                  <input
                    type="text"
                    id="organization"
                    placeholder="Optional"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="company">Company</label>
              <input
                type="text"
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="form-group">
              <label htmlFor="position">Position / Role</label>
              <input
                type="text"
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="form-group">
              <label htmlFor="salary">Salary Range</label>
              <input
                type="text"
                id="salary"
                placeholder="e.g., $80k-$100k"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                disabled={isLocked}
              />
            </div>

            <div className="form-group">
              <label htmlFor="jobUrl">Job Posting URL</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="url"
                  id="jobUrl"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLocked}
                  style={{ flex: 1 }}
                />
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary btn-sm"
                    style={{ whiteSpace: 'nowrap', textDecoration: 'none', padding: '6px 10px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><LinkIcon size={12} /> Open</span>
                  </a>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Interest Level</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((val) => (
                  <React.Fragment key={val}>
                    <input
                      type="radio"
                      name="rating"
                      value={val}
                      id={`rating${val}`}
                      checked={rating === val}
                      onChange={() => setRating(val)}
                      disabled={isLocked}
                    />
                    <label htmlFor={`rating${val}`}>★</label>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isLocked}
              >
                <option value="interested">Interested</option>
                <option value="applied">Applied</option>
                <option value="forgotten">Forgotten</option>
                <option value="interview">Interview</option>
                <option value="pending">Pending Next Step</option>
                <option value="offer">Offer</option>
                <option value="rejected">Rejected</option>
                {status === 'archived' && <option value="archived">Archived</option>}
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
                      const downloadUrl = jobId ? api.files.getDownloadUrl(jobId, file.id) : '#';
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
                              disabled={isLocked}
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
                  disabled={isLocked}
                />
                <button
                  type="button"
                  id="addFileBtn"
                  className="btn-secondary btn-sm"
                  onClick={handleFileUploadClick}
                  disabled={isLocked}
                >
                  + Add File
                </button>
              </div>
            </div>

            <div className="form-group">
              <div className="comments-header">
                <label htmlFor="comments">Comments</label>
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
                    __html: comments
                      ? marked.parse(comments)
                      : '<p style="color: var(--text-tertiary);">No comments yet...</p>',
                  }}
                />
              ) : (
                <textarea
                  id="comments"
                  rows={8}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={isLocked}
                />
              )}
            </div>

            {jobId && !isLocked && type === 'job' && (
              <div 
                className={`form-group ai-copilot-accordion ${isCopilotOpen ? 'open' : ''}`}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '1rem',
                  backgroundColor: 'rgba(99, 102, 241, 0.03)',
                  marginTop: '1.5rem',
                  marginBottom: '1rem'
                }}
              >
                <div 
                  className="accordion-header" 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => setIsCopilotOpen(!isCopilotOpen)}
                  id="copilotAccordionHeader"
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <BrainIcon size={16} /> Copiloto de Postulación IA
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isCopilotOpen ? '▲ Contraer' : '▼ Expandir'}
                  </span>
                </div>

                {isCopilotOpen && (
                  <div className="accordion-body" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>
                        Tipo de Documento
                      </label>
                      <div className="type-selector" style={{ gap: '0.5rem' }}>
                        <label className="type-option" style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="copilotDocType"
                            value="cover_letter"
                            checked={docType === 'cover_letter'}
                            onChange={() => handleDocTypeChange('cover_letter')}
                          />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Carta de Presentación</span>
                        </label>
                        <label className="type-option" style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}>
                          <input
                            type="radio"
                            name="copilotDocType"
                            value="resume_bullets"
                            checked={docType === 'resume_bullets'}
                            onChange={() => handleDocTypeChange('resume_bullets')}
                          />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><TargetIcon size={14} /> CV Optimizado (ATS)</span>
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={handleGenerateCopilotDocument}
                        disabled={isGeneratingDoc}
                        id="generateCopilotBtn"
                      >
                        {isGeneratingDoc ? 'Generando...' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><SettingsIcon size={14} /> Generar con IA</span>}
                      </button>

                      {generatedDocContent && (
                        <button
                          type="button"
                          className={`btn-secondary ${copyDocSuccess ? 'copied' : ''}`}
                          style={{ 
                            padding: '8px 16px', 
                            fontSize: '0.85rem',
                            backgroundColor: copyDocSuccess ? '#D1FAE5' : '',
                            color: copyDocSuccess ? '#065F46' : '',
                            borderColor: copyDocSuccess ? '#A7F3D0' : ''
                          }}
                          onClick={handleCopyDocToClipboard}
                          id="copyCopilotDocBtn"
                        >
                          {copyDocSuccess ? '¡Copiado!' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CopyIcon size={14} /> Copiar Contenido</span>}
                        </button>
                      )}
                    </div>

                    {generatedDocContent ? (
                      <div 
                        id="copilotDocResult"
                        style={{
                          background: 'var(--canvas)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '1rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-main)',
                          maxHeight: '200px',
                          overflowY: 'auto',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.4'
                        }}
                      >
                        {generatedDocContent}
                      </div>
                    ) : (
                      <div 
                        style={{ 
                          textAlign: 'center', 
                          padding: '1.5rem', 
                          border: '1px dashed var(--border)', 
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        Presiona "Generar con IA" para redactar tu documento adaptado.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="form-actions">

              {jobId && !isLocked && type === 'job' && (
                <button
                  type="button"
                  id="transformBtn"
                  className="btn-secondary"
                  style={{
                    marginRight: '0.5rem',
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    borderColor: '#E0E7FF',
                  }}
                  onClick={() => setShowTransformConfirm(true)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><RocketLaunchIcon size={14} /> Transform to Connection</span>
                </button>
              )}
              {!isLocked && <button type="submit" className="btn-primary">Save</button>}
              {jobId && !isLocked && (
                <button
                  type="button"
                  id="archiveJobBtn"
                  className="btn-secondary"
                  style={{ marginRight: 'auto' }}
                  onClick={() => setShowArchiveConfirm(true)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ArchiveIcon size={14} /> Archive</span>
                </button>
              )}
              {jobId && !isLocked && (
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

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div id="archiveConfirmModal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Archive this Card?</h2>
            </div>
            <div className="modal-body">
              <p>It will be moved to the Vault. You can restore it later.</p>
            </div>
            <div className="modal-footer">
              <button
                id="cancelArchive"
                className="btn-secondary"
                onClick={() => setShowArchiveConfirm(false)}
              >
                Cancel
              </button>
              <button
                id="confirmArchive"
                className="btn-primary"
                onClick={async () => {
                  if (jobId) {
                    await onArchive(jobId);
                    setShowArchiveConfirm(false);
                  }
                }}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transform Confirmation Modal */}
      {showTransformConfirm && (
        <div id="transformConfirmModal" className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Transform to Connection?</h2>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '0.5rem' }}>This action will:</p>
              <ul
                style={{
                  listStyleType: 'disc',
                  marginLeft: '1.5rem',
                  marginBottom: '1rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <li>
                  <strong>Lock</strong> this Job card in place 🔒
                </li>
                <li>
                  Create a new <strong>Connection card</strong> in the Business Board 🤝
                </li>
                <li>Copy all existing files 📂</li>
              </ul>
              <p>Are you sure you want to proceed?</p>
            </div>
            <div className="modal-footer">
              <button
                id="cancelTransform"
                className="btn-secondary"
                onClick={() => setShowTransformConfirm(false)}
              >
                Cancel
              </button>
              <button
                id="confirmTransform"
                className="btn-primary"
                style={{ backgroundColor: '#4F46E5' }}
                onClick={async () => {
                  if (jobId) {
                    await onTransform(jobId);
                    setShowTransformConfirm(false);
                  }
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><RocketLaunchIcon size={14} /> Transform</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Card Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal">
            <div className="modal-header">
              <h2>Delete this Card?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this card? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button
                id="confirmDelete"
                className="btn-danger"
                onClick={async () => {
                  if (jobId) {
                    await onDelete(jobId);
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
                  href={`${jobId ? api.files.getDownloadUrl(jobId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
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
                  src={`${jobId ? api.files.getDownloadUrl(jobId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                    token
                  )}&preview=true`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                />
              ) : fileToPreview.mimetype.startsWith('image/') ? (
                <img
                  src={`${jobId ? api.files.getDownloadUrl(jobId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
                    token
                  )}&preview=true`}
                  alt={fileToPreview.original_name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div className="preview-fallback">
                  <p>Preview not available for this file type.</p>
                  <a
                    href={`${jobId ? api.files.getDownloadUrl(jobId, fileToPreview.id) : '#'}&token=${encodeURIComponent(
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
