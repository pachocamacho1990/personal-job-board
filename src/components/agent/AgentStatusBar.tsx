import React from 'react';
import type { ActiveRun } from '../../types/agent';

interface Props {
  activeRun: ActiveRun | null;
  isPanelOpen: boolean;
  onViewClick: () => void;
}

export const AgentStatusBar: React.FC<Props> = ({ activeRun, isPanelOpen, onViewClick }) => {
  if (!activeRun) return null;

  return (
    <div className={`agent-status-bar ${isPanelOpen ? 'agent-open' : ''}`}>
      <span className="agent-status-bar-icon">⚡</span>
      <span className="agent-status-bar-text">
        Agent: {activeRun.description} — {activeRun.progressPct}%
      </span>
      <button className="agent-status-bar-action" onClick={onViewClick}>
        Ver
      </button>
    </div>
  );
};
