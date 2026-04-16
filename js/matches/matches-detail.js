// ═══════════════════════════════════════════
// matches-detail.js — detalhe do jogo e convocados
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { esc, toast, emptyState } from '../utils.js';
import { MS } from './matches-state.js';
import { timerStop, updateTimerDisplay, updateTimerButtons } from './matches-timer.js';
import { switchTab } from './matches-tabs.js';

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
      squad: null, players: {}, events: [],
    };
    if (!m.stats.events)  m.stats.events  = [];
    if (!m.stats.players) m.stats.players = {};

    document.getElementById('md-our-short').textContent = myShort;
    document.getElementById('md-opp-short').textContent = opp.short_name;
    document.getElementById('md-score-our').textContent = m.stats.scoreOur;
    document.getElementById('md-score-opp').textContent = m.stats.scoreOpp;
    document.getElementById('md-status').value          = m.status || 'por_começar';
    updateTimerDisplay();
    updateTimerButtons();

    const hasSquad = m.stats.squad && m.stats.squad.length > 0;
    if (hasSquad) {
      MS.players = players.filter(p => m.stats.squad.includes(p.id));
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
    } else {
      MS.players = [];
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
  MS.match           = null;
  MS.players         = [];
  MS.oppPlayers      = [];
  MS.selectedPlayerId = null;
  if (window.app) window.app.showSec('matches');
}

export function saveMatchStatus() {
  if (!MS.match) return;
  MS.match.status = document.getElementById('md-status').value;
  DB.matches.put(MS.match);
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
  MS.match.stats.squad = checked.map(c => parseInt(c.dataset.pid));
  DB.players.bySeason(S.season.id).then(players => {
    MS.players = players.filter(p => MS.match.stats.squad.includes(p.id));
    DB.matches.put(MS.match).then(() => {
      document.getElementById('md-squad-section').style.display = 'none';
      document.getElementById('md-tabs-section').style.display  = '';
      switchTab('entrada');
      toast('Convocados confirmados', 'success');
    });
  });
}

export function openMatchEvents(id) { openMatchDetail(id); }