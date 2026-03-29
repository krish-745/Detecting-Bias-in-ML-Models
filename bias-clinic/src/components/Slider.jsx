import React from 'react';
import '../styles/components.css';

export default function Slider({ label, value, min, max, step=0.01, onChange, tooltip }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="field">
      <label>{label}{tooltip && <span className="info-tip" data-tip={tooltip}>?</span>}</label>
      <div className="slider-wrap">
        <input 
          type="range" min={min} max={max} step={step}
          value={value}
          style={{'--pct': `${pct}%`}}
          onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        />
        <span className="slider-val">{step < 1 ? value.toFixed(2) : value}</span>
      </div>
    </div>
  );
}