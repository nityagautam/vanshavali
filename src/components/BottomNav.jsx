import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <NavLink to="/" end className={({ isActive }) => `bottom-nav-tab${isActive ? ' active' : ''}`}>
        <span className="bottom-nav-icon">🌳</span>
        <span className="bottom-nav-label">Tree</span>
      </NavLink>
      <NavLink to="/about" className={({ isActive }) => `bottom-nav-tab${isActive ? ' active' : ''}`}>
        <span className="bottom-nav-icon">ℹ</span>
        <span className="bottom-nav-label">About</span>
      </NavLink>
    </nav>
  );
}
