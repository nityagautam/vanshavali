import { useState } from 'react';

// Small avatar icon for the signed-in Google user; hovering reveals their
// name/email in a popover. `user` is { name, email, picture }.
export default function UserBadge({ user }) {
  const [imgError, setImgError] = useState(false);
  const showImg = user.picture && !imgError;
  const initial = (user.name || user.email || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <div className="user-badge">
      <div className="user-badge-icon">
        {showImg ? (
          <img
            src={user.picture}
            alt={user.name || user.email}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>
      <div className="user-badge-popover">
        {showImg && <img className="user-badge-popover-photo" src={user.picture} alt={user.name || user.email} draggable={false} />}
        <div className="user-badge-popover-text">
          {user.name && <div className="user-badge-popover-name">{user.name}</div>}
          {user.email && <div className="user-badge-popover-email">{user.email}</div>}
        </div>
      </div>
    </div>
  );
}
