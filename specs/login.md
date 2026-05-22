# Spec: Login / Access Control

**Status**: Ready  
**Priority**: P1  
**Dependencies**: Floating Action Button spec (FAB must exist to gate)

---

## Goal

Protect Print Data, Print Tree, Export JSON, and Add Member behind a single shared family password. The real password is never stored in the codebase — only its SHA-256 hash is hardcoded.

---

## Approach

- **Method**: SHA-256 hashed password, compared client-side
- **Crypto**: Browser-native `window.crypto.subtle.digest('SHA-256', ...)` — no library needed
- **Session**: Auth state stored in `sessionStorage` under key `vv-auth` — clears when tab is closed
- **Security posture**: Hash is visible in the JS bundle. A weak password could be brute-forced offline. Use a strong passphrase (12+ chars, mixed). This is appropriate for family content, not sensitive data.

---

## Password setup

1. Owner chooses a password and shares it with me once
2. I compute `SHA-256(password)` locally and hardcode only the hex digest in the code
3. The plaintext password never appears anywhere in the repo
4. To change password: compute new hash, update the constant, redeploy

Stored as a constant in `src/utils/auth.js`:
```js
export const PASSWORD_HASH = 'e5aac6d94670b1f06946f65649e24b61b9898d9687fb2a70be4041cd98b8f58c';
```

---

## Auth utility (`src/utils/auth.js`)

```js
export const PASSWORD_HASH = '<hex digest here>';

export async function checkPassword(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === PASSWORD_HASH;
}

export function isAuthenticated() {
  return sessionStorage.getItem('vv-auth') === 'true';
}

export function setAuthenticated() {
  sessionStorage.setItem('vv-auth', 'true');
}

export function clearAuth() {
  sessionStorage.removeItem('vv-auth');
}
```

---

## Component: `src/components/LoginModal.jsx`

**Trigger**: Called via `onAuthRequired()` callback from `FloatingActions` when a locked action is clicked.

**Layout**:
- Modal overlay (full screen backdrop, blur)
- Card in centre: dynasty name at top, password input, Submit button
- On mobile: card takes 90vw

**Behaviour**:
1. User types password → clicks Submit (or presses Enter)
2. `checkPassword(input)` is called (async)
3. **Match**: `setAuthenticated()`, close modal, execute the originally requested action
4. **No match**: input shakes (CSS animation), shows "Incorrect password", input clears
5. **Close**: clicking backdrop or pressing Escape closes modal without logging in

**Props**: `{ isOpen, onSuccess, onClose }`

**State** (local): `inputValue`, `error`, `loading`

---

## Auth state in `App.jsx`

```js
const [isLoggedIn, setIsLoggedIn] = useState(() => isAuthenticated());
const [pendingAction, setPendingAction] = useState(null);

const handleAuthRequired = (action) => {
  setPendingAction(() => action); // store the callback
  setLoginOpen(true);
};

const handleLoginSuccess = () => {
  setIsLoggedIn(true);
  setLoginOpen(false);
  pendingAction?.(); // execute the originally requested action
  setPendingAction(null);
};
```

---

## FAB lock indicator

- FAB main button shows `🔒` badge when `isLoggedIn === false`
- FAB main button shows `🔓` badge when `isLoggedIn === true`
- Optionally: long-press or right-click FAB to log out (clears sessionStorage)

---

## Print protection note

`window.print()` itself cannot be blocked by JS alone — a user could open browser print dialog directly. The protection here is UI-level: the buttons that call `window.print()` are hidden/gated. This is acceptable for family content.

---

## Out of Scope (this spec)

- Google SSO (deferred to future)
- Per-user accounts
- Server-side validation
- Protecting the tree view itself (tree remains public)
