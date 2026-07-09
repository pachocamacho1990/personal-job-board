import React, { useState, useRef, useEffect } from 'react';
import type { AgentMessage as AgentMessageType } from '../../types/agent';

interface Props {
  message: AgentMessageType;
  onAction?: (action: string) => void;
  canEdit?: boolean;
  onEditMessage?: (messageId: number, content: string) => void;
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

export const AgentMessage: React.FC<Props> = ({ message, onAction, canEdit = false, onEditMessage }) => {
  const [collapsed, setCollapsed] = useState(message.isCollapsed ?? false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(message.content);
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
        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
          {isEditing ? (
            <div className="agent-msg-bubble" style={{ width: '100%', background: 'var(--color-bg-card)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
              <textarea
                className="agent-input-field"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                style={{ width: '100%', minHeight: '100px', maxHeight: 'none', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-input)', resize: 'vertical', overflowY: 'auto' }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditVal(message.content);
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editVal.trim()) {
                      onEditMessage?.(Number(message.id), editVal.trim());
                      setIsEditing(false);
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Guardar y enviar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', width: '100%', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {canEdit && message.role === 'user' && message.type === 'chat' && (
                <button
                  className="agent-msg-edit-btn"
                  onClick={() => setIsEditing(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    padding: '4px',
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'opacity 0.2s'
                  }}
                  title="Editar mensaje"
                >
                  ✏️
                </button>
              )}
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
            </div>
          )}
        </div>
      )}
      <div className="agent-msg-time">{formatTime(message.timestamp)}</div>
    </div>
  );
};
