import { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Lock } from 'lucide-react';
import { login } from '../utils/auth';

export default function LoginModal({ isOpen, meta, onSuccess, onClose }) {
  const [input,   setInput]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    const result = await login(input.trim());
    setLoading(false);
    if (result.ok) {
      onSuccess();
      setInput('');
    } else {
      setError(result.error || 'Incorrect password. Please try again.');
      setInput('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="login-overlay" />
        <Dialog.Content
          className={`login-modal${shake ? ' login-shake' : ''}`}
          onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus(); }}
        >
          {/* Header */}
          <div className="login-header">
            <div className="login-lock-icon"><Lock size={22} /></div>
            <Dialog.Title asChild><div className="login-title">{meta?.dynasty || 'Vanshavali'}</div></Dialog.Title>
            <Dialog.Description asChild><div className="login-subtitle">Family access required</div></Dialog.Description>
          </div>

          {/* Form */}
          <form className="login-body" onSubmit={handleSubmit} noValidate>
            <label className="login-label" htmlFor="vv-password">Family Password</label>
            <input
              ref={inputRef}
              id="vv-password"
              className={`login-input${error ? ' login-input-error' : ''}`}
              type="password"
              placeholder="Enter password…"
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              autoComplete="current-password"
            />
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-submit" disabled={loading || !input.trim()}>
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
            <Dialog.Close asChild>
              <button type="button" className="login-cancel">Cancel</button>
            </Dialog.Close>
          </form>

          <div className="login-divider"><span>or</span></div>

          <a href="/api/auth/google/login" className="login-google-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.19.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Sign in with Google
          </a>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
