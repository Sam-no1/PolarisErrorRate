import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, rateColor, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function AllocProfile({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!data?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const sorted = [...data].sort((a, b) => b.error_rate - a.error_rate);
      const m  = { top: 10, right: 80, bottom: 40, left: 160 };
      const W0 = ref.current.clientWidth || 500;
      const W  = W0 - m.left - m.right;
      const H  = Math.max(160, sorted.length * 38 + m.top + m.bottom);

      const svg = container.append('svg').attr('width', W0).attr('height', H)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x = d3.scaleLinear().domain([0, 100]).range([0, W]);
      const y = d3.scaleBand().domain(sorted.map(d => d.name))
        .range([0, H - m.top - m.bottom]).padding(0.3);

      svg.append('g').attr('class', 'grid')
        .call(d3.axisBottom(x).tickSize(H - m.top - m.bottom).tickFormat(''));

      svg.selectAll('.track').data(sorted).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth())
        .attr('rx', 4).attr('fill', C.border).attr('opacity', 0.3);

      svg.selectAll('.bar').data(sorted).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('height', y.bandwidth()).attr('rx', 4)
        .attr('fill', C.warning).attr('opacity', 0.85).attr('width', 0)
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Total',     fmtI(d.total))}
           ${tipRow('Errors',    fmtI(d.error),           't-error')}
           ${tipRow('Success',   fmtI(d.success),          't-success')}
           ${tipRow('Error rate',fmtP(d.error_rate) + '%', 't-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut)
        .delay((_, i) => i * 80)
        .attr('width', d => x(d.error_rate));

      svg.selectAll('.val').data(sorted).join('text')
        .attr('x', d => x(d.error_rate) + 5)
        .attr('y', d => y(d.name) + y.bandwidth() / 2)
        .attr('dy', '0.35em').attr('fill', C.muted).attr('font-size', 11)
        .text(d => fmtP(d.error_rate) + '%');

      svg.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('.tick text').attr('fill', '#c2cfe0').attr('font-size', 11);

      svg.append('g').attr('class', 'axis')
        .attr('transform', `translate(0,${H - m.top - m.bottom})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(v => v + '%'));

      svg.select('.domain').remove();
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [data]);

  return <div ref={ref} />;
}
