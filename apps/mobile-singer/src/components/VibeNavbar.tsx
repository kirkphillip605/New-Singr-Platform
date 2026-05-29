import { Navbar, NavTitle, NavLeft, NavRight, Link } from 'framework7-react';

export default function VibeNavbar() {
  return (
    <Navbar className="vibe-navbar">
      <NavLeft>
        <Link iconF7="menu" panelOpen="left" className="navbar-hamburger-btn" />
      </NavLeft>
      <NavTitle>
        <span style={{ 
          background: 'var(--vibe-accent-gradient)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent', 
          fontWeight: 800, 
          fontSize: '22px', 
          letterSpacing: '-0.5px',
          fontFamily: 'var(--vibe-font)'
        }}>
          SINGR
        </span>
      </NavTitle>
      <NavRight>
        <Link iconF7="person_circle" panelOpen="right" className="navbar-profile-btn" />
      </NavRight>
    </Navbar>
  );
}
