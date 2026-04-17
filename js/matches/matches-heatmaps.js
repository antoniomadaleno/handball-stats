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

// ── Cor do ponto ───────────────────────────
function dotColor(action) {
  if (action.startsWith('golo_'))       return 'rgba(74,222,128,0.9)';
  if (action === 'remate_bloqueado')    return 'rgba(232,200,74,0.9)';
  if (action === 'bloco_efetuado')      return 'rgba(232,200,74,0.9)';
  if (action.startsWith('sofreu_'))     return 'rgba(239,68,68,0.9)';
  if (action.startsWith('defesa_'))     return 'rgba(74,222,128,0.9)';
  return 'rgba(239,68,68,0.9)';
}

// ── Modo pontos ────────────────────────────
function renderDots(el, events, type, perspective) {
  const filtered = events.filter(e => type === 'field' ? (e.fieldX != null) : (e.goalX != null));
  if (!filtered.length) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px">Sem dados</div>`;
    return;
  }
  if (type === 'goal') {
    // Baliza: usar SVG nativo para dots — evita problemas de aspect ratio com HTML absoluto
    const dotsSvg = filtered.map(e => {
      const pos   = goalNormToVB(e.goalX, e.goalY);
      const color = dotColor(e.action);
      let labelText = '';
      if (perspective === 'adv' && e.oppPlayerId) {
        const oppP = MS.oppPlayers.find(p => p._id === e.oppPlayerId);
        labelText = oppP ? String(oppP.shirt || '?') : '?';
      } else if (perspective !== 'adv') {
        labelText = e.shirt ? String(e.shirt) : '';
      }
      const textEl = labelText
        ? `<text x="${pos.x}" y="${pos.y + 1}" text-anchor="middle" dominant-baseline="central" style="font-size:7px;font-weight:700;fill:white;pointer-events:none">${labelText}</text>`
        : '';
      return `<circle cx="${pos.x}" cy="${pos.y}" r="9" fill="${color}" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" filter="url(#shadow)"/>${textEl}`;
    }).join('');

    el.innerHTML = `<div style="position:relative;width:100%;height:100%">
      <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:4px">
        <defs><filter id="shadow"><feDropShadow dx="0" dy="0" stdDeviation="2" flood-opacity="0.5"/></filter></defs>
        <rect x="0" y="0" width="500" height="200" fill="#0a0a18"/>
        <rect x="90" y="20" width="320" height="140" fill="#111128"/>
        <line x1="197" y1="20" x2="197" y2="160" stroke="#222245" stroke-width="2"/>
        <line x1="303" y1="20" x2="303" y2="160" stroke="#222245" stroke-width="2"/>
        <line x1="90"  y1="67" x2="410" y2="67"  stroke="#222245" stroke-width="2"/>
        <line x1="90"  y1="113" x2="410" y2="113" stroke="#222245" stroke-width="2"/>
        <rect x="85" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="407" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="85" y="16" width="330" height="8"   fill="#4a9a6a" rx="2"/>
        ${dotsSvg}
      </svg>
    </div>`;
    return;
  }

  // Campo: HTML absoluto
  const bg   = FIELD_IMG;
  const dots = filtered.map(e => {
    const x = e.fieldX;
    const y = e.fieldY;
    const color = dotColor(e.action);
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

// ── Modo zonas ─────────────────────────────
// Campo: grelha 3 cols × 4 linhas = 12 zonas
// Baliza: grelha 3 cols × 3 linhas = 9 zonas

// Baliza no viewBox 500×200: poste esq=85, poste dir=415, barra=16, chão=164
const GOAL_VB_X1 = 85,  GOAL_VB_X2 = 415;
const GOAL_VB_Y1 = 16,  GOAL_VB_Y2 = 164;
const GOAL_VB_W  = 500, GOAL_VB_H  = 200;
// Helpers para converter coordenadas normalizadas (0-100% dentro da baliza) → viewBox
function goalNormToVB(nx, ny) {
  return {
    x: GOAL_VB_X1 + (nx / 100) * (GOAL_VB_X2 - GOAL_VB_X1),
    y: GOAL_VB_Y1 + (ny / 100) * (GOAL_VB_Y2 - GOAL_VB_Y1),
  };
}

function assignZoneField(x, y, cols, rows) {
  const col = Math.min(Math.floor(x / 100 * cols), cols - 1);
  const row = Math.min(Math.floor(y / 100 * rows), rows - 1);
  return row * cols + col;
}

function assignZoneGoal(x, y, cols, rows) {
  // Coordenadas 0-100% dentro da baliza — mapeia direto para zonas
  const col = Math.min(Math.floor(x / 100 * cols), cols - 1);
  const row = Math.min(Math.floor(y / 100 * rows), rows - 1);
  return row * cols + col;
}

function isGoalAction(action) {
  return action.startsWith('golo_') || action.startsWith('defesa_');
}

function renderZones(el, events, type) {
  const filtered = events.filter(e => type === 'field' ? (e.fieldX != null) : (e.goalX != null));
  const bg       = type === 'field' ? FIELD_IMG : GOAL_SVG;

  const cols = 3;
  const rows = type === 'field' ? 4 : 3;
  const total_zones = cols * rows;

  // Contagem por zona
  const counts  = Array(total_zones).fill(0);
  const goals   = Array(total_zones).fill(0);
  filtered.forEach(e => {
    const x = type === 'field' ? e.fieldX : e.goalX;
    const y = type === 'field' ? e.fieldY : e.goalY;
    const z = type === 'field'
      ? assignZoneField(x, y, cols, rows)
      : assignZoneGoal(x, y, cols, rows);
    counts[z]++;
    if (isGoalAction(e.action)) goals[z]++;
  });

  const total   = filtered.length || 1;
  const maxCount = Math.max(...counts, 1);

  // Para baliza: foco só na área interior (x: 18%-82%, y: 8%-80% do viewBox 500x200)
  // Mapeamos as zonas para as coordenadas do SVG da baliza
  const goalZoneCoords = [
    // row 0 (topo): 3 zonas
    { x1: 90, y1: 20, x2: 197, y2: 67  }, // col0
    { x1: 197,y1: 20, x2: 303, y2: 67  }, // col1
    { x1: 303,y1: 20, x2: 410, y2: 67  }, // col2
    // row 1 (meio)
    { x1: 90, y1: 67, x2: 197, y2: 113 },
    { x1: 197,y1: 67, x2: 303, y2: 113 },
    { x1: 303,y1: 67, x2: 410, y2: 113 },
    // row 2 (baixo)
    { x1: 90, y1:113, x2: 197, y2: 160 },
    { x1: 197,y1:113, x2: 303, y2: 160 },
    { x1: 303,y1:113, x2: 410, y2: 160 },
  ];

  if (type === 'goal') {
    // Render SVG com zonas sobrepostas
    const zoneSvgs = counts.map((count, i) => {
      if (count === 0) return '';
      const pct      = Math.round(count / total * 100);
      const intensity = count / maxCount;
      const alpha    = 0.15 + intensity * 0.55;
      const c        = goalZoneCoords[i];
      const cx       = (c.x1 + c.x2) / 2;
      const cy       = (c.y1 + c.y2) / 2;
      const color    = `rgba(232,200,74,${alpha})`;
      return `<rect x="${c.x1}" y="${c.y1}" width="${c.x2-c.x1}" height="${c.y2-c.y1}" fill="${color}" rx="2"/>
        <text x="${cx}" y="${cy - 6}" text-anchor="middle" dominant-baseline="central"
          style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;fill:white">${count}</text>
        <text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="central"
          style="font-family:'Barlow Condensed',sans-serif;font-size:10px;fill:rgba(255,255,255,0.7)">${pct}%</text>`;
    }).join('');

    el.innerHTML = `<div style="position:relative;width:100%;height:100%">
      <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:4px">
        <rect x="0" y="0" width="500" height="200" fill="#0a0a18"/>
        <rect x="90" y="20" width="320" height="140" fill="#111128"/>
        ${zoneSvgs}
        <line x1="197" y1="20" x2="197" y2="160" stroke="#222245" stroke-width="2"/>
        <line x1="303" y1="20" x2="303" y2="160" stroke="#222245" stroke-width="2"/>
        <line x1="90"  y1="67" x2="410" y2="67"  stroke="#222245" stroke-width="2"/>
        <line x1="90"  y1="113" x2="410" y2="113" stroke="#222245" stroke-width="2"/>
        <rect x="85" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="407" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="85" y="16" width="330" height="8"   fill="#4a9a6a" rx="2"/>
      </svg>
    </div>`;
    return;
  }

  // Campo — overlay com divs sobre a imagem
  const zoneW = 100 / cols;
  const zoneH = 100 / rows;
  const zoneDivs = counts.map((count, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const pct = Math.round(count / total * 100);
    const intensity = count / maxCount;
    const alpha = count === 0 ? 0 : 0.12 + intensity * 0.5;
    const left = col * zoneW;
    const top  = row * zoneH;
    return `<div style="position:absolute;left:${left}%;top:${top}%;width:${zoneW}%;height:${zoneH}%;
      background:rgba(232,200,74,${alpha});
      border:1px solid rgba(255,255,255,0.06);
      display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box">
      ${count > 0 ? `
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:white;line-height:1">${count}</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:10px;color:rgba(255,255,255,0.7);line-height:1.4">${pct}%</span>
      ` : ''}
    </div>`;
  }).join('');

  el.innerHTML = `<div style="position:relative;width:100%;height:100%">
    ${FIELD_IMG}
    <div style="position:absolute;inset:0">${zoneDivs}</div>
  </div>`;
}

// ── API pública ────────────────────────────

export function renderHeatmap(containerId, events, type, perspective) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!events.length) {
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:12px">Sem dados</div>`;
    return;
  }
  if (HM.viewMode === 'zones') renderZones(el, events, type);
  else                          renderDots(el, events, type, perspective);
}

export function hmSetViewMode(mode) {
  HM.viewMode = mode;
  renderJogoHeatmaps();
  renderAdvHeatmaps();
}

function makeFilterBtns(opts, currentVal, callbackFn) {
  return opts.map(o =>
    `<button onclick="app.${callbackFn}('${o.id}')"
      style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${currentVal == o.id ? 'var(--accent)' : 'var(--surface2)'};color:${currentVal == o.id ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${esc(o.label)}</button>`
  ).join('');
}

function modeToggle() {
  return `<div style="display:flex;gap:4px">
    <button onclick="app.hmSetViewMode('dots')"
      style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${HM.viewMode==='dots' ? 'var(--accent)' : 'var(--surface2)'};color:${HM.viewMode==='dots' ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer">
      ● Pontos
    </button>
    <button onclick="app.hmSetViewMode('zones')"
      style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${HM.viewMode==='zones' ? 'var(--accent)' : 'var(--surface2)'};color:${HM.viewMode==='zones' ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer">
      ▦ Zonas
    </button>
  </div>`;
}

export function hmSetFilter(val)      { HM.filter      = val; renderJogoHeatmaps(); }
export function hmSetGkFilter(val)    { HM.gkFilter    = val; renderJogoHeatmaps(); }
export function hmSetAdvFilter(val)   { HM.advFilter   = val; renderAdvHeatmaps(); }
export function hmSetAdvGkFilter(val) { HM.advGkFilter = val; renderAdvHeatmaps(); }

export function renderJogoHeatmaps() {
  const allEvents  = MS.match.stats.events || [];
  const ourPlayers = MS.players.filter(p => p.position !== 'GR');
  const gks        = MS.players.filter(p => p.position === 'GR');

  // Toggle modo
  const toggleEl = document.getElementById('hm-view-toggle');
  if (toggleEl) toggleEl.innerHTML = modeToggle();

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

  const isOurShot = e => e.action.startsWith('golo_') || e.action.startsWith('falha_') || e.action === 'remate_bloqueado';

  renderHeatmap('hm-field-our', allEvents.filter(e => fieldFn(e) && e.fieldX != null && isOurShot(e)), 'field');
  renderHeatmap('hm-goal-our',  allEvents.filter(e => fieldFn(e) && e.goalX  != null && isOurShot(e)), 'goal');
  renderHeatmap('hm-field-gk',  allEvents.filter(e => gkFn(e)   && e.fieldX != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'field');
  renderHeatmap('hm-goal-gk',   allEvents.filter(e => gkFn(e)   && e.goalX  != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_'))), 'goal');
}

export function renderAdvHeatmaps() {
  const allEvents = MS.match.stats.events || [];

  // Toggle modo
  const toggleEl = document.getElementById('adv-view-toggle');
  if (toggleEl) toggleEl.innerHTML = modeToggle();

  const oppGks = MS.oppPlayers.filter(p => p.position === 'GR');
  const gkEl = document.getElementById('adv-gk-filter');
  if (gkEl) gkEl.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos GR' }, ...oppGks.map(p => ({ id: p._id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.advGkFilter, 'hmSetAdvGkFilter'
  );

  const advPlayerIds = [...new Set(allEvents.filter(e => e.oppPlayerId).map(e => e.oppPlayerId))];
  const advPlayers   = MS.oppPlayers.filter(p => advPlayerIds.includes(p._id));
  const advEl = document.getElementById('adv-player-filter');
  if (advEl) advEl.innerHTML = makeFilterBtns(
    [{ id: 'all', label: 'Todos' }, ...advPlayers.map(p => ({ id: p._id, label: `${p.shirt || '?'} ${p.name.split(' ')[0]}` }))],
    HM.advFilter, 'hmSetAdvFilter'
  );

  const gkFn  = e => HM.advGkFilter === 'all' || e.ourGkId === HM.advGkFilter;
  const advFn = e => HM.advFilter   === 'all' || e.oppPlayerId === HM.advFilter;

  const ourShotEvents = allEvents.filter(e =>
    e.action.startsWith('golo_') || e.action.startsWith('falha_') || e.action === 'remate_bloqueado'
  );
  renderHeatmap('adv-field-gk', ourShotEvents.filter(e => gkFn(e) && e.fieldX != null), 'field', 'our');
  renderHeatmap('adv-goal-gk',  ourShotEvents.filter(e => gkFn(e) && e.goalX  != null), 'goal',  'our');

  const oppShotEvents = allEvents.filter(e =>
    e.action.startsWith('sofreu_') || e.action.startsWith('defesa_') || e.action === 'bloco_efetuado'
  );
  renderHeatmap('adv-field-adv', oppShotEvents.filter(e => advFn(e) && e.fieldX != null), 'field', 'adv');
  renderHeatmap('adv-goal-adv',  oppShotEvents.filter(e => advFn(e) && e.goalX  != null), 'goal',  'adv');
}