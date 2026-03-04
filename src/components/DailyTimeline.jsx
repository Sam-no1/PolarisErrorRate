import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { C, rateColor, fmtI, fmtP, showTip, hideTip, tipRow, tipBar } from '../utils.js';

export default function DailyTimeline({ daily }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    function render() {
      if (!daily?.length || !ref.current) return;
      const container = d3.select(ref.current);
      container.selectAll('*').remove();

      const parseDate = d3.timeParse('%Y-%m-%d');
      const fmtDate   = d3.timeFormat('%b %d');
      const parsed    = daily.map(d => ({ ...d, dateObj: parseDate(d.date) }));
      const avgRate   = d3.mean(parsed, d => d.error_rate);

      const m    = { top: 20, right: 34, bottom: 24, left: 52 };
      const mCtx = { top: 6,  right: 34, bottom: 30, left: 52 };
      const W0   = ref.current.clientWidth || 900;
      const W    = W0 - m.left - m.right;
      const mainH  = 200;
      const ctxH   = 46;
      const gap    = 18;
      const totalH = m.top + mainH + gap + mCtx.top + ctxH + mCtx.bottom;

      const svg = container.append('svg').attr('width', W0).attr('height', totalH);
      const defs = svg.append('defs');
      defs.append('clipPath').attr('id', 'tl-clip')
        .append('rect').attr('width', W).attr('height', mainH);
      const grad = defs.append('linearGradient').attr('id', 'tl-grad')
        .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%');
      grad.append('stop').attr('offset','0%').attr('stop-color', C.error).attr('stop-opacity', 0.4);
      grad.append('stop').attr('offset','100%').attr('stop-color', C.error).attr('stop-opacity', 0.02);

      const main = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);
      const ctx  = svg.append('g')
        .attr('transform', `translate(${mCtx.left},${m.top + mainH + gap + mCtx.top})`);

      const xFull = d3.scaleTime().domain(d3.extent(parsed, d => d.dateObj)).range([0, W]);
      const xMain = xFull.copy();
      const yMain = d3.scaleLinear().domain([0, 100]).range([mainH, 0]);
      const yCtx  = d3.scaleLinear().domain([0, 100]).range([ctxH, 0]);

      const areaMain = d3.area().x(d => xMain(d.dateObj)).y0(mainH).y1(d => yMain(d.error_rate)).curve(d3.curveMonotoneX);
      const lineMain = d3.line().x(d => xMain(d.dateObj)).y(d => yMain(d.error_rate)).curve(d3.curveMonotoneX);

      main.append('g').attr('class', 'grid')
        .call(d3.axisLeft(yMain).tickSize(-W).tickFormat('').ticks(5));

      // Avg reference line
      main.append('line')
        .attr('x1', 0).attr('x2', W).attr('y1', yMain(avgRate)).attr('y2', yMain(avgRate))
        .attr('stroke', C.muted).attr('stroke-width', 1).attr('stroke-dasharray', '6,4').attr('opacity', .6);
      main.append('text')
        .attr('x', W + 4).attr('y', yMain(avgRate)).attr('dy', '0.35em')
        .attr('fill', C.muted).attr('font-size', 9).text('avg');

      const chartG = main.append('g').attr('clip-path', 'url(#tl-clip)');
      const areaPath = chartG.append('path').datum(parsed).attr('fill', 'url(#tl-grad)').attr('d', areaMain);
      const linePath = chartG.append('path').datum(parsed)
        .attr('fill', 'none').attr('stroke', C.error).attr('stroke-width', 2).attr('d', lineMain);
      const dots = chartG.selectAll('.tl-dot').data(parsed).join('circle')
        .attr('class', 'tl-dot')
        .attr('cx', d => xMain(d.dateObj)).attr('cy', d => yMain(d.error_rate))
        .attr('r', 3.5).attr('fill', d => rateColor(d.error_rate))
        .attr('stroke', C.surface).attr('stroke-width', 1.5);

      // Crosshair
      const vLine = main.append('line')
        .attr('stroke', C.muted).attr('stroke-width', 1).attr('stroke-dasharray', '3,3')
        .attr('opacity', 0).attr('y1', 0).attr('y2', mainH);
      const vDot = main.append('circle').attr('r', 5)
        .attr('fill', C.error).attr('stroke', C.surface).attr('stroke-width', 2)
        .attr('opacity', 0).attr('pointer-events', 'none');

      const bisect = d3.bisector(d => d.dateObj).left;
      main.append('rect').attr('width', W).attr('height', mainH).attr('fill', 'transparent')
        .on('mousemove', function(event) {
          const [mx] = d3.pointer(event);
          const x0 = xMain.invert(mx);
          const i  = bisect(parsed, x0);
          const d0 = parsed[Math.max(0, i - 1)];
          const d1 = parsed[Math.min(parsed.length - 1, i)];
          const d  = !d1 || (x0 - d0.dateObj) < (d1.dateObj - x0) ? d0 : d1;
          const cx = xMain(d.dateObj), cy = yMain(d.error_rate);
          vLine.attr('x1', cx).attr('x2', cx).attr('opacity', 0.5);
          vDot.attr('cx', cx).attr('cy', cy).attr('opacity', 1);
          showTip(event,
            `<strong>${d.date}</strong>
             ${tipRow('Error rate', fmtP(d.error_rate) + '%', 't-rate')}
             ${tipRow('Errors',     fmtI(d.error),            't-error')}
             ${tipRow('Total jobs', fmtI(d.total))}
             ${tipRow('Successful', fmtI(d.success),           't-success')}
             ${tipBar(d.error_rate)}`
          );
        })
        .on('mouseleave', () => { vLine.attr('opacity', 0); vDot.attr('opacity', 0); hideTip(); });

      const xAxisMain = main.append('g').attr('class', 'axis').attr('transform', `translate(0,${mainH})`)
        .call(d3.axisBottom(xMain).ticks(d3.timeDay.every(3)).tickFormat(fmtDate));
      main.append('g').attr('class', 'axis')
        .call(d3.axisLeft(yMain).ticks(5).tickFormat(v => v + '%'));
      main.select('.domain').remove();

      // Context overview
      ctx.append('path').datum(parsed)
        .attr('fill', C.error).attr('fill-opacity', 0.18)
        .attr('stroke', C.error).attr('stroke-width', 1)
        .attr('d', d3.area().x(d => xFull(d.dateObj)).y0(ctxH).y1(d => yCtx(d.error_rate)).curve(d3.curveMonotoneX));
      ctx.append('g').attr('class', 'axis').attr('transform', `translate(0,${ctxH})`)
        .call(d3.axisBottom(xFull).ticks(d3.timeDay.every(5)).tickFormat(fmtDate));

      const brush = d3.brushX().extent([[0, 0], [W, ctxH]])
        .on('brush end', function(event) {
          if (!event.selection) return;
          const [x0, x1] = event.selection.map(xFull.invert);
          xMain.domain([x0, x1]);
          areaPath.attr('d', areaMain);
          linePath.attr('d', lineMain);
          dots.attr('cx', d => xMain(d.dateObj)).attr('cy', d => yMain(d.error_rate));
          xAxisMain.call(d3.axisBottom(xMain).ticks(5).tickFormat(fmtDate));
        });

      ctx.append('g').attr('class', 'brush').call(brush);
    }

    render();
    const obs = new ResizeObserver(render);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [daily]);

  return <div ref={ref} />;
}
