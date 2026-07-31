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
            {/* What the product actually is: opportunities moving through a pipeline,
                with the agent feeding new ones in at the top.

                The diagram this replaced advertised an ATS match optimiser, a
                percentage score and AI cover-letter generation. None of those
                exist. A login page is the first promise the product makes, and
                that one was writing cheques the app cannot cash — so this shows
                the board, the stages and the agent, which are real.

                The stage colours are the board's own: Interested is purple,
                Applied is blue, Offer is green. Someone who signs up sees the
                same three columns in the same three colours. */}
            <svg viewBox="0 0 600 450" fill="none" className="blueprint-svg" role="img"
                 aria-label="Zenith's pipeline: the agent surfaces matches, and opportunities move from Interested through Applied to Offer.">
              <defs>
                <pattern id="grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="var(--showcase-text)" strokeOpacity="0.03" strokeWidth="1" />
                </pattern>
                {/* The aura the app puts on agent-created cards, at showcase scale. */}
                <linearGradient id="agent-aura" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="var(--showcase-blue)" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="var(--showcase-blue)" stopOpacity="0" />
                </linearGradient>
                <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5"
                        markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="var(--showcase-text)"
                        strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid-pattern)" />

              {/* ── The agent, at the top, where the work starts ── */}
              <g transform="translate(40, 34)">
                <rect width="520" height="52" rx="8" fill="var(--showcase-surface)"
                      stroke="var(--showcase-blue)" strokeOpacity="0.45" strokeWidth="1.5" />
                <rect width="520" height="52" rx="8" fill="url(#agent-aura)" />
                <rect x="16" y="14" width="24" height="24" rx="6" fill="var(--showcase-blue)" fillOpacity="0.16" />
                <path d="M28 20c0 2.2-1.8 4-4 4 2.2 0 4 1.8 4 4 0-2.2 1.8-4 4-4-2.2 0-4-1.8-4-4z" fill="var(--showcase-blue)" />
                <text x="52" y="24" fill="var(--showcase-text)" fontSize="12" fontWeight="600" fontFamily="var(--cds-font-sans)">Zenith Agent</text>
                <text x="52" y="40" fill="var(--showcase-text-muted)" fontSize="10" fontFamily="var(--cds-font-sans)">Working through 34 new postings against your profile</text>
                <rect x="404" y="16" width="100" height="20" rx="10" fill="var(--showcase-blue)" fillOpacity="0.14" />
                <text x="454" y="30" fill="var(--showcase-blue)" fontSize="10" fontWeight="600" textAnchor="middle" fontFamily="var(--cds-font-sans)">3 matches found</text>
              </g>

              {/* It hands them to the first column. */}
              <path d="M 105 86 L 105 116" stroke="var(--showcase-blue)" strokeOpacity="0.4"
                    strokeWidth="1.5" strokeDasharray="3 4" markerEnd="url(#flow-arrow)" />

              {/* ── Three stages of the real board ── */}
              {[
                { x: 40,  name: 'Interested', count: 6, hue: 'var(--showcase-purple)' },
                { x: 225, name: 'Applied',    count: 4, hue: 'var(--showcase-blue)' },
                { x: 410, name: 'Offer',      count: 1, hue: 'var(--showcase-green)' },
              ].map((col) => (
                <g key={col.name} transform={`translate(${col.x}, 116)`}>
                  {/* Header: neutral fill, accent bar on the top edge — the board's own treatment. */}
                  <rect width="150" height="34" rx="6" fill="var(--showcase-surface)"
                        stroke="var(--showcase-text)" strokeOpacity="0.08" strokeWidth="1" />
                  <path d={`M 6 1 H 144`} stroke={col.hue} strokeWidth="3" strokeLinecap="round" />
                  <text x="14" y="22" fill={col.hue} fontSize="9" fontWeight="600"
                        letterSpacing="0.06em" fontFamily="var(--cds-font-sans)">{col.name.toUpperCase()}</text>
                  <circle cx="130" cy="18" r="9" fill="var(--showcase-text)" fillOpacity="0.06" />
                  <text x="130" y="21" fill="var(--showcase-text-muted)" fontSize="9" fontWeight="600"
                        textAnchor="middle" fontFamily="var(--cds-font-sans)">{col.count}</text>
                </g>
              ))}

              {/* ── The cards. The first one is the agent's, and wears its mark. ── */}
              <g transform="translate(40, 162)">
                <rect width="150" height="66" rx="6" fill="var(--showcase-surface)"
                      stroke="var(--showcase-blue)" strokeOpacity="0.4" strokeWidth="1.5" />
                <rect width="150" height="66" rx="6" fill="url(#agent-aura)" />
                <path d="M 1.5 8 V 58" stroke="var(--showcase-blue)" strokeWidth="3" strokeLinecap="round" />
                <text x="14" y="24" fill="var(--showcase-text)" fontSize="10.5" fontWeight="600" fontFamily="var(--cds-font-sans)">Staff Platform Engineer</text>
                <text x="14" y="39" fill="var(--showcase-text-muted)" fontSize="9" fontFamily="var(--cds-font-sans)">Iberdrola · Madrid</text>
                <rect x="14" y="47" width="46" height="14" rx="7" fill="var(--showcase-blue)" fillOpacity="0.16" />
                <text x="37" y="57" fill="var(--showcase-blue)" fontSize="8" fontWeight="600" textAnchor="middle" fontFamily="var(--cds-font-sans)">Zenith</text>
                <text x="136" y="57" fill="var(--showcase-text-muted)" fontSize="8" textAnchor="end" fontFamily="var(--cds-font-sans)">2h ago</text>
              </g>

              <g transform="translate(40, 238)">
                <rect width="150" height="52" rx="6" fill="var(--showcase-surface)"
                      stroke="var(--showcase-text)" strokeOpacity="0.1" strokeWidth="1" />
                <path d="M 1 8 V 44" stroke="var(--showcase-purple)" strokeWidth="3" strokeLinecap="round" />
                <text x="14" y="24" fill="var(--showcase-text)" fontSize="10.5" fontWeight="600" fontFamily="var(--cds-font-sans)">Head of Data</text>
                <text x="14" y="39" fill="var(--showcase-text-muted)" fontSize="9" fontFamily="var(--cds-font-sans)">Glovo · Barcelona</text>
              </g>

              <g transform="translate(225, 162)">
                <rect width="150" height="52" rx="6" fill="var(--showcase-surface)"
                      stroke="var(--showcase-text)" strokeOpacity="0.1" strokeWidth="1" />
                <path d="M 1 8 V 44" stroke="var(--showcase-blue)" strokeWidth="3" strokeLinecap="round" />
                <text x="14" y="24" fill="var(--showcase-text)" fontSize="10.5" fontWeight="600" fontFamily="var(--cds-font-sans)">Principal Architect</text>
                <text x="14" y="39" fill="var(--showcase-text-muted)" fontSize="9" fontFamily="var(--cds-font-sans)">Telefónica · Madrid</text>
              </g>

              <g transform="translate(410, 162)">
                <rect width="150" height="66" rx="6" fill="var(--showcase-surface)"
                      stroke="var(--showcase-green)" strokeOpacity="0.4" strokeWidth="1.5" />
                <path d="M 1.5 8 V 58" stroke="var(--showcase-green)" strokeWidth="3" strokeLinecap="round" />
                <text x="14" y="24" fill="var(--showcase-text)" fontSize="10.5" fontWeight="600" fontFamily="var(--cds-font-sans)">Engineering Manager</text>
                <text x="14" y="39" fill="var(--showcase-text-muted)" fontSize="9" fontFamily="var(--cds-font-sans)">Wallapop · Remote</text>
                <text x="14" y="57" fill="var(--showcase-green)" fontSize="9" fontWeight="600" fontFamily="var(--cds-font-sans)">Offer received</text>
              </g>

              {/* ── The movement between stages, which is the whole point ── */}
              <path d="M 196 188 H 219" stroke="var(--showcase-text)" strokeOpacity="0.3"
                    strokeWidth="1.5" strokeDasharray="3 4" markerEnd="url(#flow-arrow)" />
              <path d="M 381 188 H 404" stroke="var(--showcase-text)" strokeOpacity="0.3"
                    strokeWidth="1.5" strokeDasharray="3 4" markerEnd="url(#flow-arrow)" />

              {/* ── The other half of the product: the same board for relationships ── */}
              <g transform="translate(40, 330)">
                <rect width="520" height="76" rx="8" fill="var(--showcase-surface)"
                      stroke="var(--showcase-teal)" strokeOpacity="0.35" strokeWidth="1.5" />
                <path d="M 8 1 H 512" stroke="var(--showcase-teal)" strokeWidth="3" strokeLinecap="round" />
                <text x="18" y="26" fill="var(--showcase-text)" fontSize="11.5" fontWeight="600" fontFamily="var(--cds-font-sans)">Business board</text>
                <text x="18" y="42" fill="var(--showcase-text-muted)" fontSize="9.5" fontFamily="var(--cds-font-sans)">The same pipeline, for the people behind the roles</text>
                {[
                  { x: 18,  label: 'Researching' },
                  { x: 118, label: 'Contacted' },
                  { x: 208, label: 'Meeting' },
                  { x: 288, label: 'Negotiation' },
                  { x: 386, label: 'Signed' },
                ].map((s, i, all) => (
                  <g key={s.label}>
                    <rect x={s.x} y="52" width={s.label.length * 5.6 + 14} height="16" rx="8"
                          fill="var(--showcase-teal)" fillOpacity={i === all.length - 1 ? 0.2 : 0.08} />
                    <text x={s.x + (s.label.length * 5.6 + 14) / 2} y="63" fill="var(--showcase-teal)"
                          fontSize="8.5" fontWeight="600" textAnchor="middle" fontFamily="var(--cds-font-sans)">{s.label}</text>
                  </g>
                ))}
              </g>
            </svg>
          </div>

          <div className="showcase-text">
            <h2>Every opportunity, on one board.</h2>
            <p>
              Zenith tracks your applications through eight stages and keeps a history of
              every move, so you always know where each one stands. The agent works your
              profile against new postings and drops what fits straight into the board — and
              the same pipeline handles the investors, funds and contacts behind the roles.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
