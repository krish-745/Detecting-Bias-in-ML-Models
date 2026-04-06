// ─────────────────────────────────────────────────────────────
//  Recommendation Engine  (shared by Pre + Post Processing pages)
// ─────────────────────────────────────────────────────────────

export const PRE_ALGORITHMS = [
  {
    id: 'reweighing',
    label: 'Reweighing',
    desc: 'Assigns statistical compensation weights to each group/outcome combination. Least invasive — preserves original feature values.',
    params: [],
  },
  {
    id: 'dir',
    label: 'Disparate Impact Remover',
    desc: 'Repairs feature distributions for each protected group by aligning them toward a common representation.',
    params: [
      { key: 'repair_level', label: 'Repair Level', min: 0, max: 1, step: 0.05, default: 0.8,
        tip: '1.0 = full repair (identical distributions). 0.0 = no change.' },
    ],
  },
  {
    id: 'optimized',
    label: 'Optimized Preprocessor',
    desc: 'Uses convex optimization (CVXPY) to find the minimum-distortion transformation that enforces joint parity constraints.',
    params: [
      { key: 'epsilon',    label: 'Epsilon (ε)',   min: 0.01, max: 0.2,  step: 0.01, default: 0.05,
        tip: 'Maximum allowed disparity between groups. Lower = stricter fairness.' },
      { key: 'distortion', label: 'Distortion Budget', min: 0.5, max: 10,  step: 0.5, default: 3.0,
        tip: 'How much each data point can shift. Higher = more flexibility for the optimizer.' },
    ],
  },
];

export const POST_ALGORITHMS = [
  {
    id: 'equalized_odds',
    label: 'Equalized Odds',
    desc: 'Computes per-group ROC curves and finds optimal decision thresholds that equalise TPR and FPR across groups.',
    params: [],
  },
  {
    id: 'reject_option',
    label: 'Reject Option Classification',
    desc: 'Flips borderline predictions (near the decision boundary) in favour of the unprivileged group.',
    params: [
      { key: 'threshold', label: 'Decision Threshold', min: 0.3, max: 0.7, step: 0.05, default: 0.5,
        tip: 'The central threshold. Predictions within ± margin of this are considered borderline.' },
      { key: 'margin',    label: 'Margin Width',       min: 0.05, max: 0.4, step: 0.05, default: 0.15,
        tip: 'The width of the "uncertain zone" around the threshold.' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
//  Recommendation map  (16 diagnostic combinations × 2 modes)
// ─────────────────────────────────────────────────────────────

const PRE_MAP = {
  '0000': { algo: null, title: 'No Mitigation Required', color: 'pass',
    reason: 'All four fairness diagnostics passed. Your dataset shows no significant disparate impact, data imbalance, proxy variables, or intersectional gaps. No pre-processing mitigation is needed at this time.' },
  '1000': { algo: 'reweighing', title: 'Reweighing Recommended', color: 'warn',
    reason: 'Disparate Impact was detected without proxy or intersectional complexity. Reweighing is the least invasive fix — it assigns statistical compensation weights to underrepresented group/outcome pairs, correcting selection rate disparity while preserving every original feature value.' },
  '0100': { algo: 'reweighing', title: 'Reweighing Recommended', color: 'warn',
    reason: 'A data desert exists — one or more groups are severely underrepresented. Reweighing compensates by assigning higher statistical weights to rare group instances, effectively making the model train as if those subgroups had more examples.' },
  '0010': { algo: 'dir', title: 'Disparate Impact Remover Recommended', color: 'fail',
    reason: 'Proxy variables detected — features in your dataset are strongly correlated with the protected attribute. The Disparate Impact Remover (Feldman et al., 2015) directly repairs feature distributions for each group, aligning them toward a shared representation while minimising information distortion.' },
  '0001': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Intersectional gaps detected across subgroup combinations. The Optimized Preprocessor uses convex optimization to enforce fairness constraints simultaneously across all protected group intersections — the only algorithm powerful enough to handle multi-attribute parity requirements.' },
  '1100': { algo: 'reweighing', title: 'Reweighing Recommended', color: 'warn',
    reason: 'Both disparate impact and data deserts are present. Reweighing addresses both in a single pass — the joint probability weighting accounts for group imbalance and selection rate disparity simultaneously without distorting the feature space.' },
  '1010': { algo: 'dir', title: 'Disparate Impact Remover Recommended', color: 'fail',
    reason: 'Disparate Impact is likely being driven by proxy variables. The DIR is the targeted solution — it repairs the feature distributions that are acting as proxies, cutting off the causal pathway between the proxy feature and the protected attribute.' },
  '1001': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Disparate Impact combined with intersectional gaps signals deep structural bias. The Optimized Preprocessor\'s mathematical framework handles this complexity, enforcing parity constraints across all group combinations while minimising information loss.' },
  '0110': { algo: 'dir', title: 'Disparate Impact Remover Recommended', color: 'fail',
    reason: 'Proxy variables are correlated with the underrepresented group, compounding their disadvantage. The DIR targets the feature-level source of this correlation, providing a repair that simultaneously addresses proxy bias and reduces the impact of data desert conditions.' },
  '0101': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Data deserts combined with intersectional gaps create a complex bias pattern. The Optimized Preprocessor re-balances the state distribution across all subgroup combinations, handling the multi-dimensional nature of this bias through convex optimization.' },
  '0011': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Proxy variables combined with intersectional gaps indicate bias encoded across multiple features and group combinations. The Optimized Preprocessor\'s full joint-distribution transformation is the only approach capable of handling this level of complexity.' },
  '1110': { algo: 'dir', title: 'Disparate Impact Remover Recommended', color: 'fail',
    reason: 'Three diagnostic failures all traceable to proxy variables driving disparate impact in an imbalanced dataset. The DIR is the highest-leverage intervention — repairing the proxy features should cascade to resolve the DI and desert-amplified bias.' },
  '1101': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Disparate impact, data deserts, and intersectional gaps indicate systemic structural bias. The Optimized Preprocessor is the most comprehensive solution, using mathematical optimization to achieve fairness across all protected group intersections.' },
  '1011': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Disparate impact, proxy variables, and intersectional failures simultaneously detected. This severity warrants the Optimized Preprocessor — its convex optimization is the only approach that can simultaneously satisfy parity constraints across all group combinations.' },
  '0111': { algo: 'optimized', title: 'Optimized Preprocessor Recommended', color: 'fail',
    reason: 'Proxy variables are amplifying both intersectional and desert-driven bias. The Optimized Preprocessor\'s joint distribution transformation is specifically designed for this type of multi-layered bias, enforcing group parity at every intersection mathematically.' },
  '1111': { algo: 'optimized', title: '⚠ Critical — Optimized Preprocessor Strongly Recommended', color: 'fail',
    reason: 'CRITICAL: All four fairness diagnostics failed. This indicates deep, systemic bias across disparate impact, data representation, proxy variables, and intersectional groups. The Optimized Preprocessor is the only algorithm with sufficient mathematical power to address bias at this scale.' },
};

const POST_MAP = {
  '0000': { algo: null, title: 'No Mitigation Required', color: 'pass',
    reason: 'All diagnostics passed on model predictions. The model is making equitable decisions across all protected groups.' },
  '1000': { algo: 'reject_option', title: 'Reject Option Classification Recommended', color: 'warn',
    reason: 'Disparate Impact in predictions only. ROC is a surgical fix — it flips borderline predictions near the decision boundary in favour of the unprivileged group, minimally impacting high-confidence predictions.' },
  '0100': { algo: 'reject_option', title: 'Reject Option Classification Recommended', color: 'warn',
    reason: 'Data deserts affecting predictions. ROC compensates by ensuring borderline cases for underrepresented groups are decided favourably, addressing the model\'s undertraining on these subgroups.' },
  '0010': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Proxy variables suggest the model is using protected information indirectly. Equalized Odds recalibrates decision thresholds per group to achieve equal True and False Positive Rates, neutralising the proxy effect in final predictions.' },
  '0001': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Intersectional gaps in predictions require group-specific threshold calibration. Equalized Odds computes separate optimal thresholds for each protected group, ensuring equal opportunity across all subgroup intersections.' },
  '1100': { algo: 'reject_option', title: 'Reject Option Classification Recommended', color: 'warn',
    reason: 'DI and data desert in predictions. ROC handles borderline cases favourably for underrepresented groups, compensating for both biases without requiring model retraining.' },
  '1010': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'DI combined with proxy variables in predictions. Equalized Odds\' ROC-based per-group threshold calibration is the appropriate correction for this pattern of indirect discrimination.' },
  '1001': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Disparate Impact combined with intersectional gaps requires group-specific threshold optimization via Equalized Odds — the only post-processing technique that handles per-subgroup calibration.' },
  '0110': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Desert combined with proxy bias — Equalized Odds per-group calibration is recommended to neutralise the compounding effect of underrepresentation and indirect discrimination.' },
  '0101': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Desert combined with intersectional gaps — Equalized Odds handles per-subgroup threshold calibration to address parity failures at each group intersection.' },
  '0011': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Both proxy variables and intersectional gaps point to group-specific threshold issues. Equalized Odds\' per-group ROC calibration is the most principled fix.' },
  '1110': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Three failures with proxy involvement — Equalized Odds ROC calibration is recommended to simultaneously address the DI, desert, and proxy-driven bias in predictions.' },
  '1101': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Complex multi-failure pattern. Equalized Odds\' per-group threshold optimization is the most comprehensive post-processing correction available.' },
  '1011': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Severe multi-failure detected in predictions. Equalized Odds is the most robust post-processing correction, enforcing per-group parity constraints at the decision boundary.' },
  '0111': { algo: 'equalized_odds', title: 'Equalized Odds Recommended', color: 'fail',
    reason: 'Desert, proxy, and intersectional bias all detected. Equalized Odds per-group calibration is essential to disentangle these compounding bias sources in the prediction layer.' },
  '1111': { algo: 'equalized_odds', title: '⚠ Critical — Equalized Odds Strongly Recommended', color: 'fail',
    reason: 'CRITICAL: All four diagnostics failed on model predictions. Equalized Odds is the only post-processing technique that simultaneously calibrates decision thresholds across all protected groups to enforce both equal opportunity and equal odds.' },
};

export function getRecommendation(diagResults, mode = 'pre') {
  if (!diagResults) return null;

  const di     = !(diagResults?.disparate_impact?.is_legal ?? true);
  const desert = (diagResults?.data_desert?.groups ?? []).some(g => g.is_desert);
  const proxy  = (diagResults?.proxy?.proxies?.length ?? 0) > 0;
  const inter  = diagResults?.intersection?.is_gap ?? false;

  const key = `${+di}${+desert}${+proxy}${+inter}`;
  const map  = mode === 'pre' ? PRE_MAP : POST_MAP;

  return { ...(map[key] ?? map['0000']), flags: { di, desert, proxy, inter }, key };
}

// ─────────────────────────────────────────────────────────────
//  AFS Gauge  (SVG arc gauge)
// ─────────────────────────────────────────────────────────────
export function AFSGauge({ score, label = 'AFS Score', size = 160 }) {
  const R    = 50;
  const cx   = 65;
  const cy   = 70;
  const arcLen = Math.PI * R; // half-circle
  const filled = Math.min(Math.max(score / 100, 0), 1) * arcLen;
  const remaining = arcLen - filled;

  const verdict = score > 80 ? 'pass' : score > 65 ? 'warn' : 'fail';
  const color   = verdict === 'pass' ? '#10b981' : verdict === 'warn' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size * 0.7} viewBox="0 0 130 90">
        <defs>
          <linearGradient id={`g-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"  stopColor="#ef4444" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke={`url(#g-${label})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${remaining + 0.1}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}
        />
        {/* Score text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#f0f0f8"
              fontFamily="Syne, sans-serif" fontSize="26" fontWeight="800">
          {score != null ? Math.round(score) : '—'}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#9090b8"
              fontFamily="JetBrains Mono, monospace" fontSize="8" letterSpacing="0.08em">
          {label.toUpperCase()}
        </text>
      </svg>
      <span className={`badge ${verdict}`} style={{ display: 'inline-flex', marginTop: 6, fontSize: 11 }}>
        {verdict.toUpperCase()}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AFS Comparison Dashboard
// ─────────────────────────────────────────────────────────────
const METRIC_LABELS = {
  SPD:               'Statistical Parity Diff',
  DI:                'Disparate Impact',
  EOD:               'Equal Opportunity Diff',
  AOD:               'Average Odds Diff',
  Predictive_Parity: 'Predictive Parity',
  Theil_Index:       'Theil Index',
  Consistency:       'Consistency',
};
const SCORE_KEYS = {
  SPD_Score:                'Statistical Parity',
  DI_Score:                 'Disparate Impact',
  EOD_Score:                'Equal Opportunity',
  AOD_Score:                'Average Odds',
  Predictive_Parity_Score:  'Predictive Parity',
  Theil_Score:              'Theil Index',
  Consistency_Score:        'Consistency',
};

function MetricBar({ label, before, after }) {
  const delta = after - before;
  const clamp = v => Math.max(0, Math.min(100, v ?? 0));
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: 'var(--text2)' }}>
          {label}
        </span>
        <span style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
          color: delta >= 0 ? 'var(--pass)' : 'var(--fail)',
        }}>
          {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
        </span>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        {/* Before track */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 8,
          background: 'var(--bg3)', borderRadius: 4,
        }} />
        {/* After fill */}
        <div style={{
          position: 'absolute', top: 0, left: 0, height: 8, borderRadius: 4,
          width: `${clamp(after)}%`,
          background: after >= 80
            ? 'linear-gradient(90deg,var(--pass),rgba(16,185,129,0.5))'
            : after >= 65
              ? 'linear-gradient(90deg,var(--warn),rgba(245,158,11,0.5))'
              : 'linear-gradient(90deg,var(--fail),rgba(239,68,68,0.5))',
          transition: 'width 1s cubic-bezier(0.16,1,0.3,1)',
        }} />
        {/* Before marker */}
        <div style={{
          position: 'absolute', top: -2, width: 3, height: 12,
          left: `${clamp(before)}%`, background: 'rgba(255,255,255,0.35)',
          borderRadius: 2, transform: 'translateX(-50%)',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'var(--text3)' }}>
          Before: {before?.toFixed(1) ?? '—'}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'var(--text3)' }}>
          After: {after?.toFixed(1) ?? '—'}
        </span>
      </div>
    </div>
  );
}

function generateNarrative(baseline, mitigated, algorithm) {
  const delta = (mitigated.afs - baseline.afs).toFixed(1);
  const isPositive = mitigated.afs > baseline.afs;
  const algoNames = {
    reweighing:      'Reweighing',
    dir:             'Disparate Impact Remover',
    optimized:       'Optimized Preprocessor',
    equalized_odds:  'Equalized Odds',
    reject_option:   'Reject Option Classification',
  };

  const algoLabel = algoNames[algorithm] || algorithm;
  const beforeVerdict = baseline.afs > 80 ? 'passing' : baseline.afs > 65 ? 'warning' : 'failing';
  const afterVerdict  = mitigated.afs > 80 ? 'Pass' : mitigated.afs > 65 ? 'Warning' : 'Fail';

  const scoreNames = Object.entries(SCORE_KEYS);
  const improvements = scoreNames.filter(([k]) =>
    (mitigated.normalized_scores?.[k] ?? 0) > (baseline.normalized_scores?.[k] ?? 0)
  );
  const biggest = improvements.sort((a, b) =>
    ((mitigated.normalized_scores?.[b[0]] ?? 0) - (baseline.normalized_scores?.[b[0]] ?? 0)) -
    ((mitigated.normalized_scores?.[a[0]] ?? 0) - (baseline.normalized_scores?.[a[0]] ?? 0))
  ).slice(0, 2);

  return [
    `${algoLabel} shifted the AFS score from ${baseline.afs.toFixed(1)} (${beforeVerdict}) ` +
    `to ${mitigated.afs.toFixed(1)} (${afterVerdict}) — a ${isPositive ? 'gain' : 'change'} of ${isPositive ? '+' : ''}${delta} points.`,

    biggest.length
      ? `The largest improvements were in ${biggest.map(([k, v]) => v).join(' and ')}, ` +
        `where per-group distributions were most effectively re-balanced.`
      : 'Metric changes were distributed evenly across all fairness dimensions.',

    mitigated.accuracy && baseline.accuracy
      ? `Model accuracy moved from ${baseline.accuracy}% to ${mitigated.accuracy}% — a ` +
        `${(mitigated.accuracy - baseline.accuracy) >= 0 ? '+' : ''}${(mitigated.accuracy - baseline.accuracy).toFixed(1)}% trade-off ` +
        `(the fairness–accuracy trade-off is expected in any de-biasing intervention).`
      : '',
  ].filter(Boolean).join(' ');
}

export function AFSComparison({ result, algorithm }) {
  if (!result || result.error) {
    return (
      <div className="error-card">
        <span>⚠</span>
        <div>{result?.error || 'Mitigation result unavailable.'}</div>
      </div>
    );
  }

  const { baseline, mitigated, delta } = result;

  return (
    <div className="afs-comparison">

      {/* Top row: gauges + delta */}
      <div className="afs-comparison-gauges">
        <div className="afs-gauge-wrap">
          <div className="afs-gauge-label">Before Mitigation</div>
          <AFSGauge score={baseline.afs} label="Before" />
          {baseline.accuracy != null && (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                          color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              Accuracy: {baseline.accuracy}%
            </div>
          )}
        </div>

        <div className="afs-delta-col">
          <div className={`afs-delta-badge ${delta >= 0 ? 'good' : 'bad'}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)} pts
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                        color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
            AFS DELTA
          </div>
        </div>

        <div className="afs-gauge-wrap">
          <div className="afs-gauge-label">After Mitigation</div>
          <AFSGauge score={mitigated.afs} label="After" />
          {mitigated.accuracy != null && (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                          color: 'var(--text3)', marginTop: 6, textAlign: 'center' }}>
              Accuracy: {mitigated.accuracy}%
            </div>
          )}
        </div>
      </div>

      {/* Metric breakdown bars */}
      <div className="afs-metrics-grid">
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                        color: 'var(--text3)', textTransform: 'uppercase',
                        letterSpacing: '0.08em', marginBottom: 16 }}>
            Normalised Score Breakdown
          </div>
          {Object.entries(SCORE_KEYS).map(([key, label]) => (
            <MetricBar
              key={key}
              label={label}
              before={baseline.normalized_scores?.[key] ?? 0}
              after={mitigated.normalized_scores?.[key] ?? 0}
            />
          ))}
          <div style={{ marginTop: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                        color: 'var(--text3)' }}>
            White marker = before. Bar = after. All scores are 0–100.
          </div>
        </div>
      </div>

      {/* Plain-English narrative */}
      <div className="afs-narrative">
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11,
                      color: 'var(--text3)', textTransform: 'uppercase',
                      letterSpacing: '0.08em', marginBottom: 12 }}>
          ✦ Plain-English Summary
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
          {generateNarrative(baseline, mitigated, algorithm)}
        </p>
      </div>

    </div>
  );
}
