// ═══════════════════════════════════════════
// opponents.js — adversários, análise e plantel
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast, closeModal, calcAge, emptyState, POS, POS_ORDER } from './utils.js';
import { getInitials } from './badge.js';

// ── Lista de adversários ───────────────────

export function renderOpponents() {
  DB.opponents.bySeason(S.season.id).then(opps => {
    document.getElementById('opponents-count').textContent = opps.length + ' adversário(s)';
    const el = document.getElementById('opponents-list');
    if (!opps.length) { el.innerHTML = emptyState('🛡️', 'Sem adversários adicionados.'); return; }
    el.innerHTML = opps.map(o => {
      const hasAnalysis = o.analysis && (o.analysis.offensive || o.analysis.defensive || o.analysis.notes);
      const badgeHtml = o.badge
        ? `<div class="team-badge" style="flex-shrink:0"><img src="${o.badge}" style="width:100%;height:100%;object-fit:contain" /></div>`
        : `<div class="team-badge" style="flex-shrink:0"><span class="initials">${esc(getInitials(o.name || ''))}</span></div>`;
      return `<div class="player-row" onclick="app.openOpponentProfile(${o.id})">
        ${badgeHtml}
        <div class="player-name">${esc(o.name)}</div>
        <div class="player-meta">${esc(o.short_name)}${hasAnalysis ? ' · <span style="color:var(--success)">Com análise</span>' : ''}</div>
        <div class="player-arrow">›</div>
      </div>`;
    }).join('');
  });
}

export function openAddOpponent() {
  document.getElementById('modal-opp-title').textContent = 'Adicionar adversário';
  document.getElementById('mo-id').value = '';
  document.getElementById('mo-name').value = '';
  document.getElementById('mo-short').value = '';
  document.getElementById('modal-opponent').classList.add('open');
  setTimeout(() => document.getElementById('mo-name').focus(), 50);
}

export function openEditOpponent(id) {
  DB.opponents.bySeason(S.season.id).then(opps => {
    const o = opps.find(x => x.id === id);
    document.getElementById('modal-opp-title').textContent = 'Editar adversário';
    document.getElementById('mo-id').value    = o.id;
    document.getElementById('mo-name').value  = o.name       || '';
    document.getElementById('mo-short').value = o.short_name || '';
    document.getElementById('modal-opponent').classList.add('open');
  });
}

export function saveOpponent() {
  const id = document.getElementById('mo-id').value;
  const data = {
    season_id:  S.season.id,
    name:       document.getElementById('mo-name').value.trim(),
    short_name: document.getElementById('mo-short').value.trim().toUpperCase(),
  };
  if (!data.name || !data.short_name) return toast('Preenche nome e abreviatura', 'error');
  const op = id
    ? DB.opponents.bySeason(S.season.id).then(os => { const o = os.find(x => x.id === parseInt(id)); Object.assign(o, data); return DB.opponents.put(o); })
    : DB.opponents.add(data);
  op.then(() => {
    closeModal('modal-opponent');
    if (id && S.currentOpponentId) {
      document.getElementById('op-name').textContent = data.name;
      document.getElementById('op-sub').textContent  = data.short_name;
    }
    renderOpponents();
    toast('Adversário guardado', 'success');
  });
}

// ── Perfil do adversário ───────────────────

export function openOpponentProfile(id) {
  DB.opponents.bySeason(S.season.id).then(opps => {
    const o = opps.find(x => x.id === id);
    if (!o) return;
    S.currentOpponentId = id;
    document.getElementById('op-name').textContent = o.name;
    document.getElementById('op-sub').textContent  = o.short_name;
    S._oppPlayers[id] = Array.isArray(o.players) ? o.players : [];
    const a = o.analysis || {};
    document.getElementById('op-offensive').value  = a.offensive  || '';
    document.getElementById('op-defensive').value  = a.defensive  || '';
    document.getElementById('op-setpieces').value  = a.setpieces  || '';
    document.getElementById('op-goalkeeper').value = a.goalkeeper || '';
    document.getElementById('op-notes').value      = a.notes      || '';
    renderOppPlayers();
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-opponent-profile').classList.add('active');
    document.getElementById('nav-opponents').classList.add('active');
  });
}

export function saveOpponentAnalysis() {
  DB.opponents.bySeason(S.season.id).then(opps => {
    const o = opps.find(x => x.id === S.currentOpponentId);
    o.analysis = {
      offensive:  document.getElementById('op-offensive').value.trim(),
      defensive:  document.getElementById('op-defensive').value.trim(),
      setpieces:  document.getElementById('op-setpieces').value.trim(),
      goalkeeper: document.getElementById('op-goalkeeper').value.trim(),
      notes:      document.getElementById('op-notes').value.trim(),
    };
    return DB.opponents.put(o);
  }).then(() => toast('Análise guardada', 'success'));
}

export function openEditCurrentOpponent() {
  if (S.currentOpponentId) openEditOpponent(S.currentOpponentId);
}

export function deleteCurrentOpponent() {
  if (!S.currentOpponentId) return;
  if (!confirm('Apagar este adversário?')) return;
  DB.opponents.del(S.currentOpponentId).then(() => {
    S.currentOpponentId = null;
    if(window.app) window.app.showSec('opponents');
    toast('Adversário apagado');
  });
}

// ── Plantel do adversário ──────────────────

export function renderOppPlayers() {
  const oppPlayers = S._oppPlayers[S.currentOpponentId] || [];
  const el = document.getElementById('opp-players-list');
  if (!oppPlayers.length) { el.innerHTML = emptyState('👤', 'Sem jogadores. Adiciona o plantel do adversário.'); return; }
  oppPlayers.sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
  let html = '';
  POS_ORDER.forEach(grp => {
    const group = oppPlayers.filter(p => p.position === grp.key);
    if (!group.length) return;
    html += `<div class="pos-group"><div class="pos-group-title">${grp.label}</div>`;
    group.forEach(p => {
      const hasNotes = p.notes && !!(p.notes.strengths || p.notes.weaknesses || p.notes.general || p.notes.offensive || p.notes.defensive);
      html += `<div class="player-row" onclick="app.openOppPlayerProfile('${p._id}')">
        <div class="player-shirt">${p.shirt || '—'}</div>
        <div class="player-name">${esc(p.name)}</div>
        <div class="player-meta"><span class="pos pos-${p.position}">${p.position}</span>${hasNotes ? ' · <span style="color:var(--success)">Com notas</span>' : ''}</div>
        <div class="player-arrow">›</div>
      </div>`;
    });
    html += '</div>';
  });
  el.innerHTML = html || emptyState('👤', 'Sem jogadores adicionados.');
}

function getOppPlayers() {
  return S._oppPlayers[S.currentOpponentId] || [];
}

function saveOppPlayers(players) {
  S._oppPlayers[S.currentOpponentId] = players;
  return DB.opponents.bySeason(S.season.id).then(opps => {
    const o = opps.find(x => x.id === S.currentOpponentId);
    o.players = players;
    return DB.opponents.put(o);
  });
}

function loadOppPlayers() {
  return DB.opponents.bySeason(S.season.id).then(opps => {
    const o = opps.find(x => x.id === S.currentOpponentId);
    S._oppPlayers[S.currentOpponentId] = Array.isArray(o && o.players) ? o.players : [];
  });
}

export function openAddOppPlayer() {
  document.getElementById('modal-opp-player-title').textContent = 'Adicionar jogador';
  document.getElementById('mop-id').value = '';
  ['mop-name', 'mop-dob', 'mop-shirt', 'mop-weight', 'mop-height'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mop-position').value = '';
  document.getElementById('modal-opp-player').classList.add('open');
  setTimeout(() => document.getElementById('mop-name').focus(), 50);
}

export function openEditOppPlayer() {
  const players = getOppPlayers();
  const p = players.find(x => x._id === S.currentOppPlayerId);
  if (!p) return;
  document.getElementById('modal-opp-player-title').textContent = 'Editar jogador';
  document.getElementById('mop-id').value       = p._id;
  document.getElementById('mop-name').value     = p.name     || '';
  document.getElementById('mop-dob').value      = p.dob      || '';
  document.getElementById('mop-position').value = p.position || '';
  document.getElementById('mop-shirt').value    = p.shirt    || '';
  document.getElementById('mop-weight').value   = p.weight   || '';
  document.getElementById('mop-height').value   = p.height   || '';
  document.getElementById('modal-opp-player').classList.add('open');
}

export function saveOppPlayer() {
  const id   = document.getElementById('mop-id').value;
  const name = document.getElementById('mop-name').value.trim();
  const pos  = document.getElementById('mop-position').value;
  if (!name || !pos) return toast('Nome e posição são obrigatórios', 'error');
  const players = getOppPlayers();
  if (id) {
    const p = players.find(x => x._id === id);
    p.name     = name;
    p.dob      = document.getElementById('mop-dob').value;
    p.position = pos;
    p.shirt    = parseInt(document.getElementById('mop-shirt').value)  || null;
    p.weight   = parseInt(document.getElementById('mop-weight').value) || null;
    p.height   = parseInt(document.getElementById('mop-height').value) || null;
  } else {
    players.push({
      _id: Date.now().toString(), name, pos,
      dob:      document.getElementById('mop-dob').value,
      position: pos,
      shirt:    parseInt(document.getElementById('mop-shirt').value)  || null,
      weight:   parseInt(document.getElementById('mop-weight').value) || null,
      height:   parseInt(document.getElementById('mop-height').value) || null,
      notes: {},
    });
  }
  saveOppPlayers(players).then(() => { closeModal('modal-opp-player'); renderOppPlayers(); toast('Jogador guardado', 'success'); });
}

export function openOppPlayerProfile(pid) {
  loadOppPlayers().then(() => {
    const players = getOppPlayers();
    const p = players.find(x => x._id === pid);
    if (!p) return;
    S.currentOppPlayerId = pid;
    document.getElementById('opp-pp-name').textContent     = p.name;
    document.getElementById('opp-pp-sub').textContent      = POS[p.position] || p.position;
    document.getElementById('opp-pp-shirt').textContent    = p.shirt || '—';
    document.getElementById('opp-pp-pos').innerHTML        = `<span class="pos pos-${p.position}">${p.position}</span>`;
    document.getElementById('opp-pp-age').textContent      = p.dob ? calcAge(p.dob) + ' anos' : '—';
    const m = [p.height ? p.height + 'cm' : null, p.weight ? p.weight + 'kg' : null].filter(Boolean).join(' / ');
    document.getElementById('opp-pp-metrics').textContent  = m || '—';
    const n = p.notes || {};
    document.getElementById('opp-pp-strengths').value  = n.strengths  || '';
    document.getElementById('opp-pp-weaknesses').value = n.weaknesses || '';
    document.getElementById('opp-pp-offensive').value  = n.offensive  || '';
    document.getElementById('opp-pp-defensive').value  = n.defensive  || '';
    document.getElementById('opp-pp-notes').value      = n.general    || '';
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-opp-player-profile').classList.add('active');
    document.getElementById('nav-opponents').classList.add('active');
  });
}

export function saveOppPlayerNotes() {
  const players = getOppPlayers();
  const p = players.find(x => x._id === S.currentOppPlayerId);
  if (!p) return;
  p.notes = {
    strengths:  document.getElementById('opp-pp-strengths').value.trim(),
    weaknesses: document.getElementById('opp-pp-weaknesses').value.trim(),
    offensive:  document.getElementById('opp-pp-offensive').value.trim(),
    defensive:  document.getElementById('opp-pp-defensive').value.trim(),
    general:    document.getElementById('opp-pp-notes').value.trim(),
  };
  saveOppPlayers(players).then(() => toast('Notas guardadas', 'success'));
}

export function deleteCurrentOppPlayer() {
  if (!S.currentOppPlayerId) return;
  if (!confirm('Apagar este jogador?')) return;
  const players = getOppPlayers().filter(x => x._id !== S.currentOppPlayerId);
  saveOppPlayers(players).then(() => {
    S.currentOppPlayerId = null;
    openOpponentProfile(S.currentOpponentId);
    toast('Jogador apagado');
  });
}