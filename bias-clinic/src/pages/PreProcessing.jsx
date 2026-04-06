import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

// Existing components (paths relative to pages/)
import UploadZone   from '../components/UploadZone';
import Slider       from '../components/Slider';
import MultiSelect  from '../components/MultiSelect';
import Select       from '../components/Select';
import Loading      from '../components/Loading';
import { Section, DisparateImpactResult, DataDesertResult, ProxyResult, IntersectionalResult }
  from '../components/Results';

// New shared engine
import {
  PRE_ALGORITHMS,
  getRecommendation,
  AFSGauge,
  AFSComparison,
} from '../components/FairnessEngine';

import '../styles/components.css';
import '../styles/results.css';
import '../styles/workflow.css';

const API = 'http://localhost:8000';

// ─── Stage pill ───────────────────────────────────────────────
function StagePill({ num, label, active, done }) {
  return (
    <div className={`stage-pill ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <div className="stage-pill-num">{done ? '✓' : num}</div>
      <span>{label}</span>
    </div>
  );
}

export default function PreProcessing() {
  // ── Data ──────────────────────────────────────────────────
  const [file,    setFile]    = useState(null);
  const [csvText, setCsvText] = useState('');
  const [csvJson, setCsvJson] = useState([]);
  const [columns, setColumns] = useState([]);

  // ── Config ───────────────────────────────────────────────
  const [config, setConfig] = useState({
    target_col: '', fav_outcome: '1',
    prot_cols: [], group_mappings: {},
    threshold_45: 0.80, desert_thresh: 0.10,
    proxy_thresh: 50,   sec_prots: [],
  });

  // ── Stage tracking ───────────────────────────────────────
  const [stage,    setStage]    = useState(1);   // 1=config, 2=diagnostics, 3=recommend, 4=mitigate
  const [loading,  setLoading]  = useState(false);
  const [diagResults, setDiagResults] = useState(null);
  const [activeTab,   setActiveTab]   = useState('');
  const [error,       setError]       = useState(null);

  // ── Mitigation state ─────────────────────────────────────
  const [selectedAlgo,  setSelectedAlgo]  = useState(null);
  const [algoParams,    setAlgoParams]    = useState({});
  const [mitigResult,   setMitigResult]   = useState(null);
  const [mitigLoading,  setMitigLoading]  = useState(false);
  const [mitigError,    setMitigError]    = useState(null);

  // ── File handling ─────────────────────────────────────────
  const handleFileSelect = async (f) => {
    if (!f?.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f); setError(null); setDiagResults(null); setMitigResult(null);
    setStage(1);

    const text = await f.text();
    setCsvText(text);
    Papa.parse(text, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields || [];
        setColumns(cols);
        setCsvJson(res.data);
        setConfig(prev => ({
          ...prev,
          target_col: cols[cols.length - 1] || '',
          prot_cols:  [cols[0] || ''],
          sec_prots:  [cols[1] || cols[0] || ''],
        }));
      },
    });
  };

  const setConfigVal  = (key)         => (val) => setConfig(p => ({ ...p, [key]: val }));
  const setGroupMap   = (col, type)   => (val) => setConfig(prev => ({
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

  // ── Stage 2: Run diagnostics ──────────────────────────────
  const runDiagnostics = async () => {
    if (!csvText) { setError('No data loaded.'); return; }
    setLoading(true); setError(null); setDiagResults(null); setMitigResult(null);

    try {
      const res = await fetch(`${API}/api/diagnostics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_data: csvText, config }),
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

  // Advance to recommendation stage
  const goToRecommend = () => {
    const reco = getRecommendation(diagResults?.[activeTab], 'pre');
    if (reco) {
      setSelectedAlgo(reco.algo);
      const alg = PRE_ALGORITHMS.find(a => a.id === reco.algo);
      if (alg) {
        const defaults = {};
        alg.params.forEach(p => { defaults[p.key] = p.default; });
        setAlgoParams(defaults);
      }
    }
    setStage(3);
  };

  // ── Stage 4: Run mitigation ───────────────────────────────
  const runMitigation = async () => {
    if (!csvText || !selectedAlgo) return;
    setMitigLoading(true); setMitigError(null); setMitigResult(null);

    try {
      const res = await fetch(`${API}/api/preprocess`, {
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

  // ── Derived ───────────────────────────────────────────────
  const recommendation = diagResults?.[activeTab]
    ? getRecommendation(diagResults[activeTab], 'pre')
    : null;

  const activeAlgoDef = PRE_ALGORITHMS.find(a => a.id === selectedAlgo);

  // ─────────────────────────────────────────────────────────
  return (
    <div className="main" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px 80px' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '40px 0 24px' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                      color: 'var(--accent2)', letterSpacing: '0.15em',
                      textTransform: 'uppercase', marginBottom: 12,
                      display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 1, background: 'var(--accent2)', display: 'inline-block' }} />
          Pre-Processing Fairness Audit
        </div>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 'clamp(28px,4vw,48px)',
                     fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1,
                     marginBottom: 12 }}>
          Diagnose & Fix Bias{' '}
          <span style={{ background: 'linear-gradient(135deg,var(--accent2),#a78bfa)',
                         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                         backgroundClip: 'text' }}>
            Before Training
          </span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.6, maxWidth: 560 }}>
          Upload your raw training data, run a 4-part diagnostic, and apply a recommended
          mitigation algorithm — with before/after AFS comparison.
        </p>
      </div>

      {/* ── Stage pills ── */}
      <div className="stage-track">
        {[['1','Upload & Configure'], ['2','Diagnostics'], ['3','Recommendation'], ['4','Mitigate & Compare']]
          .map(([n, lbl]) => (
            <StagePill key={n} num={n} label={lbl}
                       active={stage === +n} done={stage > +n} />
          ))}
      </div>

      {/* ═══════════════════════════════════════════
          STAGE 1 — Upload & Configure
          ═══════════════════════════════════════════ */}
      <div className={`stage-panel ${stage === 1 ? 'visible' : ''}`}>
        <UploadZone file={file} csvData={csvJson} columns={columns}
                    onFileSelect={handleFileSelect} />

        {columns.length > 0 && (
          <>
            <div className="config-grid" style={{ marginTop: 32 }}>

              {/* Target card */}
              <div className="config-card">
                <h4><span className="dot" />Target & Outcome</h4>
                <Select label="Target Column"
                  tip="The column your model predicts (e.g. Approved, Hired)."
                  options={columns} selected={config.target_col}
                  onChange={setConfigVal('target_col')} />
                <Select label="Favorable Outcome"
                  tip="The positive outcome value (e.g. 1 or Yes)."
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
                  tip="Select the demographic columns to audit (Race, Gender, Age, etc.)." />

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
                        <strong style={{ fontSize: 13, color: 'var(--accent2)',
                                         display: 'block', marginBottom: 8 }}>{col}</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Select label="PRIVILEGED"
                            options={getUnique(col)}
                            selected={config.group_mappings[col]?.priv || ''}
                            onChange={setGroupMap(col, 'priv')}
                            placeholder="e.g. White or >=40" />
                          <Select label="UNPRIVILEGED"
                            options={getUnique(col)}
                            selected={config.group_mappings[col]?.unpriv || ''}
                            onChange={setGroupMap(col, 'unpriv')}
                            placeholder="e.g. Hispanic or <40" />
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
                  tooltip="Legal minimum ratio of unprivileged to privileged selection rate." />
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
                  tip="Columns combined with protected attributes to detect intersectional gaps." />
              </div>
            </div>

            <button className="run-btn"
                    onClick={runDiagnostics}
                    disabled={loading || !config.target_col || config.prot_cols.length === 0}>
              {loading ? 'Running Analysis...' : '⚡ Run Fairness Diagnostics'}
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
          STAGE 2 — Diagnostic Results
          ═══════════════════════════════════════════ */}
      {diagResults && stage >= 2 && (
        <div className={`stage-panel visible`}>
          <div className="results-header" style={{ marginTop: 48 }}>
            <h2>Diagnostic Report</h2>
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
            <Section num={1} title={`Disparate Impact: ${activeTab}`}>
              <DisparateImpactResult data={diagResults[activeTab]?.disparate_impact || {}} />
            </Section>
            <Section num={2} title={`Data Desert Test: ${activeTab}`}>
              <DataDesertResult data={diagResults[activeTab]?.data_desert || {}} />
            </Section>
            <Section num={3} title={`Proxy Radar: ${activeTab}`}>
              <ProxyResult data={diagResults[activeTab]?.proxy || {}} />
            </Section>
            <Section num={4} title={`Intersectional Gaps: ${activeTab}`}>
              <IntersectionalResult data={diagResults[activeTab]?.intersection || {}} />
            </Section>
          </div>

          {stage === 2 && (
            <button className="run-btn" style={{ marginTop: 16 }} onClick={goToRecommend}>
              See Mitigation Recommendation →
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STAGE 3 — Recommendation
          ═══════════════════════════════════════════ */}
      {stage >= 3 && recommendation && (
        <div className={`stage-panel visible`} style={{ marginTop: 40 }}>
          <div className="section-header">
            <div className="section-number">R</div>
            <div className="section-title">Mitigation Recommendation</div>
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

          {/* Recommendation card */}
          <div className={`reco-card reco-card--${recommendation.color}`}>
            <div className="reco-card-title">{recommendation.title}</div>
            <p className="reco-card-reason">{recommendation.reason}</p>
          </div>

          {/* Algorithm selector */}
          {recommendation.algo && (
            <>
              <div style={{ marginTop: 28 }}>
                <div className="section-header" style={{ marginBottom: 16 }}>
                  <div className="section-number" style={{ fontSize: 11 }}>ALG</div>
                  <div className="section-title" style={{ fontSize: 15 }}>Select Algorithm</div>
                </div>
                <div className="algo-grid">
                  {PRE_ALGORITHMS.map(alg => (
                    <div key={alg.id}
                         className={`algo-card ${selectedAlgo === alg.id ? 'algo-card--selected' : ''}`}
                         onClick={() => {
                           setSelectedAlgo(alg.id);
                           const defaults = {};
                           alg.params.forEach(p => { defaults[p.key] = p.default; });
                           setAlgoParams(defaults);
                         }}>
                      {recommendation.algo === alg.id && (
                        <span className="algo-recommended-badge">★ Recommended</span>
                      )}
                      <div className="algo-card-name">{alg.label}</div>
                      <div className="algo-card-desc">{alg.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Algorithm params */}
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

              <button className="run-btn" style={{ marginTop: 24 }}
                      onClick={runMitigation}
                      disabled={mitigLoading || !selectedAlgo}>
                {mitigLoading ? 'Running Mitigation...' : `⚡ Apply ${activeAlgoDef?.label ?? 'Algorithm'}`}
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
                Your dataset passes all fairness checks.
              </p>
              <p style={{ color: 'var(--text2)', marginTop: 8 }}>
                No mitigation is required at this time.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STAGE 4 — Before / After AFS Comparison
          ═══════════════════════════════════════════ */}
      {stage >= 4 && mitigResult && (
        <div className={`stage-panel visible`} style={{ marginTop: 40 }}>
          <div className="section-header">
            <div className="section-number">4</div>
            <div className="section-title">Mitigation Results — Before vs. After</div>
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
