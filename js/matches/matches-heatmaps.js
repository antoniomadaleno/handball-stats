// ═══════════════════════════════════════════
// matches-heatmaps.js — mapas de calor
// ═══════════════════════════════════════════

import { esc } from '../utils.js';
import { MS, HM } from './matches-state.js';

const GOAL_SVG = `<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:4px">
  <rect x="0" y="0" width="500" height="200" fill="#0a0a18"/>
  <rect x="90" y="20" width="320" height="140" fill="#111128"/>
  <line x1="197" y1="20" x2="197" y2="160" stroke="#222245" stroke-width="2"/>
  <line x1="303" y1="20" x2="303" y2="160" stroke="#222245" stroke-width="2"/>
  <line x1="90"  y1="67" x2="410" y2="67"  stroke="#222245" stroke-width="2"/>
  <line x1="90"  y1="113" x2="410" y2="113" stroke="#222245" stroke-width="2"/>
  <rect x="85" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
  <rect x="407" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
  <rect x="85" y="16" width="330" height="8"   fill="#4a9a6a" rx="2"/>
</svg>`;

const FIELD_IMG = `<img src="pictures/handball_court.png" style="width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;background:#000;border-radius:4px" />`;

export function renderHeatmap(containerId, events, type, perspective) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const filtered = events.filter(e =>
    type === 'field' ? (e.fieldX != null) : (e.goalX != null)
  );
  if (!filtered.length) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px">Sem dados</div>`;
    return;
  }
  const bg = type === 'field' ? FIELD_IMG : GOAL_SVG;
  const dots = filtered.map(e => {
    const x = type === 'field' ? e.fieldX : e.goalX;
    const y = type === 'field' ? e.fieldY : e.goalY;
    let color;
    if (e.action.startsWith('golo_'))        color = 'rgba(74,222,128,0.9)';
    else if (e.action.startsWith('sofreu_')) color = 'rgba(239,68,68,0.9)';
    else if (e.action.startsWith('defesa_')) color = 'rgba(74,222,128,0.9)';
    else                                      color = 'rgba(239,68,68,0.9)';
    let labelText = '';
    if (perspective === 'adv' && e.oppPlayerId) {
      const oppP = MS.oppPlayers.find(p => p._id === e.oppPlayerId);
      labelText = oppP ? String(oppP.shirt || '?') : '?';
    } else if (perspective !== 'adv') {
      labelText = e.shirt ? String(e.shirt) : '';
    }
    const label = labelText ? `<span style="font-size:8px;font-weight:700;color:white;line-height:1">${labelText}</span>` : '';
    return `<div style="position:absolute;width:18px;height:18px;border-radius:50%;background:${color};border:1.5px solid rgba(255,255,255,0.7);box-shadow:0 0 6px rgba(0,0,0,0.5);transform:translate(-50%,-50%);left:${x}%;top:${y}%;display:flex;align-items:center;justify-content:center;pointer-events:none">${label}</div>`;
  }).join('');
  el.innerHTML = `<div style="position:relative;width:100%;height:100%">${bg}<div style="position:absolute;inset:0">${dots}</div></div>`;
}

function makeFilterBtns(opts, currentVal, callbackFn) {
  return opts.map(o =>
    `<button onclick="app.${callbackFn}('${o.id}')"
      style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${currentVal == o.id ? 'var(--accent)' : 'var(--surface2)'};color:${currentVal == o.id ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${esc(o.label)}</button>`
  ).join('');
}

export function hmSetFilter(val)      { HM.filter      = val; renderJogoHeatmaps(); }
export function hmSetGkFilter(val)    { HM.gkFilter    = val; renderJogoHeatmaps(); }
export function hmSetAdvFilter(val)   { HM.advFilter   = val; renderAdvHeatmaps(); }
export function hmSetAdvGkFilter(val) { HM.advGkFilter = val; renderAdvHeatmaps(); }

export function renderJogoHeatmaps() {
  const allEvents  = MS.match.stats.events || [];
  const ourPlayers = MS.players.filter(p => p.position !== 'GR');
  const gks        = MS.players.filter(p => p.position === 'GR');

  const el = document.getElementById('hm-filter');
  if (el) el.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos' }, ...ourPlayers.map(p => ({ id: p.id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.filter, 'hmSetFilter'
  );
  const gkEl = document.getElementById('hm-gk-filter');
  if (gkEl) gkEl.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos GR' }, ...gks.map(p => ({ id: p.id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.gkFilter, 'hmSetGkFilter'
  );

  const fieldFn = e => HM.filter   === 'all' || String(e.playerId) === String(HM.filter);
  const gkFn    = e => HM.gkFilter === 'all' || String(e.playerId) === String(HM.gkFilter);

  renderHeatmap('hm-field-our', allEvents.filter(e => fieldFn(e) && e.fieldX != null && !e.action.startsWith('sofreu_') && !e.action.startsWith('defesa_')), 'field');
  renderHeatmap('hm-goal-our',  allEvents.filter(e => fieldFn(e) && e.goalX  != null && !e.action.startsWith('sofreu_') && !e.action.startsWith('defesa_')), 'goal');
  renderHeatmap('hm-field-gk',  allEvents.filter(e => gkFn(e)   && e.fieldX != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'field');
  renderHeatmap('hm-goal-gk',   allEvents.filter(e => gkFn(e)   && e.goalX  != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'goal');
}

export function renderAdvHeatmaps() {
  const allEvents = MS.match.stats.events || [];

  const advPlayerIds = [...new Set(allEvents.filter(e => e.oppPlayerId).map(e => e.oppPlayerId))];
  const advPlayers   = MS.oppPlayers.filter(p => advPlayerIds.includes(p._id));
  const advEl = document.getElementById('adv-player-filter');
  if (advEl) advEl.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos' }, ...advPlayers.map(p => ({ id: p._id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.advFilter, 'hmSetAdvFilter'
  );

  const ourGks = MS.players.filter(p => p.position === 'GR');
  const gkEl = document.getElementById('adv-gk-filter');
  if (gkEl) gkEl.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos GR' }, ...ourGks.map(p => ({ id: p.id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.advGkFilter, 'hmSetAdvGkFilter'
  );

  const advFn = e => HM.advFilter   === 'all' || e.oppPlayerId === HM.advFilter;
  const gkFn  = e => HM.advGkFilter === 'all' || String(e.playerId) === String(HM.advGkFilter);

  renderHeatmap('adv-field-gk',  allEvents.filter(e => gkFn(e)  && e.fieldX != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'field', 'our');
  renderHeatmap('adv-goal-gk',   allEvents.filter(e => gkFn(e)  && e.goalX  != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'goal',  'our');
  renderHeatmap('adv-field-adv', allEvents.filter(e => advFn(e) && e.fieldX != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'field', 'adv');
  renderHeatmap('adv-goal-adv',  allEvents.filter(e => advFn(e) && e.goalX  != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'goal',  'adv');
}