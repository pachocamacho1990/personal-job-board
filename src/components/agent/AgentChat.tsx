import React, { useRef, useEffect } from 'react';
import type { AgentMessage as AgentMessageType } from '../../types/agent';
import { AgentMessage } from './AgentMessage';
import { AgentProgress } from './AgentProgress';

interface Props {
  messages: AgentMessageType[];
  onAction: (action: string) => void;
}

export const AgentChat: React.FC<Props> = ({ messages, onAction }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = bottomRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  return (
    <div className="agent-chat" ref={chatRef}>
      {messages.map((msg) => {
        // Progress messages render as a special block
        if (msg.type === 'progress' && msg.progressSteps) {
          return (
            <AgentProgress
              key={msg.id}
              title={msg.content}
              progressPct={msg.progressPct ?? 0}
              steps={msg.progressSteps}
            />
          );
        }

        return (
          <AgentMessage
            key={msg.id}
            message={msg}
            onAction={onAction}
          />
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
