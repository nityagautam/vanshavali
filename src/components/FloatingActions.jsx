import { useState } from 'react';
import { Lock, Unlock, Plus, Link2, Download, Printer, LayoutGrid, X, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import AddMemberForm from './AddMemberForm';
import InviteManager from './InviteManager';
import { exportJSON } from '../utils/exportJSON';
import { printTree }  from '../utils/printTree';
import { clearAuth }  from '../utils/auth';
import { addFamilyMember } from '../utils/familyApi';

export default function FloatingActions({
  people, familyData, meta, about, lang, onAddMember,
  isLoggedIn, isAdmin, onAuthRequired, onLogout,
}) {
  const [open, setOpen]               = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInvite, setShowInvite]   = useState(false);
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
      ? { id: 'logout',     icon: Unlock, label: 'Logout',      onClick: handleLogout }
      : { id: 'login',      icon: Lock,   label: 'Login',       onClick: () => { setOpen(false); onAuthRequired(null); } },
    {
      id: 'add', icon: Plus, label: 'Add Member',
      onClick: guard(() => setShowAddMember(true)),
    },
    // Invite-redeemed (non-admin) sessions can't manage invite links —
    // hide once we actually know that, but keep it visible pre-login so
    // an admin who hasn't logged in yet still sees it (guard() handles that).
    ...(!isLoggedIn || isAdmin ? [{
      id: 'invite', icon: Link2, label: 'Invite Link',
      onClick: guard(() => setShowInvite(true)),
    }] : []),
    {
      id: 'export', icon: Download, label: 'Export JSON',
      onClick: guard(() => { exportJSON(familyData); showToast('ok', 'family.json downloaded'); }),
    },
    {
      id: 'print', icon: Printer, label: 'Print Data',
      onClick: guard(() => window.print()),
    },
    {
      id: 'print-tree', icon: LayoutGrid, label: 'Print Tree',
      onClick: guard(() => printTree({ people, meta, about, lang, showToast })),
    },
  ];

  const handleAddMember = async (newPerson) => {
    try {
      const { people: updated } = await addFamilyMember(newPerson);
      onAddMember(updated);
      showToast('ok', `"${newPerson.name}" added and saved`);
      setShowAddMember(false);
    } catch (err) {
      showToast('err', err.message || 'Could not save — please try again.');
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
                  <a.icon size={18} />
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
          {open ? <X size={20} /> : <Settings size={20} />}
          {!isLoggedIn && <span className="fab-lock-badge"><Lock size={11} /></span>}
        </button>
      </div>

      {/* Click-away backdrop */}
      {open && <div className="fab-backdrop" onClick={() => setOpen(false)} />}

      {/* Add Member modal */}
      <Modal open={showAddMember} onOpenChange={setShowAddMember} title="Add Family Member">
        <AddMemberForm
          people={people}
          onSubmit={handleAddMember}
          onCancel={() => setShowAddMember(false)}
        />
      </Modal>

      {/* Invite link modal */}
      <InviteManager open={showInvite} onOpenChange={setShowInvite} showToast={showToast} />

      {/* Toast */}
      {toast && (
        <div className={`sidebar-toast toast-${toast.type}`}>
          {toast.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {toast.msg}
        </div>
      )}
    </>
  );
}
