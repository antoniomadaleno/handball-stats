// ═══════════════════════════════════════════
// settings.js — definições da época
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast } from './utils.js';
import { ACTIONS_FIELD, ACTIONS_GK } from './matches/matches-actions.js';

function getSettings() {
  if (!S.season.settings) S.season.settings = {};
  const s = S.season.settings;
  if (!s.halfDuration)    s.halfDuration    = 30;
  if (!s.disabledActions) s.disabledActions = [];
  if (!s.customActions)   s.customActions   = [];
  return s;
}

async function saveSettings() {
  await DB.seasons.put(S.season);
  toast('Definições guardadas', 'success');
}

export function renderSettings() {
  const s = getSettings();
  const el = document.getElementById('sec-settings');
  if (!el) return;

  const optionalField = ACTIONS_FIELD.filter(a => a.optional);
  const optionalGK    = ACTIONS_GK.filter(a => a.optional);

  const toggleBtn = (action) => {
    const disabled = s.disabledActions.includes(action.key);
    return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px">
      <span style="font-size:13px;color:${disabled ? 'var(--text3)' : 'var(--text)'}">${esc(action.label)}</span>
      <button onclick="app.settingsToggleAction('${action.key}')"
        style="padding:4px 14px;border-radius:20px;border:none;font-family:var(--font-cond);font-size:12px;font-weight:700;cursor:pointer;transition:all 0.15s;background:${disabled ? 'var(--surface)' : 'var(--accent)'};color:${disabled ? 'var(--text3)' : '#0d0f14'};border:1px solid ${disabled ? 'var(--border2)' : 'var(--accent)'}">
        ${disabled ? 'DESLIGADO' : 'LIGADO'}
      </button>
    </div>`;
  };

  const customRows = s.customActions.map((a, i) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;margin-bottom:6px">
      <span style="font-size:13px;flex:1">${esc(a.label)}</span>
      <span style="font-size:10px;color:var(--text3);font-family:var(--font-cond)">${a.noLocation ? 'sem localização' : a.fieldOnly ? 'só campo' : 'campo + baliza'}</span>
      <button onclick="app.settingsRemoveCustomAction(${i})"
        style="padding:4px 10px;border-radius:5px;border:1px solid var(--danger);background:transparent;color:var(--danger);font-family:var(--font-cond);font-size:11px;font-weight:600;cursor:pointer">
        Remover
      </button>
    </div>`
  ).join('');

  el.innerHTML = `
    <div class="sec-header">
      <div><div class="sec-title">Definições</div><div class="sec-sub">Configurações da época.</div></div>
    </div>

    <!-- Duração de cada parte -->
    <div class="form-block" style="margin-bottom:16px">
      <div class="form-block-title">Duração de cada parte</div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:4px">
        <div style="display:flex;gap:8px">
          ${[15,20,25,30].map(m => `
            <button onclick="app.settingsSetHalf(${m})"
              style="padding:8px 16px;border-radius:6px;border:1px solid ${s.halfDuration === m ? 'var(--accent)' : 'var(--border2)'};background:${s.halfDuration === m ? 'var(--accent)' : 'var(--surface2)'};color:${s.halfDuration === m ? '#0d0f14' : 'var(--text)'};font-family:var(--font-cond);font-size:14px;font-weight:700;cursor:pointer">
              ${m} min
            </button>`).join('')}
        </div>
        <span style="font-size:12px;color:var(--text2)">ou</span>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="number" id="settings-half-custom" min="5" max="60" value="${s.halfDuration}"
            style="width:70px;text-align:center;font-size:16px;font-family:var(--font-cond);font-weight:700"
            onchange="app.settingsSetHalf(parseInt(this.value))" />
          <span style="font-size:12px;color:var(--text2)">min</span>
        </div>
      </div>
    </div>

    <!-- Ações opcionais -->
    <div class="form-block" style="margin-bottom:16px">
      <div class="form-block-title" style="margin-bottom:12px">Ações opcionais — Jogadores de campo</div>
      ${optionalField.map(toggleBtn).join('')}
      <div class="form-block-title" style="margin-bottom:12px;margin-top:16px">Ações opcionais — Guarda-redes</div>
      ${optionalGK.map(toggleBtn).join('')}
    </div>

    <!-- Ações personalizadas -->
    <div class="form-block">
      <div class="form-block-title" style="margin-bottom:12px">Ações personalizadas</div>
      <div id="settings-custom-list">${customRows || '<div style="font-size:12px;color:var(--text3);padding:4px 0">Nenhuma ação personalizada.</div>'}</div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text2);margin-bottom:10px">Adicionar nova ação</div>
        <div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end">
          <div class="field">
            <label>Nome da ação</label>
            <input type="text" id="settings-custom-label" placeholder="ex: Falta técnica" />
          </div>
          <div class="field">
            <label>Localização</label>
            <select id="settings-custom-loc">
              <option value="noLocation">Sem localização</option>
              <option value="fieldOnly">Só campo</option>
              <option value="both">Campo + Baliza</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="app.settingsAddCustomAction()">Adicionar</button>
        </div>
      </div>
    </div>`;
}

export function settingsSetHalf(val) {
  const v = Math.max(5, Math.min(60, parseInt(val) || 30));
  const s = getSettings();
  s.halfDuration = v;
  saveSettings().then(() => renderSettings());
}

export function settingsToggleAction(key) {
  const s = getSettings();
  const idx = s.disabledActions.indexOf(key);
  if (idx === -1) s.disabledActions.push(key);
  else            s.disabledActions.splice(idx, 1);
  saveSettings().then(() => renderSettings());
}

export function settingsAddCustomAction() {
  const label = document.getElementById('settings-custom-label').value.trim();
  if (!label) return toast('Insere o nome da ação', 'error');
  const locVal = document.getElementById('settings-custom-loc').value;
  const s = getSettings();
  const key = 'custom_' + Date.now();
  s.customActions.push({
    key,
    label,
    noLocation: locVal === 'noLocation',
    fieldOnly:  locVal === 'fieldOnly',
    custom:     true,
  });
  saveSettings().then(() => renderSettings());
}

export function settingsRemoveCustomAction(idx) {
  const s = getSettings();
  s.customActions.splice(idx, 1);
  saveSettings().then(() => renderSettings());
}