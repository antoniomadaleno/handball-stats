// ═══════════════════════════════════════════
// matches.js — gestão de jogos
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast, closeModal, fmtDatetime, emptyState } from './utils.js';

// ── Estado ─────────────────────────────────
let _match = null;
let _players = [];       // jogadores convocados (objetos completos)
let _oppPlayers = [];    // jogadores do adversário
let _timerInterval = null;
let _timerRunning = false;
let _activeTab = 'entrada';
let _selectedPlayerId = null;
let _pendingAction = null; // { playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId }

// ── Ações disponíveis ──────────────────────
const ACTIONS_FIELD = [
  { key: 'golo_9m',   label: 'Golo de 9m',          goal: true  },
  { key: 'golo_7m',   label: 'Golo de 7m',           goal: true  },
  { key: 'golo_6m',   label: 'Golo de 6m',           goal: true  },
  { key: 'golo_ponta',label: 'Golo de Ponta',        goal: true  },
  { key: 'golo_ca',   label: 'Golo de Contra-Ataque',goal: true  },
  { key: 'golo_pen',  label: 'Golo de Penetração',   goal: true  },
  { key: 'falha_9m',  label: 'Falha de 9m',          goal: false },
  { key: 'falha_7m',  label: 'Falha de 7m',          goal: false },
  { key: 'falha_6m',  label: 'Falha de 6m',          goal: false },
  { key: 'falha_ponta',label:'Falha de Ponta',       goal: false },
  { key: 'falha_ca',  label: 'Falha de Contra-Ataque',goal: false},
  { key: 'falha_pen', label: 'Falha de Penetração',  goal: false },
  { key: 'bola_perdida',   label: 'Bola perdida',    goal: false },
  { key: 'recuperacao',    label: 'Recuperação bola',goal: false },
  { key: 'assistencia',    label: 'Assistência',     goal: false },
];

const ACTIONS_GK = [
  { key: 'defesa_9m',  label: 'Defesa de 9m',           save: true  },
  { key: 'defesa_7m',  label: 'Defesa de 7m',           save: true  },
  { key: 'defesa_6m',  label: 'Defesa de 6m',           save: true  },
  { key: 'defesa_ponta',label:'Defesa de Ponta',        save: true  },
  { key: 'defesa_ca',  label: 'Defesa de Contra-Ataque',save: true  },
  { key: 'defesa_pen', label: 'Defesa de Penetração',   save: true  },
  { key: 'sofreu_9m',  label: 'Golo sofrido de 9m',     conc: true  },
  { key: 'sofreu_7m',  label: 'Golo sofrido de 7m',     conc: true  },
  { key: 'sofreu_6m',  label: 'Golo sofrido de 6m',     conc: true  },
  { key: 'sofreu_ponta',label:'Golo sofrido de Ponta',  conc: true  },
  { key: 'sofreu_ca',  label: 'Golo sofrido de Contra-Ataque', conc: true },
  { key: 'sofreu_pen', label: 'Golo sofrido de Penetração',    conc: true },
  { key: 'bola_perdida',   label: 'Bola perdida',       conc: false },
  { key: 'recuperacao',    label: 'Recuperação bola',   conc: false },
];

// ── Lista de jogos ─────────────────────────

export function renderMatches() {
  Promise.all([DB.matches.bySeason(S.season.id), DB.opponents.bySeason(S.season.id)]).then(([matches, opps]) => {
    const oppMap = Object.fromEntries(opps.map(o => [o.id, o]));
    document.getElementById('matches-count').textContent = matches.length + ' jogo(s)';
    const el = document.getElementById('matches-list');
    if (!matches.length) { el.innerHTML = emptyState('🏐', 'Sem jogos criados.'); return; }

    const info    = S.season.info || {};
    const myShort = info.teamShort || 'NÓS';
    matches.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    el.innerHTML = matches.map(m => {
      const opp  = oppMap[m.opponent_id] || { short_name: '?' };
      const home = m.home === 'home' ? myShort : opp.short_name;
      const away = m.home === 'home' ? opp.short_name : myShort;
      const date = m.datetime ? fmtDatetime(new Date(m.datetime)) : 'Data não definida';
      const s = m.stats;
      const scoreTxt = s ? ` · ${s.scoreOur}–${s.scoreOpp}` : '';
      const statusBadge = {
        'por_começar': '<span class="badge b-scout">Por começar</span>',
        'a_decorrer':  '<span class="badge b-active">A decorrer</span>',
        'finalizado':  '<span class="badge b-ended">Finalizado</span>',
      }[m.status || 'por_começar'] || '';
      return `<div class="match-card">
        <div style="font-size:18px">🏐</div>
        <div style="flex:1">
          <div class="match-vs">${home} <span style="color:var(--text3)">vs</span> ${away} ${statusBadge}${scoreTxt}</div>
          <div class="match-meta">${date} · ${m.competition || '—'} · ${m.venue || '—'}</div>
        </div>
        <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditMatch(${m.id})">Editar</button>
          <button class="btn btn-primary btn-sm" onclick="app.openMatchDetail(${m.id})">Abrir</button>
          <button class="btn btn-danger btn-sm" onclick="app.deleteMatch(${m.id})">Apagar</button>
        </div>
      </div>`;
    }).join('');
  });
}

export function openAddMatch() {
  DB.opponents.bySeason(S.season.id).then(opps => {
    if (!opps.length) { toast('Adiciona adversários primeiro', 'error'); if(window.app) window.app.showSec('opponents'); return; }
    document.getElementById('mm-opponent').innerHTML = opps.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('');
    document.getElementById('modal-match-title').textContent = 'Criar jogo';
    document.getElementById('mm-id').value = '';
    document.getElementById('mm-type').value = 'proprio';
    document.getElementById('mm-home').value = 'home';
    document.getElementById('mm-competition').value = '';
    document.getElementById('mm-datetime').value = '';
    document.getElementById('mm-venue').value = '';
    document.getElementById('modal-match').classList.add('open');
  });
}

export function openEditMatch(id) {
  Promise.all([DB.matches.bySeason(S.season.id), DB.opponents.bySeason(S.season.id)]).then(([matches, opps]) => {
    const m = matches.find(x => x.id === id);
    document.getElementById('mm-opponent').innerHTML = opps.map(o => `<option value="${o.id}"${o.id === m.opponent_id ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    document.getElementById('modal-match-title').textContent = 'Editar jogo';
    document.getElementById('mm-id').value          = m.id;
    document.getElementById('mm-type').value        = m.type        || 'proprio';
    document.getElementById('mm-home').value        = m.home        || 'home';
    document.getElementById('mm-competition').value = m.competition || '';
    document.getElementById('mm-datetime').value    = m.datetime    || '';
    document.getElementById('mm-venue').value       = m.venue       || '';
    document.getElementById('modal-match').classList.add('open');
  });
}

export function saveMatch() {
  const id   = document.getElementById('mm-id').value;
  const data = {
    season_id:   S.season.id,
    type:        document.getElementById('mm-type').value,
    opponent_id: parseInt(document.getElementById('mm-opponent').value),
    home:        document.getElementById('mm-home').value,
    competition: document.getElementById('mm-competition').value.trim(),
    datetime:    document.getElementById('mm-datetime').value,
    venue:       document.getElementById('mm-venue').value.trim(),
    status:      'por_começar',
  };
  if (!data.opponent_id) return toast('Seleciona um adversário', 'error');
  const op = id
    ? DB.matches.bySeason(S.season.id).then(ms => { const m = ms.find(x => x.id === parseInt(id)); Object.assign(m, data); return DB.matches.put(m); })
    : DB.matches.add(data);
  op.then(() => { closeModal('modal-match'); renderMatches(); toast('Jogo guardado', 'success'); });
}

export function deleteMatch(id) {
  if (!confirm('Apagar este jogo?')) return;
  DB.matches.del(id).then(() => { renderMatches(); toast('Jogo apagado'); });
}

// ── Abrir detalhe ──────────────────────────

export function openMatchDetail(id) {
  Promise.all([
    DB.matches.bySeason(S.season.id),
    DB.opponents.bySeason(S.season.id),
    DB.players.bySeason(S.season.id),
  ]).then(([matches, opps, players]) => {
    const m   = matches.find(x => x.id === id);
    const opp = opps.find(x => x.id === m.opponent_id) || { name: '?', short_name: '?' };
    _match = m;
    _oppPlayers = Array.isArray(opp.players) ? opp.players : [];

    const info    = S.season.info || {};
    const myShort = info.teamShort || 'NÓS';
    const myName  = info.teamName  || 'Nós';

    if (!m.stats) m.stats = {
      scoreOur: 0, scoreOpp: 0,
      period: 1, timerSecs: 0,
      squad: null, players: {}, events: []
    };
    if (!m.stats.events)  m.stats.events  = [];
    if (!m.stats.players) m.stats.players = {};

    // Header
    document.getElementById('md-our-short').textContent  = myShort;
    document.getElementById('md-opp-short').textContent  = opp.short_name;
    document.getElementById('md-score-our').textContent  = m.stats.scoreOur;
    document.getElementById('md-score-opp').textContent  = m.stats.scoreOpp;
    document.getElementById('md-status').value           = m.status || 'por_começar';
    updateTimerDisplay();
    updateTimerButtons();

    // Squad
    const hasSquad = m.stats.squad && m.stats.squad.length > 0;
    if (hasSquad) {
      _players = players.filter(p => m.stats.squad.includes(p.id));
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
    } else {
      _players = [];
      document.getElementById('md-squad-section').style.display = '';
      document.getElementById('md-tabs-section').style.display  = 'none';
      renderSquadPicker(players);
    }

    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-match-detail').classList.add('active');
    document.getElementById('nav-matches').classList.add('active');
  });
}

export function closeMatchDetail() {
  timerStop();
  _match = null;
  _players = [];
  _oppPlayers = [];
  _selectedPlayerId = null;
  if(window.app) window.app.showSec('matches');
}

export function saveMatchStatus() {
  if (!_match) return;
  _match.status = document.getElementById('md-status').value;
  DB.matches.put(_match);
}

// ── Convocados ─────────────────────────────

function renderSquadPicker(players) {
  const el = document.getElementById('md-squad-list');
  if (!players.length) { el.innerHTML = emptyState('👤', 'Sem jogadores no plantel.'); return; }
  players.sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
  el.innerHTML = players.map(p => `
    <label style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:var(--surface2);border:1px solid var(--border)">
      <input type="checkbox" data-pid="${p.id}" style="width:16px;height:16px;accent-color:var(--accent)" />
      <span class="player-shirt" style="width:30px;height:30px;font-size:13px">${p.shirt || '—'}</span>
      <span style="font-family:var(--font-cond);font-size:14px;font-weight:600;flex:1">${esc(p.name)}</span>
      <span class="pos pos-${p.position}">${p.position}</span>
    </label>`).join('');
}

export function confirmSquad() {
  const checked = [...document.querySelectorAll('#md-squad-list input[type=checkbox]:checked')];
  if (!checked.length) return toast('Seleciona pelo menos um jogador', 'error');
  _match.stats.squad = checked.map(c => parseInt(c.dataset.pid));
  DB.players.bySeason(S.season.id).then(players => {
    _players = players.filter(p => _match.stats.squad.includes(p.id));
    DB.matches.put(_match).then(() => {
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
      toast('Convocados confirmados', 'success');
    });
  });
}

// ── Tabs ───────────────────────────────────

export function switchTab(tab) {
  _activeTab = tab;
  _selectedPlayerId = null;
  document.querySelectorAll('.md-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  document.querySelectorAll('.md-tab-content').forEach(c => {
    c.style.display = c.dataset.tab === tab ? '' : 'none';
  });
  if (tab === 'entrada')   renderEntrada();
  if (tab === 'jogadores') renderJogadores();
  if (tab === 'jogo')      renderJogo();
  if (tab === 'resultado') renderResultado();
  if (tab === 'mapas')     { _hmFilter = 'all'; _hmGkFilter = 'all'; renderJogoHeatmaps(); }
}

// ── TAB: ENTRADA ───────────────────────────

function renderEntrada() {
  const players = _players.slice().sort((a,b) => (a.shirt||99)-(b.shirt||99));
  const gks     = players.filter(p => p.position === 'GR');
  const fields  = players.filter(p => p.position !== 'GR');

  // Lista de jogadores
  const playerList = [...gks, ...fields].map(p => `
    <div class="md-player-item ${_selectedPlayerId === p.id ? 'selected' : ''}"
         onclick="app.selectPlayer(${p.id})"
         style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:3px;background:${_selectedPlayerId === p.id ? 'var(--accent)' : 'var(--surface2)'};border:1px solid ${_selectedPlayerId === p.id ? 'var(--accent)' : 'var(--border)'};transition:all 0.1s">
      <div style="width:28px;height:28px;border-radius:5px;background:${_selectedPlayerId === p.id ? 'rgba(0,0,0,0.2)' : 'var(--surface)'};display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:13px;font-weight:700;color:${_selectedPlayerId === p.id ? '#0d0f14' : 'var(--accent)'}">${p.shirt || '—'}</div>
      <span style="font-family:var(--font-cond);font-size:13px;font-weight:600;flex:1;color:${_selectedPlayerId === p.id ? '#0d0f14' : 'var(--text)'}">${esc(p.name)}</span>
      ${p.position === 'GR' ? `<span style="font-size:9px;font-weight:700;color:${_selectedPlayerId === p.id ? '#0d0f14' : 'var(--blue)'}">GR</span>` : ''}
    </div>`).join('');

  // Ações
  const sel = _players.find(p => p.id === _selectedPlayerId);
  const isGK = sel && sel.position === 'GR';
  const actions = sel ? (isGK ? ACTIONS_GK : ACTIONS_FIELD) : [];
  const actionsHtml = !sel
    ? `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px;padding:20px;text-align:center">← Seleciona um jogador</div>`
    : actions.map(a => {
        const isGoal = a.goal || a.save;
        const color  = a.goal ? 'var(--accent)' : a.save ? 'var(--success)' : a.conc ? 'var(--danger)' : 'var(--text2)';
        return `<button onclick="app.registerAction(${_selectedPlayerId},'${a.key}')"
          style="display:block;width:100%;text-align:left;padding:10px 14px;margin-bottom:3px;border-radius:6px;border:1px solid var(--border);background:var(--surface2);font-family:'Barlow',sans-serif;font-size:13px;font-weight:${isGoal ? '600' : '400'};color:${color};cursor:pointer;transition:background 0.1s"
          onmouseover="this.style.background='var(--surface)'"
          onmouseout="this.style.background='var(--surface2)'">${a.label}</button>`;
      }).join('');

  document.getElementById('md-entrada-players').innerHTML = playerList;
  document.getElementById('md-entrada-actions').innerHTML = actionsHtml;
}

export function selectPlayer(id) {
  _selectedPlayerId = (_selectedPlayerId === id) ? null : id;
  renderEntrada();
}

export function registerAction(playerId, actionKey) {
  if (!_match) return;
  const p = _players.find(x => x.id === playerId);
  if (!p) return;
  const action = [...ACTIONS_FIELD, ...ACTIONS_GK].find(a => a.key === actionKey);
  const needsLocation = action && (action.goal || action.save || action.conc || actionKey.startsWith('falha_'));
  if (needsLocation) {
    _pendingAction = { playerId, actionKey, oppPlayerId: null };
    openLocationModal(actionKey, action);
    return;
  }
  commitAction(playerId, actionKey, null, null, null, null);
}

function openLocationModal(actionKey, action) {
  const isGoalOrSave = action && (action.goal || action.save || action.conc || (actionKey && actionKey.startsWith('falha_')));
  const needsOpp     = action && (action.save || action.conc); // defesas e golos sofridos
  document.getElementById('loc-field-dot').style.display = 'none';
  document.getElementById('loc-goal-dot').style.display  = 'none';
  document.getElementById('loc-action-label').textContent = action ? action.label : actionKey;
  const goalSection = document.getElementById('loc-goal-section');
  if (goalSection) goalSection.style.display = isGoalOrSave ? '' : 'none';
  // Seletor adversário
  const oppSection = document.getElementById('loc-opp-section');
  if (oppSection) {
    if (needsOpp && _oppPlayers.length) {
      oppSection.style.display = '';
      const sorted = _oppPlayers.slice().sort((a,b) => (a.shirt||99)-(b.shirt||99));
      document.getElementById('loc-opp-list').innerHTML = sorted.map(p =>
        `<button class="loc-opp-btn" data-pid="${p._id}"
          onclick="app.locSelectOppPlayer('${p._id}')"
          style="padding:5px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-family:var(--font-cond);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <span style="color:var(--accent)">${p.shirt||'?'}</span> ${esc(p.name.split(' ')[0])}
        </button>`
      ).join('');
    } else {
      oppSection.style.display = 'none';
    }
  }
  _pendingAction.fieldX = null; _pendingAction.fieldY = null;
  _pendingAction.goalX  = null; _pendingAction.goalY  = null;
  _pendingAction.oppPlayerId = null;
  document.getElementById('modal-location').classList.add('open');
}

export function locFieldClick(e) {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * 100);
  const y = Math.round((e.clientY - rect.top)  / rect.height * 100);
  _pendingAction.fieldX = x; _pendingAction.fieldY = y;
  const dot = document.getElementById('loc-field-dot');
  dot.style.display = '';
  dot.style.left = x + '%'; dot.style.top = y + '%';
}

export function locGoalClick(e) {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * 100);
  const y = Math.round((e.clientY - rect.top)  / rect.height * 100);
  _pendingAction.goalX = x; _pendingAction.goalY = y;
  const dot = document.getElementById('loc-goal-dot');
  dot.style.display = '';
  dot.style.left = x + '%'; dot.style.top = y + '%';
}

export function locNextStep() {
  // Kept for compatibility — single-screen layout no longer needs step navigation
  locConfirm();
}

export function locConfirm() {
  if (!_pendingAction) return;
  document.getElementById('modal-location').classList.remove('open');
  const { playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId } = _pendingAction;
  _pendingAction = null;
  commitAction(playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId);
}

export function locSkip() {
  if (!_pendingAction) return;
  document.getElementById('modal-location').classList.remove('open');
  const { playerId, actionKey } = _pendingAction;
  _pendingAction = null;
  commitAction(playerId, actionKey, null, null, null, null, null);
}

function commitAction(playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId) {
  if (!_match) return;
  const p = _players.find(x => x.id === playerId);
  if (!p) return;

  if (!_match.stats.players[playerId]) {
    _match.stats.players[playerId] = { goals: 0, shots: 0, saves: 0, conceded: 0, actions: {} };
  }
  const ps = _match.stats.players[playerId];
  if (!ps.actions) ps.actions = {};
  ps.actions[actionKey] = (ps.actions[actionKey] || 0) + 1;

  const action = [...ACTIONS_FIELD, ...ACTIONS_GK].find(a => a.key === actionKey);
  if (action) {
    if (action.goal)  { ps.goals++; ps.shots++; _match.stats.scoreOur++; }
    if (action.save)  { ps.saves++; }
    if (action.conc)  { ps.conceded++; _match.stats.scoreOpp++; }
    if (actionKey.startsWith('falha_')) ps.shots++;
  }

  _match.stats.events.push({
    t: _match.stats.timerSecs,
    period: _match.stats.period,
    playerId, action: actionKey,
    playerName: p.name, shirt: p.shirt,
    fieldX, fieldY, goalX, goalY,
    oppPlayerId: oppPlayerId || null,
  });

  DB.matches.put(_match).then(() => {
    updateScoreboard();
    renderEntrada();
    toast(action ? action.label : actionKey, action && (action.goal || action.save) ? 'success' : '');
  });
}

// ── TAB: JOGADORES ─────────────────────────

function renderJogadores() {
  const stats = _match.stats.players || {};
  const gks    = _players.filter(p => p.position === 'GR');
  const fields = _players.filter(p => p.position !== 'GR').sort((a,b) => (a.shirt||99)-(b.shirt||99));

  const pct = (a, b) => b > 0 ? Math.round(a/b*100) + '%' : '—';

  const headerRow = `<div style="display:grid;grid-template-columns:30px 1fr 40px 40px 60px 40px 40px 40px 40px 40px;gap:4px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px">
    <div></div><div>Jogador</div><div style="text-align:center">G</div><div style="text-align:center">R</div><div style="text-align:center">%R</div>
    <div style="text-align:center">7m</div><div style="text-align:center">Pen</div><div style="text-align:center">Ponta</div><div style="text-align:center">CA</div><div style="text-align:center">9m</div>
  </div>`;

  const playerRow = (p) => {
    const ps = stats[p.id] || {};
    const ac = ps.actions || {};
    const goals = ps.goals || 0;
    const goloKeys = Object.keys(ac).filter(k => k.startsWith('golo_'));
    const falhaKeys = Object.keys(ac).filter(k => k.startsWith('falha_'));
    const shots = goloKeys.reduce((s,k) => s+(ac[k]||0), 0) + falhaKeys.reduce((s,k) => s+(ac[k]||0), 0);
    const g7m   = ac.golo_7m   || 0; const f7m  = ac.falha_7m   || 0;
    const gpen  = ac.golo_pen  || 0; const fpen = ac.falha_pen  || 0;
    const gpnt  = ac.golo_ponta|| 0; const fpnt = ac.falha_ponta|| 0;
    const gca   = ac.golo_ca   || 0; const fca  = ac.falha_ca   || 0;
    const g9m   = ac.golo_9m   || 0; const f9m  = ac.falha_9m   || 0;
    return `<div style="display:grid;grid-template-columns:30px 1fr 40px 40px 60px 40px 40px 40px 40px 40px;gap:4px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;align-items:center;font-size:12px">
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;color:var(--accent)">${p.shirt||'—'}</div>
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(p.name)}</div>
      <div style="text-align:center;font-weight:700;color:var(--accent)">${goals}</div>
      <div style="text-align:center">${shots}</div>
      <div style="text-align:center;color:var(--text2)">${pct(goals,shots)}</div>
      <div style="text-align:center;color:var(--text2)">${g7m+f7m > 0 ? g7m+'/'+(g7m+f7m) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gpen+fpen > 0 ? gpen+'/'+(gpen+fpen) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gpnt+fpnt > 0 ? gpnt+'/'+(gpnt+fpnt) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${gca+fca > 0 ? gca+'/'+(gca+fca) : '—'}</div>
      <div style="text-align:center;color:var(--text2)">${g9m+f9m > 0 ? g9m+'/'+(g9m+f9m) : '—'}</div>
    </div>`;
  };

  const gkHeader = `<div style="display:grid;grid-template-columns:30px 1fr 50px 50px 60px;gap:4px;padding:6px 10px;font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;border-bottom:1px solid var(--border);margin-bottom:4px">
    <div></div><div>GR</div><div style="text-align:center">Defesas</div><div style="text-align:center">Sofridos</div><div style="text-align:center">%Def</div>
  </div>`;

  const gkRow = (p) => {
    const ps = stats[p.id] || {};
    const saves   = ps.saves    || 0;
    const conceded= ps.conceded || 0;
    const total   = saves + conceded;
    return `<div style="display:grid;grid-template-columns:30px 1fr 50px 50px 60px;gap:4px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px;align-items:center;font-size:12px">
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:700;color:var(--accent)">${p.shirt||'—'}</div>
      <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(p.name)}</div>
      <div style="text-align:center;font-weight:700;color:var(--success)">${saves}</div>
      <div style="text-align:center;font-weight:700;color:var(--danger)">${conceded}</div>
      <div style="text-align:center;color:var(--text2)">${pct(saves,total)}</div>
    </div>`;
  };

  let html = '';
  if (gks.length) html += `<div style="margin-bottom:16px">${gkHeader}${gks.map(gkRow).join('')}</div>`;
  if (fields.length) html += `<div>${headerRow}${fields.map(playerRow).join('')}</div>`;
  if (!html) html = emptyState('👤', 'Sem dados ainda.');

  document.getElementById('md-tab-jogadores').innerHTML = html;
}

// ── TAB: JOGO ──────────────────────────────

function calcJogoStats(periodFilter) {
  // periodFilter: null = total, 1 = 1ª parte, 2 = 2ª parte
  const stats  = _match.stats.players || {};
  const events = _match.stats.events  || [];

  // Para filtrar por parte, recalcula a partir dos eventos
  const getAc = (playerId) => {
    if (periodFilter === null) {
      return (stats[playerId] || {}).actions || {};
    }
    // Recalcula apenas eventos da parte filtrada
    const ac = {};
    events.filter(e => e.playerId === playerId && e.period === periodFilter).forEach(e => {
      ac[e.action] = (ac[e.action] || 0) + 1;
    });
    return ac;
  };

  let shots=0, goals=0, g7m=0, f7m=0, g6m=0, f6m=0, gPen=0, fPen=0, gPnt=0, fPnt=0, gCA=0, fCA=0, g9m=0, f9m=0;
  let gkSaves=0, gkConceded=0, gkS7m=0, gkC7m=0, gkS6m=0, gkC6m=0, gkSPen=0, gkCPen=0, gkSPnt=0, gkCPnt=0, gkSCA=0, gkCCA=0, gkS9m=0, gkC9m=0;

  _players.forEach(p => {
    const ac = getAc(p.id);
    if (p.position !== 'GR') {
      g7m  += ac.golo_7m    ||0; f7m  += ac.falha_7m    ||0;
      g6m  += ac.golo_6m    ||0; f6m  += ac.falha_6m    ||0;
      gPen += ac.golo_pen   ||0; fPen += ac.falha_pen   ||0;
      gPnt += ac.golo_ponta ||0; fPnt += ac.falha_ponta ||0;
      gCA  += ac.golo_ca    ||0; fCA  += ac.falha_ca    ||0;
      g9m  += ac.golo_9m    ||0; f9m  += ac.falha_9m    ||0;
      Object.keys(ac).filter(k=>k.startsWith('golo_')).forEach(k=>{goals+=ac[k];shots+=ac[k];});
      Object.keys(ac).filter(k=>k.startsWith('falha_')).forEach(k=>{shots+=ac[k];});
    } else {
      gkS7m  += ac.defesa_7m    ||0; gkC7m  += ac.sofreu_7m    ||0;
      gkS6m  += ac.defesa_6m    ||0; gkC6m  += ac.sofreu_6m    ||0;
      gkSPen += ac.defesa_pen   ||0; gkCPen += ac.sofreu_pen   ||0;
      gkSPnt += ac.defesa_ponta ||0; gkCPnt += ac.sofreu_ponta ||0;
      gkSCA  += ac.defesa_ca    ||0; gkCCA  += ac.sofreu_ca    ||0;
      gkS9m  += ac.defesa_9m    ||0; gkC9m  += ac.sofreu_9m    ||0;
      gkSaves    += Object.keys(ac).filter(k=>k.startsWith('defesa_')).reduce((s,k)=>s+(ac[k]||0),0);
      gkConceded += Object.keys(ac).filter(k=>k.startsWith('sofreu_')).reduce((s,k)=>s+(ac[k]||0),0);
    }
  });

  const fmtRatio = (g, t) => t > 0 ? `${g}/${t}` : '—';
  const pct = (g, t) => t > 0 ? Math.round(g/t*100)+'%' : '—';

  return {
    shots, goals, g7m,f7m, g6m,f6m, gPen,fPen, gPnt,fPnt, gCA,fCA, g9m,f9m,
    gkSaves, gkConceded, gkS7m,gkC7m, gkS6m,gkC6m, gkSPen,gkCPen, gkSPnt,gkCPnt, gkSCA,gkCCA, gkS9m,gkC9m,
    fmtRatio, pct,
    pctShots: pct(goals, shots),
    pctDef:   pct(gkSaves, gkSaves+gkConceded),
  };
}

function renderJogo() {
  const info    = S.season.info || {};
  const myShort = info.teamShort || 'NÓS';
  const oppName = document.getElementById('md-opp-short').textContent;
  const oppGoals = _match.stats.scoreOpp;

  const t  = calcJogoStats(null);
  const p1 = calcJogoStats(1);
  const p2 = calcJogoStats(2);

  const bar = (ourVal, oppVal, label) => {
    const total = ourVal + oppVal || 1;
    const ourW  = Math.round(ourVal/total*100);
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
    const r = 36; const circ = 2*Math.PI*r;
    const dash = circ * num / 100;
    return `<div style="text-align:center;flex:1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="10"/>
        <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10"
          stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ/4}" stroke-linecap="round"
          transform="rotate(-90 50 50)"/>
        <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
          style="font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;fill:${color}">${pct}</text>
      </svg>
      <div style="font-size:11px;color:var(--text2);margin-top:4px">${label}</div>
    </div>`;
  };

  const thStyle = `style="padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;text-align:center;background:var(--surface);border-bottom:1px solid var(--border)"`;
  const tdStyle = `style="padding:7px 8px;font-size:12px;text-align:center;border-bottom:1px solid var(--border)"`;
  const tdBold  = `style="padding:7px 8px;font-size:12px;text-align:center;border-bottom:1px solid var(--border);font-weight:700"`;
  const trTotal = `style="background:var(--surface2)"`;

  const fieldTable = (d, label) => `
    <tr>
      <td style="padding:7px 8px;font-size:12px;font-weight:600;border-bottom:1px solid var(--border);white-space:nowrap">${label}</td>
      <td ${tdStyle}>${d.goals}</td>
      <td ${tdStyle}>${d.shots - d.goals}</td>
      <td ${tdStyle}>${d.pctShots}</td>
      <td ${tdStyle}>${d.fmtRatio(d.g7m, d.g7m+d.f7m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.g6m, d.g6m+d.f6m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gPen, d.gPen+d.fPen)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gPnt, d.gPnt+d.fPnt)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.g9m, d.g9m+d.f9m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gCA, d.gCA+d.fCA)}</td>
    </tr>`;

  const gkTable = (d, label) => `
    <tr>
      <td style="padding:7px 8px;font-size:12px;font-weight:600;border-bottom:1px solid var(--border);white-space:nowrap">${label}</td>
      <td ${tdStyle}>${d.gkSaves}</td>
      <td ${tdStyle}>${d.gkSaves+d.gkConceded}</td>
      <td ${tdStyle}>${d.pctDef}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkS7m, d.gkS7m+d.gkC7m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkS6m, d.gkS6m+d.gkC6m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkSPen, d.gkSPen+d.gkCPen)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkSPnt, d.gkSPnt+d.gkCPnt)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkS9m, d.gkS9m+d.gkC9m)}</td>
      <td ${tdStyle}>${d.fmtRatio(d.gkSCA, d.gkSCA+d.gkCCA)}</td>
    </tr>`;

  const tableWrap = (content) => `<div style="overflow-x:auto;margin-bottom:20px"><table style="width:100%;border-collapse:collapse;background:var(--surface);border-radius:6px;overflow:hidden">${content}</table></div>`;

  const fieldHead = `<thead><tr>
    <th ${thStyle} style="text-align:left;padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3)"></th>
    <th ${thStyle}>G</th><th ${thStyle}>Falhas</th><th ${thStyle}>%R</th>
    <th ${thStyle}>7m</th><th ${thStyle}>6m</th><th ${thStyle}>Pen</th>
    <th ${thStyle}>Ponta</th><th ${thStyle}>9m</th><th ${thStyle}>CA</th>
  </tr></thead>`;

  const gkHead = `<thead><tr>
    <th ${thStyle} style="text-align:left;padding:6px 8px;font-size:10px;font-weight:700;color:var(--text3)"></th>
    <th ${thStyle}>Def</th><th ${thStyle}>Rem</th><th ${thStyle}>%D</th>
    <th ${thStyle}>7m</th><th ${thStyle}>6m</th><th ${thStyle}>Pen</th>
    <th ${thStyle}>Ponta</th><th ${thStyle}>9m</th><th ${thStyle}>CA</th>
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
    ${tableWrap(fieldHead + '<tbody>' + fieldTable(p1,'1ª Parte') + fieldTable(p2,'2ª Parte') + `<tr ${trTotal}><td style="padding:7px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--border)">Total</td>
      <td ${tdBold}>${t.goals}</td><td ${tdStyle}>${t.shots-t.goals}</td><td ${tdStyle}>${t.pctShots}</td>
      <td ${tdStyle}>${t.fmtRatio(t.g7m,t.g7m+t.f7m)}</td><td ${tdStyle}>${t.fmtRatio(t.g6m,t.g6m+t.f6m)}</td>
      <td ${tdStyle}>${t.fmtRatio(t.gPen,t.gPen+t.fPen)}</td><td ${tdStyle}>${t.fmtRatio(t.gPnt,t.gPnt+t.fPnt)}</td>
      <td ${tdStyle}>${t.fmtRatio(t.g9m,t.g9m+t.f9m)}</td><td ${tdStyle}>${t.fmtRatio(t.gCA,t.gCA+t.fCA)}</td>
    </tr></tbody>`)}

    <div style="font-family:var(--font-cond);font-size:14px;font-weight:700;text-transform:uppercase;margin-bottom:10px;color:var(--text2)">Guarda-Redes</div>
    ${tableWrap(gkHead + '<tbody>' + gkTable(p1,'1ª Parte') + gkTable(p2,'2ª Parte') + `<tr ${trTotal}><td style="padding:7px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--border)">Total</td>
      <td ${tdBold}>${t.gkSaves}</td><td ${tdStyle}>${t.gkSaves+t.gkConceded}</td><td ${tdStyle}>${t.pctDef}</td>
      <td ${tdStyle}>${t.fmtRatio(t.gkS7m,t.gkS7m+t.gkC7m)}</td><td ${tdStyle}>${t.fmtRatio(t.gkS6m,t.gkS6m+t.gkC6m)}</td>
      <td ${tdStyle}>${t.fmtRatio(t.gkSPen,t.gkSPen+t.gkCPen)}</td><td ${tdStyle}>${t.fmtRatio(t.gkSPnt,t.gkSPnt+t.gkCPnt)}</td>
      <td ${tdStyle}>${t.fmtRatio(t.gkS9m,t.gkS9m+t.gkC9m)}</td><td ${tdStyle}>${t.fmtRatio(t.gkSCA,t.gkSCA+t.gkCCA)}</td>
    </tr></tbody>`)}`;
}

// ── TAB: RESULTADO ─────────────────────────

function renderResultado() {
  const events = (_match.stats.events || []).slice().reverse();
  if (!events.length) {
    document.getElementById('md-tab-resultado').innerHTML = emptyState('📋', 'Sem eventos registados.');
    return;
  }
  const fmtTime = (secs, period) => {
    const m = Math.floor(secs/60); const s = secs%60;
    return `${period}ª ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const action = [...ACTIONS_FIELD, ...ACTIONS_GK].reduce((acc, a) => { acc[a.key] = a.label; return acc; }, {});
  document.getElementById('md-tab-resultado').innerHTML = events.map(e => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:3px">
      <div style="font-size:10px;color:var(--text3);white-space:nowrap;min-width:60px">${fmtTime(e.t, e.period)}</div>
      <div style="width:26px;height:26px;border-radius:4px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0">${e.shirt||'—'}</div>
      <div style="flex:1">
        <div style="font-family:var(--font-cond);font-size:13px;font-weight:600">${esc(e.playerName)}</div>
        <div style="font-size:11px;color:var(--text2)">${action[e.action] || e.action}</div>
      </div>
    </div>`).join('');
}

// ── Placard + Timer ─────────────────────────

function updateScoreboard() {
  document.getElementById('md-score-our').textContent = _match.stats.scoreOur;
  document.getElementById('md-score-opp').textContent = _match.stats.scoreOpp;
}

function updateTimerDisplay() {
  const secs = _match.stats.timerSecs;
  const m = Math.floor(secs/60); const s = secs%60;
  document.getElementById('md-timer').textContent =
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('md-period-label').textContent =
    _match.stats.period === 1 ? '1ª PARTE' : '2ª PARTE';
}

function updateTimerButtons() {
  document.getElementById('md-btn-start').style.display = _timerRunning ? 'none' : '';
  document.getElementById('md-btn-pause').style.display = _timerRunning ? '' : 'none';
  document.getElementById('md-btn-half').style.display  = _timerRunning ? '' : 'none';
}

function timerStop() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  _timerRunning = false;
}

export function matchTimerStart() {
  if (_timerRunning) return;
  _timerRunning = true;
  updateTimerButtons();
  _match.status = 'a_decorrer';
  document.getElementById('md-status').value = 'a_decorrer';
  _timerInterval = setInterval(() => {
    if (_match.stats.timerSecs < 30*60) {
      _match.stats.timerSecs++;
      updateTimerDisplay();
      if (_match.stats.timerSecs % 30 === 0) DB.matches.put(_match);
    } else {
      timerStop(); updateTimerButtons();
      if (_match.stats.period === 1) toast('Fim da 1ª parte!', 'success');
      else { toast('Fim do jogo!', 'success'); _match.status = 'finalizado'; document.getElementById('md-status').value = 'finalizado'; }
      DB.matches.put(_match);
    }
  }, 1000);
}

export function matchTimerPause() {
  timerStop(); updateTimerButtons(); DB.matches.put(_match);
}

export function matchTimerHalf() {
  timerStop();
  _match.stats.period = 2;
  _match.stats.timerSecs = 0;
  updateTimerDisplay(); updateTimerButtons();
  DB.matches.put(_match);
  toast('Intervalo — 2ª parte pronta a iniciar', 'success');
}

export function adjustTimer() {
  if (!_match) return;
  document.getElementById('timer-min').value = Math.floor(_match.stats.timerSecs/60);
  document.getElementById('timer-sec').value = _match.stats.timerSecs % 60;
  document.getElementById('modal-timer').classList.add('open');
}

export function confirmAdjustTimer() {
  const min = Math.min(parseInt(document.getElementById('timer-min').value)||0, 30);
  const sec = Math.min(parseInt(document.getElementById('timer-sec').value)||0, 59);
  _match.stats.timerSecs = min*60+sec;
  updateTimerDisplay();
  DB.matches.put(_match);
  document.getElementById('modal-timer').classList.remove('open');
  toast('Tempo ajustado', 'success');
}

export function openMatchEvents(id) { openMatchDetail(id); }
// ── Mapa de calor ──────────────────────────

const GOAL_SVG = `<svg viewBox="0 0 500 200" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;border-radius:4px">
  <rect x="0" y="0" width="500" height="200" fill="#0a0a18"/>
  <rect x="90" y="20" width="320" height="140" fill="#111128"/>
  <line x1="197" y1="20" x2="197" y2="160" stroke="#222245" stroke-width="2"/>
  <line x1="303" y1="20" x2="303" y2="160" stroke="#222245" stroke-width="2"/>
  <line x1="90"  y1="67" x2="410" y2="67"  stroke="#222245" stroke-width="2"/>
  <line x1="90"  y1="113" x2="410" y2="113" stroke="#222245" stroke-width="2"/>
  <rect x="85" y="16" width="8" height="148" fill="#4a9a6a" rx="2"/>
  <rect x="407" y="16" width="8" height="148" fill="#4a9a6a" rx="2"/>
  <rect x="85" y="16" width="330" height="8" fill="#4a9a6a" rx="2"/>
</svg>`;

const FIELD_IMG = `<img src="pictures/handball_court.png" style="width:100%;height:100%;object-fit:contain;display:block;pointer-events:none;background:#000;border-radius:4px" />`;

function isGoalAction(action) {
  return action && (action.startsWith('golo_') || action.startsWith('sofreu_'));
}

export function renderHeatmap(containerId, events, type) {
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
    // Verde = golo marcado, Vermelho = falha/golo sofrido, Amarelo = defesa
    let color;
    if (e.action.startsWith('golo_'))   color = 'rgba(74,222,128,0.9)';   // verde
    else if (e.action.startsWith('sofreu_')) color = 'rgba(239,68,68,0.9)'; // vermelho
    else if (e.action.startsWith('defesa_')) color = 'rgba(74,222,128,0.9)'; // verde (defesa = bom)
    else color = 'rgba(239,68,68,0.9)'; // vermelho (falha)
    const label = e.shirt ? `<span style="font-size:8px;font-weight:700;color:white;line-height:1">${e.shirt}</span>` : '';
    return `<div style="position:absolute;width:18px;height:18px;border-radius:50%;background:${color};border:1.5px solid rgba(255,255,255,0.7);box-shadow:0 0 6px rgba(0,0,0,0.5);transform:translate(-50%,-50%);left:${x}%;top:${y}%;display:flex;align-items:center;justify-content:center;pointer-events:none">${label}</div>`;
  }).join('');
  el.innerHTML = `<div style="position:relative;width:100%;height:100%">${bg}<div style="position:absolute;inset:0">${dots}</div></div>`;
}

let _hmFilter = 'all';   // 'all' ou player id (jogadores de campo)
let _hmGkFilter = 'all'; // 'all' ou player id (guarda-redes)

export function hmSetFilter(val) {
  _hmFilter = val;
  renderJogoHeatmaps();
}

export function hmSetGkFilter(val) {
  _hmGkFilter = val;
  renderJogoHeatmaps();
}

export function renderJogoHeatmaps() {
  const allEvents = _match.stats.events || [];

  // Jogadores para o filtro
  const ourPlayers = _players.filter(p => p.position !== 'GR');
  const gks        = _players.filter(p => p.position === 'GR');

  // Render filtro
  const filterEl = document.getElementById('hm-filter');
  if (filterEl) {
    const opts = [{ id: 'all', label: 'Todos' }, ...ourPlayers.map(p => ({ id: p.id, label: `${p.shirt||'?'} ${p.name.split(' ')[0]}` }))];
    filterEl.innerHTML = opts.map(o =>
      `<button onclick="app.hmSetFilter('${o.id}')"
        style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${_hmFilter == o.id ? 'var(--accent)' : 'var(--surface2)'};color:${_hmFilter == o.id ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${esc(o.label)}</button>`
    ).join('');
  }
  const gkFilterEl = document.getElementById('hm-gk-filter');
  if (gkFilterEl) {
    const gkOpts = [{ id: 'all', label: 'Todos GR' }, ...gks.map(p => ({ id: p.id, label: `${p.shirt||'?'} ${p.name.split(' ')[0]}` }))];
    gkFilterEl.innerHTML = gkOpts.map(o =>
      `<button onclick="app.hmSetGkFilter('${o.id}')"
        style="padding:4px 10px;border-radius:5px;border:1px solid var(--border2);background:${_hmGkFilter == o.id ? 'var(--accent)' : 'var(--surface2)'};color:${_hmGkFilter == o.id ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap">${esc(o.label)}</button>`
    ).join('');
  }

  // Filtra eventos
  const filterFn    = e => _hmFilter    === 'all' || String(e.playerId) === String(_hmFilter);
  const filterGkFn  = e => _hmGkFilter  === 'all' || String(e.playerId) === String(_hmGkFilter);

  // Nossa equipa: golos + falhas (tudo exceto sofreu_ e defesa_)
  const ourShots  = allEvents.filter(e => filterFn(e) && e.fieldX != null && !e.action.startsWith('sofreu_') && !e.action.startsWith('defesa_'));
  const ourGoals  = allEvents.filter(e => filterFn(e) && e.goalX  != null && !e.action.startsWith('sofreu_') && !e.action.startsWith('defesa_'));
  // Adversário: remates sofridos e defesas, filtrado por GR
  const oppShots  = allEvents.filter(e => filterGkFn(e) && e.fieldX != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_')));
  const oppGoals  = allEvents.filter(e => filterGkFn(e) && e.goalX  != null && (e.action.startsWith('sofreu_') || e.action.startsWith('defesa_')));

  renderHeatmap('hm-field-our', ourShots, 'field');
  renderHeatmap('hm-goal-our',  ourGoals, 'goal');
  renderHeatmap('hm-field-opp', oppShots, 'field');
  renderHeatmap('hm-goal-opp',  oppGoals, 'goal');
}


export function locSelectOppPlayer(pid) {
  if (!_pendingAction) return;
  // Toggle selection
  _pendingAction.oppPlayerId = _pendingAction.oppPlayerId === pid ? null : pid;
  // Update UI
  document.querySelectorAll('.loc-opp-btn').forEach(b => {
    b.style.background = b.dataset.pid === String(pid) && _pendingAction.oppPlayerId === pid
      ? 'var(--accent)' : 'var(--surface2)';
    b.style.color = b.dataset.pid === String(pid) && _pendingAction.oppPlayerId === pid
      ? '#0d0f14' : 'var(--text)';
  });
}

export function locGetOppPlayers() {
  return _oppPlayers;
}


// Compat
export function addGoal(id)    { registerAction(id, 'golo_9m'); }
export function addSave(id)    { registerAction(id, 'defesa_9m'); }
export function addConceded(id){ registerAction(id, 'sofreu_9m'); }