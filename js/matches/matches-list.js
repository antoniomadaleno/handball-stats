// ═══════════════════════════════════════════
// matches-list.js — lista de jogos (CRUD)
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { esc, toast, closeModal, fmtDatetime, emptyState } from '../utils.js';

export function renderMatches() {
  Promise.all([DB.matches.bySeason(S.season.id), DB.opponents.bySeason(S.season.id)]).then(([matches, opps]) => {
    const oppMap = Object.fromEntries(opps.map(o => [o.id, o]));
    document.getElementById('matches-count').textContent = matches.length + ' jogo(s)';
    const el = document.getElementById('matches-list');
    if (!matches.length) { el.innerHTML = emptyState('🏐', 'Sem jogos criados.'); return; }

    const info    = S.season.info || {};
    const myShort = info.teamShort || 'NÓS';
    matches.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

    el.innerHTML = matches.map(m => {
      const opp  = oppMap[m.opponent_id] || { short_name: '?' };
      const home = m.home === 'home' ? myShort : opp.short_name;
      const away = m.home === 'home' ? opp.short_name : myShort;
      const date = m.datetime ? fmtDatetime(new Date(m.datetime)) : 'Data não definida';
      const s = m.stats;
      const scoreTxt = s ? ` · ${s.scoreOur}–${s.scoreOpp}` : '';
      const compTxt  = [m.competition, m.round].filter(Boolean).join(' · ');
      const statusBadge = {
        'por_começar': '<span class="badge b-scout">Por começar</span>',
        'a_decorrer':  '<span class="badge b-active">A decorrer</span>',
        'finalizado':  '<span class="badge b-ended">Finalizado</span>',
      }[m.status || 'por_começar'] || '';
      return `<div class="match-card">
        <div style="font-size:18px">🏐</div>
        <div style="flex:1">
          <div class="match-vs">${home} <span style="color:var(--text3)">vs</span> ${away} ${statusBadge}${scoreTxt}</div>
          <div class="match-meta">${date}${compTxt ? ' · ' + compTxt : ''} · ${m.venue || '—'}</div>
        </div>
        <div style="display:flex;gap:6px" onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" onclick="app.openEditMatch(${m.id})">Editar</button>
          <button class="btn btn-primary btn-sm"   onclick="app.openMatchDetail(${m.id})">Abrir</button>
          <button class="btn btn-danger btn-sm"    onclick="app.deleteMatch(${m.id})">Apagar</button>
        </div>
      </div>`;
    }).join('');
  });
}

// ── Helpers para preencher o modal ─────────

function buildCompetitionOptions(current) {
  const info = (S.season && S.season.info) || {};
  const leagues = info.leagues || (info.league ? [{ name: info.league }] : []);
  const cups    = info.cups    || [];

  const opts = [{ value: 'amigavel', label: 'Amigável' }];
  leagues.forEach(l => { if (l.name) opts.push({ value: l.name, label: l.name }); });
  cups.forEach(c => {
    const label = c.type + (c.name ? ' — ' + c.name : '');
    if (c.type) opts.push({ value: label, label });
  });
  opts.push({ value: '__custom__', label: 'Outra (personalizada)...' });

  const currentInList = opts.some(o => o.value === current);
  return opts.map(o =>
    `<option value="${esc(o.value)}" ${(current && o.value === current) || (!currentInList && o.value === '__custom__') ? 'selected' : ''}>${esc(o.label)}</option>`
  ).join('');
}

function buildVenueOptions(home, current) {
  const info = (S.season && S.season.info) || {};
  const pavs = info.pavilions || (info.pavilion ? [{ name: info.pavilion }] : []);

  if (home !== 'home' || !pavs.length) return null;

  const opts = pavs.map(p => ({ value: p.name, label: p.name + (p.address ? ' · ' + p.address : '') }));
  opts.push({ value: '__custom__', label: 'Outro...' });

  return opts.map(o =>
    `<option value="${esc(o.value)}" ${current && o.value === current ? 'selected' : ''}>${esc(o.label)}</option>`
  ).join('');
}

function applyModalState(homeVal, compVal, venueVal) {
  // Competição
  const compSelect = document.getElementById('mm-competition-select');
  compSelect.innerHTML = buildCompetitionOptions(compVal);
  const isCustomComp = compVal && !Array.from(compSelect.options).some(o => o.value === compVal && o.value !== '__custom__');
  const showCustomComp = compSelect.value === '__custom__' || isCustomComp;
  document.getElementById('mm-competition-custom-wrap').style.display = showCustomComp ? '' : 'none';
  if (isCustomComp) document.getElementById('mm-competition').value = compVal || '';
  else if (!showCustomComp) document.getElementById('mm-competition').value = '';

  // Pavilhão
  const venueOpts = buildVenueOptions(homeVal, venueVal);
  const venueSelect = document.getElementById('mm-venue-select');
  if (venueOpts) {
    venueSelect.innerHTML = venueOpts;
    venueSelect.style.display = '';
    const isCustomVenue = venueVal && !Array.from(venueSelect.options).some(o => o.value === venueVal && o.value !== '__custom__');
    if (venueSelect.value === '__custom__' || isCustomVenue) {
      document.getElementById('mm-venue').style.display = '';
      document.getElementById('mm-venue').value = venueVal || '';
    } else {
      document.getElementById('mm-venue').style.display = 'none';
      document.getElementById('mm-venue').value = venueSelect.value;
    }
  } else {
    venueSelect.style.display = 'none';
    document.getElementById('mm-venue').style.display = '';
    document.getElementById('mm-venue').value = venueVal || '';
  }
}

// ── Handlers chamados pelo HTML ────────────

export function onMatchHomeChange(val) {
  const comp  = document.getElementById('mm-competition-select').value;
  const venue = document.getElementById('mm-venue').value;
  applyModalState(val, comp === '__custom__' ? venue : comp, venue);
}

export function onMatchCompetitionSelect(val) {
  const showCustom = val === '__custom__';
  document.getElementById('mm-competition-custom-wrap').style.display = showCustom ? '' : 'none';
  if (!showCustom) document.getElementById('mm-competition').value = '';
}

export function onMatchVenueSelect(val) {
  const input = document.getElementById('mm-venue');
  if (val === '__custom__') {
    input.style.display = '';
    input.value = '';
    input.focus();
  } else {
    input.style.display = 'none';
    input.value = val;
  }
}

// ── CRUD ───────────────────────────────────

export function openAddMatch() {
  DB.opponents.bySeason(S.season.id).then(opps => {
    if (!opps.length) { toast('Adiciona adversários primeiro', 'error'); if (window.app) window.app.showSec('opponents'); return; }
    document.getElementById('mm-opponent').innerHTML = opps.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('');
    document.getElementById('modal-match-title').textContent = 'Criar jogo';
    document.getElementById('mm-id').value    = '';
    document.getElementById('mm-type').value  = 'proprio';
    document.getElementById('mm-home').value  = 'home';
    document.getElementById('mm-round').value = '';
    document.getElementById('mm-datetime').value = '';
    applyModalState('home', null, null);
    document.getElementById('modal-match').classList.add('open');
  });
}

export function openEditMatch(id) {
  Promise.all([DB.matches.bySeason(S.season.id), DB.opponents.bySeason(S.season.id)]).then(([matches, opps]) => {
    const m = matches.find(x => x.id === id);
    document.getElementById('mm-opponent').innerHTML = opps.map(o => `<option value="${o.id}"${o.id === m.opponent_id ? ' selected' : ''}>${esc(o.name)}</option>`).join('');
    document.getElementById('modal-match-title').textContent = 'Editar jogo';
    document.getElementById('mm-id').value       = m.id;
    document.getElementById('mm-type').value     = m.type     || 'proprio';
    document.getElementById('mm-home').value     = m.home     || 'home';
    document.getElementById('mm-round').value    = m.round    || '';
    document.getElementById('mm-datetime').value = m.datetime || '';
    applyModalState(m.home || 'home', m.competition || null, m.venue || null);
    document.getElementById('modal-match').classList.add('open');
  });
}

export function saveMatch() {
  const id       = document.getElementById('mm-id').value;
  const compSel  = document.getElementById('mm-competition-select').value;
  const compCustom = document.getElementById('mm-competition').value.trim();
  const competition = compSel === '__custom__' ? compCustom : (compSel || compCustom);

  const venueSel   = document.getElementById('mm-venue-select');
  const venueInput = document.getElementById('mm-venue').value.trim();
  const venue = (venueSel.style.display !== 'none' && venueSel.value !== '__custom__')
    ? venueSel.value
    : venueInput;

  const data = {
    season_id:   S.season.id,
    type:        document.getElementById('mm-type').value,
    opponent_id: parseInt(document.getElementById('mm-opponent').value),
    home:        document.getElementById('mm-home').value,
    competition,
    round:       document.getElementById('mm-round').value.trim(),
    datetime:    document.getElementById('mm-datetime').value,
    venue,
    status:      'por_começar',
  };
  if (!data.opponent_id) return toast('Seleciona um adversário', 'error');
  const op = id
    ? DB.matches.bySeason(S.season.id).then(ms => { const m = ms.find(x => x.id === parseInt(id)); Object.assign(m, data); return DB.matches.put(m); })
    : DB.matches.add({ ...data, halfDuration: (S.season?.settings?.halfDuration) || 30 });
  op.then(() => { closeModal('modal-match'); renderMatches(); toast('Jogo guardado', 'success'); });
}

export function deleteMatch(id) {
  if (!confirm('Apagar este jogo?')) return;
  DB.matches.del(id).then(() => { renderMatches(); toast('Jogo apagado'); });
}