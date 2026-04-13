// ═══════════════════════════════════════════
// matches.js — gestão de jogos
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast, closeModal, fmtDatetime, emptyState } from './utils.js';

// ── Estado do jogo em curso ────────────────
let _match = null;
let _timerInterval = null;
let _timerRunning = false;

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
      const scoreOur = m.stats ? m.stats.scoreOur : null;
      const scoreOpp = m.stats ? m.stats.scoreOpp : null;
      const scoreTxt = (scoreOur !== null && scoreOpp !== null) ? ` · ${scoreOur}–${scoreOpp}` : '';
      const statusBadge = {
        'por_começar': '<span class="badge b-scout">Por começar</span>',
        'a_decorrer':  '<span class="badge b-active">A decorrer</span>',
        'finalizado':  '<span class="badge b-ended">Finalizado</span>',
      }[m.status || 'por_começar'] || '';
      return `<div class="match-card">
        <div style="font-size:18px">🏐</div>
        <div style="flex:1">
          <div class="match-vs">${home} <span style="color:var(--text3)">vs</span> ${away}${m.type === 'scout' ? ' <span class="badge b-scout">Scout</span>' : ''} ${statusBadge}${scoreTxt}</div>
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

// ── Detalhe do jogo ────────────────────────

export function openMatchDetail(id) {
  Promise.all([
    DB.matches.bySeason(S.season.id),
    DB.opponents.bySeason(S.season.id),
    DB.players.bySeason(S.season.id),
  ]).then(([matches, opps, players]) => {
    const m   = matches.find(x => x.id === id);
    const opp = opps.find(x => x.id === m.opponent_id) || { name: '?', short_name: '?' };
    _match = m;

    const info    = S.season.info || {};
    const myShort = info.teamShort || 'NÓS';
    const myName  = info.teamName  || 'Nós';
    const home    = m.home === 'home';

    document.getElementById('md-title').textContent = home
      ? `${myShort} vs ${opp.short_name}`
      : `${opp.short_name} vs ${myShort}`;
    document.getElementById('md-meta').textContent =
      (m.datetime ? fmtDatetime(new Date(m.datetime)) : '') +
      (m.competition ? ' · ' + m.competition : '') +
      (m.venue ? ' · ' + m.venue : '');

    document.getElementById('md-our-name').textContent = myName.toUpperCase();
    document.getElementById('md-opp-name').textContent = opp.name.toUpperCase();
    document.getElementById('md-status').value = m.status || 'por_começar';

    if (!m.stats) m.stats = { scoreOur: 0, scoreOpp: 0, period: 1, timerSecs: 0, squad: null, players: {} };

    updateScoreboard();
    updateTimerDisplay();
    updateTimerButtons();

    const hasSquad = m.stats.squad && m.stats.squad.length > 0;
    document.getElementById('md-squad-section').style.display = hasSquad ? 'none' : '';
    document.getElementById('md-stats-section').style.display = hasSquad ? '' : 'none';

    if (hasSquad) renderStatsTable(players);
    else renderSquadPicker(players);

    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-match-detail').classList.add('active');
    document.getElementById('nav-matches').classList.add('active');
  });
}

export function closeMatchDetail() {
  timerStop();
  _match = null;
  if(window.app) window.app.showSec('matches');
}

export function saveMatchStatus() {
  if (!_match) return;
  _match.status = document.getElementById('md-status').value;
  DB.matches.put(_match).then(() => toast('Estado atualizado', 'success'));
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
  DB.matches.put(_match).then(() => {
    document.getElementById('md-squad-section').style.display = 'none';
    document.getElementById('md-stats-section').style.display = '';
    DB.players.bySeason(S.season.id).then(players => renderStatsTable(players));
    toast('Convocados confirmados', 'success');
  });
}

// ── Tabela de stats ────────────────────────

function renderStatsTable(allPlayers) {
  const squad   = _match.stats.squad || [];
  const players = allPlayers.filter(p => squad.includes(p.id));
  const stats   = _match.stats.players || {};
  const gks     = players.filter(p => p.position === 'GR');
  const fields  = players.filter(p => p.position !== 'GR').sort((a,b) => (a.shirt||99)-(b.shirt||99));

  // GR
  const gkEl = document.getElementById('md-gk-list');
  gkEl.innerHTML = !gks.length ? emptyState('👤', 'Sem GR convocados.') :
    gks.map(p => {
      const ps = stats[p.id] || { goals: 0, saves: 0, conceded: 0 };
      return `<div style="display:grid;grid-template-columns:auto 1fr 1fr 1fr;gap:12px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="player-shirt" style="width:32px;height:32px;font-size:13px">${p.shirt || '—'}</div>
          <div style="font-family:var(--font-cond);font-size:14px;font-weight:600">${esc(p.name)}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Defesas</div>
          <div style="font-family:var(--font-cond);font-size:22px;font-weight:700;color:var(--success)">${ps.saves}</div>
          <button class="btn btn-success btn-sm" onclick="app.addSave(${p.id})" style="margin-top:6px">+ Defesa</button>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Golos sofridos</div>
          <div style="font-family:var(--font-cond);font-size:22px;font-weight:700;color:var(--danger)">${ps.conceded}</div>
          <button class="btn btn-danger btn-sm" onclick="app.addConceded(${p.id})" style="margin-top:6px">+ Golo sofrido</button>
        </div>
        <div style="text-align:center">
          <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:4px">Golos marcados</div>
          <div style="font-family:var(--font-cond);font-size:22px;font-weight:700;color:var(--accent)">${ps.goals}</div>
          <button class="btn btn-primary btn-sm" onclick="app.addGoal(${p.id})" style="margin-top:6px">+ Golo</button>
        </div>
      </div>`;
    }).join('');

  // Campo
  const fieldEl = document.getElementById('md-field-list');
  fieldEl.innerHTML = !fields.length ? emptyState('👤', 'Sem jogadores de campo convocados.') :
    fields.map(p => {
      const ps = stats[p.id] || { goals: 0, saves: 0, conceded: 0 };
      return `<div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:6px">
        <div class="player-shirt" style="width:32px;height:32px;font-size:13px">${p.shirt || '—'}</div>
        <div>
          <div style="font-family:var(--font-cond);font-size:14px;font-weight:600">${esc(p.name)}</div>
          <span class="pos pos-${p.position}" style="font-size:9px">${p.position}</span>
        </div>
        <div style="font-family:var(--font-cond);font-size:28px;font-weight:700;color:var(--accent);text-align:center;min-width:48px">${ps.goals}</div>
        <button class="btn btn-primary btn-sm" onclick="app.addGoal(${p.id})">+ Golo</button>
      </div>`;
    }).join('');
}

function refreshStats() {
  DB.players.bySeason(S.season.id).then(players => renderStatsTable(players));
}

// ── Ações ──────────────────────────────────

export function addGoal(playerId) {
  if (!_match) return;
  if (!_match.stats.players[playerId]) _match.stats.players[playerId] = { goals: 0, saves: 0, conceded: 0 };
  _match.stats.players[playerId].goals++;
  _match.stats.scoreOur++;
  DB.matches.put(_match).then(() => { updateScoreboard(); refreshStats(); });
}

export function addSave(playerId) {
  if (!_match) return;
  if (!_match.stats.players[playerId]) _match.stats.players[playerId] = { goals: 0, saves: 0, conceded: 0 };
  _match.stats.players[playerId].saves++;
  DB.matches.put(_match).then(() => refreshStats());
}

export function addConceded(playerId) {
  if (!_match) return;
  if (!_match.stats.players[playerId]) _match.stats.players[playerId] = { goals: 0, saves: 0, conceded: 0 };
  _match.stats.players[playerId].conceded++;
  _match.stats.scoreOpp++;
  DB.matches.put(_match).then(() => { updateScoreboard(); refreshStats(); });
}

// ── Placard ────────────────────────────────

function updateScoreboard() {
  document.getElementById('md-score-our').textContent = _match.stats.scoreOur;
  document.getElementById('md-score-opp').textContent = _match.stats.scoreOpp;
}

// ── Timer ──────────────────────────────────

function updateTimerDisplay() {
  const secs = _match.stats.timerSecs;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  document.getElementById('md-timer').textContent =
    `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('md-period-label').textContent =
    _match.stats.period === 1 ? '1ª PARTE' : '2ª PARTE';
}

export function adjustTimer() {
  if (!_match) return;
  const cur = _match.stats.timerSecs;
  document.getElementById('timer-min').value = Math.floor(cur / 60);
  document.getElementById('timer-sec').value = cur % 60;
  document.getElementById('modal-timer').classList.add('open');
}

export function confirmAdjustTimer() {
  const min = Math.min(parseInt(document.getElementById('timer-min').value) || 0, 30);
  const sec = Math.min(parseInt(document.getElementById('timer-sec').value) || 0, 59);
  _match.stats.timerSecs = min * 60 + sec;
  updateTimerDisplay();
  DB.matches.put(_match);
  document.getElementById('modal-timer').classList.remove('open');
  toast('Tempo ajustado', 'success');
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
    if (_match.stats.timerSecs < 30 * 60) {
      _match.stats.timerSecs++;
      updateTimerDisplay();
      if (_match.stats.timerSecs % 30 === 0) DB.matches.put(_match);
    } else {
      timerStop();
      updateTimerButtons();
      if (_match.stats.period === 1) {
        toast('Fim da 1ª parte!', 'success');
      } else {
        toast('Fim do jogo!', 'success');
        _match.status = 'finalizado';
        document.getElementById('md-status').value = 'finalizado';
      }
      DB.matches.put(_match);
    }
  }, 1000);
}

export function matchTimerPause() {
  timerStop();
  updateTimerButtons();
  DB.matches.put(_match);
}

export function matchTimerHalf() {
  timerStop();
  _match.stats.period = 2;
  _match.stats.timerSecs = 0;
  updateTimerDisplay();
  updateTimerButtons();
  DB.matches.put(_match);
  toast('Intervalo — 2ª parte pronta a iniciar', 'success');
}

export function openMatchEvents(id) {
  openMatchDetail(id);
}