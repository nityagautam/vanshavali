import { useEffect, useState } from 'react';
import { getInviteStatus, generateInvite, resetInvite } from '../utils/inviteApi';

export default function InviteManager({ onClose, showToast }) {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);

  const load = () => {
    setLoading(true);
    getInviteStatus()
      .then(setStatus)
      .catch(err => showToast('err', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const link = status?.token ? `${window.location.origin}/?invite=${status.token}` : null;

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const data = await generateInvite();
      setStatus({ active: true, ...data });
      showToast('ok', 'New invite link generated.');
    } catch (err) {
      showToast('err', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    try {
      const data = await resetInvite();
      setStatus({ active: true, ...data });
      showToast('ok', 'Invite link re-enabled for one more use.');
    } catch (err) {
      showToast('err', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link).then(
      () => showToast('ok', 'Link copied.'),
      () => showToast('err', 'Could not copy — copy it manually.')
    );
  };

  return (
    <div className="fab-modal-overlay" onClick={onClose}>
      <div className="fab-modal" onClick={e => e.stopPropagation()}>
        <div className="fab-modal-header">
          <span>One-Time Invite Link</span>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="invite-body">
          {loading ? (
            <div className="invite-loading">Loading…</div>
          ) : (
            <>
              <p className="invite-help">
                Share this link so someone can log in once. After it's used, it stops
                working — you can re-enable it or generate a fresh one anytime, from any device.
              </p>

              {status?.active ? (
                <>
                  <div className={`invite-status-pill ${status.consumed ? 'used' : 'active'}`}>
                    {status.consumed ? 'Already used' : 'Active — not yet used'}
                  </div>
                  <div className="invite-link-row">
                    <input className="invite-link-input" readOnly value={link} onFocus={e => e.target.select()} />
                    <button className="invite-copy-btn" onClick={handleCopy}>Copy</button>
                  </div>
                </>
              ) : (
                <div className="invite-status-pill">No invite link yet</div>
              )}

              <div className="invite-actions">
                {status?.active && status?.consumed && (
                  <button className="amf-btn-save" disabled={busy} onClick={handleReset}>
                    {busy ? 'Working…' : 'Re-enable this link'}
                  </button>
                )}
                <button className="amf-btn-cancel" disabled={busy} onClick={handleGenerate}>
                  {busy ? 'Working…' : status?.active ? 'Generate new link' : 'Generate link'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
