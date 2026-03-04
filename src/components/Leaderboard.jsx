import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, FEATURE_COLORS, FEATURE_LABELS, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function Leaderboard({ entities }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!entities?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const top15 = [...entities].sort((a, b) => b.error - a.error).slice(0, 15);
      const m   = { top: 10, right: 100, bottom: 36, left: 155 };
      const W0  = ref.current.clientWidth || 500;
      const W   = W0 - m.left - m.right;
      const rowH = 36;
      const H   = top15.length * rowH;

      const svg = container.append('svg').attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(top15, d => d.error)]).range([0, W]);
      const y = d3.scaleBand().domain(top15.map(d => d.name)).range([0, H]).padding(0.25);

      svg.selectAll('.lb-track').data(top15).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth())
        .attr('rx', 4).attr('fill', C.border).attr('opacity', 0.25);

      svg.selectAll('.lb-bar').data(top15).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('height', y.bandwidth()).attr('rx', 4)
        .attr('fill', d => FEATURE_COLORS[d.feature])
        .attr('opacity', 0.75).attr('width', 0)
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Feature',   FEATURE_LABELS[d.feature])}
           ${tipRow('Errors',    fmtI(d.error),           't-error')}
           ${tipRow('Total jobs',fmtI(d.total))}
           ${tipRow('Error rate',fmtP(d.error_rate) + '%','t-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut).delay((_, i) => i * 40)
        .attr('width', d => x(d.error));

      svg.selectAll('.lb-val').data(top15).join('text')
        .attr('x', d => x(d.error) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2)
        .attr('dy', '0.35em').attr('font-size', 10).attr('fill', C.muted)
        .text(d => fmtI(d.error) + ' (' + fmtP(d.error_rate) + '%)');


      const SHORT = { science: 'Sci. Field', queue: 'Queue', alloc: 'Allocation', nodes: 'Nodes' };
      const nameToFeature = new Map(top15.map(d => [d.name, d.feature]));

      svg.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0))
        .selectAll('.tick').each(function(d) {
          const feat  = nameToFeature.get(d);
          const label = d.length > 16 ? d.slice(0, 15) + '…' : d;
          const txt   = d3.select(this).select('text')
            .attr('fill', '#c2cfe0').attr('font-size', 10.5).text(null);
          txt.append('tspan').attr('x', -8).attr('dy', '-0.25em').text(label);
          txt.append('tspan').attr('x', -8).attr('dy', '1.35em')
            .attr('fill', FEATURE_COLORS[feat]).attr('font-size', 8.5)
            .text(SHORT[feat] || feat);
        });

      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(fmtI));

      svg.append('text').attr('x', W / 2).attr('y', H + 30)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Failed Job Count');

      svg.select('.domain').remove();
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [entities]);

  return <div ref={ref} />;
}
