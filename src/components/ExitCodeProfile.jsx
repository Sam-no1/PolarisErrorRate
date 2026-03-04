import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, fmtI, fmtP, showTip, hideTip, tipRow } from '../utils.js';

export default function ExitCodeProfile({ exitCodes }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!exitCodes?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const failures = exitCodes.filter(d => !d.name.startsWith('Success'));
      if (!failures.length) return;

      const totalFailed = d3.sum(failures, d => d.count);
      const data = failures.map(d => ({ ...d, share: d.count / totalFailed * 100 }));

      const m   = { top: 10, right: 110, bottom: 40, left: 175 };
      const W0  = ref.current.clientWidth || 900;
      const W   = W0 - m.left - m.right;
      const rowH = 26;
      const H   = data.length * rowH;

      const svg = container.append('svg').attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(data, d => d.count)]).range([0, W]);
      const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, H]).padding(0.2);
      const colorScale = d3.scaleSequential()
        .domain([0, data.length - 1])
        .interpolator(d3.interpolateRgb(C.error, C.border));

      svg.append('g').attr('class', 'grid')
        .call(d3.axisBottom(x).tickSize(H).tickFormat('').ticks(5));

      svg.selectAll('.ec-track').data(data).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('width', W).attr('height', y.bandwidth())
        .attr('rx', 3).attr('fill', C.border).attr('opacity', 0.2);

      svg.selectAll('.ec-bar').data(data).join('rect')
        .attr('x', 0).attr('y', d => y(d.name))
        .attr('height', y.bandwidth()).attr('rx', 3)
        .attr('fill', (_, i) => colorScale(i)).attr('opacity', 0.85).attr('width', 0)
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Count',          fmtI(d.count))}
           ${tipRow('Share of fails', fmtP(d.share) + '%', 't-rate')}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut).delay((_, i) => i * 35)
        .attr('width', d => x(d.count));

      svg.selectAll('.ec-val').data(data).join('text')
        .attr('x', d => x(d.count) + 5).attr('y', d => y(d.name) + y.bandwidth() / 2)
        .attr('dy', '0.35em').attr('font-size', 10).attr('fill', C.muted)
        .text(d => fmtI(d.count) + ' (' + fmtP(d.share) + '%)');

      svg.append('g').attr('class', 'axis').call(d3.axisLeft(y).tickSize(0))
        .selectAll('.tick text').attr('fill', '#c2cfe0').attr('font-size', 10.5);

      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(fmtI));

      svg.append('text').attr('x', W / 2).attr('y', H + 30)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11)
        .text('Number of Failed Jobs');

      svg.select('.domain').remove();
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [exitCodes]);

  return <div ref={ref} />;
}
