// ═══════════════════════════════════════════
// info.js — informações da época
// ═══════════════════════════════════════════

import { S } from './state.js?v=1775834769';
import { DB } from './db.js?v=1775834769';
import { esc, toast } from './utils.js?v=1775834769';
import { renderBadge, getInitials } from './badge.js?v=1775834769';

export function fillInfoForm(season) {
  const i = season.info || {};
  const fields = {
    'i-team': i.teamName, 'i-short': i.teamShort,
    'i-league': i.league, 'i-division': i.division, 'i-federation': i.federation,
    'i-coach': i.coach, 'i-coach2': i.coach2, 'i-coachgr': i.coachGR, 'i-physio': i.physio,
    'i-president': i.president, 'i-delegate': i.delegate,
  };
  Object.keys(fields).forEach(k => { document.getElementById(k).value = fields[k] || ''; });
  renderPavilions(i.pavilions || (i.pavilion ? [{ name: i.pavilion, address: i.address }] : []));
  renderInfoView();
  const hasData = i.teamName || i.league || i.coach;
  setInfoMode(hasData ? 'view' : 'edit');
}

export function setInfoMode(mode) {
  document.getElementById('info-view').style.display = mode === 'view' ? '' : 'none';
  document.getElementById('info-edit').style.display = mode === 'edit' ? '' : 'none';
  if (mode === 'edit') renderBadge('own-badge', (S.season && S.season.info) || {});
}

export function renderInfoView() {
  const i = S.season.info || {};

  const row = (label, val) => val
    ? `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${esc(val)}</span></div>`
    : '';

  const block = (title, rows) => {
    const content = rows.filter(Boolean).join('');
    return content
      ? `<div class="form-block" style="margin-bottom:16px"><div class="form-block-title">${title}</div>${content}</div>`
      : '';
  };

  const badgeHtml = i.badge
    ? `<img src="${i.badge}" style="width:100%;height:100%;object-fit:contain" />`
    : `<span class="initials" style="font-size:16px">${esc(getInitials(i.teamName || ''))}</span>`;

  const pavs = i.pavilions || (i.pavilion ? [{ name: i.pavilion, address: i.address }] : []);
  const pavsHtml = pavs.map((p, idx) =>
    row(pavs.length > 1 ? `Pavilhão ${idx + 1}` : 'Pavilhão', p.name + (p.address ? ' · ' + p.address : ''))
  ).join('');

  const badgeBlock = `<div class="form-block" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:16px;padding:6px 0">
      <div class="team-badge" style="width:56px;height:56px;border-radius:10px;flex-shrink:0">${badgeHtml}</div>
      <div>
        <div style="font-family:var(--font-cond);font-size:20px;font-weight:700">${esc(i.teamName || '—')}</div>
        <div style="font-size:12px;color:var(--text2)">${esc(i.teamShort || '')}${i.pavilion ? ' · ' + esc(i.pavilion) : ''}</div>
      </div>
    </div>
    ${pavsHtml}
  </div>`;

  let html = badgeBlock
    + block('Competição',     [row('Campeonato', i.league), row('Série / Divisão', i.division), row('Federação', i.federation)])
    + block('Equipa técnica', [row('Treinador principal', i.coach), row('Treinador adjunto', i.coach2), row('Treinador de GR', i.coachGR), row('Fisioterapeuta', i.physio)])
    + block('Dirigentes',     [row('Presidente', i.president), row('Delegado', i.delegate)]);

  if (!i.teamName && !i.league && !i.coach)
    html = `<div class="empty"><div class="empty-icon">⚙️</div><div class="empty-text">Sem informações. Clica em Editar para preencher.</div></div>`;

  document.getElementById('info-view-body').innerHTML = html;
}

export function saveInfo() {
  if (!S.season) return;
  const prevBadge = (S.season.info && S.season.info.badge) || null;
  const pavs = collectPavilions();
  S.season.info = {
    badge:      prevBadge,
    teamName:   document.getElementById('i-team').value.trim(),
    teamShort:  document.getElementById('i-short').value.trim().toUpperCase(),
    pavilions:  pavs,
    pavilion:   (pavs[0] || {}).name    || '',
    address:    (pavs[0] || {}).address || '',
    league:     document.getElementById('i-league').value.trim(),
    division:   document.getElementById('i-division').value.trim(),
    federation: document.getElementById('i-federation').value.trim(),
    coach:      document.getElementById('i-coach').value.trim(),
    coach2:     document.getElementById('i-coach2').value.trim(),
    coachGR:    document.getElementById('i-coachgr').value.trim(),
    physio:     document.getElementById('i-physio').value.trim(),
    president:  document.getElementById('i-president').value.trim(),
    delegate:   document.getElementById('i-delegate').value.trim(),
  };
  DB.seasons.put(S.season).then(() => {
    renderInfoView();
    setInfoMode('view');
    renderBadge('sb-badge', S.season.info);
    document.getElementById('sb-team-name').textContent = S.season.info.teamName || '';
    if(window.app) window.app.renderSeasons();
    toast('Informações guardadas', 'success');
  });
}

// ── Pavilhões ──────────────────────────────

export function renderPavilions(pavs) {
  const c = document.getElementById('pavilions-container');
  if (!c) return;
  if (!pavs || !pavs.length) pavs = [{ name: '', address: '' }];
  c.innerHTML = pavs.map((p, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:8px">
      <input type="text" class="pav-name" placeholder="Nome do pavilhão" value="${esc(p.name || '')}" />
      <input type="text" class="pav-addr" placeholder="Morada (opcional)"  value="${esc(p.address || '')}" />
      ${pavs.length > 1
        ? `<button type="button" class="btn btn-ghost btn-sm" onclick="app.removePavilion(this)" style="align-self:center;padding:6px 8px">✕</button>`
        : '<div></div>'}
    </div>`).join('');
}

export function addPavilion() {
  const pavs = collectPavilions();
  pavs.push({ name: '', address: '' });
  renderPavilions(pavs);
  const inputs = document.querySelectorAll('#pavilions-container .pav-name');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removePavilion(btn) {
  btn.parentElement.remove();
  if (!document.querySelectorAll('#pavilions-container > div').length)
    renderPavilions([{ name: '', address: '' }]);
}

export function collectPavilions() {
  const result = [];
  document.querySelectorAll('#pavilions-container > div').forEach(row => {
    const name = row.querySelector('.pav-name').value.trim();
    const addr = row.querySelector('.pav-addr').value.trim();
    if (name) result.push({ name, address: addr });
  });
  return result;
}