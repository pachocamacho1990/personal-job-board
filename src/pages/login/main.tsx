import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { navigateTo } from '../../router';
import { DocsIcon, RocketIcon } from '../../components/icons';
import '../../styles/styles.css';
import '../../styles/login.css';

export const LoginPage: React.FC = () => {
  const [isSignupMode, setIsSignupMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check if already logged in
    if (localStorage.getItem('authToken')) {
      navigateTo('/jobboard/index.html');
    }
  }, []);

  const isValidEmail = (val: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const handleToggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsSignupMode(!isSignupMode);
    setError('');
  };

  const handleInputEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError('');
  };

  const handleInputPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter both email and password');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (isSignupMode) {
        await api.auth.signup(trimmedEmail, password);
      } else {
        await api.auth.login(trimmedEmail, password);
      }
      navigateTo('/jobboard/index.html');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="login-split-container">
      {/* Left side: Stark Form Pane */}
      <div className="login-form-pane">
        <div className="login-form-wrapper">
          <div className="login-brand">
            <RocketIcon size={24} style={{ color: 'var(--cds-button-primary)' }} />
            <span>Zenith</span>
          </div>

          <div className="auth-header">
            <h1 id="formTitle">{isSignupMode ? 'Create Account' : 'Welcome Back'}</h1>
            <p>Track your job applications and connections</p>
          </div>

          {error && (
            <div id="errorMessage" className="error-message" style={{ display: 'block' }} role="alert">
              {error}
            </div>
          )}

          <form id="authForm" className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                value={email}
                onChange={handleInputEmailChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="At least 6 characters"
                required
                autoComplete={isSignupMode ? 'new-password' : 'current-password'}
                minLength={6}
                value={password}
                onChange={handleInputPasswordChange}
              />
            </div>

            <button type="submit" id="submitBtn" className="btn-submit" disabled={isLoading}>
              <span>
                {isLoading
                  ? isSignupMode
                    ? 'Creating account...'
                    : 'Logging in...'
                  : isSignupMode
                  ? 'Sign Up'
                  : 'Log In'}
              </span>
              <span>→</span>
            </button>
          </form>

          <p className="toggle-mode">
            <a href="#" id="toggleMode" onClick={handleToggleMode}>
              {isSignupMode ? (
                <>Already have an account? <strong>Log in</strong></>
              ) : (
                <>Don't have an account? <strong>Sign up</strong></>
              )}
            </a>
          </p>
          <p className="toggle-mode" style={{ marginTop: '20px', borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '16px' }}>
            <a
              href="/jobboard/docs.html"
              style={{ opacity: 0.8, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/jobboard/docs.html');
              }}
            >
              <DocsIcon size={14} /> Documentación y APIs de la App
            </a>
          </p>
        </div>
      </div>

      {/* Right side: Diagrammatic Showcase Pane */}
      <div className="login-showcase-pane">
        <div className="showcase-content">
          <div className="blueprint-container">
            {/* Custom SVG diagram depicting job portals, automation, and flowchart */}
            <svg viewBox="0 0 600 450" fill="none" className="blueprint-svg">
              {/* Background Grid Pattern */}
              <defs>
                <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--showcase-text)" strokeOpacity="0.03" strokeWidth="1" />
                </pattern>
                <linearGradient id="primary-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--showcase-blue)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--showcase-purple)" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="accent-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--showcase-purple)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--showcase-teal)" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Apply grid pattern */}
              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* Connecting Pipeline Paths (Flowchart lines) */}
              <path d="M120,160 L240,160 L240,240 M240,240 L380,240 L380,310" stroke="var(--showcase-blue)" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M470,220 L470,280 M380,180 L470,180 L470,220" stroke="var(--showcase-purple)" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* Connection glows */}
              <circle cx="240" cy="240" r="4" fill="var(--showcase-blue)" />
              <circle cx="240" cy="240" r="12" stroke="var(--showcase-blue)" strokeOpacity="0.3" strokeWidth="1.5" />
              
              <circle cx="470" cy="220" r="4" fill="var(--showcase-purple)" />
              <circle cx="470" cy="220" r="12" stroke="var(--showcase-purple)" strokeOpacity="0.3" strokeWidth="1.5" />

              {/* Mock Job Card (Stripe Job offer portal) */}
              <g transform="translate(40, 50)">
                <rect width="200" height="130" rx="8" fill="var(--showcase-surface)" stroke="var(--showcase-blue)" strokeOpacity="0.4" strokeWidth="1.5" />
                <rect width="200" height="8" rx="4" fill="var(--showcase-blue)" fillOpacity="0.2" />
                {/* Browser dots */}
                <circle cx="16" cy="18" r="4" fill="#ff5f56" />
                <circle cx="28" cy="18" r="4" fill="#ffbd2e" />
                <circle cx="40" cy="18" r="4" fill="#27c93f" />
                
                {/* Job metadata */}
                <text x="16" y="48" fill="var(--showcase-text)" fontSize="13" fontWeight="600" fontFamily="var(--cds-font-sans)">Senior AI Specialist</text>
                <text x="16" y="65" fill="var(--showcase-text-muted)" fontSize="11" fontFamily="var(--cds-font-sans)">Stripe • San Francisco, CA</text>
                <line x1="16" y1="78" x2="184" y2="78" stroke="var(--showcase-text)" strokeOpacity="0.08" strokeWidth="1" />
                
                <rect x="16" y="92" width="60" height="18" rx="3" fill="var(--showcase-blue)" fillOpacity="0.1" stroke="var(--showcase-blue)" strokeOpacity="0.3" strokeWidth="1" />
                <text x="24" y="104" fill="var(--showcase-blue)" fontSize="9" fontWeight="600" fontFamily="var(--cds-font-sans)">Interested</text>
                
                <text x="140" y="104" fill="var(--showcase-green)" fontSize="10" fontWeight="600" fontFamily="var(--cds-font-sans)">$165k/yr</text>
              </g>

              {/* Mock ATS Copilot Analyzer (Radial graph card) */}
              <g transform="translate(320, 80)">
                <rect width="220" height="130" rx="8" fill="var(--showcase-surface)" stroke="var(--showcase-purple)" strokeOpacity="0.4" strokeWidth="1.5" />
                
                <text x="18" y="32" fill="var(--showcase-text)" fontSize="13" fontWeight="600" fontFamily="var(--cds-font-sans)">ATS Match Optimizador</text>
                <text x="18" y="48" fill="var(--showcase-text-muted)" fontSize="10" fontFamily="var(--cds-font-sans)">Analizando currículum vs. vacante</text>
                
                {/* Radial Gauge */}
                <circle cx="50" cy="95" r="22" stroke="var(--showcase-purple)" strokeOpacity="0.15" strokeWidth="4.5" />
                <circle cx="50" cy="95" r="22" stroke="var(--showcase-purple)" strokeWidth="4.5" strokeDasharray="138" strokeDashoffset="24" strokeLinecap="round" />
                <text x="50" y="99" fill="var(--showcase-text)" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="var(--cds-font-sans)">82%</text>

                {/* Score legend */}
                <rect x="94" y="76" width="108" height="6" rx="3" fill="var(--showcase-text)" fillOpacity="0.05" />
                <rect x="94" y="76" width="88" height="6" rx="3" fill="var(--showcase-purple)" />
                <text x="94" y="98" fill="var(--showcase-text)" fontSize="11" fontWeight="600" fontFamily="var(--cds-font-sans)">Directiva Encontrada</text>
                <text x="94" y="112" fill="var(--showcase-text-muted)" fontSize="9" fontFamily="var(--cds-font-sans)">Matching keyword: "MLOps"</text>
              </g>

              {/* Mock Automation Portal (Stages / Kanban flow) */}
              <g transform="translate(120, 260)">
                <rect width="240" height="130" rx="8" fill="var(--showcase-surface)" stroke="var(--showcase-teal)" strokeOpacity="0.4" strokeWidth="1.5" />
                
                {/* Brand Monogram & Title */}
                <rect x="16" y="16" width="28" height="28" rx="4" fill="var(--showcase-teal)" fillOpacity="0.15" stroke="var(--showcase-teal)" strokeOpacity="0.3" strokeWidth="1" />
                {/* Inline sparkle */}
                <path d="M30 22c0 2.2-1.8 4-4 4 2.2 0 4 1.8 4 4 0-2.2 1.8-4 4-4-2.2 0-4-1.8-4-4z" fill="var(--showcase-teal)" />
                
                <text x="56" y="28" fill="var(--showcase-text)" fontSize="13" fontWeight="600" fontFamily="var(--cds-font-sans)">Pipeline Automatizado</text>
                <text x="56" y="42" fill="var(--showcase-text-muted)" fontSize="10" fontFamily="var(--cds-font-sans)">Disparando tareas de postulación...</text>

                {/* Checklist */}
                <g transform="translate(16, 68)">
                  <circle cx="8" cy="8" r="6" stroke="var(--showcase-teal)" strokeWidth="1.5" fill="none" />
                  <path d="M5 8 L7 10 L11 6" stroke="var(--showcase-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="24" y="12" fill="var(--showcase-text)" fontSize="10" fontFamily="var(--cds-font-sans)">Validar perfil profesional</text>
                </g>

                <g transform="translate(16, 94)">
                  <circle cx="8" cy="8" r="6" stroke="var(--showcase-teal)" strokeWidth="1.5" fill="none" />
                  <path d="M5 8 L7 10 L11 6" stroke="var(--showcase-teal)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="24" y="12" fill="var(--showcase-text)" fontSize="10" fontFamily="var(--cds-font-sans)">Generar carta de presentación con IA</text>
                </g>
              </g>
            </svg>
          </div>

          <div className="showcase-text">
            <h2>Take command of your career pipelines.</h2>
            <p>
              Zenith bridges the gap between applications, networks, and automation. Build dynamic kanban trackers, optimize resumes with ATS copilots, and manage contacts under a single design system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
