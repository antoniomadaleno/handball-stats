// ═══════════════════════════════════════════
// info.js — informações da época
// ═══════════════════════════════════════════

import { S } from './state.js';
import { DB } from './db.js';
import { esc, toast } from './utils.js';
import { renderBadge, getInitials } from './badge.js';

export function fillInfoForm(season) {
  const i = season.info || {};
  const fields = {
    'i-team': i.teamName, 'i-short': i.teamShort,
    'i-coach': i.coach, 'i-coach2': i.coach2, 'i-coachgr': i.coachGR, 'i-physio': i.physio,
    'i-president': i.president, 'i-delegate': i.delegate,
  };
  Object.keys(fields).forEach(k => { document.getElementById(k).value = fields[k] || ''; });
  renderPavilions(i.pavilions || (i.pavilion ? [{ name: i.pavilion, address: i.address }] : []));
  // Migração: se tinha league antigo, converte para array
  const leagues = i.leagues || (i.league ? [{ name: i.league, division: i.division || '', federation: i.federation || '' }] : [{ name: '', division: '', federation: '' }]);
  const cups    = i.cups    || [];
  renderLeagues(leagues);
  renderCups(cups);
  renderInfoView(season);
  const hasData = i.teamName || i.league || i.leagues || i.coach;
  setInfoMode(hasData ? 'view' : 'edit');
}

export function setInfoMode(mode) {
  document.getElementById('info-view').style.display = mode === 'view' ? '' : 'none';
  document.getElementById('info-edit').style.display = mode === 'edit' ? '' : 'none';
  if (mode === 'edit') renderBadge('own-badge', (S.season && S.season.info) || {});
}

export function renderInfoView(season) {
  const i = (season || S.season).info || {};

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

  // Campeonatos
  const leagues = i.leagues || (i.league ? [{ name: i.league, division: i.division || '', federation: i.federation || '' }] : []);
  const leaguesHtml = leagues.length
    ? leagues.map((l, idx) => {
        const title = leagues.length > 1 ? `Campeonato ${idx + 1}` : 'Campeonato';
        return [
          row(title, l.name),
          l.division   ? row('Série / Divisão', l.division)   : '',
          l.federation ? row('Federação', l.federation) : '',
        ].filter(Boolean).join('');
      }).join('')
    : '';

  // Taças
  const cups = i.cups || [];
  const cupsHtml = cups.length
    ? cups.map((c, idx) => {
        const label = `Taça / Competição${cups.length > 1 ? ' ' + (idx + 1) : ''}`;
        const val = c.type + (c.name ? ' · ' + c.name : '');
        return row(label, val);
      }).filter(Boolean).join('')
    : '';

  const competitionBlock = (leaguesHtml || cupsHtml)
    ? `<div class="form-block" style="margin-bottom:16px"><div class="form-block-title">Competições</div>${leaguesHtml}${cupsHtml}</div>`
    : '';

  let html = badgeBlock
    + competitionBlock
    + block('Equipa técnica', [row('Treinador principal', i.coach), row('Treinador adjunto', i.coach2), row('Treinador de GR', i.coachGR), row('Fisioterapeuta', i.physio)])
    + block('Dirigentes',     [row('Presidente', i.president), row('Delegado', i.delegate)]);

  if (!i.teamName && !i.league && !i.leagues && !i.coach)
    html = `<div class="empty"><div class="empty-icon">⚙️</div><div class="empty-text">Sem informações. Clica em Editar para preencher.</div></div>`;

  document.getElementById('info-view-body').innerHTML = html;
}

export function saveInfo() {
  if (!S.season) return;
  const prevBadge = (S.season.info && S.season.info.badge) || null;
  const pavs    = collectPavilions();
  const leagues = collectLeagues();
  const cups    = collectCups();
  const firstLeague = leagues[0] || {};
  S.season.info = {
    badge:      prevBadge,
    teamName:   document.getElementById('i-team').value.trim(),
    teamShort:  document.getElementById('i-short').value.trim().toUpperCase(),
    pavilions:  pavs,
    pavilion:   (pavs[0] || {}).name    || '',
    address:    (pavs[0] || {}).address || '',
    leagues,
    cups,
    // retrocompatibilidade
    league:     firstLeague.name       || '',
    division:   firstLeague.division   || '',
    federation: firstLeague.federation || '',
    coach:      document.getElementById('i-coach').value.trim(),
    coach2:     document.getElementById('i-coach2').value.trim(),
    coachGR:    document.getElementById('i-coachgr').value.trim(),
    physio:     document.getElementById('i-physio').value.trim(),
    president:  document.getElementById('i-president').value.trim(),
    delegate:   document.getElementById('i-delegate').value.trim(),
  };
  DB.seasons.put(S.season).then(() => {
    try { renderInfoView(S.season); } catch(e) { console.error('renderInfoView error:', e); }
    setInfoMode('view');
    renderBadge('sb-badge', S.season.info);
    document.getElementById('sb-team-name').textContent = S.season.info.teamName || '';
    if(window.app) window.app.renderSeasons();
    toast('Informações guardadas', 'success');
  }).catch(e => { console.error('saveInfo DB error:', e); toast('Erro ao guardar', 'error'); });
}

// ── Campeonatos ────────────────────────────

export function renderLeagues(leagues) {
  const c = document.getElementById('leagues-container');
  if (!c) return;
  if (!leagues || !leagues.length) leagues = [{ name: '', division: '', federation: '' }];
  c.innerHTML = leagues.map((l, i) => `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:12px;margin-bottom:8px">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end">
        <div class="field"><label>Campeonato</label><input type="text" class="lg-name" placeholder="ex: Campeonato Nacional" value="${esc(l.name || '')}" /></div>
        <div class="field"><label>Série / Divisão</label><input type="text" class="lg-division" placeholder="ex: Série B" value="${esc(l.division || '')}" /></div>
        <div class="field"><label>Federação</label><input type="text" class="lg-federation" placeholder="ex: FAP" value="${esc(l.federation || '')}" /></div>
        ${leagues.length > 1
          ? `<button type="button" class="btn btn-ghost btn-sm" onclick="app.removeLeague(this)" style="align-self:center;padding:6px 8px">✕</button>`
          : '<div></div>'}
      </div>
    </div>`).join('');
}

export function addLeague() {
  const leagues = collectLeagues();
  leagues.push({ name: '', division: '', federation: '' });
  renderLeagues(leagues);
  const inputs = document.querySelectorAll('#leagues-container .lg-name');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removeLeague(btn) {
  btn.closest('div[style]').remove();
  if (!document.querySelectorAll('#leagues-container > div').length)
    renderLeagues([{ name: '', division: '', federation: '' }]);
}

export function collectLeagues() {
  const result = [];
  document.querySelectorAll('#leagues-container > div').forEach(row => {
    const name       = row.querySelector('.lg-name').value.trim();
    const division   = row.querySelector('.lg-division').value.trim();
    const federation = row.querySelector('.lg-federation').value.trim();
    if (name) result.push({ name, division, federation });
    else if (division || federation) result.push({ name: '', division, federation });
  });
  return result;
}

// ── Taças / Outras competições ─────────────



export function renderCups(cups) {
  const c = document.getElementById('cups-container');
  if (!c) return;
  if (!cups || !cups.length) { c.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:4px 0">Nenhuma taça ou competição adicional.</div>`; return; }
  c.innerHTML = cups.map((cup) => `
    <div class="cup-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:8px;align-items:end">
      <div class="field"><label>Nome da competição</label><input type="text" class="cup-type" placeholder="ex: Taça de Portugal" value="${esc(cup.type || '')}" /></div>
      <div class="field"><label>Fase / Detalhe</label><input type="text" class="cup-name" placeholder="ex: Fase de grupos" value="${esc(cup.name || '')}" /></div>
      <button type="button" class="btn btn-ghost btn-sm" onclick="app.removeCup(this)" style="align-self:center;padding:6px 8px">✕</button>
    </div>`).join('');
}

export function addCup() {
  const cups = collectCups();
  cups.push({ type: '', name: '' });
  renderCups(cups);
  const inputs = document.querySelectorAll('#cups-container .cup-name');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

export function removeCup(btn) {
  btn.closest('.cup-row').remove();
  if (!document.querySelectorAll('#cups-container .cup-row').length)
    renderCups([]);
}

export function collectCups() {
  const result = [];
  document.querySelectorAll('#cups-container .cup-row').forEach(row => {
    const type = row.querySelector('.cup-type').value;
    const name = row.querySelector('.cup-name').value.trim();
    result.push({ type, name });
  });
  return result;
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