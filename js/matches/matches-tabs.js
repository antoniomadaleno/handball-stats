// ═══════════════════════════════════════════
// matches-tabs.js — conteúdo das tabs
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { esc, emptyState } from '../utils.js';
import { MS } from './matches-state.js';
import { ACTIONS_FIELD, ACTIONS_GK, getAllActions, registerAction, getActiveActions } from './matches-actions.js';
import { renderJogoHeatmaps, renderAdvHeatmaps } from './matches-heatmaps.js';
import { HM } from './matches-state.js';

export function switchTab(tab) {
  MS.activeTab = tab;
  MS.selectedPlayerId = null;
  document.querySelectorAll('.md-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
    t.style.color        = t.dataset.tab === tab ? 'var(--accent)' : 'var(--text2)';
    t.style.borderBottom = t.dataset.tab === tab ? '2px solid var(--accent)' : '2px solid transparent';
  });
  document.querySelectorAll('.md-tab-content').forEach(c => {
    c.style.display = c.dataset.tab === tab ? '' : 'none';
  });
  if (tab === 'entrada')   renderEntrada();
  if (tab === 'jogadores') renderJogadores();
  if (tab === 'jogo')      renderJogo();
  if (tab === 'resultado') renderResultado();
  if (tab === 'mapas')     { HM.filter = 'all'; HM.gkFilter = 'all'; renderJogoHeatmaps(); }
  if (tab === 'adv')       { HM.advFilter = 'all'; HM.advGkFilter = 'all'; renderAdvHeatmaps(); }
}

// ── TAB: ENTRADA ───────────────────────────

export function renderEntrada() {
  const players = MS.players.slice().sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
  const gks     = players.filter(p => p.position === 'GR');
  const fields  = players.filter(p => p.position !== 'GR');

  const playerList = [...gks, ...fields].map(p => {
    const sel = MS.selectedPlayerId === p.id;
    return `<div class="md-player-item ${sel ? 'selected' : ''}"
         onclick="app.selectPlayer(${p.id})"
         style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:3px;background:${sel ? 'var(--accent)' : 'var(--surface2)'};border:1px solid ${sel ? 'var(--accent)' : 'var(--border)'};transition:all 0.1s">
      <div style="width:28px;height:28px;border-radius:5px;background:${sel ? 'rgba(0,0,0,0.2)' : 'var(--surface)'};display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:13px;font-weight:700;color:${sel ? '#0d0f14' : 'var(--accent)'}">
        ${p.shirt || '—'}
      </div>
      <span style="font-family:var(--font-cond);font-size:13px;font-weight:600;flex:1;color:${sel ? '#0d0f14' : 'var(--text)'}">
        ${esc(p.name)}
      </span>
      ${p.position === 'GR' ? `<span style="font-size:9px;font-weight:700;color:${sel ? '#0d0f14' : 'var(--blue)'}">GR</span>` : ''}
    </div>`;
  }).join('');

  const sel     = MS.players.find(p => p.id === MS.selectedPlayerId);
  const actions = sel ? getActiveActions(sel) : [];

  const actionsHtml = !sel
    ? `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px;padding:20px;text-align:center">← Seleciona um jogador</div>`
    : actions.map(a => {
        const isGoal = a.goal || a.save;
        const color  = a.goal ? 'var(--accent)'
          : a.save    ? 'var(--success)'
          : a.conc    ? 'var(--danger)'
          : (a.key === 'exclusao_2min' || a.key === 'cartao_amarelo' || a.key === 'cartao_vermelho') ? 'var(--danger)'
          : (a.key === '7m_ganho' || a.key === '2min_ganho' || a.key === 'falta_ganha' || a.key === '7m_provocado') ? 'var(--success)'
          : 'var(--text2)';
        return `<button onclick="app.registerAction(${MS.selectedPlayerId},'${a.key}')"
          style="display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:3px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);font-family:'Barlow',sans-serif;font-size:13px;font-weight:${isGoal ? '600' : '400'};color:${color};cursor:pointer;transition:background 0.1s"
          onmouseover="this.style.background='var(--surface)'"
          onmouseout="this.style.background='var(--surface2)'">${a.label}</button>`;
      }).join('');

  document.getElementById('md-entrada-players').innerHTML = playerList;
  document.getElementById('md-entrada-actions').innerHTML = actionsHtml;
}

export function selectPlayer(id) {
  MS.selectedPlayerId = (MS.selectedPlayerId === id) ? null : id;
  renderEntrada();
}

// ── TAB: JOGADORES ─────────────────────────

function renderJogadores() {
  const stats  = MS.match.stats.players || {};
  const gks    = MS.players.filter(p => p.position === 'GR');
  const fields = MS.players.filter(p => p.position !== 'GR').sort((a, b) => (a.shirt || 99) - (b.shirt || 99));

  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) + '%' : '—';

  const headerRow = `<div style="display:grid;grid-template-columns:30px 1fr 40px 40px 60px 40px 40px 40px 40px 40px;gap:4px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px">
    <div></div><div>Jogador</div><div style="text-align:center">G</div><div style="text-align:center">R</div><div style="text-align:center">%R</div>
    <div style="text-align:center">7m</div><div style="text-align:center">Pen</div><div style="text-align:center">Ponta</div><div style="text-align:center">CA</div><div style="text-align:center">9m</div>
  </div>`;

  const playerRow = (p) => {
    const ps = stats[p.id] || {};
    const ac = ps.actions || {};
    const goals = ps.goals || 0;
    const shots = Object.keys(ac).filter(k => k.startsWith('golo_')).reduce((s, k) => s + (ac[k] || 0), 0)
                + Object.keys(ac).filter(k => k.startsWith('falha_')).reduce((s, k) => s + (ac[k] || 0), 0);
    const g7m = ac.golo_7m || 0; const f7m = ac.falha_7m || 0;
    const gpen = ac.golo_pen || 0; const fpen = ac.falha_pen || 0;
    const gpnt = ac.golo_ponta || 0; const fpnt = ac.falha_ponta || 0;
    const gca = ac.golo_ca || 0; const fca = ac.falha_ca || 0;
    const g9m = ac.golo_9m || 0; const f9m = ac.falha_9m || 0;
    return `<div style="display:grid;grid-template-columns:30px 1fr 40px 40px 60px 40px 40px 40px 40px 40px;gap:4px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;align-items:center;font-size:12px">
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;color:var(--accent)">${p.shirt || '—'}</div>
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(p.name)}</div>
      <div style="text-align:center;font-weight:700;color:var(--accent)">${goals}</div>
      <div style="text-align:center">${shots}</div>
      <div style="text-align:center;color:var(--text2)">${pct(goals, shots)}</div>
      <div style="text-align:center;color:var(--text2)">${g7m + f7m > 0 ? g7m + '/' + (g7m + f7m) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gpen + fpen > 0 ? gpen + '/' + (gpen + fpen) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gpnt + fpnt > 0 ? gpnt + '/' + (gpnt + fpnt) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gca + fca > 0 ? gca + '/' + (gca + fca) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${g9m + f9m > 0 ? g9m + '/' + (g9m + f9m) : '—'}</div>
    </div>`;
  };

  const gkHeader = `<div style="display:grid;grid-template-columns:30px 1fr 50px 50px 60px;gap:4px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px">
    <div></div><div>GR</div><div style="text-align:center">Defesas</div><div style="text-align:center">Sofridos</div><div style="text-align:center">%Def</div>
  </div>`;

  const gkRow = (p) => {
    const ps = MS.match.stats.players[p.id] || {};
    const saves    = ps.saves    || 0;
    const conceded = ps.conceded || 0;
    return `<div style="display:grid;grid-template-columns:30px 1fr 50px 50px 60px;gap:4px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;align-items:center;font-size:12px">
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;color:var(--accent)">${p.shirt || '—'}</div>
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(p.name)}</div>
      <div style="text-align:center;font-weight:700;color:var(--success)">${saves}</div>
      <div style="text-align:center;font-weight:700;color:var(--danger)">${conceded}</div>
      <div style="text-align:center;color:var(--text2)">${pct(saves, saves + conceded)}</div>
    </div>`;
  };

  let html = '';
  if (gks.length)    html += `<div style="margin-bottom:16px">${gkHeader}${gks.map(gkRow).join('')}</div>`;
  if (fields.length) html += `<div>${headerRow}${fields.map(playerRow).join('')}</div>`;
  if (!html) html = emptyState('👤', 'Sem dados ainda.');
  document.getElementById('md-tab-jogadores').innerHTML = html;
}

// ── TAB: JOGO ──────────────────────────────

function calcJogoStats(periodFilter) {
  const stats  = MS.match.stats.players || {};
  const events = MS.match.stats.events  || [];

  const getAc = (playerId) => {
    if (periodFilter === null) return (stats[playerId] || {}).actions || {};
    const ac = {};
    events.filter(e => e.playerId === playerId && e.period === periodFilter).forEach(e => {
      ac[e.action] = (ac[e.action] || 0) + 1;
    });
    return ac;
  };

  let shots=0, goals=0, g7m=0, f7m=0, g6m=0, f6m=0, gPen=0, fPen=0, gPnt=0, fPnt=0, gCA=0, fCA=0, g9m=0, f9m=0;
  let gkSaves=0, gkConceded=0, gkS7m=0, gkC7m=0, gkS6m=0, gkC6m=0, gkSPen=0, gkCPen=0, gkSPnt=0, gkCPnt=0, gkSCA=0, gkCCA=0, gkS9m=0, gkC9m=0;

  MS.players.forEach(p => {
    const ac = getAc(p.id);
    if (p.position !== 'GR') {
      g7m  += ac.golo_7m    ||0; f7m  += ac.falha_7m    ||0;
      g6m  += ac.golo_6m    ||0; f6m  += ac.falha_6m    ||0;
      gPen += ac.golo_pen   ||0; fPen += ac.falha_pen   ||0;
      gPnt += ac.golo_ponta ||0; fPnt += ac.falha_ponta ||0;
      gCA  += ac.golo_ca    ||0; fCA  += ac.falha_ca    ||0;
      g9m  += ac.golo_9m    ||0; f9m  += ac.falha_9m    ||0;
      Object.keys(ac).filter(k => k.startsWith('golo_')).forEach(k  => { goals += ac[k]; shots += ac[k]; });
      Object.keys(ac).filter(k => k.startsWith('falha_')).forEach(k => { shots += ac[k]; });
    } else {
      gkS7m  += ac.defesa_7m    ||0; gkC7m  += ac.sofreu_7m    ||0;
      gkS6m  += ac.defesa_6m    ||0; gkC6m  += ac.sofreu_6m    ||0;
      gkSPen += ac.defesa_pen   ||0; gkCPen += ac.sofreu_pen   ||0;
      gkSPnt += ac.defesa_ponta ||0; gkCPnt += ac.sofreu_ponta ||0;
      gkSCA  += ac.defesa_ca    ||0; gkCCA  += ac.sofreu_ca    ||0;
      gkS9m  += ac.defesa_9m    ||0; gkC9m  += ac.sofreu_9m    ||0;
      gkSaves    += Object.keys(ac).filter(k => k.startsWith('defesa_')).reduce((s, k) => s + (ac[k] || 0), 0);
      gkConceded += Object.keys(ac).filter(k => k.startsWith('sofreu_')).reduce((s, k) => s + (ac[k] || 0), 0);
    }
  });

  const fmtRatio = (g, t) => t > 0 ? `${g}/${t}` : '—';
  const pct      = (g, t) => t > 0 ? Math.round(g / t * 100) + '%' : '—';
  return {
    shots, goals, g7m, f7m, g6m, f6m, gPen, fPen, gPnt, fPnt, gCA, fCA, g9m, f9m,
    gkSaves, gkConceded, gkS7m, gkC7m, gkS6m, gkC6m, gkSPen, gkCPen, gkSPnt, gkCPnt, gkSCA, gkCCA, gkS9m, gkC9m,
    fmtRatio, pct,
    pctShots: pct(goals, shots),
    pctDef:   pct(gkSaves, gkSaves + gkConceded),
  };
}

function renderJogo() {
  const info    = S.season.info || {};
  const myShort = info.teamShort || 'NÓS';
  const oppName = document.getElementById('md-opp-short').textContent;
  const oppGoals = MS.match.stats.scoreOpp;

  const t  = calcJogoStats(null);
  const p1 = calcJogoStats(1);
  const p2 = calcJogoStats(2);

  const bar = (ourVal, oppVal, label) => {
    const total = ourVal + oppVal || 1;
    const ourW  = Math.round(ourVal / total * 100);
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-family:var(--font-cond);font-size:16px;font-weight:700;color:var(--accent)">${ourVal}</span>
        <span style="font-size:12px;color:var(--text2)">${label}</span>
        <span style="font-family:var(--font-cond);font-size:16px;font-weight:700;color:var(--text)">${oppVal}</span>
      </div>
      <div style="height:6px;border-radius:3px;background:var(--surface2);overflow:hidden">
        <div style="height:100%;width:${ourW}%;background:var(--accent);border-radius:3px;transition:width 0.3s"></div>
      </div>
    </div>`;
  };

  const circle = (pct, label, color) => {
    const num = parseInt(pct) || 0;
    const r = 36; const circ = 2 * Math.PI * r;
    const dash = circ * num / 100;
    return `<div style="text-align:center;flex:1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="10"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ / 4}" stroke-linecap="round"
          transform="rotate(-90 50 50)"/>
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
          style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;fill:${color}">${pct}</text>
      </svg>
      <div style="font-size:11px;color:var(--text2);margin-top:4px">${label}</div>
    </div>`;
  };

  const th = `style="padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center;background:var(--surface);border-bottom:1px solid var(--border)"`;
  const td = `style="padding:7px 8px;font-size:12px;text-align:center;border-bottom:1px solid var(--border)"`;
  const tb = `style="padding:7px 8px;font-size:12px;text-align:center;border-bottom:1px solid var(--border);font-weight:700"`;
  const tr = `style="background:var(--surface2)"`;

  const fieldRow = (d, label) => `<tr>
    <td style="padding:7px 8px;font-size:12px;font-weight:600;border-bottom:1px solid var(--border);white-space:nowrap">${label}</td>
    <td ${td}>${d.goals}</td><td ${td}>${d.shots - d.goals}</td><td ${td}>${d.pctShots}</td>
    <td ${td}>${d.fmtRatio(d.g7m, d.g7m+d.f7m)}</td><td ${td}>${d.fmtRatio(d.g6m, d.g6m+d.f6m)}</td>
    <td ${td}>${d.fmtRatio(d.gPen, d.gPen+d.fPen)}</td><td ${td}>${d.fmtRatio(d.gPnt, d.gPnt+d.fPnt)}</td>
    <td ${td}>${d.fmtRatio(d.g9m, d.g9m+d.f9m)}</td><td ${td}>${d.fmtRatio(d.gCA, d.gCA+d.fCA)}</td>
  </tr>`;

  const gkRow = (d, label) => `<tr>
    <td style="padding:7px 8px;font-size:12px;font-weight:600;border-bottom:1px solid var(--border);white-space:nowrap">${label}</td>
    <td ${td}>${d.gkSaves}</td><td ${td}>${d.gkSaves+d.gkConceded}</td><td ${td}>${d.pctDef}</td>
    <td ${td}>${d.fmtRatio(d.gkS7m,d.gkS7m+d.gkC7m)}</td><td ${td}>${d.fmtRatio(d.gkS6m,d.gkS6m+d.gkC6m)}</td>
    <td ${td}>${d.fmtRatio(d.gkSPen,d.gkSPen+d.gkCPen)}</td><td ${td}>${d.fmtRatio(d.gkSPnt,d.gkSPnt+d.gkCPnt)}</td>
    <td ${td}>${d.fmtRatio(d.gkS9m,d.gkS9m+d.gkC9m)}</td><td ${td}>${d.fmtRatio(d.gkSCA,d.gkSCA+d.gkCCA)}</td>
  </tr>`;

  const tableWrap = (content) => `<div style="overflow-x:auto;margin-bottom:20px"><table style="width:100%;border-collapse:collapse;background:var(--surface);border-radius:6px;overflow:hidden">${content}</table></div>`;

  const fieldHead = `<thead><tr>
    <th ${th} style="text-align:left;padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3)"></th>
    <th ${th}>G</th><th ${th}>Falhas</th><th ${th}>%R</th>
    <th ${th}>7m</th><th ${th}>6m</th><th ${th}>Pen</th><th ${th}>Ponta</th><th ${th}>9m</th><th ${th}>CA</th>
  </tr></thead>`;

  const gkHead = `<thead><tr>
    <th ${th} style="text-align:left;padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3)"></th>
    <th ${th}>Def</th><th ${th}>Rem</th><th ${th}>%D</th>
    <th ${th}>7m</th><th ${th}>6m</th><th ${th}>Pen</th><th ${th}>Ponta</th><th ${th}>9m</th><th ${th}>CA</th>
  </tr></thead>`;

  document.getElementById('md-tab-jogo').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <span style="font-family:var(--font-cond);font-size:14px;font-weight:700;color:var(--accent)">● ${myShort}</span>
      <span style="font-family:var(--font-cond);font-size:14px;font-weight:700;color:var(--text)">${oppName} ●</span>
    </div>
    ${bar(t.shots, 0, 'Remates')}
    ${bar(t.goals, oppGoals, 'Golos')}
    ${bar(t.g7m, 0, 'Golos 7m')}
    ${bar(t.gCA, 0, 'Golos Contra-Ataque')}
    <div style="display:flex;gap:12px;justify-content:center;margin:20px 0">
      ${circle(t.pctDef,   'Percentagem Defesas', 'var(--success)')}
      ${circle(t.pctShots, 'Percentagem Remates', 'var(--accent)')}
    </div>
    <div style="font-family:var(--font-cond);font-size:14px;font-weight:700;text-transform:uppercase;margin-bottom:10px;color:var(--text2)">Jogadores de Campo</div>
    ${tableWrap(fieldHead + '<tbody>' + fieldRow(p1, '1ª Parte') + fieldRow(p2, '2ª Parte') + `<tr ${tr}><td style="padding:7px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--border)">Total</td>
      <td ${tb}>${t.goals}</td><td ${td}>${t.shots-t.goals}</td><td ${td}>${t.pctShots}</td>
      <td ${td}>${t.fmtRatio(t.g7m,t.g7m+t.f7m)}</td><td ${td}>${t.fmtRatio(t.g6m,t.g6m+t.f6m)}</td>
      <td ${td}>${t.fmtRatio(t.gPen,t.gPen+t.fPen)}</td><td ${td}>${t.fmtRatio(t.gPnt,t.gPnt+t.fPnt)}</td>
      <td ${td}>${t.fmtRatio(t.g9m,t.g9m+t.f9m)}</td><td ${td}>${t.fmtRatio(t.gCA,t.gCA+t.fCA)}</td>
    </tr></tbody>`)}
    <div style="font-family:var(--font-cond);font-size:14px;font-weight:700;text-transform:uppercase;margin-bottom:10px;color:var(--text2)">Guarda-Redes</div>
    ${tableWrap(gkHead + '<tbody>' + gkRow(p1, '1ª Parte') + gkRow(p2, '2ª Parte') + `<tr ${tr}><td style="padding:7px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--border)">Total</td>
      <td ${tb}>${t.gkSaves}</td><td ${td}>${t.gkSaves+t.gkConceded}</td><td ${td}>${t.pctDef}</td>
      <td ${td}>${t.fmtRatio(t.gkS7m,t.gkS7m+t.gkC7m)}</td><td ${td}>${t.fmtRatio(t.gkS6m,t.gkS6m+t.gkC6m)}</td>
      <td ${td}>${t.fmtRatio(t.gkSPen,t.gkSPen+t.gkCPen)}</td><td ${td}>${t.fmtRatio(t.gkSPnt,t.gkSPnt+t.gkCPnt)}</td>
      <td ${td}>${t.fmtRatio(t.gkS9m,t.gkS9m+t.gkC9m)}</td><td ${td}>${t.fmtRatio(t.gkSCA,t.gkSCA+t.gkCCA)}</td>
    </tr></tbody>`)}`;
}

// ── TAB: RESULTADO ─────────────────────────

function renderResultado() {
  const events = (MS.match.stats.events || []).slice().reverse();
  if (!events.length) {
    document.getElementById('md-tab-resultado').innerHTML = emptyState('📋', 'Sem eventos registados.');
    return;
  }
  const fmtTime = (secs, period) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${period}ª ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };
  const actionMap = getAllActions().reduce((acc, a) => { acc[a.key] = a.label; return acc; }, {});
  document.getElementById('md-tab-resultado').innerHTML = events.map(e => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px">
      <div style="font-size:10px;color:var(--text3);white-space:nowrap;min-width:60px">${fmtTime(e.t, e.period)}</div>
      <div style="width:26px;height:26px;border-radius:4px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0">${e.shirt || '—'}</div>
      <div style="flex:1">
        <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(e.playerName)}</div>
        <div style="font-size:11px;color:var(--text2)">${actionMap[e.action] || e.action}</div>
      </div>
    </div>`).join('');
}