import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, rateColor, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function NodesProfile({ data }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!data?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const m  = { top: 24, right: 60, bottom: 52, left: 55 };
      const W0 = ref.current.clientWidth || 500;
      const W  = W0 - m.left - m.right;
      const H  = 240;

      const svg = container.append('svg')
        .attr('width', W0).attr('height', H + m.top + m.bottom)
        .append('g').attr('transform', `translate(${m.left},${m.top})`);

      const x       = d3.scaleBand().domain(data.map(d => d.name)).range([0, W]).padding(0.15);
      const y       = d3.scaleLinear().domain([0, 100]).range([H, 0]);
      const yVol    = d3.scaleLinear().domain([0, d3.max(data, d => d.total)]).range([H, 0]).nice();
      const rScale  = d3.scaleSqrt().domain([0, d3.max(data, d => d.total)]).range([5, 18]);
      const cx      = d => x(d.name) + x.bandwidth() / 2;

      svg.append('g').attr('class', 'grid').call(d3.axisLeft(y).tickSize(-W).tickFormat(''));

      // Volume bars (secondary axis, muted background)
      svg.selectAll('.vol-bar').data(data).join('rect')
        .attr('class', 'vol-bar')
        .attr('x', d => x(d.name))
        .attr('y', d => yVol(d.total))
        .attr('width', x.bandwidth())
        .attr('height', d => H - yVol(d.total))
        .attr('fill', C.accent).attr('opacity', 0.1).attr('rx', 3);

      // Area + line (error rate)
      const defs = svg.append('defs');
      const grad = defs.append('linearGradient').attr('id', 'nodes-grad-r')
        .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
      grad.append('stop').attr('offset','0%').attr('stop-color', C.success).attr('stop-opacity', 0.45);
      grad.append('stop').attr('offset','100%').attr('stop-color', C.success).attr('stop-opacity', 0.02);

      svg.append('path').datum(data)
        .attr('fill', 'url(#nodes-grad-r)')
        .attr('d', d3.area().x(cx).y0(H).y1(d => y(d.error_rate)).curve(d3.curveMonotoneX));
      svg.append('path').datum(data)
        .attr('fill', 'none').attr('stroke', C.success).attr('stroke-width', 2.5).attr('stroke-linejoin', 'round')
        .attr('d', d3.line().x(cx).y(d => y(d.error_rate)).curve(d3.curveMonotoneX));

      // Dots sized by job volume
      svg.selectAll('.ndot').data(data).join('circle')
        .attr('class', 'ndot').attr('cx', cx).attr('cy', H)
        .attr('r', d => rScale(d.total))
        .attr('fill',   d => rateColor(d.error_rate))
        .attr('stroke', C.surface).attr('stroke-width', 2).attr('cursor', 'pointer')
        .on('mousemove', (ev, d) => showTip(ev,
          `<strong>Nodes: ${d.name}</strong>
           ${tipRow('Total jobs', fmtI(d.total))}
           ${tipRow('Errors',     fmtI(d.error),           't-error')}
           ${tipRow('Success',    fmtI(d.success),          't-success')}
           ${tipRow('Error rate', fmtP(d.error_rate) + '%', 't-rate')}
           ${tipBar(d.error_rate)}`
        ))
        .on('mouseleave', hideTip)
        .transition().duration(600).ease(d3.easeCubicOut).delay((_, i) => i * 80)
        .attr('cy', d => y(d.error_rate));

      // Error rate labels
      svg.selectAll('.nlabel').data(data).join('text')
        .attr('class', 'nlabel').attr('x', cx).attr('y', d => y(d.error_rate) - rScale(d.total) - 4)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 10)
        .text(d => fmtP(d.error_rate) + '%');

      // Job volume labels inside bars
      svg.selectAll('.vol-label').data(data).join('text')
        .attr('class', 'vol-label')
        .attr('x', cx)
        .attr('y', d => yVol(d.total) - 4)
        .attr('text-anchor', 'middle')
        .attr('fill', C.accent).attr('font-size', 9).attr('opacity', 0.7)
        .text(d => fmtI(d.total));

      // Left axis (error rate)
      svg.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`).call(d3.axisBottom(x));
      svg.append('g').attr('class', 'axis').call(d3.axisLeft(y).ticks(5).tickFormat(v => v + '%'));

      // Right axis (job volume)
      svg.append('g').attr('class', 'axis').attr('transform', `translate(${W},0)`)
        .call(d3.axisRight(yVol).ticks(4).tickFormat(fmtI))
        .selectAll('text').attr('fill', C.accent).attr('opacity', 0.6);

      // Axis labels
      svg.append('text').attr('x', W / 2).attr('y', H + 44)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 11).text('Node Count Group');
      svg.append('text').attr('transform', 'rotate(-90)').attr('x', -H / 2).attr('y', -44)
        .attr('text-anchor', 'middle').attr('fill', C.muted).attr('font-size', 10).text('Error Rate (%)');
      svg.append('text').attr('transform', 'rotate(90)').attr('x', H / 2).attr('y', -(W + 52))
        .attr('text-anchor', 'middle').attr('fill', C.accent).attr('font-size', 10).attr('opacity', 0.6).text('Total Jobs');

      svg.select('.domain').remove();
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [data]);

  return <div ref={ref} />;
}
