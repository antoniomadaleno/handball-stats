// ═══════════════════════════════════════════
// nav.js — navegação, páginas, sidebar
// ═══════════════════════════════════════════

import { S } from './state.js';
import { esc } from './utils.js';
import { renderBadge } from './badge.js';

export function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
}

export function goHome() {
  S.season = null;
  document.getElementById('sidebar').classList.add('hidden');
  setBreadcrumb([]);
  showPage('home');
  if(window.app) window.app.renderSeasons();
}

export function openSeason(season) {
  S.season = season;
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('sb-season-name').textContent = season.name;
  document.getElementById('sb-end-btn').textContent = season.ended ? 'Reativar época' : 'Terminar época';
  renderBadge('sb-badge', season.info || {});
  document.getElementById('sb-team-name').textContent = (season.info && season.info.teamName) || '';
  setBreadcrumb([season.name]);
  if(window.app) window.app.fillInfoForm(season);
  showPage('season');
  showSec('info');
}

export function showSec(id) {
  S.activeSec = id;
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  document.getElementById('nav-' + id).classList.add('active');
  if (id === 'players')   { if(window.app) window.app.renderPlayers(); }
  if (id === 'opponents') { if(window.app) window.app.renderOpponents(); }
  if (id === 'matches')   { if(window.app) window.app.renderMatches(); }
  if (id === 'settings')  { if(window.app) window.app.renderSettings(); }
}

export function setBreadcrumb(parts) {
  let html = '<span class="crumb" onclick="app.goHome()">Épocas</span>';
  parts.forEach(p => {
    html += `<span class="sep">›</span><span class="current">${esc(p)}</span>`;
  });
  document.getElementById('breadcrumb').innerHTML = html;
}