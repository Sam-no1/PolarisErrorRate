import { useState, useMemo } from 'react';
import { FEATURE_LABELS, fmtI, fmtP, rateColor } from '../utils.js';

export default function EntityTable({ entities }) {
  const [sortCol,       setSortCol]       = useState('error_rate');
  const [sortAsc,       setSortAsc]       = useState(false);
  const [search,        setSearch]        = useState('');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [riskFilter,    setRiskFilter]    = useState('all');

  const filtered = useMemo(() => {
    let d = entities.slice();
    if (featureFilter !== 'all') d = d.filter(x => x.feature === featureFilter);
    if (search)                  d = d.filter(x => x.name.toLowerCase().includes(search));
    if      (riskFilter === 'critical') d = d.filter(x => x.error_rate > 50);
    else if (riskFilter === 'risky')    d = d.filter(x => x.error_rate >= 20 && x.error_rate <= 50);
    else if (riskFilter === 'ok')       d = d.filter(x => x.error_rate < 20);
    d.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return d;
  }, [entities, featureFilter, search, riskFilter, sortCol, sortAsc]);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(false); }
  }

  function thClass(col) {
    const classes = [];
    if (sortCol === col) classes.push('sorted');
    if (sortAsc && sortCol === col) classes.push('asc');
    return classes.join(' ');
  }

  return (
    <>
      <div className="card-controls" style={{ marginBottom: 12 }}>
        <input
          className="search-box"
          placeholder="🔍 filter name…"
          value={search}
          onChange={e => setSearch(e.target.value.toLowerCase())}
        />
        <select className="ctrl-select" value={featureFilter} onChange={e => setFeatureFilter(e.target.value)}>
          <option value="all">All Features</option>
          <option value="science">Science Field</option>
          <option value="queue">Queue</option>
          <option value="alloc">Allocation</option>
          <option value="nodes">Node Count</option>
        </select>
        <select className="ctrl-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          <option value="all">All Risk Levels</option>
          <option value="critical">Critical (&gt;50%)</option>
          <option value="risky">Risky (20–50%)</option>
          <option value="ok">OK (&lt;20%)</option>
        </select>
      </div>

      <div className="entity-table-wrap">
        <table className="entity-table">
          <thead>
            <tr>
              <th style={{ cursor: 'default', width: 36 }}>#</th>
              <th className={thClass('name')}     onClick={() => handleSort('name')}>Entity / Group</th>
              <th style={{ cursor: 'default' }}>Feature</th>
              <th className={thClass('total')}    onClick={() => handleSort('total')}>Total Jobs</th>
              <th className={thClass('error')}    onClick={() => handleSort('error')}>Failed Jobs</th>
              <th className={thClass('success')}  onClick={() => handleSort('success')}>Successful</th>
              <th className={thClass('error_rate')} onClick={() => handleSort('error_rate')}>Error Rate</th>
              <th className="rate-bar-cell" style={{ cursor: 'default' }}>Rate Bar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                  No matching groups
                </td>
              </tr>
            ) : filtered.map((row, i) => {
              const barColor = rateColor(row.error_rate);
              return (
                <tr key={`${row.feature}-${row.name}`}>
                  <td style={{ color: 'var(--muted)', fontSize: '.75rem' }}>{i + 1}</td>
                  <td><strong>{row.name}</strong></td>
                  <td><span className={`feature-tag tag-${row.feature}`}>{FEATURE_LABELS[row.feature]}</span></td>
                  <td>{fmtI(row.total)}</td>
                  <td style={{ color: 'var(--error-l)', fontWeight: 600 }}>{fmtI(row.error)}</td>
                  <td style={{ color: 'var(--success-l)', fontWeight: 600 }}>{fmtI(row.success)}</td>
                  <td style={{ color: barColor, fontWeight: 700 }}>{fmtP(row.error_rate)}%</td>
                  <td className="rate-bar-cell">
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: `${row.error_rate}%`, background: barColor }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
