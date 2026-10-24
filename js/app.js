// Arranque, login, perfiles, plantillas, navegación y pantalla HOY
import * as db from './db.js';
import {
  S, loadProfiles, loadProfileData, updateProfile, applyTemplate, TEMPLATES, activeCats, getVal, setVal, isDone,
  isHabit, dayCompletion, itemsOf, careStatus, markCareDone, iplBlock, products, productExpiry, checkRoutine,
  dayPlan, saveItem, loadWeather, weatherTips, settings, saveSettings, catByKey, streak,
  postIpl, scrubBlock, lipsPlan, planApplied, focusCats, minutesOf, unsetCare,
  events, removeEvent, trainingOn, training, bodyPlan, outDays,
} from './store.js';
import { PLANS } from './plans.js';
import {
  esc, $, $$, icon, toast, sheet, closeSheet, today, addDays, diffDays, fmtLong, parseDay,
  avatarHtml, resizeImage, formData, relDay, eur, num,
} from './ui.js';
import { CATALOG, CARE_CATALOG, SECTIONS, QUOTES, CARE_GROUPS, sectionColor, CARE_GROUP_COLORS } from './data.js';
import { renderCare } from './care.js';
import { renderProgress } from './progress.js';
import { renderAgenda } from './agenda.js';
import { renderMente } from './mente.js';
import { renderSettings, openMenu, planSheet } from './settings.js';
import { startTimer, TIMER_KINDS, fmtShortSec } from './timers.js';
import { planVersionApplied } from './store.js';

const app = document.getElementById('app');
const LAST = 'ritual_last_profile';

// ---------------- Tema ----------------
export function applyTheme() {
  const t = localStorage.getItem('ritual_theme') || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#2B2927' : '#F7F5F2');
}

// ---------------- Arranque ----------------
async function boot() {
  applyTheme();
  try { await db.init(); } catch {
    app.innerHTML = '<div class="center-screen"><p>No hay conexión. Comprueba internet y vuelve a abrir la app.</p></div>'; return;
  }
  const session = await db.getSession().catch(() => null);
  if (!session) return renderLogin();
  await enter();
}
async function enter() {
  await loadProfiles();
  const p = S.profiles.find(x => x.id === localStorage.getItem(LAST));
  if (p) await openProfile(p); else renderPicker();
}
export async function openProfile(p) {
  app.innerHTML = '<div class="center-screen"><div class="loader"></div></div>';
  await loadProfileData(p);
  localStorage.setItem(LAST, p.id);
  document.documentElement.style.setProperty('--pc', p.color);
  S.date = today();
  if (!p.onboarded) return renderOnboarding();
  renderShell();
  loadWeather().then(() => { if (!location.hash || location.hash.startsWith('#/hoy')) rerender(); });
}

// ---------------- Login ----------------
function renderLogin(err = '') {
  app.innerHTML = `
  <div class="center-screen login">
    <div class="center"><div class="wordmark">Ritual</div><p class="tagline">tu día, en orden</p></div>
    <form class="card stack" id="loginForm">
      <label class="field"><span>Correo</span><input type="email" name="email" autocomplete="username" required></label>
      <label class="field"><span>Contraseña</span><input type="password" name="password" autocomplete="current-password" required></label>
      ${err ? `<p class="error">${esc(err)}</p>` : ''}
      <button class="btn primary" type="submit">Entrar</button>
    </form>
  </div>`;
  $('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const f = formData(e.target);
    const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Entrando…';
    try { await db.signIn(f.email, f.password); await enter(); } catch { renderLogin('El correo o la contraseña no coinciden.'); }
  };
}

// ---------------- Selector de perfil ----------------
export function renderPicker() {
  localStorage.removeItem(LAST);
  app.innerHTML = `
  <div class="center-screen">
    <div class="center"><div class="wordmark" style="font-size:48px">Ritual</div><p class="tagline">¿Quién eres?</p></div>
    <div class="profile-grid">${S.profiles.map(p => `
      <button class="profile-tile" data-id="${p.id}" style="--pc:${esc(p.color)}">${avatarHtml(p, 'lg')}<span class="pname">${esc(p.name)}</span></button>`).join('')}
    </div>
    ${db.DEMO ? '<p class="demo-note">Modo demo: los datos se guardan solo en este navegador</p>' : ''}
  </div>`;
  $$('.profile-tile').forEach(b => b.onclick = () => openProfile(S.profiles.find(p => p.id === b.dataset.id)));
}

// ---------------- Editor de perfil ----------------
const SWATCHES = ['#F2A9BC', '#F4A988', '#F2CF7E', '#A8C99A', '#96D1CC', '#A7BCEB', '#BDB2F0', '#D3AEE6', '#E8B796', '#CFC7BE'];
const DOW_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const fmtShortD = d => `${DOW_NAMES[parseDay(d).getDay()].toLowerCase()} ${d.slice(8).replace(/^0/, '')}/${d.slice(5, 7).replace(/^0/, '')}`;
export function profileEditor() {
  const p = S.profile; const s = settings();
  const focusOpts = activeCats().filter(c => ['minutes', 'bool_minutes'].includes(c.type));
  sheet('Mi perfil', `
    <div class="stack">
      <div class="row gap"><div id="avPrev">${avatarHtml(p, 'xl')}</div>
        <div class="stack grow">
          <label class="btn ghost small">Subir imagen<input type="file" accept="image/*" id="avFile" hidden></label>
          <input class="input" id="avEmoji" maxlength="4" placeholder="o un emoji" value="${p.avatar && !p.avatar.startsWith('data:') ? esc(p.avatar) : ''}">
        </div></div>
      <label class="field"><span>Nombre</span><input name="name" value="${esc(p.name)}"></label>
      <div class="field"><span>Color</span><div class="swatches">
        ${SWATCHES.map(c => `<button class="swatch ${c === p.color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}
        <input type="color" id="colorPick" value="${esc(p.color)}" aria-label="Color personalizado"></div></div>
      <h3 class="mt">Plan de Hoy</h3>
      <div class="grid2">
        <label class="field"><span>Ejercicio (min)</span><input type="number" name="exerciseGoal" value="${s.exerciseGoal}"></label>
        <label class="field"><span>Tiempo libre habitual (min)</span><input type="number" name="freeTime" value="${s.freeTime}"></label>
      </div>
      <label class="field"><span>Líneas de foco del plan (puedes marcar varias; usan la meta de cada hábito)</span>
        <div class="chips">${focusOpts.map(c => `<label class="chip check"><input type="checkbox" name="focusKeys" data-multi="1" value="${c.key || c.id}" ${focusCats().some(x => x.id === c.id) ? 'checked' : ''}>${esc(c.icon)} ${esc(c.name)}</label>`).join('')}</div></label>
      <label class="field"><span>Minutos al día si el hábito no tiene meta propia</span><input type="number" name="focusGoal" value="${s.focusGoal ?? 30}"></label>
      <h3 class="mt">Mis entrenos</h3>
      <p class="small muted">Con esto la app coloca el IPL, los lavados y el plan de Hoy. Si cambias de horario (p. ej. al empezar a trabajar), cámbialo aquí.</p>
      <div class="stack" id="trainRows">${[1, 2, 3, 4, 5, 6, 0].map(dw => { const t = training().find(x => x.dow === dw); return `<div class="row gap train-row" data-dow="${dw}">
        <label class="chip check" style="min-width:64px"><input type="checkbox" ${t ? 'checked' : ''}>${DOW_NAMES[dw]}</label>
        <input class="input" type="time" value="${t?.time || '09:15'}" aria-label="Hora" style="flex:1">
        <input class="input" type="number" inputmode="numeric" value="${t?.min || 60}" aria-label="Minutos" style="width:72px"><span class="small muted">min</span></div>`; }).join('')}</div>
      <div class="field"><span>Días que sueles salir (la app evita el IPL antes de salir: sin desodorante ni perfume 24 h)</span>
        <div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(dw => `<label class="chip check"><input type="checkbox" name="outDays" data-multi="1" value="${dw}" ${outDays().includes(dw) ? 'checked' : ''}>${DOW_NAMES[dw]}</label>`).join('')}</div></div>
      <h3 class="mt">Ciudad (UV y humedad)</h3>
      <div class="grid3">
        <label class="field"><span>Ciudad</span><input name="city" value="${esc(s.city)}"></label>
        <label class="field"><span>Latitud</span><input type="number" step="0.0001" name="lat" value="${s.lat}"></label>
        <label class="field"><span>Longitud</span><input type="number" step="0.0001" name="lon" value="${s.lon}"></label>
      </div>
      <button class="btn primary" id="saveP">Guardar perfil</button>
    </div>`, body => {
    let avatar = p.avatar; let color = p.color;
    const prev = () => { $('#avPrev', body).innerHTML = avatarHtml({ ...p, avatar, color }, 'xl'); };
    $('#avFile', body).onchange = async e => { const f = e.target.files[0]; if (f) { avatar = await resizeImage(f); prev(); } };
    $('#avEmoji', body).oninput = e => { if (e.target.value) { avatar = e.target.value; prev(); } };
    $$('.swatch', body).forEach(b => b.onclick = () => { color = b.dataset.c; $$('.swatch', body).forEach(x => x.classList.toggle('on', x === b)); prev(); });
    $('#colorPick', body).oninput = e => { color = e.target.value; prev(); };
    $('#saveP', body).onclick = async () => {
      const f = formData(body);
      await updateProfile({ name: f.name || p.name, avatar, color });
      await saveSettings({
        exerciseGoal: f.exerciseGoal ?? 45, freeTime: f.freeTime ?? 120, focusKeys: f.focusKeys || [], focusGoal: f.focusGoal ?? 30,
        city: f.city, lat: f.lat ?? 40.4168, lon: f.lon ?? -3.7038,
        outDays: $$('input[name=outDays]', body).filter(i => i.checked).map(i => Number(i.value)),
        training: $$('.train-row', body).filter(r => $('input[type=checkbox]', r).checked).map(r => ({ dow: Number(r.dataset.dow), time: $('input[type=time]', r).value || null, min: Number($('input[type=number]', r).value) || 60 })),
      });
      sessionStorage.clear();
      document.documentElement.style.setProperty('--pc', color);
      closeSheet(); toast('Perfil guardado'); renderShell();
    };
  });
}

// ---------------- Plantilla inicial ----------------
function renderOnboarding() {
  let sel = 'completa_f';
  const draw = () => {
    const t = TEMPLATES[sel];
    app.innerHTML = `
    <div class="page">
      <div class="ob-head">${avatarHtml(S.profile, 'lg')}<div><h1>Hola, ${esc(S.profile.name)}</h1>
        <p class="muted">Elige con qué empezar. Todo se puede cambiar después.</p></div></div>
      <div class="chips rail">${Object.entries(TEMPLATES).map(([k, v]) => `<button class="chip ${k === sel ? 'on' : ''}" data-t="${k}">${v.label}</button>`).join('')}</div>
      <form id="obForm">
        ${SECTIONS.map(sec => {
          const items = CATALOG.filter(c => c.section === sec);
          return `<div class="section-head" style="--c:${sectionColor(sec)}"><h2 style="color:var(--c-ink)">${sec}</h2></div><div class="card list">${items.map(c => `
            <label class="check-row"><input type="checkbox" name="cats" data-multi="1" value="${c.key}" ${t.cats.includes(c.key) ? 'checked' : ''}>
            <span class="ci">${c.icon}</span><span class="grow">${esc(c.name)}</span></label>`).join('')}</div>`;
        }).join('')}
        <div class="section-head"><h2>Calendarios de cuidado</h2></div>
        <div class="card list">${CARE_CATALOG.map(c => `
          <label class="check-row"><input type="checkbox" name="care" data-multi="1" value="${c.key}" ${t.care.includes(c.key) ? 'checked' : ''}>
          <span class="ci">${c.icon}</span><span class="grow">${c.group === 'ipl' ? 'IPL: ' : ''}${esc(c.name)}</span>
          <span class="muted small">${c.group === 'ipl' ? '' : CARE_GROUPS[c.group]}</span></label>`).join('')}</div>
        <div class="sticky-cta"><button class="btn primary block" type="submit">Empezar</button></div>
      </form>
    </div>`;
    $$('[data-t]').forEach(b => b.onclick = () => { sel = b.dataset.t; draw(); });
    $('#obForm').onsubmit = async e => {
      e.preventDefault();
      const f = formData(e.target);
      e.target.querySelector('[type=submit]').disabled = true;
      await applyTemplate(f.cats || [], f.care || []);
      renderShell();
    };
  };
  draw();
}

// ---------------- Shell y navegación ----------------
const TABS = [
  ['hoy', 'Hoy', 'hoy'], ['agenda', 'Agenda', 'cal'], ['cuidado', 'Cuidado', 'care'],
  ['mente', 'Mente', 'mind'], ['progreso', 'Progreso', 'stats'],
];
function renderShell() {
  app.innerHTML = `<main id="view" class="page"></main>
    <nav class="tabbar">${TABS.map(([k, l, i]) => `<a href="#/${k}" data-tab="${k}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>`;
  if (!location.hash || location.hash === '#/') location.hash = '#/hoy'; else rerender();
}
window.addEventListener('hashchange', () => { closeSheet(); if (S.profile && $('#view')) { rerender(); window.scrollTo(0, 0); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

export function rerender() {
  const view = $('#view'); if (!view) return;
  const [, tab = 'hoy', sub, sub2] = location.hash.split('/');
  $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const pages = {
    hoy: () => renderHoy(view), agenda: () => renderAgenda(view, sub), cuidado: () => renderCare(view, sub, sub2),
    mente: () => renderMente(view, sub), progreso: () => renderProgress(view, sub), ajustes: () => renderSettings(view, sub),
  };
  (pages[tab] || pages.hoy)();
  bindTopbar(view);
}
export const go = h => { if (location.hash === h) rerender(); else location.hash = h; };

// Barra superior: nombre a la izquierda, perfil y más opciones a la derecha
export function topbar() {
  return `<div class="appbar">
    <div><div class="wordmark">Ritual</div></div>
    ${db.DEMO ? '<span class="demo-pill">DEMO</span>' : ''}
    <span class="spacer"></span>
    <button class="bar-btn" id="meBtn" aria-label="Perfil">${avatarHtml(S.profile, 'sm')}</button>
    <button class="bar-btn" id="moreBtn" aria-label="Más opciones">${icon('dots')}</button>
  </div>`;
}
function bindTopbar(root) {
  const me = $('#meBtn', root); const more = $('#moreBtn', root);
  if (me) me.onclick = () => sheet(S.profile.name, `<div class="stack">
      <button class="btn ghost" id="mEdit">Editar perfil, color e imagen</button>
      <button class="btn ghost" id="mSwitch">Cambiar de perfil</button></div>`, body => {
    $('#mEdit', body).onclick = profileEditor;
    $('#mSwitch', body).onclick = () => { closeSheet(); location.hash = ''; renderPicker(); };
  });
  if (more) more.onclick = openMenu;
}

// ---------------- Mosaico de hábitos ----------------
const EX_TYPES = [['crossfit', 'CrossFit'], ['correr', 'Correr'], ['casa', 'En casa'], ['descanso', 'Descanso']];
const EX_LABEL = Object.fromEntries(EX_TYPES);
const INT = [['suave', 'Suave'], ['media', 'Media'], ['alta', 'Alta']];

function tileValue(c, v) {
  const bar = (n, t) => t ? `<div class="bar"><i style="width:${Math.min(100, (Number(n) || 0) / t * 100)}%"></i></div>` : '';
  switch (c.type) {
    case 'number': return `<span class="t-val">${v ? num(v) : '0'}</span><span class="t-sub">${esc(c.unit || '')}${c.target ? ` de ${num(c.target)}` : ''}</span>${bar(v, c.target)}`;
    case 'minutes': return `<span class="t-val">${Number(v) || 0}′</span>${c.target ? `<span class="t-sub">meta ${c.target}′</span>` : ''}${bar(v, c.target)}`;
    case 'bool_minutes': return v?.min ? `<span class="t-val">${v.min}′</span>` : '';
    case 'scale': return `<div class="scale-mini">${[1, 2, 3, 4, 5].map(n => `<i class="${Number(v) >= n ? 'on' : ''}"></i>`).join('')}</div>`;
    case 'money': return v ? `<span class="t-val">${eur(v.amount)}</span>${v.note ? `<span class="t-sub">${esc(v.note)}</span>` : ''}` : '<span class="t-sub">Toca para apuntar</span>';
    case 'text': return `<span class="t-sub">${v ? esc(String(v).slice(0, 80)) + (String(v).length > 80 ? '…' : '') : 'Toca para escribir'}</span>`;
    case 'exercise': return v?.type ? `<span class="t-val">${EX_LABEL[v.type]}${v.min ? ` ${v.min}′` : ''}</span><span class="t-sub">${[v.km ? `${v.km} km` : '', v.int || '', v.sweat ? 'muy sudoroso' : ''].filter(Boolean).join(', ')}</span>` : '<span class="t-sub">Toca para apuntar</span>';
    default: return '';
  }
}
function tile(c, day) {
  const v = getVal(c.id, day); const done = isDone(c, v);
  const st = c.type === 'bool' && day === today() ? streak(c) : 0;
  const wide = c.type === 'text' || c.type === 'exercise';
  return `<button class="tile ${done ? 'done' : ''} ${wide ? 'wide' : ''}" data-tile="${c.id}" style="--c:${sectionColor(c.section)}">
    <div class="t-top"><span class="t-emoji">${esc(c.icon || '•')}</span>${['bool', 'bool_minutes'].includes(c.type) || (done && c.type !== 'text') ? `<span class="t-check">${icon('check')}</span>` : ''}</div>
    <span class="t-name">${esc(c.name)}</span>${tileValue(c, v)}
    ${st >= 3 ? `<span class="t-streak">🔥${st}</span>` : ''}
  </button>`;
}

// Hoja para apuntar un hábito que no es sí/no
export function habitSheet(c, day, after) {
  const v = getVal(c.id, day);
  const col = sectionColor(c.section);
  const done = async val => { await setVal(c.id, val, day); closeSheet(); after(); };
  let html = '';
  if (c.type === 'scale') html = `<div class="scale" style="--c:${col}">${[1, 2, 3, 4, 5].map(n => `<button class="dot ${Number(v) === n ? 'on' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <p class="small muted center mt-s">1 = muy mal · 5 = genial</p>${v ? '<button class="btn ghost block mt" id="clr">Borrar</button>' : ''}`;
  else if (c.type === 'number') html = `<input class="input big" type="number" inputmode="numeric" id="val" value="${v ?? ''}" placeholder="0">
      <p class="center muted small">${esc(c.unit || '')}${c.target ? ` · meta ${num(c.target)}` : ''}</p>
      <button class="btn primary block mt" id="ok">Guardar</button>`;
  else if (c.type === 'minutes' || c.type === 'bool_minutes') {
    const m = c.type === 'minutes' ? Number(v) || 0 : Number(v?.min) || 0;
    html = `${c.type === 'bool_minutes' ? `<button class="btn ${v?.done ? 'color' : 'ghost'} block" id="tg" style="--c:${col}">${v?.done ? '✓ Hecho' : 'Marcar como hecho'}</button>` : ''}
      <div class="stepper mt"><button class="icon-btn" data-d="-5">−</button><input class="input big" style="width:130px" type="number" inputmode="numeric" id="val" value="${m}"><button class="icon-btn" data-d="5">+</button></div>
      <p class="center muted small">minutos${c.target ? ` · meta ${c.target}` : ''}</p>
      <div class="quick">${[10, 15, 30, 45, 60].map(n => `<button class="chip" data-add="${n}">+${n}</button>`).join('')}</div>
      <button class="btn primary block mt" id="ok">Guardar</button>`;
  } else if (c.type === 'money') html = `<input class="input big" type="number" inputmode="decimal" step="0.01" id="val" value="${v?.amount ?? ''}" placeholder="0 €">
      <label class="field mt"><span>¿En qué?</span><input id="note" value="${esc(v?.note || '')}"></label>
      <div class="row gap mt"><button class="btn ghost grow" id="zero">No he gastado nada</button><button class="btn primary grow" id="ok">Guardar</button></div>`;
  else if (c.type === 'text') html = `<textarea class="input" rows="7" id="val" placeholder="Cómo ha ido el día…">${esc(v || '')}</textarea><button class="btn primary block mt" id="ok">Guardar nota</button>`;
  else if (c.type === 'exercise') {
    const x = { ...(v || {}) };
    const plan = !v && trainingOn(S.date);
    if (plan) { x.min = plan.min; x.time = plan.time; }
    html = `<div class="stack" id="ex">
      <div class="chips">${EX_TYPES.map(([k, l]) => `<button class="chip ${x.type === k ? 'on' : ''}" data-f="type" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="grid3"><label class="field"><span>Minutos</span><input type="number" inputmode="numeric" id="min" value="${x.min ?? ''}"></label>
        <label class="field" id="kmF" ${x.type === 'correr' ? '' : 'hidden'}><span>Km</span><input type="number" inputmode="decimal" step="0.1" id="km" value="${x.km ?? ''}"></label>
        <label class="field"><span>Hora</span><input type="time" id="time" value="${x.time ?? ''}"></label></div>
      <div class="field"><span>Intensidad</span><div class="chips">${INT.map(([k, l]) => `<button class="chip ${x.int === k ? 'on' : ''}" data-f="int" data-v="${k}">${l}</button>`).join('')}
        <button class="chip ${x.sweat ? 'on' : ''}" data-f="sweat" data-v="1">💦 Muy sudoroso</button></div></div>
      <p class="small muted">La hora sirve para el aviso de IPL (12 h después del entreno).</p>
      <div class="row gap">${v ? '<button class="btn ghost" id="clr">Borrar</button>' : ''}<button class="btn primary grow" id="ok">Guardar</button></div></div>`;
    sheet(c.name, html, body => {
      $$('[data-f]', body).forEach(b => b.onclick = () => {
        const f = b.dataset.f;
        if (f === 'sweat') x.sweat = !x.sweat; else x[f] = x[f] === b.dataset.v ? null : b.dataset.v;
        $$(`[data-f="${f}"]`, body).forEach(o => o.classList.toggle('on', f === 'sweat' ? x.sweat : x[f] === o.dataset.v));
        $('#kmF', body).hidden = x.type !== 'correr';
      });
      $('#ok', body).onclick = () => {
        const n = id => { const e = $(id, body).value; return e === '' ? null : Number(e); };
        x.min = n('#min'); x.km = x.type === 'correr' ? n('#km') : null; x.time = $('#time', body).value || null;
        if (x.type === 'descanso') Object.assign(x, { min: null, km: null, int: null, sweat: false });
        done(x.type ? x : null);
      };
      $('#clr', body)?.addEventListener('click', () => done(null));
    });
    return;
  }
  sheet(`${c.icon || ''} ${c.name}`, html, body => {
    $$('.dot', body).forEach(b => b.onclick = () => done(Number(b.dataset.n)));
    $('#clr', body)?.addEventListener('click', () => done(null));
    const inp = $('#val', body);
    $$('[data-d]', body).forEach(b => b.onclick = () => { inp.value = Math.max(0, (Number(inp.value) || 0) + Number(b.dataset.d)); });
    $$('[data-add]', body).forEach(b => b.onclick = () => { inp.value = (Number(inp.value) || 0) + Number(b.dataset.add); });
    let tg = !!v?.done;
    $('#tg', body)?.addEventListener('click', e => { tg = !tg; e.target.className = `btn ${tg ? 'color' : 'ghost'} block`; e.target.textContent = tg ? '✓ Hecho' : 'Marcar como hecho'; });
    $('#zero', body)?.addEventListener('click', () => done({ amount: 0, note: 'Nada' }));
    $('#ok', body)?.addEventListener('click', () => {
      const raw = inp.value;
      if (c.type === 'number' || c.type === 'minutes') done(raw === '' || Number(raw) === 0 ? null : Number(raw));
      else if (c.type === 'bool_minutes') done({ done: tg || Number(raw) > 0, min: Number(raw) || null });
      else if (c.type === 'money') done(raw === '' ? null : { amount: Number(raw), note: $('#note', body).value.trim() });
      else if (c.type === 'text') done(raw.trim() || null);
    });
    if (inp && c.type !== 'text') setTimeout(() => inp.select?.(), 300);
  });
}

// ---------------- HOY ----------------
function ring(p) {
  const r = 38, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 92 92"><circle cx="46" cy="46" r="${r}" class="ring-bg"/>
    <circle cx="46" cy="46" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
    <text x="46" y="53" text-anchor="middle">${Math.round(p * 100)}%</text></svg>`;
}
function taskLine(t, dot) {
  return `<button class="plan-task" data-task="${t.id}"><span class="pdot ${dot}"></span><span class="grow">${esc(t.data.title)}</span>${t.data.est ? `<span class="est">${t.data.est}′</span>` : ''}<span class="tick">${icon('check')}</span></button>`;
}
function planCard() {
  const s = settings();
  const { red, orange, green } = dayPlan();
  const exCat = S.cats.find(c => c.type === 'exercise' && c.active);
  const exMin = exCat ? Number(getVal(exCat.id, today())?.min) || 0 : 0;
  const focus = focusCats().map(c => ({ c, min: minutesOf(c, getVal(c.id, today())), goal: Number(c.target) || Number(s.focusGoal) || 30 }));
  const free = Number(s.todayFree?.day === today() ? s.todayFree.min : s.freeTime) || 0;
  const all = [...red, ...orange, ...green];
  const need = all.reduce((a, t) => a + (Number(t.data.est) || 0), 0) + Math.max(0, s.exerciseGoal - exMin) + focus.reduce((a, f) => a + Math.max(0, f.goal - f.min), 0);
  const q = QUOTES[parseDay(today()).getDate() % QUOTES.length];
  const group = (label, list, dot) => `<div class="plan-group"><p class="plan-label">${label}</p>${list.map(t => taskLine(t, dot)).join('') || '<p class="small" style="color:#A8A29A">Nada aquí</p>'}</div>`;
  return `<section class="card plan">
    <div class="row between"><h2>Plan de hoy</h2><button class="btn tiny free" id="freeBtn">⏳ ${free} min libres</button></div>
    ${all.length ? `${group('🔴 No lo pospongas', red, 'r')}${group('🟠 Importantes', orange, 'o')}${group('🟢 Pequeñas', green, 'g')}`
      : '<p class="note-line">No tienes tareas pendientes. <a href="#/agenda/tareas">Añade alguna</a> y aquí verás tu plan.</p>'}
    <div class="plan-goals">
      <button class="goal-chip" data-open="${exCat?.id || ''}"><b>${exMin}/${s.exerciseGoal}′</b><span>🏋️ Ejercicio</span><div class="bar"><i style="width:${Math.min(100, exMin / s.exerciseGoal * 100)}%"></i></div></button>
      ${focus.map(f => `<button class="goal-chip" data-open="${f.c.id}"><b>${f.min}/${f.goal}′</b><span>${esc(f.c.icon)} ${esc(f.c.name)}</span><div class="bar"><i style="width:${Math.min(100, f.min / f.goal * 100)}%"></i></div></button>`).join('')}
    </div>
    <p class="quote">${esc(q)}</p>
    ${all.length ? `<p class="note-line ${need > free ? 'warn' : ''}">${need > free ? `Necesitas unos ${need} min y tienes ${free}. Céntrate en lo rojo y lo naranja.` : `Te cabe todo: unos ${need} min de ${free}.`}</p>` : ''}
  </section>`;
}

function alertCards() {
  if (S.date !== today()) return '';
  const out = [];
  // Cuerpo: lo que el planificador ha colocado hoy (y el aviso de mañana)
  const bp = bodyPlan(); const tmw = addDays(today(), 1);
  for (const e of bp.items.filter(x => x.day === today())) {
    let when = e.time ? `Esta noche desde las ${e.time}` : 'Hoy';
    if (e.time) { const [h, m] = e.time.split(':').map(Number); const t = new Date(); t.setHours(h, m, 0, 0); if (t <= new Date()) when = 'Ya puedes'; }
    const col = e.kind === 'scrub' || e.kind === 'shave' ? CARE_GROUP_COLORS.cuerpo : CARE_GROUP_COLORS.ipl;
    out.push(`<div class="rcard" style="--c:${col}"><div class="rc-top">${e.icon}<span>${e.min} min</span></div>
      <b>${esc(e.title)}</b><span><b>${when}.</b> ${esc(e.why)}</span>
      <div class="row gap" style="margin-top:auto">${e.kind === 'scrub' ? `<button class="btn tiny" data-care="${e.care.id}">Hecho</button>` : e.kind === 'ipl' ? '<a class="btn tiny" href="#/cuidado/ipl">Ir a IPL</a>' : ''}</div></div>`);
  }
  const nextIpl = bp.items.find(x => x.kind === 'ipl' && x.day > today());
  if (nextIpl && !bp.items.some(x => x.day === today() && x.kind !== 'scrub') && itemsOf('care').some(z => z.data.group === 'ipl' && careStatus(z).due))
    out.push(`<a class="rcard" href="#/cuidado/ipl" style="--c:${CARE_GROUP_COLORS.ipl}"><div class="rc-top">✨<span>${nextIpl.day === tmw ? 'Mañana' : fmtShortD(nextIpl.day)}</span></div>
      <b>IPL: mejor el ${fmtShortD(nextIpl.day)} a las ${nextIpl.time}</b><span>${esc(nextIpl.why)}</span></a>`);
  const plan = PLANS.find(p => p.forName.test(S.profile.name) && !planApplied(p));
  if (plan) out.unshift(`<button class="rcard" data-plan="${plan.id}" style="--c:#D3AEE6;text-align:left"><div class="rc-top">📋<span>Nuevo</span></div><b>${planVersionApplied(plan) ? 'Novedades en tu plan' : 'Tu plan de renovación'}</b><span>${planVersionApplied(plan) ? esc(plan.changes || '') : 'Qué guardar, gastar, dejar y comprar. Toca para revisarlo y aplicarlo.'}</span></button>`);
  for (const e of events().filter(e => diffDays(e.date, today()) <= 30)) {
    const n = diffDays(e.date, today());
    out.unshift(`<div class="rcard" style="--c:#E8C979"><div class="rc-top">${esc(e.icon || '⭐')}<span>${n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : `${n} días`}</span></div>
      <b>${esc(e.title)}</b><span>${n === 0 ? 'Lotion pack, protector y el maquillaje que ensayaste. ¡Disfruta!' : n <= 7 ? 'Nada nuevo en la cara hasta entonces. Sigue las tareas con 🎓 en Agenda.' : esc(e.note || 'Las tareas con fecha están en Agenda.')}</span>
      <div class="row gap" style="margin-top:auto"><a class="btn tiny" href="#/agenda">Ver tareas</a></div></div>`);
  }
  const tr = trainingOn(today()); const exc = S.cats.find(c => c.type === 'exercise' && c.active);
  if (tr && exc && !getVal(exc.id, today())) {
    out.push(`<button class="rcard" data-open="${exc.id}" style="--c:${CARE_GROUP_COLORS.cuerpo || '#9CCFB5'};text-align:left"><div class="rc-top">🏋️<span>${esc(tr.time || '')}</span></div>
      <b>Hoy entrenas (${tr.min} min)</b><span>Después: ducha templada, limpiador suave y crema.${bp.items.some(x => x.day === today() && x.kind === 'ipl') ? ' El IPL, por la noche: 12 h después de acabar.' : ''} Toca para apuntarlo.</span></button>`);
  }
  const yday = addDays(today(), -1);
  if (activeCats().some(isHabit) && !activeCats().some(c => getVal(c.id, yday) !== undefined) && new Date().getHours() < 23)
    out.push(`<button class="rcard" data-yday style="--c:#CFC7BE;text-align:left"><div class="rc-top">🗓️<span>Ayer</span></div><b>Ayer no apuntaste nada</b><span>Si te acuerdas, rellénalo en un minuto: las rachas y las estadísticas lo agradecen.</span></button>`);
  const un = unsetCare();
  if (un.length) out.push(`<a class="rcard" href="#/cuidado/calendarios" style="--c:#CFC7BE"><div class="rc-top">⏰<span>${un.length}</span></div><b>Recordatorios sin empezar</b><span>${un.map(i => esc(i.data.name)).join(', ')}. Márcalos como hechos la primera vez para que empiecen a avisarte.</span></a>`);
  const pi = postIpl();
  if (pi) out.push(`<div class="rcard" style="--c:${CARE_GROUP_COLORS.ipl}"><div class="rc-top">🤍<span>post-IPL</span></div><b>${esc(pi.zones.join(', '))}</b><span>${pi.first24 ? 'Hoy: LV Perusvoide; nada de desodorante, perfume ni bruma en esas zonas. ' : ''}Sin exfoliante hasta el ${pi.until.split('-').reverse().slice(0, 2).join('/')}. SPF si van al sol.</span></div>`);
  const lp = lipsPlan(); const lc = catByKey('lips');
  if (lp && !lp.cured && lc && !getVal(lc.id, today())) out.push(`<a class="rcard" href="#/cuidado/labios" style="--c:#F2A9BC"><div class="rc-top">👄<span>Día ${diffDays(today(), lp.start) + 1}</span></div><b>Labios: bálsamo en vez de tocar</b><span>Racha ${streak(lc)} días. Apunta los impulsos para verlos venir.</span></a>`);
  itemsOf('care').filter(i => i.data.group !== 'ipl' && careStatus(i).due && !(i.data.key === 'body_scrub' && bp.scrubs.length)).forEach(i => {
    const blk = i.data.key === 'body_scrub' ? scrubBlock() : null;
    out.push(`
    <div class="rcard" style="--c:${CARE_GROUP_COLORS[i.data.group] || '#CFC7BE'}"><div class="rc-top">${esc(i.data.icon)}<span>${blk ? 'Espera' : careStatus(i).label}</span></div>
      <b>${esc(i.data.name)}</b>${blk ? `<span>${esc(blk)}</span>` : `<div class="row gap" style="margin-top:auto">${i.data.timerSec ? `<button class="btn tiny" data-tmr="${i.id}">⏱ ${fmtShortSec(i.data.timerSec)}</button>` : ''}<button class="btn tiny" data-care="${i.id}">Hecho</button></div>`}</div>`);
  });
  const exp = products().map(p => ({ p, e: productExpiry(p) })).filter(x => x.e && x.e.days <= 30).sort((a, b) => a.e.days - b.e.days);
  if (exp.length) out.push(`<a class="rcard" href="#/cuidado/inventario" style="--c:#CFC7BE"><div class="rc-top">⏳<span>${exp.length}</span></div><b>Caducan pronto</b><span>${exp.slice(0, 3).map(x => `${esc(x.p.data.name)} (${x.e.days < 0 ? 'caducado' : relDay(x.e.exp)})`).join(', ')}</span></a>`);
  const warns = [...checkRoutine('am'), ...checkRoutine('pm')].filter(r => r.level === 'warn');
  if (warns.length) out.push(`<a class="rcard" href="#/cuidado/rutinas" style="--c:#EFA3AE"><div class="rc-top">⚠️</div><b>Revisa tu rutina</b><span>${esc(warns[0].msg)}</span></a>`);
  const ex = S.cats.find(c => c.type === 'exercise' && c.active); const hw = catByKey('hair_wash');
  if (ex && hw && getVal(ex.id, today())?.sweat && !getVal(hw.id, today())) {
    const last = [0, 1, 2, 3].map(n => addDays(today(), -n)).find(d => getVal(hw.id, d));
    out.push(`<div class="rcard" style="--c:${CARE_GROUP_COLORS.pelo}"><div class="rc-top">🚿</div><b>Pelo tras entreno sudoroso</b><span>${last && diffDays(today(), last) >= 1 ? `Último lavado ${relDay(last)}: hoy toca lavar.` : 'Aclara con agua y acondicionador en medios y puntas.'}</span></div>`);
  }
  if (parseDay(today()).getDay() === 0) out.push(`<a class="rcard" href="#/progreso" style="--c:var(--pc)"><div class="rc-top">🗓️</div><b>Resumen de la semana</b><span>Mira cómo te ha ido y lo que viene.</span></a>`);
  return out.length ? `<div class="section-head"><h2>Para hoy</h2><span class="small muted">${out.length}</span></div><div class="rail-cards">${out.join('')}</div>` : '';
}

let hoyFilter = 'Todo';
export function renderHoy(view) {
  const day = S.date; const isToday = day === today();
  const cats = activeCats();
  const habits = cats.filter(isHabit);
  const pct = dayCompletion(day);
  const h = new Date().getHours();
  const hello = h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  const rank = s => { const i = SECTIONS.indexOf(s); return i < 0 ? 99 : i; };
  const secs = [...new Set(cats.map(c => c.section))].sort((a, b) => rank(a) - rank(b));
  if (!['Todo', 'Pendientes'].includes(hoyFilter) && !secs.includes(hoyFilter)) hoyFilter = 'Todo';
  const shown = hoyFilter === 'Todo' ? cats : hoyFilter === 'Pendientes' ? cats.filter(c => !isDone(c, getVal(c.id, day))) : cats.filter(c => c.section === hoyFilter);
  const ordered = ['Todo', 'Pendientes'].includes(hoyFilter) ? secs.flatMap(s => shown.filter(c => c.section === s)) : shown;
  const w = S.weather; const tips = isToday ? weatherTips(w) : [];
  view.innerHTML = `${topbar()}
    <div class="hero">
      <p class="date">${isToday ? fmtLong(day) : 'Editando otro día'}</p>
      <h1>${isToday ? `${hello},<br>${esc(S.profile.name)}` : esc(fmtLong(day))}</h1>
    </div>
    <div class="today-top">
      ${ring(pct)}
      <div class="wx-mini">
        <div class="wx-line"><b>${habits.filter(c => isDone(c, getVal(c.id, day))).length} de ${habits.length}</b> hábitos hechos</div>
        ${w && isToday ? `<div class="wx-line"><span class="wx-temp">${Math.round(w.temp)}°</span><span class="muted">${esc(settings().city)} · UV ${Math.round(w.uvMax ?? 0)} · humedad ${w.hum}%</span></div>` : ''}
        <div class="row gap"><button class="icon-btn" id="prevD" aria-label="Día anterior" style="background:var(--soft)">${icon('left')}</button>
          ${isToday ? '' : '<button class="chip on" id="todayD">Volver a hoy</button>'}
          <button class="icon-btn" id="nextD" aria-label="Día siguiente" style="background:var(--soft)" ${isToday ? 'disabled' : ''}>${icon('right')}</button></div>
      </div>
    </div>
    ${tips.length ? tips.map(t => `<p class="note ${t.tone === 'warn' ? 'warn' : ''}" style="margin:0 0 8px">${t.icon === 'sun' ? '☀️' : '💧'} ${esc(t.msg)}</p>`).join('') : ''}
    ${isToday ? planCard() : ''}
    ${alertCards()}
    <div class="section-head"><h2>Hábitos</h2><a href="#/ajustes/categorias">Editar</a></div>
    <div class="filter"><div class="chips rail">
      <button class="chip ${hoyFilter === 'Todo' ? 'on' : ''}" data-f="Todo">Todo</button>
      <button class="chip ${hoyFilter === 'Pendientes' ? 'on' : ''}" data-f="Pendientes">Pendientes ${habits.filter(c => !isDone(c, getVal(c.id, day))).length}</button>
      ${secs.map(s => `<button class="chip ${hoyFilter === s ? 'c-on' : ''}" data-f="${esc(s)}" style="--c:${sectionColor(s)}"><span class="swatch-dot"></span>${esc(s)}</button>`).join('')}
    </div></div>
    ${cats.length ? (ordered.length ? `<div class="tiles" id="tiles">${ordered.map(c => tile(c, day)).join('')}</div>` : '<div class="card empty"><p>¡Todo hecho por hoy! ✨</p></div>')
      : '<div class="card empty"><p>No tienes hábitos activos.</p><a class="btn primary" href="#/ajustes/categorias">Añadir hábitos</a></div>'}`;
  $('#prevD').onclick = () => { S.date = addDays(S.date, -1); rerender(); };
  $('#nextD').onclick = () => { if (S.date < today()) { S.date = addDays(S.date, 1); rerender(); } };
  $('#todayD')?.addEventListener('click', () => { S.date = today(); rerender(); });
  $$('[data-f]', view).forEach(b => b.onclick = () => { hoyFilter = b.dataset.f; rerender(); });
  $$('[data-tile]', view).forEach(b => b.onclick = async () => {
    const c = S.cats.find(x => x.id === b.dataset.tile);
    if (c.type === 'bool') {
      const nv = !getVal(c.id, day);
      b.classList.toggle('done', nv); navigator.vibrate?.(10);
      await setVal(c.id, nv, day);
      if (nv && dayCompletion(day) >= 1) toast('Día completo ✨');
      rerender();
    } else habitSheet(c, day, rerender);
  });
  $$('[data-open]', view).forEach(b => b.onclick = () => { const c = S.cats.find(x => x.id === b.dataset.open); if (c) habitSheet(c, today(), rerender); });
  $$('[data-task]', view).forEach(b => b.onclick = async () => {
    const t = S.items.find(i => i.id === b.dataset.task);
    b.classList.add('done'); await saveItem(t, { done: true, doneAt: today() });
    toast('Tarea hecha'); setTimeout(rerender, 350);
  });
  $$('[data-yday]', view).forEach(b => b.onclick = () => { S.date = addDays(today(), -1); rerender(); window.scrollTo(0, 0); });
  $$('[data-plan]', view).forEach(b => b.onclick = () => planSheet(PLANS.find(p => p.id === b.dataset.plan)));
  $$('[data-care]', view).forEach(b => b.onclick = async () => { await markCareDone(S.items.find(i => i.id === b.dataset.care)); toast('Registrado'); rerender(); });
  $('#freeBtn')?.addEventListener('click', () => sheet('Tiempo libre hoy', `
      <p class="muted">¿Cuántos minutos tienes hoy para tareas, ejercicio y foco?</p>
      <div class="chips">${[30, 60, 90, 120, 180, 240].map(m => `<button class="chip" data-m="${m}">${m} min</button>`).join('')}</div>
      <label class="field mt"><span>Otro</span><input type="number" id="freeIn" inputmode="numeric"></label>
      <button class="btn primary block mt" id="freeOk">Guardar</button>`, body => {
    const save = async m => { await saveSettings({ todayFree: { day: today(), min: m } }); closeSheet(); rerender(); };
    $$('[data-m]', body).forEach(b => b.onclick = () => save(Number(b.dataset.m)));
    $('#freeOk', body).onclick = () => { const v = Number($('#freeIn', body).value); if (v) save(v); };
  }));
}

// ---------------- Temporizadores: cualquier botón ⏱ de la app ----------------
document.addEventListener('click', e => {
  const b = e.target.closest('[data-tmr]'); if (!b || !S.profile) return;
  e.preventDefault(); e.stopPropagation();
  const it = S.items.find(i => i.id === b.dataset.tmr); if (!it) return;
  const d = it.data;
  if (it.kind === 'dye') {
    startTimer({ label: `Tinte: tiempo de pose`, sec: (Number(d.pose) || 35) * 60, after: 'Aclara hasta que el agua salga limpia y sigue las instrucciones de la caja.', color: '#E8B796' });
  } else {
    const k = TIMER_KINDS[d.timerKind || 'on'];
    startTimer({ label: d.timerLabel || `${d.name}${d.brand ? ' · ' + d.brand : ''}`, sec: d.timerSec, after: d.timerAfter || k.done, color: it.kind === 'care' ? (CARE_GROUP_COLORS[d.group] || '#A7BCEB') : '#A7BCEB' });
  }
  toast(`⏱ En marcha: ${fmtShortSec(it.kind === 'dye' ? (Number(d.pose) || 35) * 60 : d.timerSec)}`);
}, true);

// ---------------- Service worker ----------------
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

boot();
