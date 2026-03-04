import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, rateColor, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function BubbleChart({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!data?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const m   = { top: 20, right: 24, bottom: 50, left: 60 };
      const W0  = ref.current.clientWidth || 500;
      const W   = W0 - m.left - m.right;
      const H   = 260;

      const svg = container.append('svg')
        .attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const maxTotal = d3.max(data, d => d.total);
      const meanRate = d3.mean(data, d => d.error_rate);
      const x        = d3.scaleLinear().domain([0, 100]).range([0, W]);
      const y        = d3.scaleLinear().domain([0, maxTotal]).range([H, 0]).nice();
      const rScale   = d3.scaleSqrt().domain([0, maxTotal]).range([4, 24]);

      svg.append('g').attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-W).tickFormat(''));

      svg.append('line')
        .attr('x1', x(meanRate)).attr('x2', x(meanRate)).attr('y1', 0).attr('y2', H)
        .attr('stroke', C.muted).attr('stroke-dasharray', '4,4').attr('opacity', .5);
      svg.append('text')
        .attr('x', x(meanRate) + 4).attr('y', 8)
        .attr('fill', C.muted).attr('font-size', 9).text('avg ' + fmtP(meanRate) + '%');

      svg.selectAll('.bubble').data(data).join('circle')
        .attr('class', 'bubble')
        .attr('cx', d => x(d.error_rate)).attr('cy', H)
        .attr('r',  d => rScale(d.total))
        .attr('fill',   d => rateColor(d.error_rate))
        .attr('stroke', C.bg).attr('stroke-width', 1.5).attr('opacity', 0).attr('cursor', 'pointer')
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>${d.name}</strong>
           ${tipRow('Total jobs', fmtI(d.total))}
           ${tipRow('Errors',     fmtI(d.error),           't-error')}
           ${tipRow('Success',    fmtI(d.success),          't-success')}
           ${tipRow('Error rate', fmtP(d.error_rate) + '%', 't-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(700).ease(d3.easeCubicOut)
        .delay((_, i) => i * 40)
        .attr('cy', d => y(d.total)).attr('opacity', 0.75);

      svg.selectAll('.blabel')
        .data(data.filter(d => rScale(d.total) >= 14)).join('text')
        .attr('class', 'blabel')
        .attr('x', d => x(d.error_rate)).attr('y', d => y(d.total)).attr('dy', '0.35em')
        .attr('text-anchor', 'middle').attr('fill', '#fff').attr('font-size', 8).attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d => d.name.length > 11 ? d.name.slice(0, 10) + '…' : d.name);

      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(v => v + '%'));
      svg.append('g').attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(fmtI));

      svg.append('text').attr('x', W / 2).attr('y', H + 42)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Error Rate (%)');
      svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', -50)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Total Jobs');

      svg.select('.domain').remove();
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [data]);

  return <div ref={ref} />;
}
