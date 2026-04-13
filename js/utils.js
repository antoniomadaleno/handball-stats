// ═══════════════════════════════════════════
// utils.js — utilitários partilhados
// ═══════════════════════════════════════════

export function emptyState(icon, text) {
  return `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-text">${text}</div></div>`;
}

export function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show ' + type;
  setTimeout(() => el.className = '', 2500);
}

export function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

export function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtDate(d) {
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDatetime(d) {
  return fmtDate(d) + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export const POS = {
  GR: 'Guarda-redes', EE: 'Ext. Esq.', LE: 'Lat. Esq.',
  CE: 'Central', LD: 'Lat. Dir.', ED: 'Ext. Dir.', PI: 'Pivot',
};

export const POS_ORDER = [
  { key: 'GR', label: 'Guarda-redes' },
  { key: 'EE', label: 'Extremo Esquerdo' },
  { key: 'ED', label: 'Extremo Direito' },
  { key: 'LE', label: 'Lateral Esquerdo' },
  { key: 'LD', label: 'Lateral Direito' },
  { key: 'CE', label: 'Central' },
  { key: 'PI', label: 'Pivot' },
];