import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="navbar-brand">
          <img src="/phantom-tag.svg" alt="Phantom-Tag" className="brand-icon" />
          <div>
            <div className="brand-name">PHANTOM<span style={{ color: 'var(--accent-cyan)' }}>TAG</span></div>
            <div className="brand-tag">Digital Asset Protection</div>
          </div>
        </NavLink>

        <div className="navbar-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            🏠 Dashboard
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🔨 Forge
          </NavLink>
          <NavLink to="/scout" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🔍 Scout
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
