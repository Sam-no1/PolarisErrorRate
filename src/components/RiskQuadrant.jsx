import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, FEATURE_COLORS, FEATURE_LABELS, rateColor, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function RiskQuadrant({ entities }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!entities?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const m  = { top: 24, right: 30, bottom: 50, left: 60 };
      const W0 = ref.current.clientWidth || 500;
      const W  = W0 - m.left - m.right;
      const H  = 280;

      const svg = container.append('svg')
        .attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const maxErr = d3.max(entities, d => d.error);
      const midErr = maxErr / 2;
      const x    = d3.scaleLinear().domain([0, maxErr]).range([0, W]).nice();
      const y    = d3.scaleLinear().domain([0, 100]).range([H, 0]);
      const xMid = x(midErr);

      // Quadrant backgrounds
      [
        [0,    0,          xMid,     y(50), 'rgba(248,81,73,.06)'],
        [xMid, 0,          W - xMid, y(50), 'rgba(248,81,73,.13)'],
        [0,    y(50),      xMid,     H - y(50), 'rgba(63,185,80,.06)'],
        [xMid, y(50),      W - xMid, H - y(50), 'rgba(227,179,65,.07)'],
      ].forEach(([qx, qy, qw, qh, fill]) => {
        svg.append('rect').attr('x', qx).attr('y', qy).attr('width', qw).attr('height', qh)
          .attr('fill', fill).attr('rx', 3);
      });

      // Dividers
      svg.append('line').attr('x1', xMid).attr('x2', xMid).attr('y1', 0).attr('y2', H)
        .attr('stroke', C.border).attr('stroke-width', 1).attr('stroke-dasharray', '4,3');
      svg.append('line').attr('x1', 0).attr('x2', W).attr('y1', y(50)).attr('y2', y(50))
        .attr('stroke', C.border).attr('stroke-width', 1).attr('stroke-dasharray', '4,3');

      // Quadrant labels
      [
        [xMid / 2,             9,           'High Rate / Low Count', C.error],
        [xMid + (W - xMid)/2, 9,           '⚠ Critical',            C.error],
        [xMid / 2,             y(50) + 14, 'OK',                    C.success],
        [xMid + (W - xMid)/2, y(50) + 14, 'Watch',                 C.warning],
      ].forEach(([qx, qy, label, fill]) => {
        svg.append('text').attr('x', qx).attr('y', qy).attr('text-anchor', 'middle')
          .attr('fill', fill).attr('font-size', 9.5).attr('font-weight', 700).attr('opacity', 0.6)
          .text(label);
      });

      svg.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-W).tickFormat('').ticks(5));

      svg.selectAll('.qdot').data(entities).join('circle')
        .attr('class', 'qdot')
        .attr('cx', d => x(d.error)).attr('cy', H).attr('r', 5)
        .attr('fill',   d => FEATURE_COLORS[d.feature])
        .attr('stroke', d => rateColor(d.error_rate)).attr('stroke-width', 1.5)
        .attr('opacity', 0.8).attr('cursor', 'pointer')
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Feature',   FEATURE_LABELS[d.feature])}
           ${tipRow('Errors',    fmtI(d.error),           't-error')}
           ${tipRow('Total jobs',fmtI(d.total))}
           ${tipRow('Error rate',fmtP(d.error_rate) + '%','t-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut).delay((_, i) => i * 15)
        .attr('cy', d => y(d.error_rate));

      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(fmtI));
      svg.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(v => v + '%'));
      svg.append('text').attr('x', W / 2).attr('y', H + 42)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Failed Jobs (count)');
      svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', -48)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Error Rate (%)');
      svg.select('.domain').remove();

      // Feature legend
      const leg = container.append('div').attr('class', 'quad-legend');
      Object.entries(FEATURE_LABELS).forEach(([key, label]) => {
        leg.append('div').attr('class', 'quad-legend-item').html(
          `<span class="quad-swatch" style="background:${FEATURE_COLORS[key]}"></span>${label}`
        );
      });
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [entities]);

  return <div ref={ref} />;
}
