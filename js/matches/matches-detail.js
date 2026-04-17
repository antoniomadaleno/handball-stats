// ═══════════════════════════════════════════
// matches-detail.js — detalhe do jogo e convocados
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { esc, toast, emptyState } from '../utils.js';
import { MS } from './matches-state.js';
import { timerStop, updateTimerDisplay, updateTimerButtons } from './matches-timer.js';
import { switchTab } from './matches-tabs.js';

const POS_ORDER = [
  { key: 'GR', label: 'Guarda-redes' },
  { key: 'EE', label: 'Extremo Esquerdo' },
  { key: 'ED', label: 'Extremo Direito' },
  { key: 'LE', label: 'Lateral Esquerdo' },
  { key: 'LD', label: 'Lateral Direito' },
  { key: 'CE', label: 'Central' },
  { key: 'PI', label: 'Pivot' },
];

export function openMatchDetail(id) {
  Promise.all([
    DB.matches.bySeason(S.season.id),
    DB.opponents.bySeason(S.season.id),
    DB.players.bySeason(S.season.id),
  ]).then(([matches, opps, players]) => {
    const m   = matches.find(x => x.id === id);
    const opp = opps.find(x => x.id === m.opponent_id) || { name: '?', short_name: '?' };
    MS.match      = m;
    MS.oppPlayers = Array.isArray(opp.players) ? opp.players : [];

    const info    = S.season.info || {};
    const myShort = info.teamShort || 'NÓS';

    if (!m.stats) m.stats = {
      scoreOur: 0, scoreOpp: 0,
      period: 1, timerSecs: 0,
      squad: null, oppSquad: null, players: {}, events: [],
    };
    if (!m.stats.events)  m.stats.events  = [];
    if (!m.stats.players) m.stats.players = {};

    document.getElementById('md-our-short').textContent = myShort;
    document.getElementById('md-opp-short').textContent = opp.short_name;
    document.getElementById('md-score-our').textContent = m.stats.scoreOur;
    document.getElementById('md-score-opp').textContent = m.stats.scoreOpp;
    document.getElementById('md-status').value          = m.status || 'por_começar';

    const hasSquad = m.stats.squad && m.stats.squad.length > 0;

    document.getElementById('md-scoreboard').style.display = hasSquad ? 'grid' : 'none';

    if (hasSquad) {
      updateTimerDisplay();
      updateTimerButtons();
      MS.players = players.filter(p => m.stats.squad.includes(p.id));
      // Aplicar oppSquad guardado se existir
      if (m.stats.oppSquad && m.stats.oppSquad.length) {
        MS.oppPlayers = MS.oppPlayers.filter(p => m.stats.oppSquad.includes(p._id));
      }
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
    } else {
      MS.players = [];
      document.getElementById('md-squad-section').style.display = '';
      document.getElementById('md-tabs-section').style.display  = 'none';
      renderSquadPicker(players);
      renderOppSquadPicker(MS.oppPlayers, m.stats.oppSquad || []);
    }

    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('sec-match-detail').classList.add('active');
    document.getElementById('nav-matches').classList.add('active');
  });
}

export function closeMatchDetail() {
  timerStop();
  MS.match            = null;
  MS.players          = [];
  MS.oppPlayers       = [];
  MS.selectedPlayerId = null;
  if (window.app) window.app.showSec('matches');
}

export function saveMatchStatus() {
  if (!MS.match) return;
  MS.match.status = document.getElementById('md-status').value;
  DB.matches.put(MS.match);
}

// ── Convocados próprios ────────────────────

function renderSquadPicker(players) {
  const el = document.getElementById('md-squad-list');
  if (!players.length) { el.innerHTML = emptyState('👤', 'Sem jogadores no plantel.'); return; }

  let html = '';
  POS_ORDER.forEach(grp => {
    const group = players.filter(p => p.position === grp.key).sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
    if (!group.length) return;
    html += `<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${grp.label}</div>`;
    group.forEach(p => {
      html += `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:var(--surface2);border:1px solid var(--border);transition:border-color 0.12s">
        <input type="checkbox" data-pid="${p.id}" style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0" />
        <span style="width:30px;height:30px;border-radius:5px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:14px;font-weight:700;color:var(--accent);flex-shrink:0">${p.shirt || '—'}</span>
        <span style="font-family:var(--font-cond);font-size:14px;font-weight:600">${esc(p.name)}</span>
      </label>`;
    });
    html += `</div>`;
  });
  el.innerHTML = html;
}

export function confirmSquad() {
  const checked = [...document.querySelectorAll('#md-squad-list input[type=checkbox]:checked')];
  if (!checked.length) return toast('Seleciona pelo menos um jogador', 'error');
  MS.match.stats.squad = checked.map(c => parseInt(c.dataset.pid));

  // Guardar oppSquad — se nenhum selecionado, fica null (plantel todo)
  const oppChecked = [...document.querySelectorAll('#md-opp-squad-list input[type=checkbox]:checked')];
  MS.match.stats.oppSquad = oppChecked.length ? oppChecked.map(c => c.dataset.pid) : null;
  if (MS.match.stats.oppSquad) {
    MS.oppPlayers = MS.oppPlayers.filter(p => MS.match.stats.oppSquad.includes(p._id));
  }

  DB.players.bySeason(S.season.id).then(players => {
    MS.players = players.filter(p => MS.match.stats.squad.includes(p.id));
    DB.matches.put(MS.match).then(() => {
      document.getElementById('md-scoreboard').style.display = 'grid';
      updateTimerDisplay();
      updateTimerButtons();
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
      toast('Convocados confirmados', 'success');
    });
  });
}

// ── Convocados adversário ──────────────────

function renderOppSquadPicker(oppPlayers, selectedIds) {
  const el = document.getElementById('md-opp-squad-list');
  if (!el) return;

  if (!oppPlayers.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:8px 0">Sem jogadores registados para este adversário.</div>`;
    return;
  }

  let html = '';
  POS_ORDER.forEach(grp => {
    const group = oppPlayers.filter(p => p.position === grp.key).sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
    if (!group.length) return;
    html += `<div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:var(--text3);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${grp.label}</div>`;
    group.forEach(p => {
      const checked = selectedIds.includes(p._id) ? 'checked' : '';
      html += `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:var(--surface2);border:1px solid var(--border);transition:border-color 0.12s">
        <input type="checkbox" data-pid="${p._id}" ${checked} style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0" />
        <span style="width:30px;height:30px;border-radius:5px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-family:var(--font-cond);font-size:14px;font-weight:700;color:var(--accent);flex-shrink:0">${p.shirt || '—'}</span>
        <span style="font-family:var(--font-cond);font-size:14px;font-weight:600">${esc(p.name)}</span>
      </label>`;
    });
    html += `</div>`;
  });
  el.innerHTML = html;
}

export function openMatchEvents(id) { openMatchDetail(id); }