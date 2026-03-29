import React from 'react';
import '../styles/results.css';

const fmt = (v, d = 3) => (typeof v === 'number' && !isNaN(v)) ? v.toFixed(d) : '—';
const pct = v => `${(v * 100).toFixed(1)}%`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function Section({ num, title, children }) {
  return (
    <div className="section" style={{ animationDelay: `${(num - 1) * 0.08}s` }}>
      <div className="section-header">
        <div className="section-number">{num}</div>
        <div className="section-title">{title}</div>
      </div>
      <div className="result-card">{children}</div>
    </div>
  );
}

function BarChart({ rows, dangerAt, colorFn }) {
  const max = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="bar-chart">
      {rows.map((row, i) => {
        const percentage = clamp((row.value / max) * 100, 0, 100);
        const cls = colorFn ? colorFn(row) : 'neutral';
        return (
          <div key={i} className="bar-row">
            <span className="bar-label" title={row.label}>{row.label}</span>
            <div className="bar-track">
              {dangerAt != null && <div className="danger-line" style={{ left: `${clamp((dangerAt / max) * 100, 0, 100)}%` }} />}
              <div className={`bar-fill ${cls}`} style={{ width: `${percentage}%` }}>
                {percentage > 15 ? (row.displayVal ?? '') : ''}
              </div>
            </div>
            <span className="bar-count">{row.displayVal ?? row.value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DisparateImpactResult({ data }) {
  if (data.error) return <div className="error-card">⚠ {data.error}</div>;
  if (data.ratio == null) return <div className="error-card" style={{color: 'var(--fail)'}}>⚠ Could not calculate — check class names.</div>;

  const pass = data.is_legal;
  const gaugeWidth = clamp((data.ratio / 1.5) * 100, 0, 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className={`badge ${pass ? 'pass' : 'fail'}`}>{pass ? 'PASS' : 'FAIL'}</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Threshold: {data.threshold}</span>
      </div>
      <div className="metric-row">
        <span className={`metric-big ${pass ? 'good' : 'bad'}`}>{fmt(data.ratio, 2)}</span>
        <span className="metric-label">Disparate Impact Ratio</span>
      </div>
      <div className="gauge-wrap">
        <div className="gauge-track">
          <div className="gauge-fill" style={{ width: `${gaugeWidth}%` }} />
        </div>
        <div className="gauge-ticks">
          <span className="gauge-tick">0</span>
          <span className="gauge-tick" style={{ color: 'var(--warn)' }}>0.8 (legal min)</span>
          <span className="gauge-tick">1.5+</span>
        </div>
      </div>
    </div>
  );
}

export function DataDesertResult({ data }) {
  const rows = (data.groups || []).map(g => ({
    label: String(g.group), value: g.proportion, displayVal: pct(g.proportion), isDesert: g.is_desert
  }));
  const deserts = rows.filter(r => r.isDesert);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className={`badge ${deserts.length ? 'fail' : 'pass'}`}>{deserts.length ? `${deserts.length} DESERT(S) FOUND` : 'NO DESERTS'}</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Threshold: {pct(data.threshold)}</span>
      </div>
      <BarChart rows={rows} dangerAt={data.threshold} colorFn={r => r.isDesert ? 'bad' : 'good'} />
    </div>
  );
}

export function ProxyResult({ data }) {
  const proxies = data.proxies || [];
  if (proxies.length === 0) return <div><span className="badge pass">NO PROXIES DETECTED</span></div>;

  return (
    <div>
      <span className="badge fail">{proxies.length} PROXY DETECTED</span>
      <div style={{ marginTop: 20 }}>
        {proxies.map((p, i) => {
          const cov = clamp((p.cov) / (proxies.length) * 100, 0, 100);
          const mi = clamp((p.mi) / (proxies.length) * 100, 0, 100);
          const rf = clamp((p.rf) / (proxies.length) * 100, 0, 100);
          return (
            <div key={i} className="proxy-feature">
              <div className="proxy-feature-name"><span>⚡</span>{p.feature}</div>
              <div className="proxy-mini-bars">
                {[['COV', 'pmf-cov', cov, p.cov], ['MI', 'pmf-mi', mi, p.mi], ['RF', 'pmf-rf', rf, p.rf]].map(([l, cls, w, raw]) => (
                  <div key={l} className="proxy-mini-bar-wrap">
                    <div className="proxy-mini-label">{l}</div>
                    <div className="proxy-mini-track"><div className={`proxy-mini-fill ${cls}`} style={{ width: `${w}%` }} /></div>
                    <div className="proxy-mini-val">rank {fmt(raw, 1)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function IntersectionalResult({ data }) {
  const pass = !data.is_gap;
  const groups = data.groups || [];
  const getColor = rate => rate >= 0.7 ? 'var(--pass)' : rate >= 0.4 ? 'var(--warn)' : 'var(--fail)';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className={`badge ${pass ? 'pass' : 'fail'}`}>{pass ? 'SAFE MARGINS' : 'GAP DETECTED'}</span>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Gap: {pct(data.gap)}</span>
      </div>
      <div className="metric-row">
        <span className={`metric-big ${pass ? 'good' : 'bad'}`}>{pct(data.gap)}</span>
        <span className="metric-label">Max intersectional gap</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            {groups[0] && Object.keys(groups[0]).filter(k => k !== 'rate' && k !== 'count').map(k => <th key={k}>{k}</th>)}
            <th>Approval Rate</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => {
            const keys = Object.keys(g).filter(k => k !== 'rate' && k !== 'count');
            const color = getColor(g.rate);
            return (
              <tr key={i}>
                {keys.map(k => <td key={k} className="td-val">{String(g[k])}</td>)}
                <td><span className="rate-pill" style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}>{pct(g.rate)}</span></td>
                <td style={{ color: 'var(--text3)' }}>{g.count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}