import React, { useState, useRef, useEffect } from 'react';
import '../styles/components.css';

export default function MultiSelect({ label, options, selected, onChange, tip }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleOption = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter(i => i !== opt));
    else onChange([...selected, opt]);
  };

  return (
    <div className="field" ref={dropdownRef} style={{ position: 'relative' }}>
      <label>{label}{tip && <span className="info-tip" data-tip={tip}>?</span>}</label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--radius2)',
          padding: '9px 12px', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
        }}
      >
        <span style={{ color: selected.length ? 'var(--text)' : 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected.length ? selected.join(', ') : '— select multiple —'}
        </span>
        <span style={{ color: 'var(--text3)' }}>▼</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius2)', zIndex: 100, maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
        }}>
          {options.map(opt => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', cursor: 'pointer', margin: 0, borderBottom: '1px solid var(--border)', textTransform: 'none', letterSpacing: 'normal', fontSize: '14px', color: 'var(--text)' }}>
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} style={{ cursor: 'pointer' }} />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}