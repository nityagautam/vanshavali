import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Unlock, Plus, Link2, Download, Printer, LayoutGrid } from 'lucide-react';
import Modal from './Modal';
import AddMemberForm from './AddMemberForm';
import InviteManager from './InviteManager';
import MobileBar from './MobileBar';
import DesktopActions from './DesktopActions';
import { usePhone } from '../hooks/useMediaQuery';
import { useToast } from './Toaster';
import { exportJSON } from '../utils/exportJSON';
import { printTree, resetScrollForPrint } from '../utils/printTree';
import { clearAuth }  from '../utils/auth';
import { addFamilyMember } from '../utils/familyApi';

export default function FloatingActions({
  people, familyData, meta, about, lang, onAddMember,
  isLoggedIn, isAdmin, onAuthRequired, onLogout,
  viewMode, onToggleView, filtersContent, activeFilterCount, filtersOpen, setFiltersOpen,
  actionsSlot,
}) {
  const isPhone = usePhone();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInvite, setShowInvite]   = useState(false);
  const { notify: showToast } = useToast();

  const guard = (fn) => () => {
    if (!isLoggedIn) { onAuthRequired(fn); return; }
    fn();
  };

  const handleLogout = () => {
    clearAuth();
    onLogout();
    showToast('ok', 'Logged out');
  };

  const actions = [
    // Auth action: Login when logged out, Logout when logged in
    isLoggedIn
      ? { id: 'logout',     icon: Unlock, label: 'Logout',      onClick: handleLogout }
      : { id: 'login',      icon: Lock,   label: 'Login',       onClick: () => onAuthRequired(null) },
    // Adding members is admin-only; hide it once a non-admin session is confirmed.
    ...(!isLoggedIn || isAdmin ? [{
      id: 'add', icon: Plus, label: 'Add Member',
      onClick: guard(() => setShowAddMember(true)),
    }] : []),
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
      onClick: guard(() => { resetScrollForPrint(); window.print(); }),
    },
    {
      id: 'print-tree', icon: LayoutGrid, label: 'Print Tree',
      onClick: guard(() => printTree({ people, meta, about, lang, showToast })),
    },
  ];

  const addAction  = isAdmin ? actions.find(a => a.id === 'add') : null;
  const moreActions = actions.filter(a => a.id !== 'add');

  const handleAddMember = async (newPerson, insertAfterId) => {
    try {
      const { people: updated } = await addFamilyMember(newPerson, insertAfterId);
      onAddMember(updated);
      showToast('ok', `"${newPerson.name}" added and saved`);
      setShowAddMember(false);
    } catch (err) {
      showToast('err', err.message || 'Could not save — please try again.');
    }
  };

  return (
    <>
      {/* Phones: bottom bar + sheets. Wider screens: app-bar controls (portalled into the header). */}
      {isPhone ? (
        <MobileBar
          viewMode={viewMode}
          onToggleView={onToggleView}
          addAction={addAction}
          moreActions={moreActions}
          filtersContent={filtersContent}
          activeFilterCount={activeFilterCount}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />
      ) : actionsSlot && createPortal(
        <DesktopActions
          addAction={addAction}
          moreActions={moreActions}
          filtersContent={filtersContent}
          activeFilterCount={activeFilterCount}
          filtersOpen={filtersOpen}
          setFiltersOpen={setFiltersOpen}
        />,
        actionsSlot,
      )}

      {/* Add Member modal */}
      <Modal wide open={showAddMember} onOpenChange={setShowAddMember} title="Add family member">
        <AddMemberForm
          people={people}
          onSubmit={handleAddMember}
          onCancel={() => setShowAddMember(false)}
        />
      </Modal>

      {/* Invite link modal */}
      <InviteManager open={showInvite} onOpenChange={setShowInvite} showToast={showToast} />

    </>
  );
}
