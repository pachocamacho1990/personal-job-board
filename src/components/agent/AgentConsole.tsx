import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentMessage as AgentMessageType, ActiveRun, AgentOnboardingStatus } from '../../types/agent';
import { AgentChat } from './AgentChat';
import { AgentInput } from './AgentInput';
import { AgentStatusBar } from './AgentStatusBar';
import '../../styles/agent-console.css';

export const AgentConsole: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    return localStorage.getItem('agentPanelOpen') === 'true';
  });
  const [messages, setMessages] = useState<AgentMessageType[]>([]);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<AgentOnboardingStatus>('uninitialized');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  
  const wsRef = useRef<WebSocket | null>(null);

  // Establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setConnectionStatus('closed');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/jobboard/agent-ws?token=${token}`;
      logger.info("Connecting to Agent WebSocket:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setConnectionStatus('connecting');

      ws.onopen = () => {
        logger.info("Agent WebSocket connected successfully");
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = json.parse(event.data);
          
          if (data.event === 'history') {
            setMessages(data.messages);
            setOnboardingStatus(data.onboardingStatus);
            // If onboarding is uninitialized and panel closed, show unread count
            if (data.onboardingStatus === 'uninitialized' && !isPanelOpenRef.current) {
              setUnreadCount(1);
            }
          } 
          
          else if (data.event === 'messages_update') {
            setMessages(data.messages);
            
            // Check if the last message is an agent message and the panel is closed to show unread badge
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg && lastMsg.role === 'agent' && !isPanelOpenRef.current) {
              setUnreadCount(prev => prev + 1);
            }
          } 
          
          else if (data.event === 'run_update') {
            setActiveRun(data.run);
          }
          
          else if (data.event === 'onboarding_status_update') {
            setOnboardingStatus(data.status);
          }
        } catch (err) {
          logger.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = (event) => {
        logger.warn("Agent WebSocket disconnected", event);
        setConnectionStatus('closed');
        // Retry connection in 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        logger.error("Agent WebSocket error:", err);
        setConnectionStatus('error');
      };

    } catch (e) {
      logger.error("Failed to initialize WebSocket:", e);
      setConnectionStatus('error');
    }
  }, []);

  // Set up connection on mount
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Keep a ref to isPanelOpen for the callback closure
  const isPanelOpenRef = useRef(isPanelOpen);
  useEffect(() => {
    isPanelOpenRef.current = isPanelOpen;
  }, [isPanelOpen]);

  // Persist panel state
  useEffect(() => {
    localStorage.setItem('agentPanelOpen', String(isPanelOpen));

    // Toggle class on main-content elements
    const mainContents = document.querySelectorAll('.main-content, .docs-content');
    mainContents.forEach(el => {
      if (isPanelOpen) {
        el.classList.add('agent-open');
      } else {
        el.classList.remove('agent-open');
      }
    });
  }, [isPanelOpen]);

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => {
      if (!prev) {
        // Opening — clear unread
        setUnreadCount(0);
      }
      return !prev;
    });
  }, []);

  const handleAction = useCallback((action: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error("Cannot click action: WebSocket is not open");
      return;
    }

    const actionLabel = messages
      .flatMap(m => m.actions || [])
      .find(a => a.action === action)?.label || action;

    ws.send(JSON.stringify({
      event: 'action',
      action: action,
      label: actionLabel
    }));
  }, [messages]);

  const handleSend = useCallback((text: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error("Cannot send message: WebSocket is not open");
      return;
    }

    ws.send(JSON.stringify({
      event: 'message',
      content: text
    }));
  }, []);

  // Console helper objects to bypass missing globals
  const logger = {
    info: (...args: any[]) => console.log("[AgentConsole]", ...args),
    warn: (...args: any[]) => console.warn("[AgentConsole]", ...args),
    error: (...args: any[]) => console.error("[AgentConsole]", ...args)
  };
  const json = JSON;

  const isOnline = connectionStatus === 'connected';

  return (
    <>
      {/* Toggle Button (visible when panel is closed) */}
      {!isPanelOpen && (
        <button
          className="agent-toggle-btn"
          onClick={togglePanel}
          aria-label="Abrir Zenith Agent"
        >
          {unreadCount > 0 && (
            <span className="agent-toggle-badge">{unreadCount}</span>
          )}
          <span className="toggle-icon">🧠</span>
          <span className="toggle-label">Agent</span>
        </button>
      )}

      {/* Panel */}
      <div className={`agent-panel ${isPanelOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="agent-header">
          <div className="agent-header-icon">🧠</div>
          <div className="agent-header-info">
            <div className="agent-header-title">Zenith Agent</div>
            <div className={`agent-header-status ${isOnline ? 'online' : 'offline'}`} style={{ color: isOnline ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
              {isOnline && <span className="agent-status-dot" />}
              {isOnline ? 'Online' : 'Conectando...'}
            </div>
          </div>
          <button
            className="agent-close-btn"
            onClick={togglePanel}
            aria-label="Cerrar panel del agente"
          >
            ✕
          </button>
        </div>

        {/* Chat */}
        <AgentChat
          messages={messages}
          onAction={handleAction}
        />

        {/* Input */}
        <AgentInput onSend={handleSend} disabled={!isOnline} />
      </div>

      {/* Global Status Bar */}
      <AgentStatusBar
        activeRun={activeRun}
        isPanelOpen={isPanelOpen}
        onViewClick={() => setIsPanelOpen(true)}
      />
    </>
  );
};
