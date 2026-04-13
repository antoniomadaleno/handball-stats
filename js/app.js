// ═══════════════════════════════════════════
// app.js — ponto de entrada da aplicação
// ═══════════════════════════════════════════

import { openDB } from './db.js?v=1775834769';
import { S } from './state.js?v=1775834769';
import { goHome, openSeason, showSec, setBreadcrumb } from './nav.js?v=1775834769';
import { renderSeasons, createSeason, quickToggleEnded, toggleSeasonEnded, deleteSeason, getSeasonById } from './seasons.js?v=1775834769';
import { fillInfoForm, setInfoMode, saveInfo, renderPavilions, addPavilion, removePavilion } from './info.js?v=1775834769';
import { uploadOwnBadge, removeOwnBadge } from './badge.js?v=1775834769';
import { renderPlayers, openPlayerProfile, openEditCurrentPlayer, deleteCurrentPlayer, openAddPlayer, openEditPlayer, savePlayer, deletePlayer } from './players.js?v=1775834769';
import { renderOpponents, openAddOpponent, openEditOpponent, saveOpponent, openOpponentProfile, saveOpponentAnalysis, openEditCurrentOpponent, deleteCurrentOpponent, openAddOppPlayer, openEditOppPlayer, saveOppPlayer, openOppPlayerProfile, saveOppPlayerNotes, deleteCurrentOppPlayer } from './opponents.js?v=1775834769';
import { renderMatches, openAddMatch, openEditMatch, saveMatch, deleteMatch, openMatchEvents } from './matches.js?v=1775834769';
import { closeModal } from './utils.js?v=1775834769';

// ── openSeasonById — lookup seguro sem JSON no onclick ──
function openSeasonById(id) {
  const s = getSeasonById(id);
  if (s) openSeason(s);
}

// ── Objeto público da aplicação ────────────
// Exportado e atribuído a window._appReady pelo index.html
export const app = {
  // nav
  goHome, openSeason, openSeasonById, showSec,
  // render (used by nav.js via window.app)
  renderSeasons, fillInfoForm, renderPlayers, renderOpponents, renderMatches,
  // seasons
  createSeason, quickToggleEnded, toggleSeasonEnded, deleteSeason,
  // info
  setInfoMode, saveInfo, addPavilion, removePavilion,
  // badge
  uploadOwnBadge, removeOwnBadge,
  // players
  openPlayerProfile, openEditCurrentPlayer, deleteCurrentPlayer,
  openAddPlayer, openEditPlayer, savePlayer, deletePlayer,
  // opponents
  openAddOpponent, openEditOpponent, saveOpponent,
  openOpponentProfile, saveOpponentAnalysis,
  openEditCurrentOpponent, deleteCurrentOpponent,
  openAddOppPlayer, openEditOppPlayer, saveOppPlayer,
  openOppPlayerProfile, saveOppPlayerNotes, deleteCurrentOppPlayer,
  // matches
  openAddMatch, openEditMatch, saveMatch, deleteMatch, openMatchEvents,
  // utils
  closeModal,
  // state access (usado no HTML para o botão ← Adversário)
  _S: () => S,
};

// ── Eventos internos ───────────────────────
document.addEventListener('seasons:refresh', () => renderSeasons());
document.addEventListener('season:open', (e) => openSeason(e.detail));

// ── Fechar modais ao clicar fora ───────────
document.querySelectorAll('.modal-backdrop').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});

// ── Arranque ───────────────────────────────
openDB()
  .then(() => { renderSeasons(); setBreadcrumb([]); })
  .catch(err => alert('Erro ao abrir base de dados: ' + err.message));