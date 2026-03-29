import React from 'react';
import '../styles/components.css';

export default function Hero() {
  return (
    <div className="hero">
      <div className="hero-label">AI Fairness Auditing</div>
      <h1>4-Part Fairness<br/><span>X-Ray Engine</span></h1>
      <p className="hero-desc">Upload your training data to run a comprehensive bias diagnostic across disparate impact, data deserts, proxy variables, and intersectional gaps.</p>
    </div>
  );
}