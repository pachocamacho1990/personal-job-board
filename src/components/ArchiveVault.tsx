import React from 'react';
import { Job } from '../types';

interface ArchiveVaultProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: Job[];
  onRestore: (id: number, newStatus: string) => Promise<void>;
}

export const ArchiveVault: React.FC<ArchiveVaultProps> = ({ isOpen, onClose, jobs, onRestore }) => {
  const archivedJobs = jobs.filter((j) => j.status === 'archived');

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    if (newStatus !== 'archived') {
      await onRestore(jobId, newStatus);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="archiveModal"
      className="center-peek-overlay open"
      style={{ display: 'flex' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="center-peek-container glass-panel" style={{ maxWidth: '800px' }}>
        <button id="closeArchiveModal" className="btn-icon close-peek" title="Close" onClick={onClose}>
          ×
        </button>
        <div className="archive-header" style={{ padding: '2rem 2rem 0', borderBottom: '1px solid var(--border-color)' }}>
          <h2>Archived Jobs</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Vault of processed cards. Restore them to bring them back to the board.
          </p>
        </div>
        <div id="archiveContent" className="peek-content" style={{ padding: 0 }}>
          {archivedJobs.length === 0 ? (
            <div className="archive-empty" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
              <h3>The Vault is Empty</h3>
              <p>Jobs you archive will appear here.</p>
            </div>
          ) : (
            <div className="archive-list">
              {/* Header row */}
              <div
                className="archive-row"
                style={{
                  background: 'var(--bg-secondary)',
                  borderBottom: '2px solid var(--border-color)',
                  fontWeight: '600',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--font-size-xs)',
                  textTransform: 'uppercase',
                }}
              >
                <div className="archive-col-main">Job Details</div>
                <div className="archive-col-status">Status</div>
              </div>

              {/* Data rows */}
              {archivedJobs.map((job) => {
                const isConnection = job.type === 'connection';
                const title = isConnection ? job.contact_name || job.position : job.position;
                const subtitle = isConnection ? job.organization || job.company : job.company;

                return (
                  <div key={job.id} className="archive-row">
                    <div className="archive-col-main">
                      <div className="archive-title" style={{ fontWeight: 600 }}>
                        {title || 'Untitled'}
                      </div>
                      <div className="archive-company" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {subtitle || 'Unknown'}
                      </div>
                    </div>
                    <div className="archive-col-status">
                      <select
                        className="archive-status-select"
                        data-job-id={job.id}
                        value="archived"
                        onChange={(e) => handleStatusChange(job.id, e.target.value)}
                      >
                        <option value="archived">📦 Archived</option>
                        <option value="interested">Interested</option>
                        <option value="applied">Applied</option>
                        <option value="interview">Interview</option>
                        <option value="pending">Pending Next Step</option>
                        <option value="offer">Offer</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
