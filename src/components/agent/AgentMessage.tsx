import React, { useState } from 'react';
import type { AgentMessage as AgentMessageType } from '../../types/agent';

interface Props {
  message: AgentMessageType;
  onAction?: (action: string) => void;
}

/** Renders bold markdown (**text**) as <strong> */
function renderContent(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Convert newlines to <br>
    const lines = part.split('\n');
    return lines.map((line, j) => (
      <React.Fragment key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </React.Fragment>
    ));
  });
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const AgentMessage: React.FC<Props> = ({ message, onAction }) => {
  const [collapsed, setCollapsed] = useState(message.isCollapsed ?? false);
  const isCollapsible = message.type === 'thinking' || message.type === 'tool_call';

  const classNames = [
    'agent-msg',
    `role-${message.role}`,
    `type-${message.type}`,
    collapsed ? 'agent-msg-collapsed' : '',
  ].filter(Boolean).join(' ');

  // Tool call label
  const toolLabel = message.type === 'tool_call'
    ? `🔧 ${message.toolName || 'tool'}`
    : message.type === 'thinking'
    ? '💭 Thinking'
    : null;

  return (
    <div className={classNames}>
      {isCollapsible && (
        <button
          className="agent-msg-collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
        >
          <span>{collapsed ? '▶' : '▼'}</span>
          {toolLabel}
        </button>
      )}
      {!collapsed && (
        <div className="agent-msg-bubble">
          <div className="agent-msg-content">
            {renderContent(message.content)}
          </div>
          {message.actions && message.actions.length > 0 && (
            <div className="agent-msg-actions">
              {message.actions.map((btn) => (
                <button
                  key={btn.action}
                  className={`agent-action-btn variant-${btn.variant}`}
                  onClick={() => onAction?.(btn.action)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="agent-msg-time">{formatTime(message.timestamp)}</div>
    </div>
  );
};
