// ═══════════════════════════════════════════
// matches-timer.js — timer, placar, período
// ═══════════════════════════════════════════

import { S } from '../state.js';
import { DB } from '../db.js';
import { toast } from '../utils.js';
import { MS } from './matches-state.js';

export function updateScoreboard() {
  document.getElementById('md-score-our').textContent = MS.match.stats.scoreOur;
  document.getElementById('md-score-opp').textContent = MS.match.stats.scoreOpp;
}

export function updateTimerDisplay() {
  const secs = MS.match.stats.timerSecs;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  document.getElementById('md-timer').textContent =
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.getElementById('md-period-label').textContent =
    MS.match.stats.period === 1 ? '1ª PARTE' : '2ª PARTE';
  const half = MS.match.halfDuration || 30;
  const durEl = document.getElementById('md-half-duration');
  if (durEl) durEl.textContent = `${half} MIN / PARTE`;
}

export function updateTimerButtons() {
  document.getElementById('md-btn-start').style.display = MS.timerRunning ? 'none' : '';
  document.getElementById('md-btn-pause').style.display = MS.timerRunning ? '' : 'none';
  document.getElementById('md-btn-half').style.display  = MS.timerRunning ? '' : 'none';
}

export function timerStop() {
  if (MS.timerInterval) { clearInterval(MS.timerInterval); MS.timerInterval = null; }
  MS.timerRunning = false;
}

export function matchTimerStart() {
  if (MS.timerRunning) return;
  MS.timerRunning = true;
  updateTimerButtons();
  MS.match.status = 'a_decorrer';
  document.getElementById('md-status').value = 'a_decorrer';
  const halfSecs = (MS.match.halfDuration || 30) * 60;
  MS.timerInterval = setInterval(() => {
    if (MS.match.stats.timerSecs < halfSecs) {
      MS.match.stats.timerSecs++;
      updateTimerDisplay();
      if (MS.match.stats.timerSecs % 30 === 0) DB.matches.put(MS.match);
    } else {
      timerStop(); updateTimerButtons();
      if (MS.match.stats.period === 1) toast('Fim da 1ª parte!', 'success');
      else {
        toast('Fim do jogo!', 'success');
        MS.match.status = 'finalizado';
        document.getElementById('md-status').value = 'finalizado';
      }
      DB.matches.put(MS.match);
    }
  }, 1000);
}

export function matchTimerPause() {
  timerStop(); updateTimerButtons(); DB.matches.put(MS.match);
}

export function matchTimerHalf() {
  timerStop();
  MS.match.stats.period = 2;
  MS.match.stats.timerSecs = 0;
  updateTimerDisplay(); updateTimerButtons();
  DB.matches.put(MS.match);
  toast('Intervalo — 2ª parte pronta a iniciar', 'success');
}

export function adjustTimer() {
  if (!MS.match) return;
  document.getElementById('timer-min').value = Math.floor(MS.match.stats.timerSecs / 60);
  document.getElementById('timer-sec').value = MS.match.stats.timerSecs % 60;
  document.getElementById('modal-timer').classList.add('open');
}

export function confirmAdjustTimer() {
  const min = Math.min(parseInt(document.getElementById('timer-min').value) || 0, 30);
  const sec = Math.min(parseInt(document.getElementById('timer-sec').value) || 0, 59);
  MS.match.stats.timerSecs = min * 60 + sec;
  updateTimerDisplay();
  DB.matches.put(MS.match);
  document.getElementById('modal-timer').classList.remove('open');
  toast('Tempo ajustado', 'success');
}