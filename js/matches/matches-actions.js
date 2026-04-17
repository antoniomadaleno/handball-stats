// ═══════════════════════════════════════════
// matches-actions.js — ações e modal de localização
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { esc, toast } from '../utils.js';
import { MS } from './matches-state.js';
import { updateScoreboard } from './matches-timer.js';

// ── Definições de ações ────────────────────
// Flags:
//   goal            — conta como golo marcado (+scoreOur)
//   save            — conta como defesa do GR
//   conc            — conta como golo sofrido (+scoreOpp)
//   fieldOnly       — modal só com campo (sem baliza)
//   noLocation      — sem modal de localização
//   optional        — pode ser desligada nas definições
//   selectOpp       — mostra seletor de jogador adversário no modal
//   selectOppLabel  — label do seletor adversário

export const ACTIONS_FIELD = [
  // ── Golos ──
  { key: 'golo_9m',        label: 'Golo de 9m',              goal: true },
  { key: 'golo_7m',        label: 'Golo de 7m',              goal: true },
  { key: 'golo_6m',        label: 'Golo de 6m',              goal: true },
  { key: 'golo_ponta',     label: 'Golo de Ponta',           goal: true },
  { key: 'golo_ca',        label: 'Golo de Contra-Ataque',   goal: true },
  { key: 'golo_pen',       label: 'Golo de Penetração',      goal: true },
  // ── Falhas ──
  { key: 'falha_9m',       label: 'Falha de 9m'    },
  { key: 'falha_7m',       label: 'Falha de 7m'    },
  { key: 'falha_6m',       label: 'Falha de 6m'    },
  { key: 'falha_ponta',    label: 'Falha de Ponta' },
  { key: 'falha_ca',       label: 'Falha de Contra-Ataque' },
  { key: 'falha_pen',      label: 'Falha de Penetração'    },
  // ── Remate bloqueado ──
  { key: 'remate_bloqueado', label: 'Remate bloqueado', fieldOnly: true, selectOpp: true, selectOppLabel: 'Jogador adversário que bloqueou (opcional)' },
  // ── Bloco efetuado ──
  { key: 'bloco_efetuado',   label: 'Bloco efetuado',   fieldOnly: true, selectOpp: true, selectOppLabel: 'Jogador adversário que rematou (opcional)' },
  // ── Disciplinar ──
  { key: 'exclusao_2min',    label: 'Exclusão (2 min)',  noLocation: true },
  { key: 'cartao_amarelo',   label: 'Cartão amarelo',    noLocation: true },
  { key: 'cartao_vermelho',  label: 'Cartão vermelho',   noLocation: true },
  // ── Disputas ──
  { key: '7m_ganho',         label: '7m ganho',          fieldOnly: true },
  { key: '7m_provocado',     label: '7m provocado',      fieldOnly: true },
  { key: '2min_ganho',       label: '2 min ganho',       noLocation: true },
  { key: 'falta_cometida',   label: 'Falta cometida',    fieldOnly: true },
  { key: 'falta_ganha',      label: 'Falta ganha',       fieldOnly: true },
  // ── Opcionais ──
  { key: 'bola_perdida',     label: 'Bola perdida',        noLocation: true, optional: true },
  { key: 'recuperacao',      label: 'Recuperação de bola', noLocation: true, optional: true },
  { key: 'assistencia',      label: 'Assistência',         noLocation: true, optional: true },
];

export const ACTIONS_GK = [
  // ── Defesas ──
  { key: 'defesa_9m',        label: 'Defesa de 9m',              save: true },
  { key: 'defesa_7m',        label: 'Defesa de 7m',              save: true },
  { key: 'defesa_6m',        label: 'Defesa de 6m',              save: true },
  { key: 'defesa_ponta',     label: 'Defesa de Ponta',           save: true },
  { key: 'defesa_ca',        label: 'Defesa de Contra-Ataque',   save: true },
  { key: 'defesa_pen',       label: 'Defesa de Penetração',      save: true },
  // ── Golos sofridos ──
  { key: 'sofreu_9m',        label: 'Golo sofrido de 9m',        conc: true },
  { key: 'sofreu_7m',        label: 'Golo sofrido de 7m',        conc: true },
  { key: 'sofreu_6m',        label: 'Golo sofrido de 6m',        conc: true },
  { key: 'sofreu_ponta',     label: 'Golo sofrido de Ponta',     conc: true },
  { key: 'sofreu_ca',        label: 'Golo sofrido de CA',        conc: true },
  { key: 'sofreu_pen',       label: 'Golo sofrido de Penetração',conc: true },
  { key: 'sofreu_sgr',       label: 'Golo sofrido s/ GR',        conc: true, fieldOnly: true, selectOpp: true, selectOppLabel: 'Jogador adversário que marcou (opcional)' },
  // ── Disciplinar ──
  { key: 'exclusao_2min',    label: 'Exclusão (2 min)', noLocation: true },
  { key: 'cartao_amarelo',   label: 'Cartão amarelo',   noLocation: true },
  { key: 'cartao_vermelho',  label: 'Cartão vermelho',  noLocation: true },
  // ── Opcionais ──
  { key: 'bola_perdida',     label: 'Bola perdida',        noLocation: true, optional: true },
  { key: 'recuperacao',      label: 'Recuperação de bola', noLocation: true, optional: true },
];

export function getAllActions() {
  return [...ACTIONS_FIELD, ...ACTIONS_GK];
}

// Retorna as ações ativas para um jogador, tendo em conta as definições da época
export function getActiveActions(player) {
  const settings = (S.season && S.season.settings) || {};
  const disabled = settings.disabledActions || [];
  const custom   = settings.customActions   || [];
  const base     = player.position === 'GR' ? ACTIONS_GK : ACTIONS_FIELD;
  const active   = base.filter(a => !disabled.includes(a.key));
  const customActive = custom.filter(a => !disabled.includes(a.key));
  return [...active, ...customActive];
}

// ── Registar ação ──────────────────────────

export function registerAction(playerId, actionKey) {
  if (!MS.match) return;
  const p = MS.players.find(x => x.id === playerId);
  if (!p) return;
  const action = getAllActions().find(a => a.key === actionKey)
    || ((S.season?.settings?.customActions) || []).find(a => a.key === actionKey);

  if (!action || action.noLocation) {
    commitAction(playerId, actionKey, null, null, null, null, null, null);
    return;
  }
  MS.pendingAction = { playerId, actionKey, oppPlayerId: null, ourGkId: null };
  openLocationModal(actionKey, action);
}

// ── Modal de localização ───────────────────

function openLocationModal(actionKey, action) {
  const fieldOnly  = action && action.fieldOnly;
  const needsOurGk = action && action.goal;  // golos marcados — GR adversário que sofreu

  document.getElementById('loc-field-dot').style.display = 'none';
  document.getElementById('loc-goal-dot').style.display  = 'none';
  document.getElementById('loc-action-label').textContent = action ? action.label : actionKey;

  // Baliza — esconde em fieldOnly
  const goalSection = document.getElementById('loc-goal-section');
  if (goalSection) goalSection.style.display = fieldOnly ? 'none' : '';

  // Seletor de jogador adversário
  const oppSection = document.getElementById('loc-opp-section');
  if (oppSection) {
    let label    = null;
    let players  = [];
    let callback = 'locSelectOppPlayer';

    if (action.selectOpp && MS.oppPlayers.length) {
      label   = action.selectOppLabel || 'Jogador adversário (opcional)';
      players = MS.oppPlayers;
    } else if (needsOurGk) {
      const oppGks = MS.oppPlayers.filter(p => p.position === 'GR');
      if (oppGks.length) {
        label    = 'GR adversário que sofreu (opcional)';
        players  = oppGks;
        callback = 'locSelectOurGk';
      }
    }

    if (label && players.length) {
      oppSection.style.display = '';
      document.getElementById('loc-opp-label').textContent = label;
      const sorted = players.slice().sort((a, b) => (a.shirt || 99) - (b.shirt || 99));
      document.getElementById('loc-opp-list').innerHTML = sorted.map(p =>
        `<button class="loc-opp-btn" data-pid="${p._id}"
          onclick="app.${callback}('${p._id}')"
          style="padding:8px 14px;border-radius:6px;border:1px solid var(--border2);background:var(--surface2);color:var(--text);font-family:var(--font-cond);font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;min-height:38px">
          <span style="color:var(--accent)">${p.shirt || '?'}</span> ${esc(p.name.split(' ')[0])}
        </button>`
      ).join('');
    } else {
      oppSection.style.display = 'none';
    }
  }

  MS.pendingAction.fieldX      = null;
  MS.pendingAction.fieldY      = null;
  MS.pendingAction.goalX       = null;
  MS.pendingAction.goalY       = null;
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
  const el   = e.currentTarget;
  const rect = el.getBoundingClientRect();

  // O SVG usa viewBox="0 0 500 200" com preserveAspectRatio="xMidYMid meet" (default)
  // Precisamos de saber onde a baliza real está dentro do elemento renderizado
  const vbW = 500, vbH = 200;
  const elW = rect.width, elH = rect.height;
  const scale = Math.min(elW / vbW, elH / vbH);
  const rendW = vbW * scale;
  const rendH = vbH * scale;
  const offX  = (elW - rendW) / 2;  // letterbox horizontal
  const offY  = (elH - rendH) / 2;  // letterbox vertical

  // Postes e barra no viewBox: poste esq x=85, poste dir x=415, barra y=16, chão y=164
  const gx1 = offX + 85  * scale;
  const gx2 = offX + 415 * scale;
  const gy1 = offY + 16  * scale;
  const gy2 = offY + 164 * scale;

  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const x = Math.round(Math.max(0, Math.min(100, (clickX - gx1) / (gx2 - gx1) * 100)));
  const y = Math.round(Math.max(0, Math.min(100, (clickY - gy1) / (gy2 - gy1) * 100)));

  MS.pendingAction.goalX = x;
  MS.pendingAction.goalY = y;

  const dot = document.getElementById('loc-goal-dot');
  dot.style.display = '';
  dot.style.left = ((clickX / elW) * 100) + '%';
  dot.style.top  = ((clickY / elH) * 100) + '%';
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

// ── Commit ─────────────────────────────────

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

  const action = getAllActions().find(a => a.key === actionKey)
    || ((S.season?.settings?.customActions) || []).find(a => a.key === actionKey);

  if (action) {
    if (action.goal) { ps.goals++; ps.shots++; MS.match.stats.scoreOur++; }
    if (action.save) { ps.saves++; }
    if (action.conc) { ps.conceded++; MS.match.stats.scoreOpp++; }
    if (actionKey.startsWith('falha_') || actionKey === 'remate_bloqueado') ps.shots++;
  }

  MS.match.stats.events.push({
    t:             MS.match.stats.timerSecs,
    period:        MS.match.stats.period,
    playerId,      action: actionKey,
    playerName:    p.name,
    shirt:         p.shirt,
    fieldX, fieldY, goalX, goalY,
    oppPlayerId:   oppPlayerId || null,
    oppPlayerName: oppPlayerId
      ? (MS.oppPlayers.find(op => op._id === oppPlayerId) || {}).name || null
      : null,
    ourGkId: ourGkId || null,
  });

  DB.matches.put(MS.match).then(() => {
    updateScoreboard();
    if (window.app) window.app.switchTab('entrada');
    toast(
      action ? action.label : actionKey,
      action && (action.goal || action.save) ? 'success' : ''
    );
  });
}