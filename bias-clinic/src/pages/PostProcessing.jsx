import React, { useState } from 'react';
import Papa from 'papaparse';

import UploadZone  from '../components/UploadZone';
import Slider      from '../components/Slider';
import MultiSelect from '../components/MultiSelect';
import Select      from '../components/Select';
import Loading     from '../components/Loading';
import { Section, DisparateImpactResult, DataDesertResult, ProxyResult, IntersectionalResult }
  from '../components/Results';

import {
  POST_ALGORITHMS,
  getRecommendation,
  AFSComparison,
} from '../components/FairnessEngine';

import '../styles/components.css';
import '../styles/results.css';
import '../styles/workflow.css';

const API = 'http://localhost:8000';

function StagePill({ num, label, active, done }) {
  return (
    <div className={`stage-pill ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="stage-pill-num">{done ? '✓' : num}</div>
      <span>{label}</span>
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 'var(--radius2)', padding: '14px 18px',
                  fontSize: 13, lineHeight: 1.6, color: 'var(--text2)', marginBottom: 20 }}>
      {children}
    </div>
  );
}

export default function PostProcessing() {
  // ── Data ──────────────────────────────────────────────────
  const [file,    setFile]    = useState(null);
  const [csvText, setCsvText] = useState('');
  const [csvJson, setCsvJson] = useState([]);
  const [columns, setColumns] = useState([]);

  // ── Config ───────────────────────────────────────────────
  // post-processing adds 'score_col' — the model's predicted probability column
  const [config, setConfig] = useState({
    target_col:   '',   // true label column
    score_col:    '',   // predicted probability column
    fav_outcome:  '1',
    prot_cols:    [], group_mappings: {},
    threshold_45: 0.80, desert_thresh: 0.10,
    proxy_thresh: 50,   sec_prots: [],
  });

  const [stage,       setStage]       = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [diagResults, setDiagResults] = useState(null);
  const [activeTab,   setActiveTab]   = useState('');
  const [error,       setError]       = useState(null);

  const [selectedAlgo, setSelectedAlgo] = useState(null);
  const [algoParams,   setAlgoParams]   = useState({});
  const [mitigResult,  setMitigResult]  = useState(null);
  const [mitigLoading, setMitigLoading] = useState(false);
  const [mitigError,   setMitigError]   = useState(null);

  // ── File handling ─────────────────────────────────────────
  const handleFileSelect = async (f) => {
    if (!f?.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f); setError(null); setDiagResults(null); setMitigResult(null); setStage(1);

    const text = await f.text();
    setCsvText(text);
    Papa.parse(text, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields || [];
        setColumns(cols);
        setCsvJson(res.data);
        // Try to auto-detect score column
        const scoreGuess = cols.find(c =>
          ['score', 'prob', 'probability', 'predicted_score', 'pred_score', 'confidence']
            .some(k => c.toLowerCase().includes(k))
        ) || cols[cols.length - 2] || '';
        const labelGuess = cols.find(c =>
          ['label', 'target', 'true', 'actual', 'outcome', 'approved', 'hired']
            .some(k => c.toLowerCase().includes(k))
        ) || cols[cols.length - 1] || '';
        setConfig(prev => ({
          ...prev,
          target_col:  labelGuess,
          score_col:   scoreGuess,
          prot_cols:   [cols[0] || ''],
          sec_prots:   [cols[1] || cols[0] || ''],
        }));
      },
    });
  };

  const setConfigVal = (key) => (val) => setConfig(p => ({ ...p, [key]: val }));
  const setGroupMap  = (col, type) => (val) => setConfig(prev => ({
    ...prev,
    group_mappings: {
      ...prev.group_mappings,
      [col]: { ...(prev.group_mappings[col] || {}), [type]: val },
    },
  }));

  const getUnique = (colName) => {
    if (!csvJson.length || !colName) return [];
    const s = new Set();
    csvJson.forEach(r => { const v = r[colName]; if (v != null && v !== '') s.add(String(v)); });
    return Array.from(s).sort();
  };

  // ── Stage 2: diagnostics on predicted labels ──────────────
  const runDiagnostics = async () => {
    if (!csvText) { setError('No data loaded.'); return; }
    // For post-processing diagnostics, we audit the score_col as if it were the target
    // (i.e. thresholded at 0.5) against the protected groups
    const diagConfig = {
      ...config,
      target_col: config.score_col || config.target_col,
      fav_outcome: config.fav_outcome,
    };
    setLoading(true); setError(null); setDiagResults(null); setMitigResult(null);

    try {
      const res = await fetch(`${API}/api/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_data: csvText, config: diagConfig }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
      const data = await res.json();
      setDiagResults(data);
      if (config.prot_cols.length > 0) setActiveTab(config.prot_cols[0]);
      setStage(2);
    } catch (e) {
      setError('Connection failed. Is your FastAPI server running? ' + e.message);
    }
    setLoading(false);
  };

  const goToRecommend = () => {
    const reco = getRecommendation(diagResults?.[activeTab], 'post');
    if (reco) {
      setSelectedAlgo(reco.algo);
      const alg = POST_ALGORITHMS.find(a => a.id === reco.algo);
      if (alg) {
        const defaults = {};
        alg.params.forEach(p => { defaults[p.key] = p.default; });
        setAlgoParams(defaults);
      }
    }
    setStage(3);
  };

  // ── Stage 4: post-processing mitigation ──────────────────
  const runMitigation = async () => {
    if (!csvText || !selectedAlgo) return;
    setMitigLoading(true); setMitigError(null); setMitigResult(null);

    try {
      const res = await fetch(`${API}/api/postprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_data:         csvText,
          config,
          algorithm:        selectedAlgo,
          algorithm_params: algoParams,
        }),
      });
      if (!res.ok) throw new Error(`Backend error: ${res.statusText}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMitigResult(data);
      setStage(4);
    } catch (e) {
      setMitigError(e.message);
    }
    setMitigLoading(false);
  };

  const recommendation = diagResults?.[activeTab]
    ? getRecommendation(diagResults[activeTab], 'post')
    : null;
  const activeAlgoDef = POST_ALGORITHMS.find(a => a.id === selectedAlgo);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="main" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '40px 0 24px' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                      color: 'var(--pass)', letterSpacing: '0.15em',
                      textTransform: 'uppercase', marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 1, background: 'var(--pass)', display: 'inline-block' }} />
          Post-Processing Fairness Audit
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,48px)',
                     fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
                     marginBottom: 12 }}>
          Calibrate Predictions{' '}
          <span style={{ background: 'linear-gradient(135deg,var(--pass),#34d399)',
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                         backgroundClip: 'text' }}>
            After Training
          </span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
          Upload a CSV of model predictions, audit for fairness disparities, and apply
          threshold recalibration without retraining.
        </p>
      </div>

      {/* ── Stage pills ── */}
      <div className="stage-track">
        {[['1','Upload & Configure'], ['2','Audit Predictions'], ['3','Recommendation'], ['4','Calibrate & Compare']]
          .map(([n, lbl]) => (
            <StagePill key={n} num={n} label={lbl}
                       active={stage === +n} done={stage > +n} />
          ))}
      </div>

      {/* ═══════════════════════════════════════════
          STAGE 1 — Upload & Configure
          ═══════════════════════════════════════════ */}
      <div className={`stage-panel ${stage === 1 ? 'visible' : ''}`}>

        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>Expected CSV format:</strong> Your file must
          contain a <code style={{ color: 'var(--accent2)' }}>true label</code> column (binary
          0/1), a <code style={{ color: 'var(--accent2)' }}>predicted score</code> column
          (probability 0–1), and at least one protected attribute column.
        </InfoBox>

        <UploadZone file={file} csvData={csvJson} columns={columns}
                    onFileSelect={handleFileSelect} />

        {columns.length > 0 && (
          <>
            <div className="config-grid" style={{ marginTop: 32 }}>

              {/* Labels & Score card */}
              <div className="config-card">
                <h4><span className="dot" style={{ background: 'var(--pass)' }} />Labels & Scores</h4>
                <Select label="True Label Column"
                  tip="The ground-truth binary outcome column (0 or 1)."
                  options={columns} selected={config.target_col}
                  onChange={setConfigVal('target_col')} />
                <Select label="Predicted Score Column"
                  tip="The model's predicted probability column (values 0–1)."
                  options={columns} selected={config.score_col}
                  onChange={setConfigVal('score_col')} />
                <Select label="Favorable Outcome Value"
                  tip="The positive outcome value in the true label column."
                  options={getUnique(config.target_col)} selected={config.fav_outcome}
                  onChange={setConfigVal('fav_outcome')} />
              </div>

              {/* Protected attributes card */}
              <div className="config-card">
                <h4><span className="dot" />Protected Attributes</h4>
                <MultiSelect
                  label="Protected Attributes"
                  options={columns} selected={config.prot_cols}
                  onChange={setConfigVal('prot_cols')}
                  tip="Demographic columns to audit (Race, Gender, Age, etc.)." />

                {config.prot_cols.length > 0 && (
                  <div style={{ marginTop: 16, padding: 16, background: 'var(--bg3)',
                                borderRadius: 'var(--radius2)', border: '1px solid var(--border2)' }}>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12,
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                fontFamily: "'JetBrains Mono',monospace" }}>
                      Define Groups / Binning
                    </p>
                    {config.prot_cols.map((col, idx) => (
                      <div key={col}
                           style={{ marginBottom: idx < config.prot_cols.length - 1 ? 16 : 0,
                                    borderBottom: idx < config.prot_cols.length - 1
                                      ? '1px solid var(--border)' : 'none',
                                    paddingBottom: idx < config.prot_cols.length - 1 ? 16 : 0 }}>
                        <strong style={{ fontSize: 13, color: 'var(--pass)',
                                         display: 'block', marginBottom: 8 }}>{col}</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Select label="PRIVILEGED"
                            options={getUnique(col)}
                            selected={config.group_mappings[col]?.priv || ''}
                            onChange={setGroupMap(col, 'priv')}
                            placeholder="e.g. Male or >=40" />
                          <Select label="UNPRIVILEGED"
                            options={getUnique(col)}
                            selected={config.group_mappings[col]?.unpriv || ''}
                            onChange={setGroupMap(col, 'unpriv')}
                            placeholder="e.g. Female or <40" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Thresholds card */}
              <div className="config-card">
                <h4><span className="dot" />Thresholds</h4>
                <Slider label="4/5ths Rule" value={config.threshold_45}
                  min={0} max={1} step={0.01} onChange={setConfigVal('threshold_45')}
                  tooltip="Legal minimum ratio for selection rate parity." />
                <Slider label="Data Desert" value={config.desert_thresh}
                  min={0} max={0.5} step={0.01} onChange={setConfigVal('desert_thresh')}
                  tooltip="Groups below this proportion are flagged as underrepresented." />
                <Slider label="Proxy Sensitivity" value={config.proxy_thresh}
                  min={0} max={100} step={1} onChange={setConfigVal('proxy_thresh')}
                  tooltip="Higher = more features flagged as proxy variables." />
                <MultiSelect
                  label="Secondary Attributes (Intersectional)"
                  options={columns} selected={config.sec_prots}
                  onChange={setConfigVal('sec_prots')}
                  tip="Columns combined with protected attributes for intersectional analysis." />
              </div>
            </div>

            <button className="run-btn"
                    style={{ background: 'linear-gradient(135deg,#059669,var(--pass))' }}
                    onClick={runDiagnostics}
                    disabled={loading || !config.target_col || !config.score_col
                               || config.prot_cols.length === 0}>
              {loading ? 'Auditing Predictions...' : '🎯 Audit Model Predictions'}
            </button>
          </>
        )}

        {error && (
          <div className="error-card" style={{ marginTop: 24 }}>
            <span>⚠</span><div>{error}</div>
          </div>
        )}
        {loading && <Loading />}
      </div>

      {/* ═══════════════════════════════════════════
          STAGE 2 — Prediction Diagnostic Results
          ═══════════════════════════════════════════ */}
      {diagResults && stage >= 2 && (
        <div className="stage-panel visible">
          <div className="results-header" style={{ marginTop: 48 }}>
            <h2>Prediction Audit Report</h2>
            <span className="badge warn">4 TESTS COMPLETE</span>
            {config.prot_cols.length > 1 && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center',
                            gap: 12, background: 'var(--bg2)', padding: '6px 16px',
                            borderRadius: 100, border: '1px solid var(--border)' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                               color: 'var(--text3)' }}>Viewing:</span>
                <div style={{ width: 150 }}>
                  <Select noLabel options={config.prot_cols} selected={activeTab}
                          onChange={setActiveTab} />
                </div>
              </div>
            )}
          </div>

          <div key={activeTab}>
            <Section num={1} title={`Disparate Impact in Predictions: ${activeTab}`}>
              <DisparateImpactResult data={diagResults[activeTab]?.disparate_impact || {}} />
            </Section>
            <Section num={2} title={`Prediction Desert Test: ${activeTab}`}>
              <DataDesertResult data={diagResults[activeTab]?.data_desert || {}} />
            </Section>
            <Section num={3} title={`Proxy Radar: ${activeTab}`}>
              <ProxyResult data={diagResults[activeTab]?.proxy || {}} />
            </Section>
            <Section num={4} title={`Intersectional Prediction Gaps: ${activeTab}`}>
              <IntersectionalResult data={diagResults[activeTab]?.intersection || {}} />
            </Section>
          </div>

          {stage === 2 && (
            <button className="run-btn"
                    style={{ marginTop: 16, background: 'linear-gradient(135deg,#059669,var(--pass))' }}
                    onClick={goToRecommend}>
              See Calibration Recommendation →
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STAGE 3 — Recommendation
          ═══════════════════════════════════════════ */}
      {stage >= 3 && recommendation && (
        <div className="stage-panel visible" style={{ marginTop: 40 }}>
          <div className="section-header">
            <div className="section-number">R</div>
            <div className="section-title">Calibration Recommendation</div>
          </div>

          {/* Diagnostic flag summary */}
          <div className="flag-summary">
            {[
              ['DI',    recommendation.flags.di,     'Disparate Impact'],
              ['DES',   recommendation.flags.desert,  'Data Desert'],
              ['PROXY', recommendation.flags.proxy,   'Proxy Variables'],
              ['INTER', recommendation.flags.inter,   'Intersectional Gap'],
            ].map(([code, fail, label]) => (
              <div key={code} className={`flag-chip ${fail ? 'flag-fail' : 'flag-pass'}`}>
                <span>{fail ? '✗' : '✓'}</span> {label}
              </div>
            ))}
          </div>

          <div className={`reco-card reco-card--${recommendation.color}`}>
            <div className="reco-card-title">{recommendation.title}</div>
            <p className="reco-card-reason">{recommendation.reason}</p>
          </div>

          {recommendation.algo && (
            <>
              <div style={{ marginTop: 28 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <div className="section-number" style={{ fontSize: 11 }}>ALG</div>
                  <div className="section-title" style={{ fontSize: 15 }}>Select Algorithm</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16,
                              fontFamily: "'JetBrains Mono',monospace" }}>
                  2 post-processing algorithms available
                </div>
                <div className="algo-grid">
                  {POST_ALGORITHMS.map(alg => (
                    <div key={alg.id}
                         className={`algo-card ${selectedAlgo === alg.id ? 'algo-card--selected algo-card--selected-green' : ''}`}
                         onClick={() => {
                           setSelectedAlgo(alg.id);
                           const defaults = {};
                           alg.params.forEach(p => { defaults[p.key] = p.default; });
                           setAlgoParams(defaults);
                         }}>
                      {recommendation.algo === alg.id && (
                        <span className="algo-recommended-badge algo-recommended-badge--green">
                          ★ Recommended
                        </span>
                      )}
                      <div className="algo-card-name">{alg.label}</div>
                      <div className="algo-card-desc">{alg.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {activeAlgoDef?.params?.length > 0 && (
                <div style={{ marginTop: 24, padding: 24, background: 'var(--bg2)',
                              border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                               color: 'var(--text3)', textTransform: 'uppercase',
                               letterSpacing: '0.08em', marginBottom: 16 }}>
                    {activeAlgoDef.label} Parameters
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {activeAlgoDef.params.map(param => (
                      <Slider key={param.key}
                        label={param.label}
                        value={algoParams[param.key] ?? param.default}
                        min={param.min} max={param.max} step={param.step}
                        onChange={v => setAlgoParams(p => ({ ...p, [param.key]: v }))}
                        tooltip={param.tip} />
                    ))}
                  </div>
                </div>
              )}

              <button className="run-btn"
                      style={{ marginTop: 24, background: 'linear-gradient(135deg,#059669,var(--pass))' }}
                      onClick={runMitigation}
                      disabled={mitigLoading || !selectedAlgo}>
                {mitigLoading
                  ? 'Running Calibration...'
                  : `🎯 Apply ${activeAlgoDef?.label ?? 'Calibration'}`}
              </button>

              {mitigLoading && <Loading />}
              {mitigError && (
                <div className="error-card" style={{ marginTop: 16 }}>
                  <span>⚠</span><div>{mitigError}</div>
                </div>
              )}
            </>
          )}

          {!recommendation.algo && (
            <div className="result-card" style={{ marginTop: 20, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <p style={{ fontSize: 16, color: 'var(--pass)', fontFamily: "'Syne',sans-serif",
                          fontWeight: 700 }}>
                Your model predictions pass all fairness checks.
              </p>
              <p style={{ color: 'var(--text2)', marginTop: 8 }}>
                No post-processing calibration is required.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STAGE 4 — AFS Comparison
          ═══════════════════════════════════════════ */}
      {stage >= 4 && mitigResult && (
        <div className="stage-panel visible" style={{ marginTop: 40 }}>
          <div className="section-header">
            <div className="section-number">4</div>
            <div className="section-title">Calibration Results — Before vs. After</div>
          </div>
          <div className="result-card" style={{ padding: 0, overflow: 'hidden' }}>
            <AFSComparison result={mitigResult} algorithm={selectedAlgo} />
          </div>
          <button className="run-btn"
                  style={{ marginTop: 24, background: 'linear-gradient(135deg,var(--pass),#059669)' }}
                  onClick={() => { setStage(1); setDiagResults(null); setMitigResult(null); }}>
            ↺ Start New Audit
          </button>
        </div>
      )}

    </div>
  );
}
