// ═══════════════════════════════════════════
// seasons.js — gestão de épocas
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast } from './utils.js';
import { getInitials } from './badge.js';

// Cache de épocas para lookup por id (evita JSON no onclick)
let _seasonsCache = [];

export function getSeasonById(id) {
  return _seasonsCache.find(s => s.id === id) || null;
}

export function renderSeasons() {
  Promise.all([DB.seasons.all(), DB.seasons.allMatches()]).then(([seasons, allMatches]) => {
    _seasonsCache = seasons;
    const el = document.getElementById('seasons-list');
    if (!seasons.length) {
      el.innerHTML = emptyState('🗓️', 'Nenhuma época. Cria uma abaixo.');
      return;
    }
    el.innerHTML = seasons.map(s => {
      const mc   = allMatches.filter(m => m.season_id === s.id).length;
      const info = s.info || {};
      const sub  = (info.teamName || '') + (mc ? (info.teamName ? ' · ' : '') + mc + ' jogo(s)' : (info.teamName ? '' : ' Sem jogos'));
      const badgeHtml = info.badge
        ? `<div class="team-badge" style="flex-shrink:0"><img src="${info.badge}" style="width:100%;height:100%;object-fit:contain" /></div>`
        : `<div class="team-badge" style="flex-shrink:0"><span class="initials">${esc(getInitials(info.teamName || ''))}</span></div>`;
      return `<div class="sc" onclick="app.openSeasonById(${s.id})">
        ${badgeHtml}
        <div class="sc-main">
          <div class="sc-name">${esc(s.name)} <span class="badge ${s.ended ? 'b-ended' : 'b-active'}">${s.ended ? 'Terminada' : 'Ativa'}</span></div>
          <div class="sc-sub">${esc(sub || 'Sem dados ainda')}</div>
        </div>
        <div class="sc-open">›</div>
        <div onclick="event.stopPropagation()" style="display:flex;gap:6px">
          <button class="btn btn-${s.ended ? 'success' : 'warn'} btn-sm" onclick="event.stopPropagation();app.quickToggleEnded(${s.id},${!s.ended})">${s.ended ? 'Reativar' : 'Terminar'}</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();app.deleteSeason(${s.id})">Apagar</button>
        </div>
      </div>`;
    }).join('');
  });
}

export function createSeason() {
  const name = document.getElementById('season-name').value.trim();
  if (!name) return toast('Insere o nome da época', 'error');
  DB.seasons.add({ name, ended: false, info: {} }).then(id => {
    document.getElementById('season-name').value = '';
    DB.seasons.all().then(seasons => {
      const s = seasons.find(x => x.id === id);
      if(window.app) window.app.openSeason(s);
    });
  });
}

export function quickToggleEnded(id, val) {
  DB.seasons.all().then(seasons => {
    const s = seasons.find(x => x.id === id);
    s.ended = val;
    return DB.seasons.put(s);
  }).then(() => {
    renderSeasons();
    toast(val ? 'Época terminada' : 'Época reativada', 'success');
  });
}

export function toggleSeasonEnded() {
  if (!S.season) return;
  S.season.ended = !S.season.ended;
  DB.seasons.put(S.season).then(() => {
    document.getElementById('sb-end-btn').textContent = S.season.ended ? 'Reativar época' : 'Terminar época';
    toast(S.season.ended ? 'Época terminada' : 'Época reativada', 'success');
  });
}

export function deleteSeason(id) {
  if (!confirm('Apagar esta época e todos os dados?')) return;
  DB.seasons.del(id).then(() => { renderSeasons(); toast('Época apagada'); });
}

function emptyState(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}