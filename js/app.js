// Arranque, login, perfiles, plantillas, navegación, Hoy y Calendario
import * as db from './db.js';
import {
  S, loadProfiles, loadProfileData, updateProfile, applyTemplate, TEMPLATES, activeCats, getVal, setVal, isDone,
  isHabit, dayCompletion, itemsOf, careStatus, markCareDone, iplBlock, products, productExpiry, checkRoutine,
  dayPlan, saveItem, loadWeather, weatherTips, settings, saveSettings, catByKey, streak,
} from './store.js';
import {
  esc, $, $$, icon, toast, sheet, closeSheet, today, addDays, diffDays, fmtLong, fmtShort, parseDay, dayStr,
  MONTHS, avatarHtml, resizeImage, formData, relDay,
} from './ui.js';
import { CATALOG, CARE_CATALOG, SECTIONS, QUOTES, CARE_GROUPS } from './data.js';
import { renderCare } from './care.js';
import { renderProgress, weeklySummaryHtml } from './progress.js';
import { renderMore } from './more.js';

const app = document.getElementById('app');
const LAST = 'ritual_last_profile';

// ---------------- Tema ----------------
export function applyTheme() {
  const t = localStorage.getItem('ritual_theme') || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#1C1916' : '#F6F1EA');
}

// ---------------- Arranque ----------------
async function boot() {
  applyTheme();
  try { await db.init(); } catch (e) {
    app.innerHTML = `<div class="center-screen"><p>No se pudo conectar. Revisa tu conexión.</p></div>`; return;
  }
  const session = await db.getSession().catch(() => null);
  if (!session) return renderLogin();
  await enter();
}

async function enter() {
  await loadProfiles();
  const last = localStorage.getItem(LAST);
  const p = S.profiles.find(x => x.id === last);
  if (p) await openProfile(p); else renderPicker();
}

export async function openProfile(p) {
  app.innerHTML = `<div class="center-screen"><div class="loader"></div></div>`;
  await loadProfileData(p);
  localStorage.setItem(LAST, p.id);
  document.documentElement.style.setProperty('--pc', p.color);
  S.date = today();
  if (!p.onboarded) return renderOnboarding();
  renderShell();
  loadWeather().then(() => { if (location.hash.startsWith('#/hoy') || !location.hash) rerender(); });
}

// ---------------- Login ----------------
function renderLogin(err = '') {
  app.innerHTML = `
  <div class="center-screen login">
    <div class="brand"><span class="brand-mark">R</span><h1>Ritual</h1><p class="muted">daily tracker</p></div>
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
    const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = 'Entrando…';
    try { await db.signIn(f.email, f.password); await enter(); }
    catch { renderLogin('Correo o contraseña incorrectos.'); }
  };
}

// ---------------- Selector de perfil ----------------
export function renderPicker() {
  localStorage.removeItem(LAST);
  app.innerHTML = `
  <div class="center-screen picker">
    <div class="brand small"><span class="brand-mark">R</span><h1>¿Quién eres?</h1></div>
    <div class="profile-grid">
      ${S.profiles.map(p => `
        <button class="profile-tile" data-id="${p.id}">
          ${avatarHtml(p, 'xl')}<span class="pname">${esc(p.name)}</span>
        </button>`).join('')}
    </div>
    ${db.DEMO ? '<p class="demo-note">Modo demo · los datos se guardan solo en este navegador</p>' : ''}
  </div>`;
  $$('.profile-tile').forEach(b => b.onclick = () => openProfile(S.profiles.find(p => p.id === b.dataset.id)));
}

// ---------------- Editor de perfil ----------------
const SWATCHES = ['#C9A99A', '#B8A08A', '#A9B39B', '#9AA7B3', '#C4B5A0', '#D4B8B0', '#8F9A86', '#B39A9A', '#A69CB8', '#C2A878'];
export function profileEditor() {
  const p = S.profile;
  const s = settings();
  sheet('Mi perfil', `
    <div class="stack">
      <div class="row gap center"><div id="avPrev">${avatarHtml(p, 'xl')}</div>
        <div class="stack grow">
          <label class="btn ghost small">Subir imagen<input type="file" accept="image/*" id="avFile" hidden></label>
          <input class="input" id="avEmoji" maxlength="4" placeholder="o un emoji 🤍" value="${p.avatar && !p.avatar.startsWith('data:') ? esc(p.avatar) : ''}">
        </div></div>
      <label class="field"><span>Nombre</span><input name="name" value="${esc(p.name)}"></label>
      <div class="field"><span>Color</span><div class="swatches">
        ${SWATCHES.map(c => `<button class="swatch ${c === p.color ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('')}
        <input type="color" id="colorPick" value="${esc(p.color)}" aria-label="Color personalizado">
      </div></div>
      <h4 class="mt">Mis objetivos diarios</h4>
      <div class="grid2">
        <label class="field"><span>Ejercicio (min)</span><input type="number" name="exerciseGoal" value="${s.exerciseGoal}"></label>
        <label class="field"><span>Tiempo libre habitual (min)</span><input type="number" name="freeTime" value="${s.freeTime}"></label>
        <label class="field"><span>Nombre del proyecto</span><input name="projectName" value="${esc(s.projectName)}"></label>
        <label class="field"><span>Proyecto (min)</span><input type="number" name="projectGoal" value="${s.projectGoal}"></label>
      </div>
      <h4 class="mt">Ciudad para UV y humedad</h4>
      <div class="grid3">
        <label class="field"><span>Ciudad</span><input name="city" value="${esc(s.city)}"></label>
        <label class="field"><span>Latitud</span><input type="number" step="0.0001" name="lat" value="${s.lat}"></label>
        <label class="field"><span>Longitud</span><input type="number" step="0.0001" name="lon" value="${s.lon}"></label>
      </div>
      <button class="btn primary" id="saveP">Guardar</button>
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
        exerciseGoal: f.exerciseGoal ?? 45, freeTime: f.freeTime ?? 120, projectName: f.projectName || 'tu proyecto',
        projectGoal: f.projectGoal ?? 30, city: f.city, lat: f.lat ?? 40.4168, lon: f.lon ?? -3.7038,
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
    <div class="page onboarding">
      <header class="ob-head">${avatarHtml(S.profile, 'lg')}<div><h1>Hola, ${esc(S.profile.name)}</h1>
        <p class="muted">Elige con qué empezar. Luego puedes añadir, quitar o editar todo.</p></div></header>
      <div class="chips wrap">${Object.entries(TEMPLATES).map(([k, v]) => `<button class="chip ${k === sel ? 'on' : ''}" data-t="${k}">${v.label}</button>`).join('')}</div>
      <form id="obForm">
        ${SECTIONS.map(sec => {
          const items = CATALOG.filter(c => c.section === sec);
          return `<h4 class="sec-title">${sec}</h4><div class="card list">${items.map(c => `
            <label class="check-row"><input type="checkbox" name="cats" data-multi="1" value="${c.key}" ${t.cats.includes(c.key) ? 'checked' : ''}>
            <span class="ci">${c.icon}</span><span class="grow">${esc(c.name)}</span></label>`).join('')}</div>`;
        }).join('')}
        <h4 class="sec-title">Calendarios de cuidado</h4>
        <div class="card list">${CARE_CATALOG.map(c => `
          <label class="check-row"><input type="checkbox" name="care" data-multi="1" value="${c.key}" ${t.care.includes(c.key) ? 'checked' : ''}>
          <span class="ci">${c.icon}</span><span class="grow">${c.group === 'ipl' ? 'IPL · ' : ''}${esc(c.name)}</span>
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
  ['hoy', 'Hoy', 'hoy'], ['calendario', 'Calendario', 'cal'], ['cuidado', 'Cuidado', 'care'],
  ['progreso', 'Progreso', 'stats'], ['mas', 'Más', 'more'],
];
function renderShell() {
  app.innerHTML = `
    <main id="view" class="page"></main>
    <nav class="tabbar">${TABS.map(([k, l, i]) => `<a href="#/${k}" data-tab="${k}">${icon(i)}<span>${l}</span></a>`).join('')}</nav>
    ${db.DEMO ? '<div class="demo-pill">demo</div>' : ''}`;
  if (!location.hash || location.hash === '#/') location.hash = '#/hoy';
  else rerender();
}
window.addEventListener('hashchange', () => { if (S.profile && $('#view')) { rerender(); window.scrollTo(0, 0); } });

export function rerender() {
  const view = $('#view'); if (!view) return;
  const [, tab = 'hoy', sub] = location.hash.split('/');
  $$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  const y = window.scrollY;
  if (tab === 'hoy') renderHoy(view);
  else if (tab === 'calendario') renderCalendar(view);
  else if (tab === 'cuidado') renderCare(view, sub);
  else if (tab === 'progreso') renderProgress(view);
  else if (tab === 'mas') renderMore(view, sub);
  return y;
}
export const go = h => { if (location.hash === h) rerender(); else location.hash = h; };

export function header(title, sub = '') {
  return `<header class="top">
    <div><p class="eyebrow">${esc(sub)}</p><h1>${title}</h1></div>
    <button class="avatar-btn" id="meBtn" aria-label="Perfil">${avatarHtml(S.profile)}</button>
  </header>`;
}
export function bindHeader(root) {
  const b = $('#meBtn', root);
  if (b) b.onclick = () => sheet(S.profile.name, `
    <div class="stack">
      <button class="btn ghost" id="mEdit">Editar perfil, color e imagen</button>
      <button class="btn ghost" id="mSwitch">Cambiar de perfil</button>
    </div>`, body => {
    $('#mEdit', body).onclick = () => profileEditor();
    $('#mSwitch', body).onclick = () => { closeSheet(); location.hash = ''; renderPicker(); };
  });
}

// ---------------- Controles de cada categoría ----------------
const EX_TYPES = [['crossfit', 'CrossFit'], ['correr', 'Correr'], ['casa', 'En casa'], ['descanso', 'Descanso']];
const INT = [['suave', 'Suave'], ['media', 'Media'], ['alta', 'Alta']];

function catRow(c, day) {
  const v = getVal(c.id, day);
  const done = isDone(c, v);
  const head = `<span class="hhead"><span class="ci">${esc(c.icon || '•')}</span><span class="cname">${esc(c.name)}</span></span>`;
  switch (c.type) {
    case 'bool':
      return `<button class="habit ${done ? 'done' : ''}" data-cid="${c.id}" data-act="toggle">${head}<span class="tick">${icon('check')}</span></button>`;
    case 'number':
      return `<div class="habit col ${done ? 'done' : ''}">${head}
        <div class="row gap"><input class="input num" type="number" inputmode="numeric" data-cid="${c.id}" data-act="num" value="${v ?? ''}" placeholder="0">
        <span class="muted small">${esc(c.unit || '')}${c.target ? ` · meta ${Number(c.target).toLocaleString('es-ES')}` : ''}</span></div>
        ${c.target ? `<div class="bar"><i style="width:${Math.min(100, (Number(v) || 0) / c.target * 100)}%"></i></div>` : ''}</div>`;
    case 'scale':
      return `<div class="habit col">${head}<div class="scale">${[1, 2, 3, 4, 5].map(n => `<button class="dot ${Number(v) >= n ? 'on' : ''}" data-cid="${c.id}" data-act="scale" data-n="${n}" aria-label="${n}">${n}</button>`).join('')}</div></div>`;
    case 'minutes':
      return `<div class="habit col ${done ? 'done' : ''}">${head}
        <div class="row gap"><button class="btn tiny ghost" data-cid="${c.id}" data-act="addmin" data-n="10">+10</button>
        <button class="btn tiny ghost" data-cid="${c.id}" data-act="addmin" data-n="30">+30</button>
        <input class="input num" type="number" inputmode="numeric" data-cid="${c.id}" data-act="num" value="${v ?? ''}" placeholder="0"><span class="muted small">min${c.target ? ` / ${c.target}` : ''}</span></div>
        ${c.target ? `<div class="bar"><i style="width:${Math.min(100, (Number(v) || 0) / c.target * 100)}%"></i></div>` : ''}</div>`;
    case 'bool_minutes':
      return `<div class="habit col ${done ? 'done' : ''}"><button class="row-btn" data-cid="${c.id}" data-act="bm-toggle">${head}<span class="tick">${icon('check')}</span></button>
        <div class="row gap"><input class="input num" type="number" inputmode="numeric" data-cid="${c.id}" data-act="bm-min" value="${v?.min ?? ''}" placeholder="0"><span class="muted small">minutos</span></div></div>`;
    case 'money':
      return `<div class="habit col ${done ? 'done' : ''}">${head}
        <div class="row gap"><input class="input num" type="number" inputmode="decimal" step="0.01" data-cid="${c.id}" data-act="money" value="${v?.amount ?? ''}" placeholder="0 €">
        <input class="input grow" data-cid="${c.id}" data-act="money-note" value="${esc(v?.note || '')}" placeholder="¿en qué?"></div>
        <button class="btn tiny ghost" data-cid="${c.id}" data-act="money-zero">No he gastado nada</button></div>`;
    case 'text':
      return `<div class="habit col">${head}<textarea class="input" rows="3" data-cid="${c.id}" data-act="text" placeholder="Cómo ha ido el día…">${esc(v || '')}</textarea></div>`;
    case 'exercise': {
      const x = v || {};
      return `<div class="habit col ex ${done ? 'done' : ''}">${head}
        <div class="chips">${EX_TYPES.map(([k, l]) => `<button class="chip ${x.type === k ? 'on' : ''}" data-cid="${c.id}" data-act="ex" data-f="type" data-v="${k}">${l}</button>`).join('')}</div>
        ${x.type && x.type !== 'descanso' ? `
        <div class="grid3">
          <label class="field"><span>Minutos</span><input class="input" type="number" inputmode="numeric" data-cid="${c.id}" data-act="exin" data-f="min" value="${x.min ?? ''}"></label>
          ${x.type === 'correr' ? `<label class="field"><span>Km</span><input class="input" type="number" inputmode="decimal" step="0.1" data-cid="${c.id}" data-act="exin" data-f="km" value="${x.km ?? ''}"></label>` : ''}
          <label class="field"><span>Hora</span><input class="input" type="time" data-cid="${c.id}" data-act="exin" data-f="time" value="${x.time ?? ''}"></label>
        </div>
        <div class="row gap wrap">
          <div class="chips">${INT.map(([k, l]) => `<button class="chip small ${x.int === k ? 'on' : ''}" data-cid="${c.id}" data-act="ex" data-f="int" data-v="${k}">${l}</button>`).join('')}</div>
          <button class="chip small ${x.sweat ? 'on' : ''}" data-cid="${c.id}" data-act="ex" data-f="sweat" data-v="1">💦 Muy sudoroso</button>
        </div>` : ''}
      </div>`;
    }
    default: return '';
  }
}

function bindCatControls(root, day, refresh) {
  const cat = id => S.cats.find(c => c.id === id);
  root.addEventListener('click', async e => {
    const el = e.target.closest('[data-act]'); if (!el || !el.dataset.cid) return;
    const c = cat(el.dataset.cid); const v = getVal(c.id, day); const a = el.dataset.act;
    if (a === 'toggle') await setVal(c.id, !v, day);
    else if (a === 'scale') await setVal(c.id, Number(v) === Number(el.dataset.n) ? null : Number(el.dataset.n), day);
    else if (a === 'addmin') await setVal(c.id, (Number(v) || 0) + Number(el.dataset.n), day);
    else if (a === 'bm-toggle') await setVal(c.id, { done: !(v?.done), min: v?.min ?? null }, day);
    else if (a === 'money-zero') await setVal(c.id, { amount: 0, note: 'Nada' }, day);
    else if (a === 'ex') {
      const x = { ...(v || {}) }; const f = el.dataset.f;
      if (f === 'sweat') x.sweat = !x.sweat;
      else x[f] = x[f] === el.dataset.v ? null : el.dataset.v;
      if (f === 'type' && x.type === 'descanso') { x.min = null; x.km = null; x.int = null; x.sweat = false; }
      await setVal(c.id, x.type ? x : null, day);
    } else return;
    refresh();
  });
  root.addEventListener('change', async e => {
    const el = e.target.closest('[data-act]'); if (!el || !el.dataset.cid) return;
    const c = cat(el.dataset.cid); const v = getVal(c.id, day); const a = el.dataset.act; const val = el.value;
    if (a === 'num') await setVal(c.id, val === '' ? null : Number(val), day);
    else if (a === 'bm-min') await setVal(c.id, { done: val !== '' && Number(val) > 0 ? true : !!v?.done, min: val === '' ? null : Number(val) }, day);
    else if (a === 'money') await setVal(c.id, { amount: val === '' ? null : Number(val), note: v?.note || '' }, day);
    else if (a === 'money-note') await setVal(c.id, { amount: v?.amount ?? null, note: val }, day);
    else if (a === 'text') { await setVal(c.id, val, day); toast('Nota guardada'); return; }
    else if (a === 'exin') {
      const x = { ...(v || {}) }; const f = el.dataset.f;
      x[f] = f === 'time' ? val : (val === '' ? null : Number(val));
      await setVal(c.id, x, day);
    } else return;
    refresh();
  });
}

// ---------------- HOY ----------------
function ring(p) {
  const r = 26, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="${r}" class="ring-bg"/>
    <circle cx="32" cy="32" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/>
    <text x="32" y="37" text-anchor="middle">${Math.round(p * 100)}%</text></svg>`;
}

function taskLine(t, dot) {
  return `<button class="plan-task" data-task="${t.id}"><span class="pdot ${dot}"></span><span class="grow">${esc(t.data.title)}</span>${t.data.est ? `<span class="muted small">${t.data.est}′</span>` : ''}<span class="tick">${icon('check')}</span></button>`;
}

function planCard() {
  const s = settings();
  const { red, orange, green } = dayPlan();
  const exCat = S.cats.find(c => c.type === 'exercise' && c.active);
  const exMin = exCat ? Number(getVal(exCat.id, today())?.min) || 0 : 0;
  const prCat = catByKey('project');
  const prMin = prCat ? Number(getVal(prCat.id, today())) || 0 : 0;
  const free = Number(s.todayFree?.day === today() ? s.todayFree.min : s.freeTime) || 0;
  const all = [...red, ...orange, ...green];
  const need = all.reduce((a, t) => a + (Number(t.data.est) || 0), 0) + Math.max(0, s.exerciseGoal - exMin) + Math.max(0, s.projectGoal - prMin);
  const q = QUOTES[parseDay(today()).getDate() % QUOTES.length];
  const top3 = [...red, ...orange].slice(0, 3);
  const empty = all.length === 0;
  return `<section class="card plan">
    <div class="row between"><h2>Hoy</h2><button class="btn tiny ghost" id="freeBtn">⏳ ${free} min libres</button></div>
    ${empty ? `<p class="muted">No tienes tareas pendientes. <a href="#/mas/tareas">Añade alguna</a> y aquí aparecerá tu plan del día.</p>` : `
    <div class="plan-group"><p class="plan-label">🔴 No lo pospongas</p>${red.map(t => taskLine(t, 'r')).join('') || '<p class="muted small">—</p>'}</div>
    <div class="plan-group"><p class="plan-label">🟠 Importantes</p>${orange.map(t => taskLine(t, 'o')).join('') || '<p class="muted small">—</p>'}</div>
    <div class="plan-group"><p class="plan-label">🟢 Pequeñas</p>${green.map(t => taskLine(t, 'g')).join('') || '<p class="muted small">—</p>'}</div>`}
    <div class="plan-goals">
      <div><span>🏋️ ${s.exerciseGoal} min de ejercicio</span><div class="bar"><i style="width:${Math.min(100, exMin / s.exerciseGoal * 100)}%"></i></div></div>
      <div><span>📚 ${s.projectGoal} min para ${esc(s.projectName)}</span><div class="bar"><i style="width:${Math.min(100, prMin / s.projectGoal * 100)}%"></i></div></div>
    </div>
    ${top3.length ? `<blockquote class="quote">“${esc(q)}”<br><b>${top3.map(t => esc(t.data.title)).join(' · ')}</b></blockquote>` : `<blockquote class="quote">“${esc(q)}”</blockquote>`}
    ${!empty ? `<p class="small ${need > free ? 'warn-text' : 'muted'}">${need > free ? `Necesitas ~${need} min y tienes ${free}. Céntrate en los tres primeros.` : `Te caben: ~${need} min de ${free}.`}</p>` : ''}
  </section>`;
}

function alertsHtml() {
  const out = [];
  const isToday = S.date === today();
  if (!isToday) return '';
  // IPL
  const zones = itemsOf('care').filter(i => i.data.group === 'ipl');
  const dueZones = zones.filter(z => careStatus(z).due);
  if (dueZones.length) {
    const block = iplBlock();
    const restart = dueZones.some(z => careStatus(z).restart);
    out.push(`<a class="alert ${block.length ? 'warn' : 'accent'}" href="#/cuidado/ipl">${block.length ? icon('lock') : '✨'}
      <span><b>IPL:</b> ${dueZones.map(z => esc(z.data.name)).join(', ')}${restart ? ' · reinicia fase inicial' : ''}${block.length ? `<br><span class="small">${esc(block[0].msg)}</span>` : ''}</span></a>`);
  }
  // Otros calendarios
  const due = itemsOf('care').filter(i => i.data.group !== 'ipl' && careStatus(i).due);
  due.slice(0, 5).forEach(i => out.push(`<div class="alert"><span class="ci">${esc(i.data.icon)}</span><span class="grow">${esc(i.data.name)} <span class="muted small">· ${careStatus(i).label}</span></span><button class="btn tiny" data-care="${i.id}">Hecho</button></div>`));
  // Caducidad
  const exp = products().map(p => ({ p, e: productExpiry(p) })).filter(x => x.e && x.e.days <= 30).sort((a, b) => a.e.days - b.e.days);
  if (exp.length) out.push(`<a class="alert" href="#/cuidado/inventario">⏳<span>${exp.slice(0, 3).map(x => `${esc(x.p.data.name)} <span class="muted small">${x.e.days < 0 ? 'caducado' : `caduca ${relDay(x.e.exp)}`}</span>`).join('<br>')}</span></a>`);
  // Compatibilidad
  const warns = [...checkRoutine('am'), ...checkRoutine('pm')].filter(r => r.level === 'warn');
  if (warns.length) out.push(`<a class="alert warn" href="#/cuidado/rutinas">⚠️<span>${esc(warns[0].msg)}</span></a>`);
  // Lavado de pelo tras días sudorosos
  const ex = S.cats.find(c => c.type === 'exercise' && c.active);
  const hw = catByKey('hair_wash');
  if (ex && hw) {
    const sweaty = getVal(ex.id, today())?.sweat;
    const washedToday = getVal(hw.id, today());
    const lastWash = [0, 1, 2, 3].map(n => addDays(today(), -n)).find(d => getVal(hw.id, d));
    if (sweaty && !washedToday) out.push(`<div class="alert">🚿<span>Entreno muy sudoroso${lastWash ? ` y último lavado ${relDay(lastWash)}` : ''}: ${lastWash && diffDays(today(), lastWash) >= 1 ? 'hoy toca lavar.' : 'aclara con agua y acondicionador en medios y puntas.'}</span></div>`);
  }
  // Domingo: resumen
  if (parseDay(today()).getDay() === 0) out.push(`<a class="alert accent" href="#/progreso">🗓️<span><b>Es domingo:</b> mira tu resumen semanal.</span></a>`);
  return out.length ? `<section class="alerts">${out.join('')}</section>` : '';
}

function weatherCard() {
  const w = S.weather;
  if (!w || S.date !== today()) return '';
  const tips = weatherTips(w);
  return `<section class="card wx">
    <div class="wx-top"><div><p class="eyebrow">${esc(settings().city)}</p><p class="wx-temp">${Math.round(w.temp)}°</p></div>
      <div class="wx-stats"><span>UV <b>${Math.round(w.uv ?? 0)}</b> · máx ${Math.round(w.uvMax ?? 0)}</span><span>Humedad <b>${w.hum}%</b></span><span>${Math.round(w.tMin)}° / ${Math.round(w.tMax)}°</span></div></div>
    ${tips.map(t => `<p class="wx-tip ${t.tone}">${icon(t.icon)}<span>${esc(t.msg)}</span></p>`).join('')}
  </section>`;
}

export function renderHoy(view) {
  const day = S.date;
  const isToday = day === today();
  const cats = activeCats();
  const pct = dayCompletion(day);
  const hour = new Date().getHours();
  const hello = hour < 13 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const sections = SECTIONS.concat([...new Set(cats.map(c => c.section))].filter(s => !SECTIONS.includes(s)));
  view.innerHTML = `
    ${header(isToday ? `${hello}, ${esc(S.profile.name)}` : esc(fmtLong(day)), isToday ? fmtLong(day) : 'Editando otro día')}
    <div class="daynav">
      <button class="icon-btn" id="prevD" aria-label="Día anterior">${icon('left')}</button>
      <button class="chip ${isToday ? 'on' : ''}" id="todayD">${isToday ? 'Hoy' : 'Volver a hoy'}</button>
      <button class="icon-btn" id="nextD" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>${icon('right')}</button>
    </div>
    ${isToday ? planCard() : ''}
    ${alertsHtml()}
    ${weatherCard()}
    <section class="card progress-card"><div>${ring(pct)}</div><div><h3>${pct >= 1 ? 'Día completo ✨' : 'Tus hábitos'}</h3>
      <p class="muted small">${cats.filter(isHabit).filter(c => isDone(c, getVal(c.id, day))).length} de ${cats.filter(isHabit).length} hechos</p></div></section>
    <div id="checklist">
    ${cats.length ? sections.map(sec => {
      const list = cats.filter(c => c.section === sec);
      if (!list.length) return '';
      return `<h4 class="sec-title">${esc(sec)}</h4><div class="habits">${list.map(c => catRow(c, day)).join('')}</div>`;
    }).join('') : `<div class="card empty"><p>No tienes categorías activas.</p><a class="btn ghost" href="#/mas/categorias">Añadir categorías</a></div>`}
    </div>`;
  bindHeader(view);
  $('#prevD').onclick = () => { S.date = addDays(S.date, -1); rerender(); };
  $('#nextD').onclick = () => { if (S.date < today()) { S.date = addDays(S.date, 1); rerender(); } };
  $('#todayD').onclick = () => { S.date = today(); rerender(); };
  bindCatControls($('#checklist'), day, () => rerender());
  $$('[data-task]').forEach(b => b.onclick = async () => {
    const t = S.items.find(i => i.id === b.dataset.task);
    b.classList.add('done');
    await saveItem(t, { done: true, doneAt: today() });
    toast('¡Hecho! ✨'); setTimeout(rerender, 350);
  });
  $$('[data-care]').forEach(b => b.onclick = async () => {
    await markCareDone(S.items.find(i => i.id === b.dataset.care)); toast('Registrado'); rerender();
  });
  const fb = $('#freeBtn');
  if (fb) fb.onclick = () => sheet('Tiempo disponible hoy', `
      <p class="muted">¿Cuántos minutos libres tienes hoy para tareas, ejercicio y proyecto?</p>
      <div class="chips wrap">${[30, 60, 90, 120, 180, 240].map(m => `<button class="chip" data-m="${m}">${m} min</button>`).join('')}</div>
      <label class="field mt"><span>Otro</span><input type="number" id="freeIn" inputmode="numeric"></label>
      <button class="btn primary block mt" id="freeOk">Guardar</button>`, body => {
    const save = async m => { await saveSettings({ todayFree: { day: today(), min: m } }); closeSheet(); rerender(); };
    $$('[data-m]', body).forEach(b => b.onclick = () => save(Number(b.dataset.m)));
    $('#freeOk', body).onclick = () => { const v = Number($('#freeIn', body).value); if (v) save(v); };
  });
}

// ---------------- CALENDARIO ----------------
let calMonth = null; let calCat = 'all';
function renderCalendar(view) {
  if (!calMonth) { const d = new Date(); calMonth = [d.getFullYear(), d.getMonth()]; }
  const [y, m] = calMonth;
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes primero
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cats = activeCats().filter(c => c.type !== 'text');
  const cat = cats.find(c => c.id === calCat);
  const logs = itemsOf('carelog');
  const tasksDue = itemsOf('task').filter(t => t.data.due && !t.data.done);
  const period = catByKey('period');
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push('<div class="cday empty"></div>');
  for (let d = 1; d <= daysIn; d++) {
    const ds = dayStr(new Date(y, m, d));
    const future = ds > today();
    let level = 0;
    if (!future) {
      if (cat) {
        const v = getVal(cat.id, ds);
        if (cat.type === 'scale') level = v ? Math.ceil(Number(v) / 5 * 4) : 0;
        else level = isDone(cat, v) ? 4 : 0;
      } else level = Math.ceil(dayCompletion(ds) * 4);
    }
    const marks = [];
    if (logs.some(l => l.data.day === ds && l.data.group === 'ipl')) marks.push('<i class="mk ipl"></i>');
    else if (logs.some(l => l.data.day === ds)) marks.push('<i class="mk care"></i>');
    if (period && getVal(period.id, ds)) marks.push('<i class="mk period"></i>');
    if (tasksDue.some(t => t.data.due === ds)) marks.push('<i class="mk task"></i>');
    cells.push(`<button class="cday l${level} ${ds === today() ? 'today' : ''} ${future ? 'future' : ''}" data-day="${ds}">
      <span>${d}</span><span class="mks">${marks.join('')}</span></button>`);
  }
  // Próximos 14 días
  const upcoming = [];
  itemsOf('care').forEach(i => { const st = careStatus(i); if (diffDays(st.next, today()) <= 14) upcoming.push({ day: st.next < today() ? today() : st.next, label: `${i.data.group === 'ipl' ? 'IPL · ' : ''}${i.data.name}`, icon: i.data.icon || '•' }); });
  tasksDue.forEach(t => { if (diffDays(t.data.due, today()) <= 14) upcoming.push({ day: t.data.due, label: t.data.title, icon: '☐' }); });
  upcoming.sort((a, b) => a.day.localeCompare(b.day));

  view.innerHTML = `
    ${header('Calendario', 'Tu mes de un vistazo')}
    <div class="card">
      <div class="row between mb">
        <button class="icon-btn" id="pm">${icon('left')}</button>
        <h3 class="cap">${MONTHS[m]} ${y}</h3>
        <button class="icon-btn" id="nm">${icon('right')}</button>
      </div>
      <select class="input" id="calCat"><option value="all">Todos los hábitos (% del día)</option>
        ${cats.map(c => `<option value="${c.id}" ${c.id === calCat ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
      <div class="cal-head">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal">${cells.join('')}</div>
      <div class="legend"><span><i class="mk ipl"></i>IPL</span><span><i class="mk care"></i>Cuidado</span>${period ? '<span><i class="mk period"></i>Periodo</span>' : ''}<span><i class="mk task"></i>Tarea</span></div>
    </div>
    <h4 class="sec-title">Próximos 14 días</h4>
    <div class="card list">${upcoming.length ? upcoming.map(u => `<div class="li"><span class="ci">${esc(u.icon)}</span><span class="grow">${esc(u.label)}</span><span class="muted small">${u.day === today() ? 'hoy' : fmtShort(u.day)}</span></div>`).join('') : '<p class="muted">Nada programado.</p>'}</div>`;
  bindHeader(view);
  $('#pm').onclick = () => { calMonth = m === 0 ? [y - 1, 11] : [y, m - 1]; rerender(); };
  $('#nm').onclick = () => { calMonth = m === 11 ? [y + 1, 0] : [y, m + 1]; rerender(); };
  $('#calCat').onchange = e => { calCat = e.target.value; rerender(); };
  $$('.cday[data-day]').forEach(b => b.onclick = () => {
    if (b.classList.contains('future')) return;
    S.date = b.dataset.day; go('#/hoy');
  });
}

// ---------------- Service worker ----------------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);
export { weeklySummaryHtml };

boot();
