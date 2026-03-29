import React, { useState, useEffect } from 'react';
import '../styles/components.css';

export default function Loading() {
  const [step, setStep] = useState(0);
  const steps = [
    '→ Running Disparate Impact analysis...',
    '→ Scanning for data deserts...',
    '→ Training proxy detector (RF + MI)...',
    '→ Computing intersectional gaps...',
  ];
  
  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s+1, steps.length-1)), 900);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="loading-wrap">
      <div className="spinner"/>
      <p>Running 4-part fairness X-ray...</p>
      <div className="loading-steps">
        {steps.map((s,i) => (
          <div key={i} className={`loading-step ${i<=step?'active':''}`}
               style={{animationDelay:`${i*0.9}s`}}>
            <span>{i<step ? '✓' : i===step ? '◉' : '○'}</span> {s}
          </div>
        ))}
      </div>
    </div>
  );
}