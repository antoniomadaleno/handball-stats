// ═══════════════════════════════════════════
// matches-list.js — lista de jogos (CRUD)
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { esc, toast, closeModal, fmtDatetime, emptyState } from '../utils.js';

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
          <button class="btn btn-primary btn-sm"   onclick="app.openMatchDetail(${m.id})">Abrir</button>
          <button class="btn btn-danger btn-sm"    onclick="app.deleteMatch(${m.id})">Apagar</button>
        </div>
      </div>`;
    }).join('');
  });
}

export function openAddMatch() {
  DB.opponents.bySeason(S.season.id).then(opps => {
    if (!opps.length) { toast('Adiciona adversários primeiro', 'error'); if (window.app) window.app.showSec('opponents'); return; }
    document.getElementById('mm-opponent').innerHTML = opps.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('');
    document.getElementById('modal-match-title').textContent = 'Criar jogo';
    document.getElementById('mm-id').value          = '';
    document.getElementById('mm-type').value        = 'proprio';
    document.getElementById('mm-home').value        = 'home';
    document.getElementById('mm-competition').value = '';
    document.getElementById('mm-datetime').value    = '';
    document.getElementById('mm-venue').value       = '';
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