// ═══════════════════════════════════════════
// app.js — ponto de entrada da aplicação
// ═══════════════════════════════════════════

import { openDB } from './db.js';
import { S } from './state.js';
import { goHome, openSeason, showSec, setBreadcrumb } from './nav.js';
import { renderSeasons, createSeason, quickToggleEnded, toggleSeasonEnded, deleteSeason, getSeasonById } from './seasons.js';
import { fillInfoForm, setInfoMode, saveInfo, addPavilion, removePavilion, addLeague, removeLeague, addCup, removeCup } from './info.js';
import { uploadOwnBadge, removeOwnBadge } from './badge.js';
import { renderPlayers, openPlayerProfile, openEditCurrentPlayer, deleteCurrentPlayer, openAddPlayer, openEditPlayer, savePlayer, deletePlayer } from './players.js';
import { renderOpponents, openAddOpponent, openEditOpponent, saveOpponent, openOpponentProfile, saveOpponentAnalysis, openEditCurrentOpponent, deleteCurrentOpponent, openAddOppPlayer, openEditOppPlayer, saveOppPlayer, openOppPlayerProfile, saveOppPlayerNotes, deleteCurrentOppPlayer } from './opponents.js';
import {
  renderMatches, openAddMatch, openEditMatch, saveMatch, deleteMatch,
  onMatchHomeChange, onMatchCompetitionSelect, onMatchVenueSelect,
  openMatchDetail, closeMatchDetail, saveMatchStatus, confirmSquad, openMatchEvents,
  switchTab, selectPlayer,
  registerAction, locFieldClick, locGoalClick, locNextStep, locConfirm, locSkip, locSelectOppPlayer, locSelectOurGk,
  matchTimerStart, matchTimerPause, matchTimerHalf, adjustTimer, confirmAdjustTimer,
  renderJogoHeatmaps, renderAdvHeatmaps, hmSetFilter, hmSetGkFilter, hmSetAdvFilter, hmSetAdvGkFilter, hmSetViewMode,
} from './matches/matches.js';
import { closeModal } from './utils.js';
import { renderSettings, settingsSetHalf, settingsToggleAction, settingsAddCustomAction, settingsRemoveCustomAction } from './settings.js';

// ── openSeasonById — lookup seguro sem JSON no onclick ──
function openSeasonById(id) {
  const s = getSeasonById(id);
  if (s) openSeason(s);
}

// ── Objeto público da aplicação ────────────
export const app = {
  // nav
  goHome, openSeason, openSeasonById, showSec,
  // render (usados por nav.js via window.app)
  renderSeasons, fillInfoForm, renderPlayers, renderOpponents, renderMatches,
  // seasons
  createSeason, quickToggleEnded, toggleSeasonEnded, deleteSeason,
  // info
  setInfoMode, saveInfo, addPavilion, removePavilion, addLeague, removeLeague, addCup, removeCup,
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
  onMatchHomeChange, onMatchCompetitionSelect, onMatchVenueSelect,
  openMatchDetail, closeMatchDetail, saveMatchStatus, confirmSquad,
  switchTab, selectPlayer, registerAction,
  locFieldClick, locGoalClick, locNextStep, locConfirm, locSkip, locSelectOppPlayer, locSelectOurGk,
  renderJogoHeatmaps, renderAdvHeatmaps, hmSetFilter, hmSetGkFilter, hmSetAdvFilter, hmSetAdvGkFilter, hmSetViewMode,
  matchTimerStart, matchTimerPause, matchTimerHalf, adjustTimer, confirmAdjustTimer,
  // utils
  closeModal,
  // settings
  renderSettings, settingsSetHalf, settingsToggleAction, settingsAddCustomAction, settingsRemoveCustomAction,
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