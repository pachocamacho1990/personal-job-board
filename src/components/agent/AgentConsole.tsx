import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AgentMessage as AgentMessageType, ActiveRun, AgentOnboardingStatus } from '../../types/agent';
import { AgentChat } from './AgentChat';
import { AgentInput } from './AgentInput';
import { AgentStatusBar } from './AgentStatusBar';
import { navigateTo } from '../../router';
import { apiRequest } from '../../api';
import '../../styles/agent-console.css';

interface ConversationHistory {
  id: number;
  title: string;
  createdAt: string;
  lastMessage: string;
  lastActive: string;
}
export const AgentConsole: React.FC = () => {
  const logger = {
    info: (...args: any[]) => console.log("[AgentConsole]", ...args),
    warn: (...args: any[]) => console.warn("[AgentConsole]", ...args),
    error: (...args: any[]) => console.error("[AgentConsole]", ...args)
  };
  const json = JSON;

  const [isPanelOpen, setIsPanelOpen] = useState(() => {
    return localStorage.getItem('agentPanelOpen') === 'true';
  });
  const [messages, setMessages] = useState<AgentMessageType[]>([]);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<AgentOnboardingStatus>('uninitialized');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'closed'>('connecting');
  
  // New States for Multi-Chat & Stop Button
  const [viewMode, setViewMode] = useState<'chat' | 'list'>('chat');
  const [conversations, setConversations] = useState<ConversationHistory[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Strategy Panel States
  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | ''>('');
  const [careerStrategy, setCareerStrategy] = useState<any>(null);
  const [searchPrompt, setSearchPrompt] = useState<string | null>(null);
  const [showStrategyPanel, setShowStrategyPanel] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

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
        // Fetch conversations list immediately on open
        ws.send(JSON.stringify({ event: 'list_conversations' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = json.parse(event.data);
          
          if (data.event === 'history') {
            setMessages(data.messages);
            setOnboardingStatus(data.onboardingStatus);
            if (data.conversationId) {
              setActiveConversationId(data.conversationId);
            }
            // If onboarding is uninitialized and panel closed, show unread count
            if (data.onboardingStatus === 'uninitialized' && !isPanelOpenRef.current) {
              setUnreadCount(1);
            }
          } 
          
          else if (data.event === 'messages_update') {
            setMessages(data.messages);
            
            // Dispatch custom event to notify other pages (dashboard, jobs, business) to reload their data in real-time
            const hasToolResult = data.messages.some((m: any) => m.role === 'tool' && m.type === 'tool_result');
            if (hasToolResult) {
              window.dispatchEvent(new CustomEvent('workspace-updated'));
            }
            
            // Check if the last message is an agent message and the panel is closed to show unread badge
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg && lastMsg.role === 'agent' && !isPanelOpenRef.current) {
              setUnreadCount(prev => prev + 1);
            }
            
            // Request refreshed conversations list to update titles/snippets
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ event: 'list_conversations' }));
            }
          } 
          
          else if (data.event === 'conversations_list') {
            setConversations(data.conversations);
          }

          else if (data.event === 'generation_started') {
            setIsGenerating(true);
          }

          else if (data.event === 'generation_stopped') {
            setIsGenerating(false);
          }
          
          else if (data.event === 'run_update') {
            setActiveRun(data.run);
          }
          
          else if (data.event === 'navigate') {
            navigateTo(data.url);
          }
          
          else if (data.event === 'onboarding_status_update') {
            logger.info("ONBOARDING STATUS UPDATE WS EVENT:", data.status);
            setOnboardingStatus(data.status);
            if (data.status === 'ready') {
              window.dispatchEvent(new CustomEvent('workspace-updated'));
            }
          }
        } catch (err) {
          logger.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = (event) => {
        logger.warn("Agent WebSocket disconnected", event);
        setConnectionStatus('closed');
        setIsGenerating(false);
        // Retry connection in 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (err) => {
        logger.error("Agent WebSocket error:", err);
        setConnectionStatus('error');
        setIsGenerating(false);
      };

    } catch (e) {
      logger.error("Failed to initialize WebSocket:", e);
      setConnectionStatus('error');
      setIsGenerating(false);
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

  // Listen to profile-saved event and send WebSocket message to agent service
  useEffect(() => {
    const handleProfileSaved = () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'profile_saved' }));
      }
    };
    window.addEventListener('profile-saved', handleProfileSaved);
    return () => window.removeEventListener('profile-saved', handleProfileSaved);
  }, []);

  // Fetch strategy and boards when onboardingStatus is ready
  useEffect(() => {
    logger.info("onboardingStatus changed:", onboardingStatus);
    if (onboardingStatus === 'ready') {
      logger.info("onboardingStatus is ready! Fetching profile and boards...");
      apiRequest('/profile')
        .then(data => {
          logger.info("FETCHED PROFILE DATA:", data);
          if (data.career_strategy) setCareerStrategy(data.career_strategy);
          if (data.search_prompt) setSearchPrompt(data.search_prompt);
        })
        .catch(err => logger.error("Error loading strategy:", err));

      apiRequest('/boards')
        .then(data => {
          logger.info("FETCHED BOARDS:", data);
          setBoards(data);
          if (data.length > 0) {
            setSelectedBoardId(data[0].id);
          }
        })
        .catch(err => logger.error("Error loading boards:", err));
    }
  }, [onboardingStatus]);

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

  const handleEditMessage = useCallback((messageId: number, content: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.error("Cannot edit message: WebSocket is not open");
      return;
    }

    setIsGenerating(true);
    ws.send(JSON.stringify({
      event: 'edit_message',
      messageId: messageId,
      content: content
    }));
  }, []);

  // New WebSocket Event Emitters
  const handleNewChat = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event: 'new_conversation' }));
    setViewMode('chat');
  }, []);

  const handleSelectChat = useCallback((id: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event: 'select_conversation', conversation_id: id }));
    setViewMode('chat');
  }, []);

  const handleDeleteChat = useCallback((e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // prevent opening the chat
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event: 'delete_conversation', conversation_id: id }));
  }, []);

  const handleStop = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ event: 'stop_generation' }));
    setIsGenerating(false);
  }, []);

  const formatConvDate = (isoString: string | null) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  };



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
          
          {/* Header Action Buttons (Only visible when connected) */}
          {isOnline && (
            <div className="agent-header-actions">
              <button
                className={`agent-header-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode(prev => prev === 'chat' ? 'list' : 'chat')}
                title="Historial de conversaciones"
                aria-label="Ver historial"
              >
                💬
              </button>
              <button
                className="agent-header-btn"
                onClick={handleNewChat}
                title="Nueva conversación"
                aria-label="Nuevo chat"
              >
                ➕
              </button>
            </div>
          )}

          <button
            className="agent-close-btn"
            onClick={togglePanel}
            aria-label="Cerrar panel del agente"
          >
            ✕
          </button>
        </div>

        {/* View Selection: Chat vs History List */}
        {viewMode === 'list' ? (
          <div className="agent-conv-list">
            <div style={{ padding: '0 4px 8px 4px', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Chats Recientes
            </div>
            {conversations.length === 0 ? (
              <div className="empty-state" style={{ fontSize: '0.85rem' }}>No hay chats anteriores.</div>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`agent-conv-item ${conv.id === activeConversationId ? 'active' : ''}`}
                  onClick={() => handleSelectChat(conv.id)}
                >
                  <div className="agent-conv-info">
                    <div className="agent-conv-title">{conv.title}</div>
                    <div className="agent-conv-snippet">
                      {conv.lastMessage ? conv.lastMessage : 'Sin mensajes'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {formatConvDate(conv.lastActive || conv.createdAt)}
                    </div>
                  </div>
                  
                  {/* Delete conversation button */}
                  <button
                    className="agent-conv-delete"
                    onClick={(e) => handleDeleteChat(e, conv.id)}
                    title="Eliminar conversación"
                    aria-label="Eliminar chat"
                  >
                    🗑
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <>


            {/* Chat Messages */}
            <AgentChat
              messages={messages}
              onAction={handleAction}
              onEditMessage={handleEditMessage}
            />

            {/* Floating Stop Button (visible while generating/thinking) */}
            {isGenerating && (
              <div className="agent-stop-container">
                <button 
                  className="agent-stop-btn" 
                  onClick={handleStop}
                  aria-label="Detener generación de IA"
                >
                  <span style={{ fontSize: '0.65rem' }}>⏹</span> Detener respuesta
                </button>
              </div>
            )}

            {/* Input Form */}
            <AgentInput onSend={handleSend} disabled={!isOnline} />
          </>
        )}
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
