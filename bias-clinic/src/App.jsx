import React, { useState } from 'react';
import Papa from 'papaparse';
import Header from './components/Header';
import Hero from './components/Hero';
import UploadZone from './components/UploadZone';
import Slider from './components/Slider';
import MultiSelect from './components/MultiSelect';
import Select from './components/Select';
import Loading from './components/Loading';
import { Section, DisparateImpactResult, DataDesertResult, ProxyResult, IntersectionalResult } from './components/Results';
import './styles/components.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [csvText, setCsvText] = useState(""); 
  const [csvJson, setCsvJson] = useState([]); // Stores parsed data for fast unique value extraction
  const [columns, setColumns] = useState([]);
  
  // The Configuration State
  const [config, setConfig] = useState({
    target_col: '', fav_outcome: '1',
    prot_cols: [], 
    group_mappings: {}, // Stores priv/unpriv values for EACH selected attribute
    threshold_45: 0.80, desert_thresh: 0.10,
    proxy_thresh: 50, sec_prots: [] 
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(""); // Tracks which result view is currently showing

  // --- Handlers & Helpers ---
  const handleFileSelect = async (f) => {
    if (!f || !f.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setFile(f); setError(null); setResults(null);
    
    const text = await f.text();
    setCsvText(text); 

    Papa.parse(text, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields || [];
        setColumns(cols);
        setCsvJson(res.data); // Save the JSON so we can extract unique values instantly
        setConfig(prev => ({
          ...prev,
          target_col: cols[cols.length-1] || '',
          prot_cols: [cols[0] || ''], 
          sec_prots: [cols[1] || cols[0] || ''],
        }));
      }
    });
  };

  const setConfigVal = (key) => (val) => setConfig(p => ({...p, [key]: val}));

  const setGroupMapping = (col, type, val) => {
    setConfig(prev => ({
      ...prev,
      group_mappings: {
        ...prev.group_mappings,
        [col]: { ...(prev.group_mappings[col] || {}), [type]: val }
      }
    }));
  };

  // Fast extractor for dropdown options
  const getUniqueValues = (colName) => {
    if (!csvJson || csvJson.length === 0 || !colName) return [];
    const unique = new Set();
    for (let i = 0; i < csvJson.length; i++) {
      const val = csvJson[i][colName];
      if (val !== undefined && val !== null && val !== "") unique.add(String(val));
    }
    return Array.from(unique).sort();
  };

  // --- API Call to Python ---
  const runDiagnostics = async () => {
    if (!csvText) { setError('No data loaded.'); return; }
    setLoading(true); setError(null); setResults(null);

    try {
      const response = await fetch('http://localhost:8000/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_data: csvText,
          config: config
        })
      });

      if (!response.ok) {
        throw new Error(`Python Backend Error: ${response.statusText}`);
      }

      const backendData = await response.json();
      setResults(backendData);
      
      // Auto-select the first attribute for the results view
      if (config.prot_cols.length > 0) {
        setActiveTab(config.prot_cols[0]);
      }

    } catch(e) { 
      setError('Connection to Python backend failed. Is your FastAPI server running? Error: ' + e.message); 
    }
    setLoading(false);
  };

  return (
    <>
      <Header />
      <Hero />
      <div className="main" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px 80px' }}>
        
        <UploadZone file={file} csvData={csvJson} columns={columns} onFileSelect={handleFileSelect} />

        {columns.length > 0 && (
          <>
            <div className="config-grid">
              
              {/* TARGET CARD */}
              <div className="config-card">
                <h4><span className="dot"/> Target & Outcome</h4>
                <Select 
                  label="Target Column" tip="The column your AI is trying to predict (e.g., Loan Approved, Hired)."
                  options={columns} selected={config.target_col} onChange={setConfigVal('target_col')} 
                />
                <Select 
                  label="Favorable Outcome" tip="The exact value in the Target Column that represents a positive result."
                  options={getUniqueValues(config.target_col)} selected={config.fav_outcome} onChange={setConfigVal('fav_outcome')} 
                />
              </div>
              
              {/* PROTECTED ATTRIBUTES CARD */}
              <div className="config-card">
                <h4><span className="dot"/> Protected Attributes</h4>
                <MultiSelect 
                  label="Protected Attributes" 
                  options={columns} selected={config.prot_cols} onChange={setConfigVal('prot_cols')} 
                  tip="Select ONE OR MORE demographic columns you want to test for bias (e.g., Race, Gender, Age)." 
                />
                
                {config.prot_cols.length > 0 && (
                  <div style={{ marginTop: '16px', padding: '16px', background: 'var(--bg3)', borderRadius: 'var(--radius2)', border: '1px solid var(--border2)' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Define Groups</p>
                    {config.prot_cols.map((col, idx) => (
                      <div key={col} style={{ marginBottom: idx === config.prot_cols.length - 1 ? 0 : '16px', borderBottom: idx === config.prot_cols.length - 1 ? 'none' : '1px solid var(--border)', paddingBottom: idx === config.prot_cols.length - 1 ? 0 : '16px' }}>
                        <strong style={{ fontSize: '13px', color: 'var(--accent2)', display: 'block', marginBottom: '8px' }}>{col}</strong>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <Select 
                              label="PRIVILEGED" noLabel={false}
                              options={getUniqueValues(col)} 
                              selected={config.group_mappings[col]?.priv || ''} 
                              onChange={val => setGroupMapping(col, 'priv', val)} 
                              placeholder="e.g. White"
                            />
                          </div>
                          <div>
                            <Select 
                              label="UNPRIVILEGED" noLabel={false}
                              options={getUniqueValues(col)} 
                              selected={config.group_mappings[col]?.unpriv || ''} 
                              onChange={val => setGroupMapping(col, 'unpriv', val)} 
                              placeholder="e.g. Hispanic"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* THRESHOLDS CARD */}
              <div className="config-card">
                <h4><span className="dot"/> Thresholds</h4>
                <Slider label="4/5ths Rule" value={config.threshold_45} min={0} max={1} step={0.01} onChange={setConfigVal('threshold_45')} tooltip="The legal baseline. The unprivileged group must succeed at least at this ratio compared to the privileged group." />
                <Slider label="Data Desert" value={config.desert_thresh} min={0} max={0.5} step={0.01} onChange={setConfigVal('desert_thresh')} tooltip="If a group makes up less than this percentage of your total data, it will be flagged as a 'Desert'." />
                <Slider label="Proxy Sensitivity" value={config.proxy_thresh} min={0} max={100} step={1} onChange={setConfigVal('proxy_thresh')} tooltip="Higher sensitivity will flag weaker correlations." />
                <MultiSelect 
                  label="Secondary Attributes" 
                  options={columns} selected={config.sec_prots} onChange={setConfigVal('sec_prots')} 
                  tip="Select columns to combine with your Protected Attributes to check for Intersectional Bias." 
                />
              </div>
            </div>

            <button className="run-btn" onClick={runDiagnostics} disabled={loading || !config.target_col || config.prot_cols.length === 0}>
              {loading ? 'Running Analysis...' : '⚡ Run Fairness Diagnostics'}
            </button>
          </>
        )}

        {error && <div className="error-card" style={{ marginTop: 24 }}><span>⚠</span><div>{error}</div></div>}
        {loading && <Loading />}

        {/* REWIRED RESULTS RENDERER WITH DROPDOWN */}
        {results && !loading && activeTab && (
          <div style={{ paddingBottom: 60 }}>
            
            {/* THE HEADER & DROPDOWN */}
            <div className="results-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '48px 0 32px', paddingBottom: '24px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: '800', margin: 0 }}>
                  Diagnostic Report
                </h2>
                <span className="badge warn">4 TESTS COMPLETE</span>
              </div>

              {/* Only show the dropdown if they selected more than 1 attribute */}
              {config.prot_cols.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg2)', padding: '6px 16px', borderRadius: '100px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em' }}>Viewing:</span>
                  <div style={{ width: '150px' }}>
                    <Select 
                      noLabel={true}
                      options={config.prot_cols} 
                      selected={activeTab} 
                      onChange={setActiveTab} 
                    />
                  </div>
                </div>
              )}
            </div>

            {/* THE CHARTS (Keyed to activeTab to force animation replay on switch) */}
            <div key={activeTab}>
              <Section num={1} title={`Disparate Impact: ${activeTab}`}>
                <DisparateImpactResult data={results[activeTab]?.disparate_impact || {error: "No data from backend"}} />
              </Section>

              <Section num={2} title={`Data Desert Test: ${activeTab}`}>
                <DataDesertResult data={results[activeTab]?.data_desert || {error: "No data from backend"}} />
              </Section>

              <Section num={3} title={`Proxy Radar: ${activeTab}`}>
                <ProxyResult data={results[activeTab]?.proxy || {error: "No data from backend"}} />
              </Section>

              <Section num={4} title={`Intersectional Gaps: ${activeTab}`}>
                <IntersectionalResult data={results[activeTab]?.intersection || {error: "No data from backend"}} />
              </Section>
            </div>

          </div>
        )}
      </div>
    </>
  );
}