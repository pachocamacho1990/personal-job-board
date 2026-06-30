import React from 'react';
import type { ProgressStep } from '../../types/agent';

interface Props {
  title: string;
  progressPct: number;
  steps: ProgressStep[];
}

function stepIcon(status: ProgressStep['status']): React.ReactNode {
  switch (status) {
    case 'completed': return <span className="agent-step-icon">✅</span>;
    case 'running':   return <span className="agent-step-icon"><span className="agent-step-running-spinner" /></span>;
    case 'failed':    return <span className="agent-step-icon">❌</span>;
    default:          return <span className="agent-step-icon">○</span>;
  }
}

export const AgentProgress: React.FC<Props> = ({ title, progressPct, steps }) => {
  return (
    <div className="agent-progress">
      <div className="agent-progress-title">
        <span>📊</span>
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
