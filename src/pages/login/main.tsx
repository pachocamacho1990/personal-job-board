import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from '../../api';
import '../../styles/styles.css';


const LoginPage: React.FC = () => {
  const [isSignupMode, setIsSignupMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Check if already logged in
    if (localStorage.getItem('authToken')) {
      window.location.href = '/jobboard/index.html';
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
      window.location.href = '/jobboard/index.html';
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
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
            {isLoading
              ? isSignupMode
                ? 'Creating account...'
                : 'Logging in...'
              : isSignupMode
              ? 'Sign Up'
              : 'Log In'}
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
        <p className="toggle-mode" style={{ marginTop: '15px' }}>
          <a href="docs.html" style={{ opacity: 0.8, fontSize: '0.875rem' }}>
            📖 Documentación y APIs de la App
          </a>
        </p>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<LoginPage />);
}
