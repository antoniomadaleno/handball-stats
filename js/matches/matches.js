// ═══════════════════════════════════════════
// matches.js — orquestrador, re-exporta tudo
// ═══════════════════════════════════════════

export { renderMatches, openAddMatch, openEditMatch, saveMatch, deleteMatch } from './matches-list.js';
export { openMatchDetail, closeMatchDetail, saveMatchStatus, confirmSquad, openMatchEvents } from './matches-detail.js';
export { switchTab, selectPlayer, renderEntrada } from './matches-tabs.js';
export { registerAction, locFieldClick, locGoalClick, locNextStep, locConfirm, locSkip, locSelectOppPlayer, locSelectOurGk, commitAction } from './matches-actions.js';
export { matchTimerStart, matchTimerPause, matchTimerHalf, adjustTimer, confirmAdjustTimer } from './matches-timer.js';
export { renderHeatmap, renderJogoHeatmaps, renderAdvHeatmaps, hmSetFilter, hmSetGkFilter, hmSetAdvFilter, hmSetAdvGkFilter } from './matches-heatmaps.js';