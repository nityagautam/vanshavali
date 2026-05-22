import { useState, useEffect, useRef } from 'react';
import { checkPassword } from '../utils/auth';

export default function LoginModal({ isOpen, meta, onSuccess, onClose }) {
  const [input,   setInput]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInput('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setError('');
    const ok = await checkPassword(input.trim());
    setLoading(false);
    if (ok) {
      onSuccess();
      setInput('');
    } else {
      setError('Incorrect password. Please try again.');
      setInput('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className={`login-modal${shake ? ' login-shake' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="login-header">
          <div className="login-lock-icon">🔒</div>
          <div className="login-title">{meta?.dynasty || 'Vanshavali'}</div>
          <div className="login-subtitle">Family access required</div>
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
          <button type="button" className="login-cancel" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}
