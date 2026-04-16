// ═══════════════════════════════════════════
// matches-actions.js — ações e modal de localização
// ═══════════════════════════════════════════

import { DB } from '../db.js';
import { esc, toast } from '../utils.js';
import { MS } from './matches-state.js';
import { updateScoreboard } from './matches-timer.js';

export const ACTIONS_FIELD = [
  { key: 'golo_9m',    label: 'Golo de 9m',           goal: true  },
  { key: 'golo_7m',    label: 'Golo de 7m',            goal: true  },
  { key: 'golo_6m',    label: 'Golo de 6m',            goal: true  },
  { key: 'golo_ponta', label: 'Golo de Ponta',         goal: true  },
  { key: 'golo_ca',    label: 'Golo de Contra-Ataque', goal: true  },
  { key: 'golo_pen',   label: 'Golo de Penetração',    goal: true  },
  { key: 'falha_9m',   label: 'Falha de 9m',           goal: false },
  { key: 'falha_7m',   label: 'Falha de 7m',           goal: false },
  { key: 'falha_6m',   label: 'Falha de 6m',           goal: false },
  { key: 'falha_ponta',label: 'Falha de Ponta',        goal: false },
  { key: 'falha_ca',   label: 'Falha de Contra-Ataque',goal: false },
  { key: 'falha_pen',  label: 'Falha de Penetração',   goal: false },
  { key: 'bola_perdida',  label: 'Bola perdida',       goal: false },
  { key: 'recuperacao',   label: 'Recuperação bola',   goal: false },
  { key: 'assistencia',   label: 'Assistência',        goal: false },
];

export const ACTIONS_GK = [
  { key: 'defesa_9m',   label: 'Defesa de 9m',            save: true  },
  { key: 'defesa_7m',   label: 'Defesa de 7m',            save: true  },
  { key: 'defesa_6m',   label: 'Defesa de 6m',            save: true  },
  { key: 'defesa_ponta',label: 'Defesa de Ponta',         save: true  },
  { key: 'defesa_ca',   label: 'Defesa de Contra-Ataque', save: true  },
  { key: 'defesa_pen',  label: 'Defesa de Penetração',    save: true  },
  { key: 'sofreu_9m',   label: 'Golo sofrido de 9m',      conc: true  },
  { key: 'sofreu_7m',   label: 'Golo sofrido de 7m',      conc: true  },
  { key: 'sofreu_6m',   label: 'Golo sofrido de 6m',      conc: true  },
  { key: 'sofreu_ponta',label: 'Golo sofrido de Ponta',   conc: true  },
  { key: 'sofreu_ca',   label: 'Golo sofrido de Contra-Ataque', conc: true },
  { key: 'sofreu_pen',  label: 'Golo sofrido de Penetração',    conc: true },
  { key: 'bola_perdida',  label: 'Bola perdida',          conc: false },
  { key: 'recuperacao',   label: 'Recuperação bola',      conc: false },
];

export function getAllActions() {
  return [...ACTIONS_FIELD, ...ACTIONS_GK];
}

export function registerAction(playerId, actionKey) {
  if (!MS.match) return;
  const p = MS.players.find(x => x.id === playerId);
  if (!p) return;
  const action = getAllActions().find(a => a.key === actionKey);
  const needsLocation = action && (action.goal || action.save || action.conc || actionKey.startsWith('falha_'));
  if (needsLocation) {
    MS.pendingAction = { playerId, actionKey, oppPlayerId: null, ourGkId: null };
    openLocationModal(actionKey, action);
    return;
  }
  commitAction(playerId, actionKey, null, null, null, null);
}

function openLocationModal(actionKey, action) {
  const needsOpp   = action && (action.save || action.conc);
  const needsOurGk = action && action.goal;

  document.getElementById('loc-field-dot').style.display = 'none';
  document.getElementById('loc-goal-dot').style.display  = 'none';
  document.getElementById('loc-action-label').textContent = action ? action.label : actionKey;

  const goalSection = document.getElementById('loc-goal-section');
  if (goalSection) goalSection.style.display = '';

  const oppSection = document.getElementById('loc-opp-section');
  if (oppSection) {
    if (needsOpp && MS.oppPlayers.length) {
      oppSection.style.display = '';
      document.getElementById('loc-opp-label').textContent = 'Quem rematou? (opcional)';
      const sorted = MS.oppPlayers.slice().sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
      document.getElementById('loc-opp-list').innerHTML = sorted.map(p =>
        `<button class="loc-opp-btn" data-pid="${p._id}"
          onclick="app.locSelectOppPlayer('${p._id}')"
          style="padding:5px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-family:var(--font-cond);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0">
          <span style="color:var(--accent)">${p.shirt || '?'}</span> ${esc(p.name.split(' ')[0])}
        </button>`
      ).join('');
    } else if (needsOurGk) {
      const oppGks = MS.oppPlayers.filter(p => p.position === 'GR');
      if (oppGks.length) {
        oppSection.style.display = '';
        document.getElementById('loc-opp-label').textContent = 'GR adversário que sofreu (opcional)';
        document.getElementById('loc-opp-list').innerHTML = oppGks.sort((a, b) => (a.shirt || 99) - (b.shirt || 99)).map(p =>
          `<button class="loc-opp-btn" data-pid="${p._id}"
            onclick="app.locSelectOurGk('${p._id}')"
            style="padding:5px 8px;border-radius:5px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-family:var(--font-cond);font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0">
            <span style="color:var(--accent)">${p.shirt || '?'}</span> ${esc(p.name.split(' ')[0])}
          </button>`
        ).join('');
      } else { oppSection.style.display = 'none'; }
    } else {
      oppSection.style.display = 'none';
    }
  }

  MS.pendingAction.fieldX    = null; MS.pendingAction.fieldY    = null;
  MS.pendingAction.goalX     = null; MS.pendingAction.goalY     = null;
  MS.pendingAction.oppPlayerId = null;
  document.getElementById('modal-location').classList.add('open');
}

export function locFieldClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * 100);
  const y = Math.round((e.clientY - rect.top)  / rect.height * 100);
  MS.pendingAction.fieldX = x; MS.pendingAction.fieldY = y;
  const dot = document.getElementById('loc-field-dot');
  dot.style.display = ''; dot.style.left = x + '%'; dot.style.top = y + '%';
}

export function locGoalClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left) / rect.width * 100);
  const y = Math.round((e.clientY - rect.top)  / rect.height * 100);
  MS.pendingAction.goalX = x; MS.pendingAction.goalY = y;
  const dot = document.getElementById('loc-goal-dot');
  dot.style.display = ''; dot.style.left = x + '%'; dot.style.top = y + '%';
}

export function locNextStep() { locConfirm(); }

export function locConfirm() {
  if (!MS.pendingAction) return;
  document.getElementById('modal-location').classList.remove('open');
  const { playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId, ourGkId } = MS.pendingAction;
  MS.pendingAction = null;
  commitAction(playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId, ourGkId);
}

export function locSkip() {
  if (!MS.pendingAction) return;
  document.getElementById('modal-location').classList.remove('open');
  const { playerId, actionKey } = MS.pendingAction;
  MS.pendingAction = null;
  commitAction(playerId, actionKey, null, null, null, null, null, null);
}

export function locSelectOppPlayer(pid) {
  if (!MS.pendingAction) return;
  MS.pendingAction.oppPlayerId = MS.pendingAction.oppPlayerId === pid ? null : pid;
  document.querySelectorAll('.loc-opp-btn').forEach(b => {
    const sel = b.dataset.pid === String(pid) && MS.pendingAction.oppPlayerId === pid;
    b.style.background = sel ? 'var(--accent)' : 'var(--surface2)';
    b.style.color      = sel ? '#0d0f14'       : 'var(--text)';
  });
}

export function locSelectOurGk(id) {
  if (!MS.pendingAction) return;
  const sid = String(id);
  MS.pendingAction.ourGkId = String(MS.pendingAction.ourGkId) === sid ? null : sid;
  document.querySelectorAll('.loc-opp-btn').forEach(b => {
    const sel = b.dataset.pid === sid && MS.pendingAction.ourGkId === sid;
    b.style.background = sel ? 'var(--accent)' : 'var(--surface2)';
    b.style.color      = sel ? '#0d0f14'       : 'var(--text)';
  });
}

export function commitAction(playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId, ourGkId) {
  if (!MS.match) return;
  const p = MS.players.find(x => x.id === playerId);
  if (!p) return;

  if (!MS.match.stats.players[playerId]) {
    MS.match.stats.players[playerId] = { goals: 0, shots: 0, saves: 0, conceded: 0, actions: {} };
  }
  const ps = MS.match.stats.players[playerId];
  if (!ps.actions) ps.actions = {};
  ps.actions[actionKey] = (ps.actions[actionKey] || 0) + 1;

  const action = getAllActions().find(a => a.key === actionKey);
  if (action) {
    if (action.goal) { ps.goals++; ps.shots++; MS.match.stats.scoreOur++; }
    if (action.save) { ps.saves++; }
    if (action.conc) { ps.conceded++; MS.match.stats.scoreOpp++; }
    if (actionKey.startsWith('falha_')) ps.shots++;
  }

  MS.match.stats.events.push({
    t: MS.match.stats.timerSecs,
    period: MS.match.stats.period,
    playerId, action: actionKey,
    playerName: p.name, shirt: p.shirt,
    fieldX, fieldY, goalX, goalY,
    oppPlayerId: oppPlayerId || null,
    oppPlayerName: oppPlayerId ? (MS.oppPlayers.find(p => p._id === oppPlayerId) || {}).name || null : null,
    ourGkId: ourGkId || null,
  });

  DB.matches.put(MS.match).then(() => {
    updateScoreboard();
    // Re-render entrada via tab switch
    if (window.app) window.app.switchTab('entrada');
    toast(action ? action.label : actionKey, action && (action.goal || action.save) ? 'success' : '');
  });
}