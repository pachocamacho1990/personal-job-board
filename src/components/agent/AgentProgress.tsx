import React from 'react';
import type { ProgressStep } from '../../types/agent';
import { ChartIcon } from '../icons';

interface Props {
  title: string;
  progressPct: number;
  steps: ProgressStep[];
}

function stepIcon(status: ProgressStep['status']): React.ReactNode {
  switch (status) {
    case 'completed': 
      return (
        <span className="agent-step-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
      );
    case 'running':   
      return <span className="agent-step-icon"><span className="agent-step-running-spinner" /></span>;
    case 'failed':    
      return (
        <span className="agent-step-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      );
    default:          
      return <span className="agent-step-icon" style={{ fontSize: '10px', opacity: 0.5 }}>○</span>;
  }
}

export const AgentProgress: React.FC<Props> = ({ title, progressPct, steps }) => {
  return (
    <div className="agent-progress">
      <div className="agent-progress-title">
        <ChartIcon size={14} style={{ marginRight: '6px' }} />
        <span>{title}</span>
        <span className="agent-progress-pct">{progressPct}%</span>
      </div>
      <div className="agent-progress-bar-track">
        <div
          className="agent-progress-bar-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="agent-progress-steps">
        {steps.map((step, i) => (
          <div key={i} className={`agent-progress-step ${step.status}`}>
            {stepIcon(step.status)}
            <span>{step.step}</span>
            {step.detail && step.status === 'completed' && (
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.7 }}>
                {step.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
