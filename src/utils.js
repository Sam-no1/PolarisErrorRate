import * as d3 from 'd3';

// ── Colour palette ─────────────────────────────────────────
export const C = {
  error:   '#f85149',
  success: '#3fb950',
  accent:  '#4f9cf9',
  warning: '#e3b341',
  purple:  '#bc8cff',
  bg:      '#0a0e14',
  surface: '#111820',
  border:  '#243044',
  muted:   '#7a8fa8',
};

export const FEATURE_COLORS = {
  science: '#4f9cf9',
  queue:   '#bc8cff',
  alloc:   '#e3b341',
  nodes:   '#3fb950',
};

export const FEATURE_LABELS = {
  science: 'Science Field',
  queue:   'Queue',
  alloc:   'Allocation',
  nodes:   'Node Count',
};

// ── Formatters ─────────────────────────────────────────────
export const fmtI = d3.format(',d');
export const fmtP = d3.format('.1f');

// ── Helpers ────────────────────────────────────────────────
export function rateColor(r) {
  if (r < 20) return C.success;
  if (r < 50) return C.warning;
  return C.error;
}

export function nameJitter(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0;
  return ((h & 0xffff) / 0xffff) - 0.5; // −0.5 … +0.5
}

// ── Tooltip (operates on the shared #tooltip DOM element) ──
export function showTip(event, html) {
  const tip = document.getElementById('tooltip');
  if (!tip) return;
  tip.classList.add('visible');
  tip.innerHTML = html;
  _positionTip(event, tip);
}

export function moveTip(event) {
  const tip = document.getElementById('tooltip');
  if (tip) _positionTip(event, tip);
}

export function hideTip() {
  const tip = document.getElementById('tooltip');
  if (tip) tip.classList.remove('visible');
}

function _positionTip(event, tip) {
  const [mx, my] = d3.pointer(event, document.body);
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = mx + 16, y = my - h / 2;
  if (x + w > window.innerWidth  - 8) x = mx - w - 16;
  if (y < 6) y = 6;
  if (y + h > window.innerHeight - 6) y = window.innerHeight - h - 6;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}

// ── Tooltip HTML helpers ───────────────────────────────────
export function tipRow(label, val, cls = '') {
  return `<div class="t-row"><span class="t-label">${label}</span><span class="t-val ${cls}">${val}</span></div>`;
}

export function tipBar(rate) {
  const c = rateColor(rate);
  return `<div class="tip-bar"><div class="tip-bar-fill" style="width:${rate}%;background:${c}"></div></div>`;
}
