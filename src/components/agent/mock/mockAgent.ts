/**
 * Mock Agent Engine
 * 
 * Simulates agent behavior for UI testing. Replaced by real
 * WebSocket backend in Stage 2+.
 */
import type { AgentMessage, AgentOnboardingStatus, ActiveRun, ProgressStep } from '../../../types/agent';

let msgIdCounter = 0;
function nextId(): string {
  return `mock-${Date.now()}-${++msgIdCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

type MessageCallback = (msg: AgentMessage) => void;
type RunCallback = (run: ActiveRun | null) => void;

export class MockAgent {
  private onboardingStatus: AgentOnboardingStatus = 'uninitialized';
  private onMessage: MessageCallback = () => {};
  private onRunUpdate: RunCallback = () => {};
  private investigationTimer: ReturnType<typeof setTimeout> | null = null;
  private interviewStep = 0;

  constructor() {
    const saved = localStorage.getItem('agentOnboardingStatus');
    if (saved) {
      this.onboardingStatus = saved as AgentOnboardingStatus;
    }
  }

  setCallbacks(onMessage: MessageCallback, onRunUpdate: RunCallback) {
    this.onMessage = onMessage;
    this.onRunUpdate = onRunUpdate;
  }

  getOnboardingStatus(): AgentOnboardingStatus {
    return this.onboardingStatus;
  }

  private setStatus(status: AgentOnboardingStatus) {
    this.onboardingStatus = status;
    localStorage.setItem('agentOnboardingStatus', status);
  }

  /** Returns initial messages based on onboarding state */
  getInitialMessages(): AgentMessage[] {
    switch (this.onboardingStatus) {
      case 'uninitialized':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'action',
          content: '¡Hola! 👋 Soy **Zenith Agent**, tu asistente inteligente de búsqueda laboral.\n\nNoté que aún no tengo contexto de tu perfil profesional. ¿Quieres que investigue tu LinkedIn para entender tu experiencia y habilidades?',
          timestamp: now(),
          actions: [
            { label: '✅ Sí, investiga mi LinkedIn', action: 'start_linkedin', variant: 'primary' },
            { label: '⏭ Después', action: 'dismiss', variant: 'secondary' },
          ],
        }];

      case 'linkedin_pending':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'chat',
          content: 'Cuando quieras, puedo investigar tu perfil de LinkedIn para entender tu experiencia profesional. Solo dime "investiga mi LinkedIn" o usa el botón de abajo.',
          timestamp: now(),
          actions: [
            { label: '✅ Iniciar investigación', action: 'start_linkedin', variant: 'primary' },
          ],
        }];

      case 'interview_pending':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'action',
          content: '¡Perfecto! Ya investigué tu perfil de LinkedIn y tengo un buen panorama de tu experiencia. 🎯\n\nPara poder ayudarte mejor en la búsqueda, necesito hacerte una entrevista profesional rápida. Son algunas preguntas para entender tus objetivos, preferencias y lo que realmente buscas.\n\n¿Estás listo para comenzar?',
          timestamp: now(),
          actions: [
            { label: '🎤 Sí, empecemos', action: 'start_interview', variant: 'primary' },
            { label: '⏭ Ahora no', action: 'dismiss_interview', variant: 'secondary' },
          ],
        }];

      case 'interviewing':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'chat',
          content: 'Continuemos con la entrevista. ¿En qué tipo de empresa te gustaría trabajar? (startup, scaleup, corporativo grande, etc.)',
          timestamp: now(),
        }];

      case 'ready':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'chat',
          content: '¡Tu perfil está completo! 🎉 Estoy listo para buscar vacantes que se ajusten a tu perfil. ¿Quieres que inicie una búsqueda?',
          timestamp: now(),
          actions: [
            { label: '🔍 Iniciar búsqueda', action: 'start_search', variant: 'primary' },
          ],
        }];

      case 'searching':
        return [{
          id: nextId(),
          role: 'agent',
          type: 'chat',
          content: 'Tengo una búsqueda activa en curso. Te notificaré cuando encuentre nuevos matches. ¿Necesitas algo más?',
          timestamp: now(),
        }];

      default:
        return [];
    }
  }

  /** Handle an inline action button press */
  async handleAction(action: string): Promise<void> {
    switch (action) {
      case 'start_linkedin':
        this.setStatus('linkedin_investigating');
        this.onMessage({
          id: nextId(), role: 'agent', type: 'chat',
          content: 'Perfecto. Iniciando investigación de tu perfil profesional...',
          timestamp: now(),
        });
        await this.delay(600);
        this.simulateLinkedInInvestigation();
        break;

      case 'dismiss':
        this.setStatus('linkedin_pending');
        this.onMessage({
          id: nextId(), role: 'agent', type: 'chat',
          content: 'Sin problema. Cuando quieras iniciar, solo escríbeme. 👋',
          timestamp: now(),
        });
        break;

      case 'start_interview':
        this.setStatus('interviewing');
        this.interviewStep = 0;
        this.onMessage({
          id: nextId(), role: 'agent', type: 'chat',
          content: `¡Genial! Empecemos. 🎯\n\nPrimera pregunta: **${this.interviewQuestions[0].q}**`,
          timestamp: now(),
        });
        break;

      case 'dismiss_interview':
        this.onMessage({
          id: nextId(), role: 'agent', type: 'chat',
          content: 'Entendido. La entrevista queda pendiente. Cuando estés listo, solo dime "empecemos la entrevista". 😊',
          timestamp: now(),
        });
        break;

      case 'start_search':
        this.setStatus('searching');
        this.simulateJobSearch();
        break;
    }
  }

  /** Handle a free-text message from the user */
  async handleUserMessage(text: string): Promise<void> {
    if (this.onboardingStatus === 'interviewing') {
      await this.handleInterviewResponse(text);
      return;
    }

    // General conversation mock
    await this.delay(800);
    this.onMessage({
      id: nextId(), role: 'agent', type: 'thinking',
      content: `Analizando tu mensaje: "${text.slice(0, 60)}..."`,
      timestamp: now(), isCollapsed: true,
    });
    await this.delay(1200);
    this.onMessage({
      id: nextId(), role: 'agent', type: 'chat',
      content: this.getGenericResponse(text),
      timestamp: now(),
    });
  }

  /** Cleanup timers */
  destroy() {
    if (this.investigationTimer) clearTimeout(this.investigationTimer);
  }

  // ── Private ──────────────────────────────────────────

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  private getGenericResponse(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('busca') || lower.includes('search')) {
      return 'Puedo buscar vacantes en LinkedIn, Indeed, Wellfound y más. ¿Qué tipo de rol te interesa?';
    }
    if (lower.includes('linkedin')) {
      return 'Puedo investigar tu perfil de LinkedIn para entender mejor tu experiencia. ¿Quieres que lo haga?';
    }
    if (lower.includes('hola') || lower.includes('hi') || lower.includes('hey')) {
      return '¡Hola! ¿En qué puedo ayudarte hoy? Puedo buscar vacantes, analizar job postings, o investigar el mercado laboral.';
    }
    return 'Entendido. ¿Hay algo específico en lo que pueda ayudarte con tu búsqueda laboral?';
  }

  private async simulateLinkedInInvestigation(): Promise<void> {
    const steps: { step: string; detail: string; duration: number }[] = [
      { step: 'Accediendo a LinkedIn', detail: 'Navegando al perfil...', duration: 1500 },
      { step: 'Header del perfil', detail: 'Senior ML Engineer at TechCorp', duration: 2000 },
      { step: 'Experiencia laboral', detail: '5 posiciones encontradas', duration: 2500 },
      { step: 'Skills y endorsements', detail: '32 skills — Top: Python (47), React (38)', duration: 2000 },
      { step: 'Educación', detail: '2 instituciones extraídas', duration: 1500 },
      { step: 'Recomendaciones', detail: '8 recomendaciones analizadas', duration: 2000 },
      { step: 'Certificaciones', detail: '3 certificaciones encontradas', duration: 1200 },
      { step: 'Análisis final', detail: 'Generando perfil estructurado...', duration: 2000 },
    ];

    // Tool call message
    this.onMessage({
      id: nextId(), role: 'tool', type: 'tool_call',
      content: 'linkedin_profile_scraper',
      toolName: 'linkedin_profile_scraper',
      toolInput: { action: 'extract_full_profile', url: 'linkedin.com/in/user' },
      timestamp: now(), isCollapsed: false,
    });

    const progressSteps: ProgressStep[] = steps.map(s => ({
      step: s.step, status: 'pending' as const,
    }));

    const progressMsgId = nextId();

    for (let i = 0; i < steps.length; i++) {
      progressSteps[i].status = 'running';
      if (i > 0) progressSteps[i - 1] = { ...progressSteps[i - 1], status: 'completed', detail: steps[i - 1].detail };

      const pct = Math.round(((i + 0.5) / steps.length) * 100);

      this.onMessage({
        id: progressMsgId, role: 'agent', type: 'progress',
        content: 'Investigación de perfil LinkedIn',
        progressPct: pct,
        progressSteps: [...progressSteps],
        timestamp: now(),
      });

      this.onRunUpdate({
        id: 'run-linkedin-1', type: 'linkedin_investigation',
        status: 'running', progressPct: pct,
        description: `Investigando LinkedIn — ${steps[i].step}`,
      });

      await this.delay(steps[i].duration);
    }

    // Mark all done
    const finalSteps = steps.map(s => ({
      step: s.step, status: 'completed' as const, detail: s.detail,
    }));
    this.onMessage({
      id: progressMsgId, role: 'agent', type: 'progress',
      content: 'Investigación de perfil LinkedIn',
      progressPct: 100,
      progressSteps: finalSteps,
      timestamp: now(),
    });

    this.onRunUpdate(null);
    await this.delay(500);

    // Summary
    this.onMessage({
      id: nextId(), role: 'agent', type: 'chat',
      content: '✅ **Investigación completada.**\n\nResumen de tu perfil:\n- **Título actual**: Senior ML Engineer\n- **Experiencia**: 8 años, 5 posiciones\n- **Top Skills**: Python, PyTorch, React, Node.js, PostgreSQL\n- **Educación**: Ingeniería de Sistemas, MBA\n- **Recomendaciones**: 8 (todas positivas)\n\nEl siguiente paso es una entrevista profesional para entender tus objetivos y preferencias. ¿Estás listo?',
      timestamp: now(),
      actions: [
        { label: '🎤 Iniciar entrevista', action: 'start_interview', variant: 'primary' },
        { label: '⏭ Después', action: 'dismiss_interview', variant: 'secondary' },
      ],
    });

    this.setStatus('interview_pending');
  }

  private interviewQuestions = [
    { q: '¿Qué tipo de rol estás buscando activamente? (por ejemplo: Individual Contributor, Tech Lead, Engineering Manager, etc.)', topic: 'role' },
    { q: '¿Cuál es tu **rango salarial** esperado (USD anual)?', topic: 'salary' },
    { q: '¿Prefieres trabajo **remoto**, **híbrido** o **presencial**?', topic: 'modality' },
    { q: '¿Qué **industrias** te interesan más? (AI/ML, Fintech, HealthTech, etc.)', topic: 'industry' },
    { q: '¿Qué **tamaño de empresa** prefieres? (startup <50, scaleup 50-500, enterprise 500+)', topic: 'company_size' },
    { q: '¿Hay algo que sea un **NO absoluto** para ti en un trabajo? (deal breakers)', topic: 'deal_breakers' },
  ];

  private async handleInterviewResponse(text: string): Promise<void> {
    this.interviewStep++;

    // Thinking
    await this.delay(500);
    this.onMessage({
      id: nextId(), role: 'agent', type: 'thinking',
      content: `Analizando respuesta sobre "${this.interviewQuestions[this.interviewStep - 1]?.topic || 'career goals'}"...`,
      timestamp: now(), isCollapsed: true,
    });
    await this.delay(800);

    if (this.interviewStep < this.interviewQuestions.length) {
      // Acknowledge + next question
      const next = this.interviewQuestions[this.interviewStep];
      this.onMessage({
        id: nextId(), role: 'agent', type: 'chat',
        content: `Perfecto, anotado. 📝\n\nSiguiente pregunta: **${next.q}**`,
        timestamp: now(),
      });
    } else if (this.interviewStep === this.interviewQuestions.length) {
      // Career suggestion
      this.onMessage({
        id: nextId(), role: 'agent', type: 'suggestion',
        content: '💡 **Sugerencia de carrera**\n\nBasándome en tu experiencia en ML y tu interés en producto, he identificado que los roles de **ML Platform Engineer** y **AI Product Manager** están en alta demanda y pagan 15-25% más que ML Engineer puro. ¿Te interesa que busque en esas direcciones también?',
        timestamp: now(),
        actions: [
          { label: '👍 Sí, incluye esos roles', action: 'accept_suggestion', variant: 'primary' },
          { label: '👎 No, solo lo que pedí', action: 'reject_suggestion', variant: 'secondary' },
        ],
      });
    } else {
      // Finish interview
      this.setStatus('ready');
      this.onMessage({
        id: nextId(), role: 'agent', type: 'chat',
        content: '🎉 **¡Entrevista completada!**\n\nTu perfil profesional está listo. Tengo toda la información que necesito para buscar vacantes que se ajusten a tu perfil.\n\n¿Quieres que inicie la primera búsqueda?',
        timestamp: now(),
        actions: [
          { label: '🔍 Iniciar búsqueda', action: 'start_search', variant: 'primary' },
        ],
      });
    }
  }

  private async simulateJobSearch(): Promise<void> {
    this.onMessage({
      id: nextId(), role: 'agent', type: 'chat',
      content: 'Iniciando búsqueda en LinkedIn Jobs, Indeed y Wellfound...',
      timestamp: now(),
    });

    this.onRunUpdate({
      id: 'run-search-1', type: 'job_search',
      status: 'running', progressPct: 0,
      description: 'Buscando vacantes en portales de empleo...',
    });

    this.onMessage({
      id: nextId(), role: 'tool', type: 'tool_call',
      content: 'browser_search', toolName: 'browser_search',
      toolInput: { portal: 'linkedin', query: 'ML Engineer remote', pages: 3 },
      timestamp: now(), isCollapsed: true,
    });

    const portals = ['LinkedIn Jobs', 'Indeed', 'Wellfound'];
    for (let i = 0; i < portals.length; i++) {
      const pct = Math.round(((i + 1) / portals.length) * 100);
      await this.delay(3000);
      this.onRunUpdate({
        id: 'run-search-1', type: 'job_search',
        status: 'running', progressPct: pct,
        description: `Buscando en ${portals[i]}...`,
      });
    }

    this.onRunUpdate(null);
    await this.delay(500);

    this.onMessage({
      id: nextId(), role: 'agent', type: 'chat',
      content: '✅ **Búsqueda completada.**\n\nEncontré **7 vacantes** con match score > 70%:\n\n1. 🏢 **Stripe** — Senior ML Engineer (Remote) — Match: 92%\n2. 🏢 **Datadog** — Staff ML Platform Engineer — Match: 88%\n3. 🏢 **Notion** — ML Engineer, Search — Match: 85%\n4. 🏢 **Scale AI** — Senior ML Engineer — Match: 82%\n5. 🏢 **Anthropic** — ML Research Engineer — Match: 79%\n6. 🏢 **Vercel** — AI Engineer — Match: 76%\n7. 🏢 **Linear** — ML Engineer — Match: 72%\n\nLas agregué a tu board **"ML Roles Q3"** con status **Interested**. ¿Quieres que analice alguna en detalle?',
      timestamp: now(),
    });

    this.setStatus('ready');
  }
}
