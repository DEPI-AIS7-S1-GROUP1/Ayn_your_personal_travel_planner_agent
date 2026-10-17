import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '../Button';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

export function AuthModal({ isOpen, initialMode = 'login', onClose }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  const { login, signup, loading } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLocalError(null);
      setEmail('');
      setPassword('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    try {
      let loggedUser;
      if (mode === 'login') {
        loggedUser = await login(email, password);
      } else {
        loggedUser = await signup(email, password);
      }
      onClose();

      // Only newly registered users go to the survey immediately
      if (mode === 'signup') {
        navigate('/survey');
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="ayn-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ayn-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="ayn-modal__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        <h2 className="ayn-modal__title">
          {mode === 'login' ? 'Log in to Ayn' : 'Sign up for Ayn'}
        </h2>
        <p className="ayn-modal__desc">
          {mode === 'login'
            ? 'Access your Egypt trips and draft itineraries.'
            : 'Start planning your tailored trip across Egypt.'}
        </p>

        <form className="ayn-modal__form" onSubmit={handleSubmit}>
          <div className="ayn-modal__field">
            <label className="ayn-modal__label" htmlFor="auth-email">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              className="ayn-modal__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="ayn-modal__field">
            <label className="ayn-modal__label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              className="ayn-modal__input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {localError && (
            <p className="ayn-modal__error" role="alert">
              {localError}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>

          <p className="ayn-modal__footer-text">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  className="ayn-modal__toggle-btn"
                  onClick={() => {
                    setLocalError(null);
                    setMode('signup');
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="ayn-modal__toggle-btn"
                  onClick={() => {
                    setLocalError(null);
                    setMode('login');
                  }}
                >
                  Log in
                </button>
              </>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
