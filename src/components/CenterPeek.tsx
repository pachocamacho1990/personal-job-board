import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Job, JobHistory } from '../types';
import { JourneyMap } from './JourneyMap';
import { marked } from 'marked';

interface CenterPeekProps {
  jobId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export const CenterPeek: React.FC<CenterPeekProps> = ({ jobId, isOpen, onClose, onEdit }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<JobHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen && jobId) {
      loadData(jobId);
    } else {
      setJob(null);
      setHistory([]);
      setError('');
    }
  }, [jobId, isOpen]);

  // Esc key closes center peek modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const loadData = async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const jobData = await api.jobs.getOne(id);
      setJob(jobData);

      // If the job is unseen, dismiss the shine effect and save
      if (jobData.is_unseen) {
        api.jobs
          .update(id, { is_unseen: false })
          .catch((err) => console.error('Failed to dismiss shine', err));
      }

      const historyData = await api.jobs.getHistory(id);
      setHistory(historyData);
    } catch (err: any) {
      console.error('Failed to load history or job details', err);
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="centerPeekModal"
      className="center-peek-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="center-peek-container glass-panel">
        <button id="closeCenterPeek" className="btn-icon close-peek" title="Close" onClick={onClose}>
          ×
        </button>
        <div id="peekContent" className="peek-content">
          {loading ? (
            <div style={{ color: 'white', padding: '2rem' }}>Loading details...</div>
          ) : error ? (
            <div style={{ color: 'var(--color-danger)', padding: '2rem' }}>{error}</div>
          ) : !job ? (
            <div style={{ color: 'white', padding: '2rem' }}>Job details not found.</div>
          ) : (
            <>
              <div className="journey-map-section">
                <div className="journey-header">
                  <h1>{job.position || 'Untitled'}</h1>
                  <p className="company">{job.company || 'Unknown Company'}</p>
                </div>
                <JourneyMap history={history} currentStatus={job.status} />
              </div>
              <div className="job-details-section">
                <div className="detail-row">
                  <div className="detail-label">Status</div>
                  <div className="detail-value">
                    <span className={`type-badge ${job.type}`} style={{ fontSize: '1rem', padding: '4px 12px' }}>
                      {job.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Location</div>
                  <div className="detail-value">{job.location || '-'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Salary</div>
                  <div className="detail-value">{job.salary || '-'}</div>
                </div>
                <div className="detail-row">
                  <div className="detail-label">Comments</div>
                  <div
                    className="detail-value markdown-body"
                    dangerouslySetInnerHTML={{
                      __html: job.comments ? marked.parse(job.comments) : 'No comments',
                    }}
                  />
                </div>
                <div style={{ marginTop: '2rem' }}>
                  <button id="editJobFromPeek" className="btn-primary" style={{ width: '100%' }} onClick={onEdit}>
                    Edit Details
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
