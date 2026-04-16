// ═══════════════════════════════════════════
// matches-state.js — estado partilhado dos jogos
// ═══════════════════════════════════════════

export const MS = {
  match:           null,   // jogo atualmente aberto
  players:         [],     // jogadores convocados (objetos completos)
  oppPlayers:      [],     // jogadores do adversário
  timerInterval:   null,
  timerRunning:    false,
  activeTab:       'entrada',
  selectedPlayerId: null,
  pendingAction:   null,   // { playerId, actionKey, fieldX, fieldY, goalX, goalY, oppPlayerId, ourGkId }
};

// Filtros dos heatmaps
export const HM = {
  filter:    'all',
  gkFilter:  'all',
  advFilter: 'all',
  advGkFilter: 'all',
};