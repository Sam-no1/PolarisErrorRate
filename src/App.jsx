import { useState, useEffect, useRef } from 'react';
import { fmtI, fmtP, rateColor, C, FEATURE_COLORS, FEATURE_LABELS } from './utils.js';
import FeatureStrip    from './components/FeatureStrip.jsx';
import DailyTimeline   from './components/DailyTimeline.jsx';
import BubbleChart     from './components/BubbleChart.jsx';
import AllocProfile    from './components/AllocProfile.jsx';
import NodesProfile    from './components/NodesProfile.jsx';
import RiskQuadrant    from './components/RiskQuadrant.jsx';
import Leaderboard     from './components/Leaderboard.jsx';
import ExitCodeProfile from './components/ExitCodeProfile.jsx';
import EntityTable     from './components/EntityTable.jsx';

// ── Animated count (counts up from 0 on mount) ─────────────
function AnimatedCount({ value, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current || value === undefined) return;
    const start    = performance.now();
    const duration = 1000;
    function tick(now) {
      const t    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      if (ref.current) ref.current.textContent = fmtI(Math.round(value * ease));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <div ref={ref} className={className} style={style}>—</div>;
}

// ── Animated bar (CSS transition from 0→target) ────────────
function AnimatedBar({ targetWidth, barClass, barColor }) {
  const [width, setWidth] = useState('0%');
  useEffect(() => {
    const t = setTimeout(() => setWidth(targetWidth || '0%'), 80);
    return () => clearTimeout(t);
  }, [targetWidth]);
  return (
    <div className="kpi-bar">
      <div
        className={`kpi-bar-fill ${barClass || ''}`}
        style={{ width, ...(barColor ? { background: barColor } : {}) }}
      />
    </div>
  );
}

// ── KPI Detail Panel ────────────────────────────────────────
function DetailPanel({ panel, data, entities, onClose }) {
  if (!panel) return null;

  const fmtN = n => n?.toLocaleString() ?? '—';

  let title = '';
  let content = null;

  if (panel === 'errors') {
    title = 'Total Failed Jobs — Breakdown';
    const top = [...entities].sort((a, b) => b.error - a.error).slice(0, 10);
    const max = top[0]?.error || 1;
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val">{fmtN(data.summary.total_errors)}</div>
            <div className="detail-stat-lbl">Total Errors</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{fmtN(data.summary.total_jobs)}</div>
            <div className="detail-stat-lbl">Total Jobs</div>
          </div>
        </div>
        <div className="detail-section-lbl">Top 10 by Error Count</div>
        {top.map(d => (
          <div key={d.name} className="detail-row">
            <div>
              <div className="detail-name">{d.name}</div>
              <div className="detail-mini-bar">
                <div className="detail-mini-bar-fill" style={{ width: (d.error / max * 100) + '%', background: 'var(--error-l)' }} />
              </div>
            </div>
            <span className="detail-badge badge-error">{fmtN(d.error)}</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'rate') {
    title = 'Overall Error Rate — Distribution';
    const critical = entities.filter(d => d.error_rate > 50);
    const risky    = entities.filter(d => d.error_rate > 20 && d.error_rate <= 50);
    const ok       = entities.filter(d => d.error_rate <= 20);
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--warning-l)' }}>{fmtP(data.summary.overall_error_rate)}%</div>
            <div className="detail-stat-lbl">Overall Rate</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{entities.length}</div>
            <div className="detail-stat-lbl">Total Groups</div>
          </div>
        </div>
        <div className="detail-section-lbl">Groups by Risk Level</div>
        <div className="detail-row">
          <div className="detail-name">Critical (&gt;50%)</div>
          <span className="detail-badge badge-error">{critical.length}</span>
        </div>
        <div className="detail-row">
          <div className="detail-name">Risky (20–50%)</div>
          <span className="detail-badge badge-warning">{risky.length}</span>
        </div>
        <div className="detail-row">
          <div className="detail-name">OK (≤20%)</div>
          <span className="detail-badge badge-ok">{ok.length}</span>
        </div>
        <div className="detail-section-lbl">Worst Groups</div>
        {[...entities].sort((a, b) => b.error_rate - a.error_rate).slice(0, 6).map(d => (
          <div key={d.name} className="detail-row">
            <div className="detail-name">{d.name}</div>
            <span className="detail-badge badge-error">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'science') {
    title = 'Science Fields — Error Detail';
    const sorted = [...data.science_field].sort((a, b) => b.error_rate - a.error_rate);
    const max = sorted[0]?.error_rate || 1;
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val">{sorted.length}</div>
            <div className="detail-stat-lbl">Fields</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--error-l)' }}>{fmtP(sorted[0]?.error_rate)}%</div>
            <div className="detail-stat-lbl">Highest Rate</div>
          </div>
        </div>
        <div className="detail-section-lbl">All Fields by Error Rate</div>
        {sorted.map(d => (
          <div key={d.name} className="detail-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-name">{d.name}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{fmtN(d.error)} errors / {fmtN(d.total)} jobs</div>
              <div className="detail-mini-bar">
                <div className="detail-mini-bar-fill" style={{ width: (d.error_rate / max * 100) + '%', background: rateColor(d.error_rate) }} />
              </div>
            </div>
            <span className="detail-badge badge-error">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'queue') {
    title = 'Queues — Error Detail';
    const sorted = [...data.queue].sort((a, b) => b.error_rate - a.error_rate);
    const max = sorted[0]?.error_rate || 1;
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val">{sorted.length}</div>
            <div className="detail-stat-lbl">Queues</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--purple-l)' }}>{fmtP(sorted[0]?.error_rate)}%</div>
            <div className="detail-stat-lbl">Highest Rate</div>
          </div>
        </div>
        <div className="detail-section-lbl">All Queues by Error Rate</div>
        {sorted.map(d => (
          <div key={d.name} className="detail-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-name">{d.name}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{fmtN(d.error)} errors / {fmtN(d.total)} jobs</div>
              <div className="detail-mini-bar">
                <div className="detail-mini-bar-fill" style={{ width: (d.error_rate / max * 100) + '%', background: 'var(--purple-l)' }} />
              </div>
            </div>
            <span className="detail-badge badge-error">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'critical') {
    title = 'Critical Groups (>50% Error Rate)';
    const critical = [...entities].filter(d => d.error_rate > 50).sort((a, b) => b.error_rate - a.error_rate);
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--error-l)' }}>{critical.length}</div>
            <div className="detail-stat-lbl">Critical Groups</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{fmtN(critical.reduce((s, d) => s + d.error, 0))}</div>
            <div className="detail-stat-lbl">Total Errors</div>
          </div>
        </div>
        <div className="detail-section-lbl">All Critical Groups</div>
        {critical.map(d => (
          <div key={d.name} className="detail-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-name">{d.name}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{fmtN(d.error)} / {fmtN(d.total)} jobs</div>
            </div>
            <span className="detail-badge badge-error">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'peak') {
    title = 'Daily Error Rate — Top Days';
    const sorted = [...(data.daily || [])].sort((a, b) => b.error_rate - a.error_rate).slice(0, 10);
    const max = sorted[0]?.error_rate || 1;
    content = (
      <>
        <div className="detail-section-lbl">Worst 10 Days</div>
        {sorted.map(d => (
          <div key={d.date} className="detail-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-name">{d.date}</div>
              <div className="detail-mini-bar">
                <div className="detail-mini-bar-fill" style={{ width: (d.error_rate / max * 100) + '%', background: 'var(--error-l)' }} />
              </div>
            </div>
            <span className="detail-badge badge-error">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'contrib') {
    title = 'Top Error Contributors';
    const top = [...entities].sort((a, b) => b.error - a.error).slice(0, 15);
    const max = top[0]?.error || 1;
    content = (
      <>
        <div className="detail-section-lbl">Top 15 by Error Count</div>
        {top.map((d, i) => (
          <div key={d.name} className="detail-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="detail-name">#{i + 1} {d.name}</div>
              <div style={{ fontSize: '.7rem', color: 'var(--muted)' }}>{fmtP(d.error_rate)}% error rate</div>
              <div className="detail-mini-bar">
                <div className="detail-mini-bar-fill" style={{ width: (d.error / max * 100) + '%', background: 'var(--warning-l)' }} />
              </div>
            </div>
            <span className="detail-badge badge-warning">{fmtN(d.error)}</span>
          </div>
        ))}
      </>
    );
  }

  if (panel === 'clean') {
    title = 'Low-Error Groups (<10%)';
    const clean = [...entities].filter(d => d.error_rate < 10).sort((a, b) => a.error_rate - b.error_rate);
    content = (
      <>
        <div className="detail-stat-grid">
          <div className="detail-stat">
            <div className="detail-stat-val" style={{ color: 'var(--success-l)' }}>{clean.length}</div>
            <div className="detail-stat-lbl">Clean Groups</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-val">{fmtN(clean.reduce((s, d) => s + d.total, 0))}</div>
            <div className="detail-stat-lbl">Total Jobs</div>
          </div>
        </div>
        <div className="detail-section-lbl">All Groups with &lt;10% Error Rate</div>
        {clean.map(d => (
          <div key={d.name} className="detail-row">
            <div className="detail-name">{d.name}</div>
            <span className="detail-badge badge-ok">{fmtP(d.error_rate)}%</span>
          </div>
        ))}
      </>
    );
  }

  return (
    <div className={`detail-panel open`}>
      <div className="detail-panel-header">
        <div className="detail-panel-title">{title}</div>
        <button className="detail-panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="detail-panel-body">{content}</div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────
export default function App() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [panel,   setPanel]   = useState(null);

  const togglePanel = key => setPanel(p => p === key ? null : key);

  useEffect(() => {
    fetch('/api/all')
      .then(r => r.json())
      .then(d  => { setData(d); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div id="loader">
      <div className="loader-inner">
        <div className="loader-ring" />
        <div className="loader-text">Loading error profiles…</div>
      </div>
    </div>
  );

  if (error) return (
    <div id="loader">
      <div className="loader-inner" style={{ color: '#f85149' }}>
        Failed to load data<br />
        <small style={{ color: '#7a8fa8' }}>{error}</small>
      </div>
    </div>
  );

  const s = data.summary;

  const entities = [
    ...data.science_field.map(d => ({ ...d, feature: 'science' })),
    ...data.queue.map(d =>         ({ ...d, feature: 'queue'   })),
    ...data.allocation.map(d =>    ({ ...d, feature: 'alloc'   })),
    ...data.node_count.map(d =>    ({ ...d, feature: 'nodes'   })),
  ];

  const worstSci  = [...data.science_field].sort((a, b) => b.error_rate - a.error_rate)[0];
  const worstQ    = [...data.queue].sort((a, b) => b.error_rate - a.error_rate)[0];
  const peakDay   = data.daily?.length
    ? [...data.daily].sort((a, b) => b.error_rate - a.error_rate)[0]
    : null;
  const topContrib   = [...entities].sort((a, b) => b.error - a.error)[0];
  const criticalCnt  = entities.filter(d => d.error_rate > 50).length;
  const cleanCnt     = entities.filter(d => d.error_rate < 10).length;

  const peakLabel = peakDay
    ? `${peakDay.date.slice(5).replace('-', '/')} — ${fmtP(peakDay.error_rate)}%`
    : '—';

  const errBarW    = (s.total_errors / s.total_jobs * 100).toFixed(1) + '%';
  const rateBarW   = s.overall_error_rate + '%';
  const sciBarW    = (worstSci?.error_rate ?? 0) + '%';
  const qBarW      = (worstQ?.error_rate   ?? 0) + '%';
  const critBarW   = Math.min(criticalCnt / entities.length * 100, 100).toFixed(1) + '%';
  const peakBarW   = (peakDay?.error_rate  ?? 0) + '%';
  const topBarW    = topContrib ? (topContrib.error / Math.max(...entities.map(d => d.error)) * 100).toFixed(1) + '%' : '0%';
  const cleanBarW  = Math.min(cleanCnt / entities.length * 100, 100).toFixed(1) + '%';

  return (
    <>
      {/* ── Header ── */}
      <header>
        <div className="header-inner">
          <svg className="header-icon" width="38" height="38" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="19" r="18" stroke="#f85149" strokeWidth="1.5" opacity=".4"/>
            <circle cx="19" cy="19" r="12" stroke="#f85149" strokeWidth="1.5" opacity=".6"/>
            <circle cx="19" cy="19" r="5"  fill="#f85149"/>
            <line x1="19" y1="1"  x2="19" y2="7"  stroke="#f85149" strokeWidth="1.5"/>
            <line x1="19" y1="31" x2="19" y2="37" stroke="#f85149" strokeWidth="1.5"/>
            <line x1="1"  y1="19" x2="7"  y2="19" stroke="#f85149" strokeWidth="1.5"/>
            <line x1="31" y1="19" x2="37" y2="19" stroke="#f85149" strokeWidth="1.5"/>
          </svg>
          <div className="header-text">
            <h1>Polaris HPC &mdash; Error Rate Profiles</h1>
            <p className="header-sub">
              Feature correlation &bull; Risk analysis &bull; Distinct group breakdown &bull; ANL-ALCF Jan 2026
            </p>
          </div>
          <a href="http://localhost:5050/" className="back-link">&#8592; Main Dashboard</a>
        </div>
      </header>

      {/* ── KPI Row 1 ── */}
      <section className="kpi-row">
        <div className={`kpi-card error${panel === 'errors' ? ' active' : ''}`} onClick={() => togglePanel('errors')}>
          <div className="kpi-icon">✗</div>
          <AnimatedCount value={s.total_errors} className="kpi-value" style={{ color: 'var(--error-l)' }} />
          <div className="kpi-label">Total Failed Jobs</div>
          <AnimatedBar targetWidth={errBarW} barClass="kpi-bar-error" />
        </div>

        <div className={`kpi-card rate${panel === 'rate' ? ' active' : ''}`} onClick={() => togglePanel('rate')}>
          <div className="kpi-icon">⚠</div>
          <div className="kpi-value" style={{ color: 'var(--warning-l)' }}>{fmtP(s.overall_error_rate)}%</div>
          <div className="kpi-label">Overall Error Rate</div>
          <AnimatedBar targetWidth={rateBarW} barColor={rateColor(s.overall_error_rate)} />
        </div>

        <div className={`kpi-card${panel === 'science' ? ' active' : ''}`} onClick={() => togglePanel('science')}>
          <div className="kpi-icon">⬡</div>
          <div className="kpi-value" style={{ fontSize: '1rem', lineHeight: 1.25, paddingTop: 4, color: 'var(--error-l)' }}>
            {worstSci?.name || '—'}
          </div>
          <div className="kpi-label">Highest-Error Science Field</div>
          <AnimatedBar targetWidth={sciBarW} barColor="var(--error-l)" />
        </div>

        <div className={`kpi-card${panel === 'queue' ? ' active' : ''}`} onClick={() => togglePanel('queue')}>
          <div className="kpi-icon">▦</div>
          <div className="kpi-value" style={{ fontSize: '1rem', lineHeight: 1.25, paddingTop: 4, color: 'var(--purple-l)' }}>
            {worstQ?.name || '—'}
          </div>
          <div className="kpi-label">Highest-Error Queue</div>
          <AnimatedBar targetWidth={qBarW} barColor="var(--purple-l)" />
        </div>
      </section>

      {/* ── KPI Row 2 ── */}
      <section className="kpi-row-2">
        <div className={`kpi-card error${panel === 'critical' ? ' active' : ''}`} onClick={() => togglePanel('critical')}>
          <div className="kpi-icon">&#9888;</div>
          <AnimatedCount value={criticalCnt} className="kpi-value" style={{ color: 'var(--error-l)' }} />
          <div className="kpi-label">Critical Groups (&gt;50% Error Rate)</div>
          <AnimatedBar targetWidth={critBarW} barClass="kpi-bar-error" />
        </div>

        <div className={`kpi-card${panel === 'peak' ? ' active' : ''}`} onClick={() => togglePanel('peak')}>
          <div className="kpi-icon">&#128197;</div>
          <div className="kpi-value" style={{ fontSize: '1rem', lineHeight: 1.25, paddingTop: 4, color: 'var(--accent)' }}>
            {peakLabel}
          </div>
          <div className="kpi-label">Peak Error Day</div>
          <AnimatedBar targetWidth={peakBarW} barColor="var(--error-l)" />
        </div>

        <div className={`kpi-card${panel === 'contrib' ? ' active' : ''}`} onClick={() => togglePanel('contrib')}>
          <div className="kpi-icon">&#9650;</div>
          <div className="kpi-value" style={{ fontSize: '1rem', lineHeight: 1.25, paddingTop: 4, color: 'var(--accent)' }}>
            {topContrib?.name || '—'}
          </div>
          <div className="kpi-label">Top Error Contributor (by count)</div>
          <AnimatedBar targetWidth={topBarW} barColor="var(--warning-l)" />
        </div>

        <div className={`kpi-card success${panel === 'clean' ? ' active' : ''}`} onClick={() => togglePanel('clean')}>
          <div className="kpi-icon">✓</div>
          <AnimatedCount value={cleanCnt} className="kpi-value" style={{ color: 'var(--success-l)' }} />
          <div className="kpi-label">Groups with &lt;10% Error Rate</div>
          <AnimatedBar targetWidth={cleanBarW} barClass="kpi-bar-success" />
        </div>
      </section>

      <DetailPanel panel={panel} data={data} entities={entities} onClose={() => setPanel(null)} />

      {/* ── Main content ── */}
      <main className="page-main">

        {/* 1 — Feature strip */}
        <div className="section-title">
          Feature Correlation with Error Rate
          <span className="pill">all dimensions</span>
        </div>
        <div className="chart-card full-width">
          <div className="card-header">
            <h2>Error Rate Distribution Across Feature Dimensions</h2>
            <span className="card-hint">each dot = one distinct group &bull; dot size = job volume &bull; line = mean</span>
          </div>
          <FeatureStrip entities={entities} />
        </div>

        {/* 2 — Daily timeline */}
        <div className="section-title">
          Daily Error Rate Timeline
          <span className="pill">Jan 2026</span>
        </div>
        <div className="chart-card full-width">
          <div className="card-header">
            <h2>Error Rate Per Day &mdash; Full Period</h2>
            <span className="card-hint">crosshair follows cursor &bull; drag brush below to zoom</span>
          </div>
          <p className="timeline-note">Dashed line = overall average error rate across all days</p>
          <DailyTimeline daily={data.daily} />
        </div>

        {/* 3 — Science bubbles */}
        <div className="section-title">
          Science Field Profiles
          <span className="pill">rate vs volume</span>
        </div>
        <div className="chart-card full-width">
          <div className="card-header">
            <h2>Science Fields — Error Rate vs Job Volume</h2>
            <span className="card-hint">bubble size = total jobs &bull; hover for details</span>
          </div>
          <BubbleChart data={data.science_field} />
        </div>

        {/* 4 — Allocation + Nodes */}
        <div className="section-title">
          Allocation &amp; Node Scale Profiles
          <span className="pill">resource correlation</span>
        </div>
        <div className="two-col">
          <div className="chart-card">
            <div className="card-header">
              <h2>Allocation Category — Error Rate</h2>
              <span className="card-hint">INCITE &bull; ALCC &bull; Discretionary</span>
            </div>
            <AllocProfile data={data.allocation} />
          </div>
          <div className="chart-card">
            <div className="card-header">
              <h2>Node Count Groups — Error Rate Trend</h2>
              <span className="card-hint">job scale vs failure rate</span>
            </div>
            <NodesProfile data={data.node_count} />
          </div>
        </div>

        {/* 5 — Risk quadrant + leaderboard */}
        <div className="section-title">
          Risk Analysis
          <span className="pill">volume &times; rate</span>
        </div>
        <div className="two-col">
          <div className="chart-card">
            <div className="card-header">
              <h2>Risk Quadrant — Error Count vs Error Rate</h2>
              <span className="card-hint">top-right = critical &bull; top-left = high rate, low volume</span>
            </div>
            <RiskQuadrant entities={entities} />
          </div>
          <div className="chart-card">
            <div className="card-header">
              <h2>Top 15 Error Contributors</h2>
              <span className="card-hint">ranked by absolute failed job count</span>
            </div>
            <Leaderboard entities={entities} />
          </div>
        </div>

        {/* 6 — Exit code profile */}
        <div className="section-title">
          Exit Code Breakdown
          <span className="pill">failure causes</span>
        </div>
        <div className="chart-card full-width">
          <div className="card-header">
            <h2>Failed Exit Codes — Count &amp; Share of All Failures</h2>
            <span className="card-hint">excludes success (exit 0) &bull; hover for details</span>
          </div>
          <ExitCodeProfile exitCodes={data.exit_codes} />
        </div>

        {/* 7 — Entity table */}
        <div className="section-title">
          Distinct Entity Error Profiles
          <span className="pill">all groups with errors</span>
        </div>
        <div className="chart-card full-width">
          <div className="card-header">
            <h2>All Distinct Groups — Connected Error Data</h2>
          </div>
          <EntityTable entities={entities} />
        </div>

      </main>

      {/* Shared tooltip */}
      <div id="tooltip" className="tooltip" />

      <footer>
        Polaris HPC — Error Profiles &bull; ANL-ALCF-DJC-POLARIS &bull; D3.js v7 + React
      </footer>
    </>
  );
}
