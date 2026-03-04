import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, FEATURE_LABELS, rateColor, nameJitter, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function FeatureStrip({ entities }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!entities?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const features = ['science', 'queue', 'alloc', 'nodes'];
      const m  = { top: 36, right: 40, bottom: 56, left: 52 };
      const W0 = ref.current.clientWidth || 800;
      const W  = W0 - m.left - m.right;
      const H  = 300;

      const svg = container.append('svg')
        .attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x       = d3.scaleBand().domain(features).range([0, W]).padding(0.25);
      const y       = d3.scaleLinear().domain([0, 100]).range([H, 0]);
      const maxTot  = d3.max(entities, d => d.total);
      const rScale  = d3.scaleSqrt().domain([0, maxTot]).range([3, 16]);

      svg.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-W).tickFormat(''));

      [25, 50, 75].forEach(pct => {
        svg.append('line')
          .attr('x1', 0).attr('x2', W)
          .attr('y1', y(pct)).attr('y2', y(pct))
          .attr('stroke', pct === 50 ? C.warning : C.border)
          .attr('stroke-width', pct === 50 ? 1 : 0.5)
          .attr('stroke-dasharray', '5,4').attr('opacity', .45);
        svg.append('text')
          .attr('x', W + 6).attr('y', y(pct)).attr('dy', '0.35em')
          .attr('fill', C.muted).attr('font-size', 9).text(pct + '%');
      });

      features.forEach(feat => {
        const subset = entities.filter(d => d.feature === feat);
        const mean   = d3.mean(subset, d => d.error_rate);
        const cx     = x(feat) + x.bandwidth() / 2;
        svg.append('line')
          .attr('x1', x(feat) + 6).attr('x2', x(feat) + x.bandwidth() - 6)
          .attr('y1', y(mean)).attr('y2', y(mean))
          .attr('stroke', C.muted).attr('stroke-width', 2.5).attr('opacity', 0.9);
        svg.append('text')
          .attr('x', cx).attr('y', y(mean) - 9).attr('text-anchor', 'middle')
          .attr('fill', C.muted).attr('font-size', 10).attr('font-weight', 700)
          .text('avg ' + fmtP(mean) + '%');
      });

      svg.selectAll('.edot').data(entities).join('circle')
        .attr('class', 'edot')
        .attr('cx', d => x(d.feature) + x.bandwidth() / 2 + nameJitter(d.name) * x.bandwidth() * 0.65)
        .attr('cy', H)
        .attr('r',  d => rScale(d.total))
        .attr('fill',   d => rateColor(d.error_rate))
        .attr('stroke', C.border)
        .attr('stroke-width', 1).attr('opacity', 0.65).attr('cursor', 'pointer')
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Feature',   FEATURE_LABELS[d.feature])}
           ${tipRow('Total jobs',fmtI(d.total))}
           ${tipRow('Errors',    fmtI(d.error),             't-error')}
           ${tipRow('Success',   fmtI(d.success),            't-success')}
           ${tipRow('Error rate',fmtP(d.error_rate) + '%',   't-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut)
        .delay((_, i) => i * 12)
        .attr('cy', d => y(d.error_rate));

      svg.append('g').attr('class', 'axis')
        .attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).tickFormat(d => FEATURE_LABELS[d]));
      svg.selectAll('.axis text').attr('fill', '#c2cfe0');
      svg.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(6).tickFormat(v => v + '%'));
      svg.append('text')
        .attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', -42)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11)
        .text('Error Rate (%)');
      svg.select('.domain').remove();

      // Legend
      const leg = container.append('div').attr('class', 'strip-legend');
      [['< 20%', C.success], ['20–50%', C.warning], ['> 50%', C.error]].forEach(([lbl, col]) => {
        leg.append('div').attr('class', 'strip-legend-item').html(
          `<span class="strip-swatch" style="background:${col};border-radius:2px"></span>${lbl} error`
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
