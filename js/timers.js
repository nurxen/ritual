// =====================================================================
//  Temporizadores de producto (mascarillas, lotion pack, aceite, pose…)
//  - Varios a la vez, siguen funcionando aunque cambies de pantalla
//  - Se guardan en este móvil: si cierras y vuelves, siguen donde iban
//  - Al terminar: pitido, vibración (Android) y aviso
// =====================================================================
import { esc } from './ui.js';

const KEY = 'ritual_timers_v1';
let list = [];
let tick = null; let audio = null; let wake = null;

const load = () => { try { list = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { list = []; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* nada */ } };
export const fmtSec = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const fmtShortSec = s => s >= 60 ? `${Math.round(s / 60 * 10) / 10}′`.replace('.', ',') : `${s}″`;

export const TIMER_KINDS = {
  on: { l: 'Dejar actuar', done: 'Ya puedes retirarlo' },
  massage: { l: 'Masajear', done: 'Ya puedes aclarar' },
  wait: { l: 'Esperar antes del siguiente paso', done: 'Ya puedes seguir' },
};

// Sugerencias por tipo de producto (siempre editables)
export function suggestTimer(d) {
  const t = `${d.type || ''} ${d.name || ''}`.toLowerCase();
  if (/aceite limpiador|cleansing oil/.test(t)) return { sec: 60, kind: 'massage', after: 'Emulsiona con un poco de agua, aclara y sigue con la espuma.' };
  if (/t[oó]nico/.test(t)) return { sec: 360, kind: 'on', after: 'Retira los discos y pon la hidratante con la piel aún húmeda.', label: 'Lotion pack (5–7 min)' };
  if (/mascarilla/.test(t) && /pelo|banana|sand[ií]a|cacao/.test(t + ' ' + (d.area || '').toLowerCase())) return { sec: 300, kind: 'on', after: 'Aclara bien. Ajusta el tiempo a lo que diga el envase.' };
  if (/mascarilla/.test(t)) return { sec: 600, kind: 'on', after: 'Retírala y sella con la hidratante. Ajusta el tiempo a lo que diga el envase.' };
  if (/protector solar/.test(t)) return { sec: 300, kind: 'wait', after: 'Ya puedes ponerte la base o el corrector.' };
  if (/exfoliante/.test(t)) return { sec: 60, kind: 'massage', after: 'Aclara con agua templada, sin frotar más.' };
  return null;
}

// --------- sonido y avisos ---------
function ensureAudio() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch { audio = null; }
}
function beep() {
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.35, 0.7].forEach(t => {
    const o = audio.createOscillator(); const g = audio.createGain();
    o.type = 'sine'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, now + t); g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.25);
    o.connect(g).connect(audio.destination); o.start(now + t); o.stop(now + t + 0.3);
  });
}
async function notify(t) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const body = t.after || 'Listo';
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) reg.showNotification(`⏱ ${t.label}`, { body, tag: t.id, icon: 'icons/icon-192.png' });
    else new Notification(`⏱ ${t.label}`, { body });
  } catch { /* nada */ }
}
async function keepAwake() {
  try { if ('wakeLock' in navigator && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener?.('release', () => { wake = null; }); } } catch { wake = null; }
}
function releaseAwake() { try { wake?.release(); } catch { /* nada */ } wake = null; }

// --------- API ---------
export function startTimer({ label, sec, after = '', color = '#A7BCEB' }) {
  ensureAudio();
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* nada */ }
  const id = Math.random().toString(36).slice(2);
  list.push({ id, label, total: sec, end: Date.now() + sec * 1000, after, color, fired: false, paused: null });
  save(); render(); run(); keepAwake();
  return id;
}
export const timersRunning = () => list.filter(t => !t.fired).length;

function remaining(t) { return t.paused !== null && t.paused !== undefined ? t.paused : (t.end - Date.now()) / 1000; }
function fire(t) {
  t.fired = true; save();
  beep(); try { navigator.vibrate?.([300, 150, 300, 150, 300]); } catch { /* nada */ }
  notify(t);
}
function run() {
  clearInterval(tick);
  if (!list.length) { releaseAwake(); render(); return; }
  tick = setInterval(() => {
    for (const t of list) if (!t.fired && t.paused == null && remaining(t) <= 0) fire(t);
    render();
    if (!list.some(t => !t.fired)) releaseAwake();
  }, 500);
}

// --------- interfaz: dock flotante ---------
let lastKey = '';
function render() {
  let dock = document.getElementById('timerDock');
  if (!list.length) { dock?.remove(); lastKey = ''; document.body.classList.remove('has-timers'); return; }
  if (!dock) { dock = document.createElement('div'); dock.id = 'timerDock'; document.body.appendChild(dock); bindDock(dock); lastKey = ''; }
  document.body.classList.add('has-timers');
  // Solo se reconstruye cuando cambia algo (nuevo, terminado, pausa); si no, se actualizan los números
  const key = list.map(t => `${t.id}:${t.fired ? 1 : 0}:${t.paused != null ? 1 : 0}`).join('|');
  if (key !== lastKey) {
    lastKey = key;
    dock.innerHTML = list.map(t => `<div class="tmr ${t.fired ? 'done' : ''}" data-id="${t.id}" style="--c:${esc(t.color)}">
      <div class="tmr-bar"><i></i></div>
      <div class="tmr-row"><span class="tmr-time"></span>
        <span class="tmr-label"><b>${esc(t.label)}</b>${t.fired ? `<br><span>${esc(t.after || 'Listo')}</span>` : ''}</span>
        ${t.fired ? '<button class="tmr-btn ok" data-act="ok">OK</button>'
          : `<button class="tmr-btn" data-act="pause" aria-label="${t.paused != null ? 'Seguir' : 'Pausa'}">${t.paused != null ? '▶' : '❚❚'}</button><button class="tmr-btn" data-act="plus">+1′</button><button class="tmr-btn" data-act="x" aria-label="Cancelar">✕</button>`}
      </div></div>`).join('');
  }
  for (const t of list) {
    const el = dock.querySelector(`[data-id="${t.id}"]`); if (!el) continue;
    const r = remaining(t);
    el.querySelector('.tmr-time').textContent = t.fired ? '✓' : fmtSec(r);
    el.querySelector('.tmr-bar i').style.width = `${t.fired ? 100 : Math.min(100, Math.max(0, (1 - r / t.total) * 100))}%`;
  }
}
function bindDock(dock) {
  dock.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    ensureAudio();
    const t = list.find(x => x.id === b.closest('[data-id]').dataset.id); if (!t) return;
    const a = b.dataset.act;
    if (a === 'ok' || a === 'x') list = list.filter(x => x !== t);
    else if (a === 'plus') { if (t.paused != null) t.paused += 60; else t.end += 60000; t.total += 60; if (t.fired) { t.fired = false; } }
    else if (a === 'pause') {
      if (t.paused != null) { t.end = Date.now() + t.paused * 1000; t.paused = null; } else t.paused = remaining(t);
    }
    save(); render(); run();
  });
}

// Al volver a la app, comprueba si alguno terminó mientras tanto
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    for (const t of list) if (!t.fired && t.paused == null && remaining(t) <= 0) fire(t);
    render(); if (list.some(t => !t.fired)) keepAwake();
  }
});
load(); render(); if (list.length) run();
