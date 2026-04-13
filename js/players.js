// ═══════════════════════════════════════════
// players.js — plantel próprio
// ═══════════════════════════════════════════

import { S } from './state.js?v=1775834769';
import { DB } from './db.js?v=1775834769';
import { esc, toast, closeModal, calcAge, emptyState, POS, POS_ORDER } from './utils.js?v=1775834769';

export function renderPlayers() {
  DB.players.bySeason(S.season.id).then(players => {
    players.sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
    document.getElementById('players-count').textContent = players.length + ' jogador(es)';
    const el = document.getElementById('players-list');
    if (!players.length) { el.innerHTML = emptyState('👤', 'Sem jogadores. Adiciona o plantel.'); return; }

    let html = '';
    POS_ORDER.forEach(grp => {
      const group = players.filter(p => p.position === grp.key);
      if (!group.length) return;
      html += `<div class="pos-group"><div class="pos-group-title">${grp.label}</div>`;
      group.forEach(p => {
        const age  = p.dob ? calcAge(p.dob) + 'a' : null;
        const meta = [p.height ? p.height + 'cm' : null, p.weight ? p.weight + 'kg' : null, age].filter(Boolean).join(' · ');
        html += `<div class="player-row" onclick="app.openPlayerProfile(${p.id})">
          <div class="player-shirt">${p.shirt || '—'}</div>
          <div class="player-name">${esc(p.name)}</div>
          <div class="player-meta">${meta || '—'}</div>
          <div class="player-arrow">›</div>
        </div>`;
      });
      html += '</div>';
    });
    el.innerHTML = html;
  });
}

export function openPlayerProfile(id) {
  DB.players.bySeason(S.season.id).then(players => {
    const p = players.find(x => x.id === id);
    if (!p) return;
    S.currentPlayerId = id;
    document.getElementById('pp-name').textContent = p.name;
    document.getElementById('pp-sub').textContent  = POS[p.position] || p.position;
    document.getElementById('pp-shirt').textContent   = p.shirt || '—';
    document.getElementById('pp-pos').innerHTML       = `<span class="pos pos-${p.position}">${p.position}</span>`;
    document.getElementById('pp-age').textContent     = p.dob ? calcAge(p.dob) + ' anos' : '—';
    const m = [p.height ? p.height + 'cm' : null, p.weight ? p.weight + 'kg' : null].filter(Boolean).join(' / ');
    document.getElementById('pp-metrics').textContent = m || '—';

    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-player-profile').classList.add('active');
    document.getElementById('nav-players').classList.add('active');
  });
}

export function openEditCurrentPlayer() {
  if (S.currentPlayerId) openEditPlayer(S.currentPlayerId);
}

export function deleteCurrentPlayer() {
  if (!S.currentPlayerId) return;
  if (!confirm('Apagar este jogador?')) return;
  DB.players.del(S.currentPlayerId).then(() => {
    S.currentPlayerId = null;
    if(window.app) window.app.showSec('players');
    toast('Jogador apagado');
  });
}

export function openAddPlayer() {
  document.getElementById('modal-player-title').textContent = 'Adicionar jogador';
  document.getElementById('mp-id').value = '';
  ['mp-name', 'mp-dob', 'mp-shirt', 'mp-weight', 'mp-height'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mp-position').value = '';
  document.getElementById('modal-player').classList.add('open');
  setTimeout(() => document.getElementById('mp-name').focus(), 50);
}

export function openEditPlayer(id) {
  DB.players.bySeason(S.season.id).then(players => {
    const p = players.find(x => x.id === id);
    document.getElementById('modal-player-title').textContent = 'Editar jogador';
    document.getElementById('mp-id').value       = p.id;
    document.getElementById('mp-name').value     = p.name     || '';
    document.getElementById('mp-dob').value      = p.dob      || '';
    document.getElementById('mp-position').value = p.position || '';
    document.getElementById('mp-shirt').value    = p.shirt    || '';
    document.getElementById('mp-weight').value   = p.weight   || '';
    document.getElementById('mp-height').value   = p.height   || '';
    document.getElementById('modal-player').classList.add('open');
  });
}

export function savePlayer() {
  const id   = document.getElementById('mp-id').value;
  const data = {
    season_id: S.season.id,
    name:      document.getElementById('mp-name').value.trim(),
    dob:       document.getElementById('mp-dob').value,
    position:  document.getElementById('mp-position').value,
    shirt:     parseInt(document.getElementById('mp-shirt').value)  || null,
    weight:    parseInt(document.getElementById('mp-weight').value) || null,
    height:    parseInt(document.getElementById('mp-height').value) || null,
  };
  if (!data.name || !data.position) return toast('Nome e posição são obrigatórios', 'error');
  const op = id
    ? DB.players.bySeason(S.season.id).then(ps => { const p = ps.find(x => x.id === parseInt(id)); Object.assign(p, data); return DB.players.put(p); })
    : DB.players.add(data);
  op.then(() => { closeModal('modal-player'); renderPlayers(); toast('Jogador guardado', 'success'); });
}

export function deletePlayer(id) {
  if (!confirm('Apagar este jogador?')) return;
  DB.players.del(id).then(() => { renderPlayers(); toast('Jogador apagado'); });
}