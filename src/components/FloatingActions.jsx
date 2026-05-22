import { useState } from 'react';
import AddMemberForm from './AddMemberForm';
import { exportJSON } from '../utils/exportJSON';
import { printTree }  from '../utils/printTree';
import { clearAuth }  from '../utils/auth';

export default function FloatingActions({
  people, familyData, meta, about, lang, onAddMember,
  isLoggedIn, onAuthRequired, onLogout,
}) {
  const [open, setOpen]               = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const guard = (fn) => () => {
    setOpen(false);
    if (!isLoggedIn) { onAuthRequired(fn); return; }
    fn();
  };

  const handleLogout = () => {
    setOpen(false);
    clearAuth();
    onLogout();
    showToast('ok', 'Logged out');
  };

  const actions = [
    // Auth action: Login when logged out, Logout when logged in
    isLoggedIn
      ? { id: 'logout',     icon: '🔓', label: 'Logout',      onClick: handleLogout }
      : { id: 'login',      icon: '🔒', label: 'Login',       onClick: () => { setOpen(false); onAuthRequired(null); } },
    {
      id: 'add', icon: '＋', label: 'Add Member',
      onClick: guard(() => setShowAddMember(true)),
    },
    {
      id: 'export', icon: '↓', label: 'Export JSON',
      onClick: guard(() => { exportJSON(familyData); showToast('ok', 'family.json downloaded'); }),
    },
    {
      id: 'print', icon: '⎙', label: 'Print Data',
      onClick: guard(() => window.print()),
    },
    {
      id: 'print-tree', icon: '⊞', label: 'Print Tree',
      onClick: guard(() => printTree({ people, meta, about, lang, showToast })),
    },
  ];

  const handleAddMember = async (newPerson) => {
    let updated = [...people, newPerson];
    if (newPerson.spouseIds?.length) {
      const sid = newPerson.spouseIds[0];
      updated = updated.map(p =>
        p.id === sid && !p.spouseIds?.includes(newPerson.id)
          ? { ...p, spouseIds: [...(p.spouseIds || []), newPerson.id] }
          : p
      );
    }
    onAddMember(updated);
    try {
      const res  = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...familyData, people: updated }),
      });
      const json = await res.json();
      if (json.ok) { showToast('ok', `"${newPerson.name}" saved to family.json`); setShowAddMember(false); }
      else throw new Error(json.error);
    } catch {
      showToast('err', 'Cannot write file here — use Export JSON to save manually.');
    }
  };

  return (
    <>
      {/* FAB */}
      <div className="fab-container">
        {open && (
          <div className="fab-actions">
            {actions.map((a, i) => (
              <div
                key={a.id}
                className="fab-action-item"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="fab-action-label">{a.label}</span>
                <button className="fab-action" onClick={a.onClick} title={a.label}>
                  {a.icon}
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          className={`fab-main${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
          title={open ? 'Close' : 'Actions'}
          aria-expanded={open}
        >
          {open ? '✕' : '⚙'}
          {!isLoggedIn && <span className="fab-lock-badge">🔒</span>}
        </button>
      </div>

      {/* Click-away backdrop */}
      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}

      {/* Add Member modal */}
      {showAddMember && (
        <div className="fab-modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="fab-modal" onClick={e => e.stopPropagation()}>
            <div className="fab-modal-header">
              <span>Add Family Member</span>
              <button onClick={() => setShowAddMember(false)}>✕</button>
            </div>
            <AddMemberForm
              people={people}
              onAdd={handleAddMember}
              onCancel={() => setShowAddMember(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`sidebar-toast toast-${toast.type}`}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </>
  );
}
