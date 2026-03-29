import React from 'react';
import '../styles/components.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-icon">⚖</div>
        Bias Diagnostic Clinic
      </div>
      <span className="header-badge">v2.0 · REACT</span>
    </header>
  );
}