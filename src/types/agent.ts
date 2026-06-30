// Agent Console Type Definitions

export type AgentOnboardingStatus =
  | 'uninitialized'
  | 'linkedin_pending'
  | 'linkedin_investigating'
  | 'interview_pending'
  | 'interviewing'
  | 'ready'
  | 'searching';

export type MessageRole = 'agent' | 'user' | 'system' | 'tool';

export type MessageType =
  | 'chat'
  | 'thinking'
  | 'tool_call'
  | 'tool_result'
  | 'progress'
  | 'notification'
  | 'suggestion'
  | 'action';

export interface ProgressStep {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
}

export interface ActionButton {
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'danger';
}

export interface AgentMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp: string;

  // For tool_call messages
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;

  // For progress messages
  progressPct?: number;
  progressSteps?: ProgressStep[];

  // For action messages (inline buttons)
  actions?: ActionButton[];

  // UI state
  isCollapsed?: boolean;
  isStreaming?: boolean;
}

export interface ActiveRun {
  id: string;
  type: string;
  status: 'running' | 'paused';
  progressPct: number;
  description: string;
}

export interface AgentState {
  isOnline: boolean;
  isPanelOpen: boolean;
  onboardingStatus: AgentOnboardingStatus;
  messages: AgentMessage[];
  activeRun: ActiveRun | null;
  unreadCount: number;
}
