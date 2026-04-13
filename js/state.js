// ═══════════════════════════════════════════
// state.js — estado global da aplicação
// ═══════════════════════════════════════════

export const S = {
  season:          null,  // época atualmente aberta
  activeSec:       'info',
  currentPlayerId:     null,
  currentOpponentId:   null,
  currentOppPlayerId:  null,
  _oppPlayers:     {},    // cache: { opponent_id: [...players] }
  _pendingOppBadge: null,
};