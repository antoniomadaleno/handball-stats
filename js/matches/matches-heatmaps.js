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

// ── Modo heatmap (gradiente gaussiano) ────────
// Colormap: preto → azul → verde → amarelo → vermelho
function getHeatColor(t) {
  // t: 0-1
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, Math.round(s * 100), Math.round(50 + s * 150)];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, Math.round(100 + s * 128), Math.round(200 - s * 200)];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(s * 255), 228, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [255, Math.round(228 - s * 228), 0];
  }
}

function renderHeatmapCanvas(el, events, type) {
  const filtered = events.filter(e => type === 'field' ? (e.fieldX != null) : (e.goalX != null));

  const W = 300, H = type === 'field' ? 240 : 120;
  const sigma = type === 'field' ? 18 : 14;

  // Para baliza: mapear coords normalizadas (0-100% dentro da baliza) para pixels do canvas
  // Para campo: coords 0-100% do elemento

  // Densidade acumulada
  const density = new Float32Array(W * H);

  filtered.forEach(e => {
    let px, py;
    if (type === 'goal') {
      px = (e.goalX / 100) * W;
      py = (e.goalY / 100) * H;
    } else {
      px = (e.fieldX / 100) * W;
      py = (e.fieldY / 100) * H;
    }
    // Gaussian splat
    const r = Math.ceil(sigma * 3);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const ix = Math.round(px + dx);
        const iy = Math.round(py + dy);
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
        const g = Math.exp(-(dx*dx + dy*dy) / (2 * sigma * sigma));
        density[iy * W + ix] += g;
      }
    }
  });

  const maxD = Math.max(...density, 1e-6);

  // Render canvas
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(W, H);

  for (let i = 0; i < W * H; i++) {
    const t = density[i] / maxD;
    if (t < 0.02) {
      imgData.data[i*4+3] = 0;
      continue;
    }
    const [r, g, b] = getHeatColor(t);
    imgData.data[i*4]   = r;
    imgData.data[i*4+1] = g;
    imgData.data[i*4+2] = b;
    imgData.data[i*4+3] = Math.round(Math.min(1, t * 1.5) * 200);
  }
  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL();

  if (type === 'goal') {
    // Overlay canvas sobre SVG da baliza — dentro da área da baliza
    // Baliza ocupa x:85-415 (66%), y:16-164 (74%) do viewBox 500×200
    el.innerHTML = `<div style="position:relative;width:100%;height:100%">
      <svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:4px">
        <rect x="0" y="0" width="500" height="200" fill="#0a0a18"/>
        <rect x="90" y="20" width="320" height="140" fill="#111128"/>
        <image href="${dataUrl}" x="85" y="16" width="330" height="148" preserveAspectRatio="none" style="mix-blend-mode:screen"/>
        <line x1="197" y1="20" x2="197" y2="160" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        <line x1="303" y1="20" x2="303" y2="160" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        <line x1="90"  y1="67" x2="410" y2="67"  stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        <line x1="90"  y1="113" x2="410" y2="113" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
        <rect x="85" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="407" y="16" width="8"   height="148" fill="#4a9a6a" rx="2"/>
        <rect x="85" y="16" width="330" height="8"   fill="#4a9a6a" rx="2"/>
      </svg>
    </div>`;
  } else {
    el.innerHTML = `<div style="position:relative;width:100%;height:100%">
      ${FIELD_IMG}
      <canvas width="${W}" height="${H}"
        style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen;border-radius:4px;pointer-events:none"></canvas>
    </div>`;
    // Draw after DOM insert
    setTimeout(() => {
      const c = el.querySelector('canvas');
      if (!c) return;
      const ctx2 = c.getContext('2d');
      ctx2.clearRect(0, 0, W, H);
      ctx2.putImageData(imgData, 0, 0);
    }, 0);
  }
}

// ── Modo zonas (contagem por zona) ─────────
function renderZones(el, events, type) {
  const filtered = events.filter(e => type === 'field' ? (e.fieldX != null) : (e.goalX != null));

  const cols = 3;
  const rows = type === 'field' ? 4 : 3;
  const total_zones = cols * rows;

  const counts = Array(total_zones).fill(0);
  filtered.forEach(e => {
    const x = type === 'field' ? e.fieldX : e.goalX;
    const y = type === 'field' ? e.fieldY : e.goalY;
    const z = type === 'field'
      ? assignZoneField(x, y, cols, rows)
      : assignZoneGoal(x, y, cols, rows);
    counts[z]++;
  });

  const total    = filtered.length || 1;
  const maxCount = Math.max(...counts, 1);

  const goalZoneCoords = [
    { x1: 90, y1: 20, x2: 197, y2: 67  },
    { x1: 197,y1: 20, x2: 303, y2: 67  },
    { x1: 303,y1: 20, x2: 410, y2: 67  },
    { x1: 90, y1: 67, x2: 197, y2: 113 },
    { x1: 197,y1: 67, x2: 303, y2: 113 },
    { x1: 303,y1: 67, x2: 410, y2: 113 },
    { x1: 90, y1:113, x2: 197, y2: 160 },
    { x1: 197,y1:113, x2: 303, y2: 160 },
    { x1: 303,y1:113, x2: 410, y2: 160 },
  ];

  if (type === 'goal') {
    const zoneSvgs = counts.map((count, i) => {
      if (count === 0) return '';
      const pct      = Math.round(count / total * 100);
      const intensity = count / maxCount;
      const alpha    = 0.15 + intensity * 0.55;
      const c        = goalZoneCoords[i];
      const cx       = (c.x1 + c.x2) / 2;
      const cy       = (c.y1 + c.y2) / 2;
      return `<rect x="${c.x1}" y="${c.y1}" width="${c.x2-c.x1}" height="${c.y2-c.y1}" fill="rgba(232,200,74,${alpha})" rx="2"/>
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

  const zoneW = 100 / cols;
  const zoneH = 100 / rows;
  const zoneDivs = counts.map((count, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const pct = Math.round(count / total * 100);
    const intensity = count / maxCount;
    const alpha = count === 0 ? 0 : 0.12 + intensity * 0.5;
    return `<div style="position:absolute;left:${col*zoneW}%;top:${row*zoneH}%;width:${zoneW}%;height:${zoneH}%;
      background:rgba(232,200,74,${alpha});border:1px solid rgba(255,255,255,0.06);
      display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box">
      ${count > 0 ? `<span style="font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700;color:white;line-height:1">${count}</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:10px;color:rgba(255,255,255,0.7);line-height:1.4">${pct}%</span>` : ''}
    </div>`;
  }).join('');
  el.innerHTML = `<div style="position:relative;width:100%;height:100%">
    ${FIELD_IMG}<div style="position:absolute;inset:0">${zoneDivs}</div>
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
  if (HM.viewMode === 'heatmap') renderHeatmapCanvas(el, events, type);
  else if (HM.viewMode === 'zones') renderZones(el, events, type);
  else renderDots(el, events, type, perspective);
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
  const btn = (mode, icon, label) => `<button onclick="app.hmSetViewMode('${mode}')"
    style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${HM.viewMode===mode ? 'var(--accent)' : 'var(--surface2)'};color:${HM.viewMode===mode ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer">
    ${icon} ${label}
  </button>`;
  return `<div style="display:flex;gap:4px">
    ${btn('dots',    '●', 'Pontos')}
    ${btn('heatmap', '◉', 'Calor')}
    ${btn('zones',   '▦', 'Zonas')}
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