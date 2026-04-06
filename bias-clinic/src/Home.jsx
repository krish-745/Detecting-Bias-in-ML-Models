import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/home.css';

const FEATURES_PRE = [
  { icon: '🔍', label: 'Disparate Impact (4/5ths Rule)' },
  { icon: '🏜', label: 'Data Desert Detection' },
  { icon: '🕵️', label: 'Proxy Variable Radar (RF + MI)' },
  { icon: '⚡', label: 'Intersectional Gap Analysis' },
  { icon: '⚖️', label: 'Reweighing Algorithm' },
  { icon: '🔧', label: 'Disparate Impact Remover' },
  { icon: '🧮', label: 'Optimized Preprocessor (CVXPY)' },
];

const FEATURES_POST = [
  { icon: '🎯', label: 'Prediction Fairness Audit' },
  { icon: '📊', label: 'ROC Curve Per-Group Analysis' },
  { icon: '🔀', label: 'Equalized Odds Calibration' },
  { icon: '🚦', label: 'Reject Option Classification' },
  { icon: '📈', label: 'AFS Score Before / After' },
  { icon: '💬', label: 'Plain-English Improvement Report' },
];

const PIPELINE_STEPS = [
  { num: '01', title: 'Upload & Configure', desc: 'Drop your CSV, map protected groups using our flexible binning engine.' },
  { num: '02', title: 'Run Diagnostics', desc: '4-part fairness X-ray reveals disparate impact, deserts, proxies, and intersectional gaps.' },
  { num: '03', title: 'Get a Recommendation', desc: 'The engine analyses all 16 possible diagnostic flag combinations and prescribes the right algorithm.' },
  { num: '04', title: 'Mitigate & Compare', desc: 'Run mitigation and see your AFS score improve in a side-by-side before/after dashboard.' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-wrap">

      {/* ── HERO ─────────────────────────────── */}
      <section className="home-hero">
        <div className="home-hero-badge">AI Fairness Auditing Platform</div>
        <h1 className="home-hero-title">
          Build AI Systems<br />
          <span className="home-gradient-text">That Are Actually Fair</span>
        </h1>
        <p className="home-hero-sub">
          A full-stack fairness toolkit — diagnose bias in your training data or
          model predictions, get a mathematically-grounded algorithm recommendation,
          and measure improvement with a standardised AFS score.
        </p>
        <div className="home-hero-ctas">
          <button className="home-cta-primary" onClick={() => navigate('/pre-processing')}>
            <span className="home-cta-icon">🔬</span>
            Pre-Processing Tool
            <span className="home-cta-arrow">→</span>
          </button>
          <button className="home-cta-secondary" onClick={() => navigate('/post-processing')}>
            <span className="home-cta-icon">🎯</span>
            Post-Processing Tool
            <span className="home-cta-arrow">→</span>
          </button>
        </div>
      </section>

      {/* ── PIPELINE STEPS ───────────────────── */}
      <section className="home-section">
        <div className="home-section-label">How It Works</div>
        <div className="home-pipeline">
          {PIPELINE_STEPS.map((step, i) => (
            <div key={i} className="home-pipeline-step">
              <div className="home-pipeline-num">{step.num}</div>
              {i < PIPELINE_STEPS.length - 1 && <div className="home-pipeline-connector" />}
              <div className="home-pipeline-content">
                <div className="home-pipeline-title">{step.title}</div>
                <div className="home-pipeline-desc">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TOOL CARDS ───────────────────────── */}
      <section className="home-section">
        <div className="home-section-label">Choose Your Workflow</div>
        <div className="home-cards">

          {/* Pre-Processing Card */}
          <div className="home-tool-card home-tool-card--pre">
            <div className="home-tool-card-accent" />
            <div className="home-tool-icon">🔬</div>
            <h2 className="home-tool-title">Pre-Processing</h2>
            <p className="home-tool-desc">
              Audit raw training data <em>before</em> model training. Detect and
              correct bias at the data level — the most effective intervention point
              in the ML pipeline.
            </p>
            <ul className="home-feature-list">
              {FEATURES_PRE.map((f, i) => (
                <li key={i} className="home-feature-item">
                  <span className="home-feature-icon">{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>
            <div className="home-tool-meta">
              <span className="home-tool-badge home-tool-badge--pre">3 ALGORITHMS</span>
              <span className="home-tool-badge home-tool-badge--pre">4 DIAGNOSTICS</span>
            </div>
            <button className="home-tool-cta home-tool-cta--pre"
                    onClick={() => navigate('/pre-processing')}>
              Launch Pre-Processing Tool →
            </button>
          </div>

          {/* Post-Processing Card */}
          <div className="home-tool-card home-tool-card--post">
            <div className="home-tool-card-accent home-tool-card-accent--post" />
            <div className="home-tool-icon">🎯</div>
            <h2 className="home-tool-title">Post-Processing</h2>
            <p className="home-tool-desc">
              Audit model predictions <em>after</em> training. Adjust decision
              thresholds per protected group to achieve equal opportunity without
              retraining.
            </p>
            <ul className="home-feature-list">
              {FEATURES_POST.map((f, i) => (
                <li key={i} className="home-feature-item">
                  <span className="home-feature-icon">{f.icon}</span>
                  {f.label}
                </li>
              ))}
            </ul>
            <div className="home-tool-meta">
              <span className="home-tool-badge home-tool-badge--post">2 ALGORITHMS</span>
              <span className="home-tool-badge home-tool-badge--post">4 DIAGNOSTICS</span>
            </div>
            <button className="home-tool-cta home-tool-cta--post"
                    onClick={() => navigate('/post-processing')}>
              Launch Post-Processing Tool →
            </button>
          </div>
        </div>
      </section>

      {/* ── AFS EXPLAINER ────────────────────── */}
      <section className="home-section home-afs-section">
        <div className="home-section-label">The Scoring System</div>
        <div className="home-afs-card">
          <div className="home-afs-score-preview">
            <svg viewBox="0 0 120 70" xmlns="http://www.w3.org/2000/svg" style={{ width: 180 }}>
              <defs>
                <linearGradient id="afsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#ef4444" />
                  <stop offset="50%"  stopColor="#f59e0b" />
                  <stop offset="80%"  stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="url(#afsGrad)" strokeWidth="12"
                    strokeDasharray="157" strokeDashoffset="47" strokeLinecap="round" />
              <text x="60" y="60" textAnchor="middle" fill="#f0f0f8"
                    fontFamily="Syne, sans-serif" fontSize="22" fontWeight="800">74</text>
              <text x="60" y="72" textAnchor="middle" fill="#9090b8"
                    fontFamily="JetBrains Mono, monospace" fontSize="7">AFS SCORE</text>
            </svg>
          </div>
          <div className="home-afs-explainer">
            <h3>Aggregated Fairness Score (AFS)</h3>
            <p>
              AFS is a composite 0–100 metric that normalises 7 independent fairness
              indicators: <strong>Statistical Parity Difference</strong>,{' '}
              <strong>Disparate Impact</strong>, <strong>Equal Opportunity Difference</strong>,{' '}
              <strong>Average Odds Difference</strong>, <strong>Predictive Parity</strong>,{' '}
              <strong>Theil Index</strong>, and <strong>Consistency Score</strong>.
            </p>
            <div className="home-afs-verdicts">
              <span className="badge pass">PASS &gt; 80</span>
              <span className="badge warn">WARNING &gt; 65</span>
              <span className="badge fail">FAIL ≤ 65</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
