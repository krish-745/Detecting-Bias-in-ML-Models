import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import PreProcessing from './pages/PreProcessing';
import PostProcessing from './pages/PostProcessing';
import './index.css';

function NavBar() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="header">
      <NavLink to="/" className="header-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="logo-icon">⚖</div>
        Bias Diagnostic Clinic
      </NavLink>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <NavLink
          to="/pre-processing"
          style={({ isActive }) => ({
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '100px',
            textDecoration: 'none',
            border: '1px solid',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
            background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
            borderColor: isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)',
            color: isActive ? 'var(--accent2)' : 'var(--text2)',
          })}
        >
          PRE-PROCESSING
        </NavLink>
        <NavLink
          to="/post-processing"
          style={({ isActive }) => ({
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            padding: '6px 14px',
            borderRadius: '100px',
            textDecoration: 'none',
            border: '1px solid',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
            background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
            borderColor: isActive ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.12)',
            color: isActive ? 'var(--pass)' : 'var(--text2)',
          })}
        >
          POST-PROCESSING
        </NavLink>
        {!isHome && (
          <span className="header-badge" style={{ marginLeft: '8px' }}>v2.0</span>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/pre-processing"  element={<PreProcessing />} />
        <Route path="/post-processing" element={<PostProcessing />} />
      </Routes>
    </BrowserRouter>
  );
}
