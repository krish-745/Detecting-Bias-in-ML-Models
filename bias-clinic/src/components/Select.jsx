import React, { useState, useRef, useEffect } from 'react';
import '../styles/components.css';

export default function Select({ label, options, selected, onChange, tip, placeholder = "— select or type —", noLabel = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="field" ref={dropdownRef} style={{ position: 'relative', marginBottom: noLabel ? 0 : undefined }}>
      {!noLabel && <label>{label}{tip && <span className="info-tip" data-tip={tip}>?</span>}</label>}
      
      <div 
        style={{
          background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius2)',
          padding: '9px 12px', fontSize: '14px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* UPGRADED: This is now an input you can type in, e.g., ">=40" */}
        <input 
          type="text"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          style={{ background: 'transparent', border: 'none', color: 'var(--text)', width: '100%', outline: 'none', fontFamily: "'Inter', sans-serif" }}
        />
        <span onClick={() => setIsOpen(!isOpen)} style={{ color: 'var(--text3)', fontSize: '10px', cursor: 'pointer', paddingLeft: '8px' }}>▼</span>
      </div>

      {isOpen && options.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius2)', zIndex: 100, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {options.map(opt => (
            <div 
              key={opt} 
              onClick={() => { onChange(opt); setIsOpen(false); }}
              style={{ 
                padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', 
                fontSize: '14px', color: selected === opt ? 'var(--accent2)' : 'var(--text)',
                background: selected === opt ? 'rgba(99,102,241,0.1)' : 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={(e) => e.currentTarget.style.background = selected === opt ? 'rgba(99,102,241,0.1)' : 'transparent'}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}