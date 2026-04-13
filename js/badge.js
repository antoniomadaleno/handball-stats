// ═══════════════════════════════════════════
// badge.js — emblemas e iniciais
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast } from './utils.js';

export function getInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

export function renderBadge(elId, obj) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (obj && obj.badge) {
    el.innerHTML = `<img src="${obj.badge}" alt="" style="width:100%;height:100%;object-fit:contain" />`;
  } else {
    const name = (obj && (obj.teamName || obj.name)) || '';
    el.innerHTML = `<span class="initials">${esc(getInitials(name))}</span>`;
  }
}

export function badgeHTML(obj, size = '') {
  const cls = 'team-badge' + (size === 'lg' ? ' badge-upload' : '');
  if (obj && obj.badge) {
    return `<div class="${cls}"><img src="${obj.badge}" alt="" style="width:100%;height:100%;object-fit:contain" /></div>`;
  }
  const name = (obj && (obj.teamName || obj.name)) || '';
  return `<div class="${cls}"><span class="initials">${esc(getInitials(name))}</span></div>`;
}

export function uploadOwnBadge(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    if (!S.season.info) S.season.info = {};
    S.season.info.badge = e.target.result;
    DB.seasons.put(S.season).then(() => {
      renderBadge('own-badge', S.season.info);
      renderBadge('sb-badge', S.season.info);
      if(window.app) window.app.renderSeasons();
      toast('Emblema guardado', 'success');
    });
  };
  reader.readAsDataURL(file);
}

export function removeOwnBadge() {
  if (!S.season.info) return;
  S.season.info.badge = null;
  DB.seasons.put(S.season).then(() => {
    renderBadge('own-badge', S.season.info);
    renderBadge('sb-badge', S.season.info);
    document.dispatchEvent(new CustomEvent('seasons:refresh'));
    toast('Emblema removido');
  });
}