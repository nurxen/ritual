// Estado en memoria + operaciones de datos + lógica de negocio
import * as db from './db.js';
import { today, addDays, diffDays, dayStr, parseDay } from './ui.js';
import { CATALOG, CARE_CATALOG, TEMPLATES, DEFAULT_SETTINGS, RULES, INGREDIENT_KEYWORDS } from './data.js';

export const S = {
  profiles: [], profile: null,
  cats: [], entries: new Map(), items: [],
  date: today(),
  weather: null,
};

const ek = (cid, day) => `${cid}|${day}`;
export const settings = () => ({ ...DEFAULT_SETTINGS, ...(S.profile?.settings || {}) });

// ---------------- Carga ----------------
export async function loadProfiles() {
  S.profiles = (await db.select('profiles')).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return S.profiles;
}

export async function loadProfileData(profile) {
  S.profile = profile;
  const since = addDays(today(), -400);
  const [cats, entries, items] = await Promise.all([
    db.select('categories', { profile_id: profile.id }),
    db.select('entries', { profile_id: profile.id }, { gte: ['day', since] }),
    db.select('items', { profile_id: profile.id }),
  ]);
  S.cats = cats.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  S.entries = new Map(entries.map(e => [ek(e.category_id, e.day), e]));
  S.items = items;
  await migrate();
}

// Cambios de la versión 2: separar estudiar y arte, proyecto opcional
async function migrate() {
  const done = S.profile.settings?.migrations || [];
  if (done.includes('v2') || !S.profile.onboarded) return;
  const old = S.cats.find(c => c.key === 'art_study');
  if (old) {
    await db.update('categories', old.id, { key: 'art', name: 'Algo artístico', icon: '🎨' });
    Object.assign(old, { key: 'art', name: 'Algo artístico', icon: '🎨' });
  }
  if (old && !S.cats.some(c => c.key === 'study')) {
    const c = CATALOG.find(x => x.key === 'study');
    const [row] = await db.insert('categories', { profile_id: S.profile.id, key: c.key, name: c.name, icon: c.icon, type: c.type, section: c.section, target: c.target, active: true, sort: (old.sort ?? 0) + 0.5, config: {} });
    S.cats.push(row); S.cats.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  }
  const proj = S.cats.find(c => c.key === 'project');
  if (proj && ![...S.entries.values()].some(e => e.category_id === proj.id)) {
    await db.update('categories', proj.id, { active: false, name: 'Proyecto personal', icon: '🚀' });
    Object.assign(proj, { active: false, name: 'Proyecto personal', icon: '🚀' });
  }
  await saveSettings({ migrations: [...done, 'v2'] });
}

// Token secreto para el calendario suscrito (Google / Apple)
export async function calToken() {
  let t = S.profile.settings?.calToken;
  if (!t) { t = db.uuid().replace(/-/g, ''); await saveSettings({ calToken: t }); }
  return t;
}
export async function resetCalToken() { await saveSettings({ calToken: null }); return calToken(); }

// ---------------- Perfiles ----------------
export async function updateProfile(patch) {
  const p = await db.update('profiles', S.profile.id, patch);
  Object.assign(S.profile, patch);
  const i = S.profiles.findIndex(x => x.id === S.profile.id);
  if (i >= 0) S.profiles[i] = { ...S.profiles[i], ...patch };
  return p;
}
export const saveSettings = patch => updateProfile({ settings: { ...(S.profile.settings || {}), ...patch } });

export async function applyTemplate(catKeys, careKeys) {
  const pid = S.profile.id;
  const existing = new Set(S.cats.map(c => c.key));
  const rows = CATALOG.filter(c => catKeys.includes(c.key) && !existing.has(c.key))
    .map((c, i) => ({
      profile_id: pid, key: c.key, name: c.name, icon: c.icon, type: c.type, section: c.section,
      unit: c.unit || null, target: c.target ?? null, active: true, sort: S.cats.length + i, config: {},
    }));
  if (rows.length) S.cats.push(...await db.insert('categories', rows));
  const careRows = CARE_CATALOG.filter(c => careKeys.includes(c.key)).map(c => ({
    profile_id: pid, kind: 'care',
    data: c.group === 'ipl'
      ? { key: c.key, group: 'ipl', name: c.name, icon: c.icon, head: c.head, phase: 'inicial', sessions: 0, interval: 14, last: null }
      : { key: c.key, group: c.group, name: c.name, icon: c.icon, interval: c.interval, last: null, tip: c.tip || '', ...(c.timerSec ? { timerSec: c.timerSec, timerKind: c.timerKind, timerAfter: c.timerAfter } : {}) },
  }));
  if (careRows.length) S.items.push(...await db.insert('items', careRows));
  await updateProfile({ onboarded: true });
}
export { TEMPLATES };

// ---------------- Categorías ----------------
export const activeCats = () => S.cats.filter(c => c.active);
export async function saveCategory(cat) {
  if (cat.id) {
    const { id, ...patch } = cat;
    await db.update('categories', id, patch);
    Object.assign(S.cats.find(c => c.id === id), patch);
  } else {
    const [row] = await db.insert('categories', { profile_id: S.profile.id, sort: S.cats.length, active: true, config: {}, ...cat });
    S.cats.push(row);
  }
}
export async function deleteCategory(id) {
  await db.remove('categories', id);
  S.cats = S.cats.filter(c => c.id !== id);
  for (const k of [...S.entries.keys()]) if (k.startsWith(id + '|')) S.entries.delete(k);
}
export async function moveCategory(id, dir) {
  const list = S.cats; const i = list.findIndex(c => c.id === id); const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((c, k) => c.sort !== k ? (c.sort = k, db.update('categories', c.id, { sort: k })) : null));
}
export const catByKey = key => S.cats.find(c => c.key === key && c.active);

// ---------------- Registros ----------------
export const getVal = (cid, day = S.date) => S.entries.get(ek(cid, day))?.value;
export const getEntry = (cid, day) => S.entries.get(ek(cid, day));
export async function setVal(cid, value, day = S.date) {
  const empty = value === null || value === undefined || value === '' || value === false
    || (typeof value === 'object' && value && Object.values(value).every(v => v === null || v === '' || v === false || v === undefined));
  if (empty) {
    S.entries.delete(ek(cid, day));
    await db.deleteEntry(cid, day);
    return;
  }
  const local = { profile_id: S.profile.id, category_id: cid, day, value, updated_at: new Date().toISOString() };
  S.entries.set(ek(cid, day), local);
  const row = await db.upsertEntry({ profile_id: S.profile.id, category_id: cid, day, value });
  S.entries.set(ek(cid, day), row);
}

export function isDone(cat, v) {
  if (v === undefined || v === null) return false;
  switch (cat.type) {
    case 'bool': return v === true;
    case 'number': return cat.target ? Number(v) >= Number(cat.target) : Number(v) > 0;
    case 'minutes': return cat.target ? Number(v) >= Number(cat.target) : Number(v) > 0;
    case 'scale': return Number(v) > 0;
    case 'bool_minutes': return !!v.done || Number(v.min) > 0;
    case 'money': return v.amount !== null && v.amount !== undefined && v.amount !== '';
    case 'text': return String(v).trim().length > 0;
    case 'exercise': return !!v.type; // basta con haber elegido el tipo (los minutos son opcionales)
    default: return !!v;
  }
}
// "Hábitos" que cuentan para el % del día (excluye notas, escala y dinero)
export const isHabit = c => !['text', 'scale', 'money'].includes(c.type);

export function dayCompletion(day) {
  const hs = activeCats().filter(isHabit);
  if (!hs.length) return 0;
  return hs.filter(c => isDone(c, getVal(c.id, day))).length / hs.length;
}

export function streak(cat) {
  let d = today(); let n = 0;
  if (!isDone(cat, getVal(cat.id, d))) d = addDays(d, -1);
  while (isDone(cat, getVal(cat.id, d))) { n++; d = addDays(d, -1); }
  return n;
}
export function bestStreak(cat) {
  const days = [...S.entries.values()].filter(e => e.category_id === cat.id && isDone(cat, e.value)).map(e => e.day).sort();
  let best = 0, cur = 0, prev = null;
  for (const d of days) { cur = prev && diffDays(d, prev) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

// ---------------- Items genéricos ----------------
export const itemsOf = kind => S.items.filter(i => i.kind === kind);
export async function addItem(kind, data) {
  const [row] = await db.insert('items', { profile_id: S.profile.id, kind, data });
  S.items.push(row); return row;
}
export async function saveItem(item, data) {
  item.data = { ...item.data, ...data };
  await db.update('items', item.id, { data: item.data, updated_at: new Date().toISOString() });
  return item;
}
export async function deleteItem(item) {
  await db.remove('items', item.id);
  S.items = S.items.filter(i => i.id !== item.id);
}

// ---------------- Calendarios de cuidado ----------------
export function careStatus(it) {
  const d = it.data;
  if (d.group === 'ipl') return iplZoneStatus(it);
  if (!d.last) return { label: 'Sin fecha', tone: 'neutral', next: addDays(today(), 999), due: false, unset: true };
  const next = addDays(d.last, d.interval || 7);
  const n = diffDays(next, today());
  if (n < 0) return { label: `Atrasado ${-n} d`, tone: 'warn', next, due: true };
  if (n === 0) return { label: 'Toca hoy', tone: 'accent', next, due: true };
  return { label: n === 1 ? 'Mañana' : `En ${n} días`, tone: 'neutral', next, due: false };
}

export function iplZoneStatus(it) {
  const d = it.data;
  const interval = d.phase === 'mantenimiento' ? 28 : 14;
  const win = d.phase === 'mantenimiento' ? 4 : 3;
  const wait = sunBlockUntil();
  const fmtD = s => s.split('-').reverse().slice(0, 2).join('/');
  if (!d.last) return wait ? { label: `Desde el ${fmtD(wait)}`, tone: 'neutral', next: wait, due: false, waiting: true }
    : { label: 'Lista para empezar', tone: 'accent', next: today(), due: true };
  const since = diffDays(today(), d.last);
  if (since > interval * 2) return wait ? { label: `Reinicia desde el ${fmtD(wait)}`, tone: 'neutral', next: wait, due: false, waiting: true, restart: true }
    : { label: 'Reinicia la fase inicial', tone: 'warn', next: today(), due: true, restart: true };
  const next = addDays(d.last, interval);
  const n = diffDays(next, today());
  if (n > win) return { label: `En ${n} días`, tone: 'neutral', next, due: false };
  if (n >= -win) return { label: n === 0 ? 'Toca hoy' : (n > 0 ? `Toca (margen ${n} d)` : `Toca (${-n} d tarde)`), tone: 'accent', next, due: true };
  return { label: `Atrasada ${-n} d`, tone: 'warn', next, due: true, late: true };
}

// Hasta qué día hay que esperar por sol o autobronceador (null si nada)
export function sunBlockUntil() {
  const s = settings(); const c = [];
  if (s.lastSun) c.push(addDays(s.lastSun, 28));
  if (s.lastSelfTan) c.push(addDays(s.lastSelfTan, 14));
  const m = c.sort().pop();
  return m && m > today() ? m : null;
}
// Calendarios que aún no tienen fecha (nunca se han hecho)
export const unsetCare = () => itemsOf('care').filter(i => i.data.group !== 'ipl' && !i.data.last);

export async function markCareDone(it, day = today()) {
  const d = it.data; const patch = { last: day };
  if (d.group === 'ipl') {
    const restart = iplZoneStatus(it).restart;
    let sessions = restart ? 1 : (d.sessions || 0) + 1;
    let phase = restart ? 'inicial' : d.phase;
    if (phase === 'inicial' && sessions >= 4 && !restart) { phase = 'mantenimiento'; }
    Object.assign(patch, { sessions, phase });
  }
  await saveItem(it, patch);
  await addItem('carelog', { careId: it.id, day, name: d.name, group: d.group, key: d.key || null });
}
export const careLogs = () => itemsOf('carelog');

// Próximos eventos (para la agenda y Google Calendar)
export function upcomingEvents(days = 60) {
  const out = []; const ipl = {};
  for (const i of itemsOf('care')) {
    const st = careStatus(i);
    if (st.unset || diffDays(st.next, today()) > days) continue;
    const day = st.next < today() ? today() : st.next;
    if (i.data.group === 'ipl') { (ipl[day] ||= []).push(i); continue; }
    out.push({ id: i.id, day, title: i.data.name, icon: i.data.icon || '•', kind: 'care', group: i.data.group, late: st.tone === 'warn' });
  }
  // todas las zonas de IPL del mismo día, en un solo evento
  for (const [day, zs] of Object.entries(ipl)) {
    out.push({ id: `ipl-${day}`, day, title: `IPL · ${zs.map(z => z.data.name).join(', ')}`, icon: '✨', kind: 'care', group: 'ipl', late: zs.some(z => careStatus(z).tone === 'warn') });
  }
  for (const t of itemsOf('task')) {
    if (t.data.done || !t.data.due || diffDays(t.data.due, today()) > days) continue;
    const late = t.data.due < today();
    out.push({ id: t.id, day: late ? today() : t.data.due, title: t.data.title, icon: '☐', kind: 'task', late, due: t.data.due });
  }
  for (const g of itemsOf('goal')) {
    if (g.data.done || !g.data.deadline || diffDays(g.data.deadline, today()) > days || g.data.deadline < today()) continue;
    out.push({ id: g.id, day: g.data.deadline, title: `Objetivo: ${g.data.title}`, icon: '🎯', kind: 'goal' });
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

// ---------------- IPL: ¿se puede hoy? ----------------
export function lastWorkout() {
  const cat = S.cats.find(c => c.type === 'exercise' && c.active);
  if (!cat) return null;
  let best = null;
  for (const day of [today(), addDays(today(), -1)]) {
    const e = getEntry(cat.id, day);
    const v = e?.value;
    if (!v || !v.type || v.type === 'descanso' || !(Number(v.min) > 0)) continue;
    let t;
    if (v.time) { const [h, m] = v.time.split(':').map(Number); t = parseDay(day); t.setHours(h, m || 0); }
    else t = new Date(e.updated_at || parseDay(day));
    if (v.min && v.time) t = new Date(t.getTime() + Number(v.min) * 60000); // hora de fin
    if (!best || t > best) best = t;
  }
  return best;
}
export function iplBlock() {
  const reasons = [];
  const lw = lastWorkout();
  if (lw) {
    const until = new Date(lw.getTime() + 12 * 3600000);
    if (until > new Date()) reasons.push({ type: 'train', until, msg: `Has entrenado hace menos de 12 h. Podrás a partir de las ${until.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}${dayStr(until) !== today() ? ' de mañana' : ''}.` });
  }
  const sc = lastLog(d => d.key === 'body_scrub' || /exfoli/i.test(d.name || ''));
  if (sc && diffDays(today(), sc) < 2) reasons.push({ type: 'scrub', msg: `Exfoliaste el ${sc.split('-').reverse().slice(0, 2).join('/')}: deja 48 h antes del IPL (desde el ${addDays(sc, 2).split('-').reverse().slice(0, 2).join('/')}).` });
  const s = settings();
  if (s.lastSun) {
    const until = addDays(s.lastSun, 28);
    if (diffDays(until, today()) > 0) reasons.push({ type: 'sun', msg: `Sol sin protección el ${s.lastSun.split('-').reverse().join('/')}: espera hasta el ${until.split('-').reverse().join('/')} (4 semanas) y haz prueba de piel.` });
  }
  if (s.lastSelfTan) {
    const until = addDays(s.lastSelfTan, 14);
    if (diffDays(until, today()) > 0) reasons.push({ type: 'tan', msg: `Autobronceador reciente: espera hasta el ${until.split('-').reverse().join('/')} (2 semanas).` });
  }
  return reasons;
}

// ---------------- Productos ----------------
export const products = () => itemsOf('product');
export function productExpiry(p) {
  const d = p.data;
  if (!d.openedAt || !d.pao || d.finished) return null;
  const dt = parseDay(d.openedAt); dt.setMonth(dt.getMonth() + Number(d.pao));
  const exp = dayStr(dt);
  return { exp, days: diffDays(exp, today()) };
}
export function tagsFromIngredients(text) {
  return INGREDIENT_KEYWORDS.filter(([, re]) => re.test(text || '')).map(([t]) => t);
}
// Estado del producto (los antiguos no tienen: cuentan como "en uso")
export const pStatus = p => p.data.status || 'use';
export function pArea(p) {
  const d = p.data;
  if (d.area) return d.area;
  const t = (d.type || '').toLowerCase();
  if (t.includes('pelo') || t.includes('champ') || t.includes('gel')) return 'Pelo';
  if (t.includes('corporal') || t.includes('manos') || t.includes('perfume')) return 'Cuerpo';
  if (t.includes('uñas')) return 'Uñas';
  if (t.includes('maquillaje') || t.includes('labios')) return 'Maquillaje';
  return 'Cuidado facial';
}
// Productos de una rutina; dow = día de la semana (0 domingo) para las rutinas por días
export function routineProducts(slot, dow = null) {
  const key = slot === 'pm' ? 'pmDays' : 'amDays';
  return products().filter(p => {
    const d = p.data; const s = pStatus(p);
    if (d.finished || s === 'drop' || s === 'pause') return false;
    if (!(d.slot === slot || d.slot === 'both')) return false;
    if (dow !== null && Array.isArray(d[key]) && d[key].length && !d[key].includes(dow)) return false;
    return true;
  }).sort((a, b) => ((slot === 'pm' ? a.data.stepPm ?? a.data.step : a.data.step) ?? 5) - ((slot === 'pm' ? b.data.stepPm ?? b.data.step : b.data.step) ?? 5));
}
export function checkRoutine(slot) {
  const list = routineProducts(slot);
  const t = { am: slot === 'am' };
  for (const p of list) {
    for (const tag of p.data.tags || []) {
      if (tag === 'bha') { if (p.data.leaveOn) t.bha_leave = true; }
      else t[tag] = true;
    }
    if ((p.data.tags || []).includes('fragrance') && p.data.slot !== 'none') t.fragrance_face = true;
  }
  t.anyActive = t.retinoid || t.aha || t.bha_leave;
  // el salicílico que se aclara también cuenta para el SPF de la mañana siguiente
  if (slot === 'am') {
    const pmTags = routineProducts('pm').flatMap(p => p.data.tags || []);
    if (pmTags.some(x => ['retinoid', 'aha', 'bha'].includes(x))) t.anyActive = true;
  }
  return RULES.filter(r => r.test(t));
}

// Lista de la compra: lo que quieres comprar + lo que repones cuando se acaba
// ¿Ya tengo (o ya voy a comprar) el producto que sustituye a este?
const words = t => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length > 3);
export function findOwned(what, except) {
  const ws = words(what); if (!ws.length) return null;
  return products().find(p => p.id !== except?.id && !p.data.finished && pStatus(p) !== 'drop' && (() => {
    const hay = words(`${p.data.name} ${p.data.brand || ''}`);
    const hit = ws.filter(w => hay.includes(w)).length;
    return hit >= Math.min(2, ws.length);
  })()) || null;
}
// Lista de la compra: lo que quieres comprar + lo que repones cuando se acaba
export function shoppingList() {
  const ps = products();
  const wish = ps.filter(p => pStatus(p) === 'wish');
  const refill = []; const ask = [];
  for (const p of ps) {
    const s = pStatus(p); const d = p.data;
    if (d.refilled || (d.snoozeUntil && d.snoozeUntil > today())) continue;
    const ending = d.low || d.finished || (productExpiry(p)?.days ?? 999) <= 30;
    if (!ending || s === 'wish' || s === 'drop' || s === 'pause') continue;
    if (s === 'use' && !d.replaceWith && !d.finished) { ask.push(p); continue; }
    let what = null;
    if (d.replaceWith) what = d.replaceWith;
    else if (s === 'keep') what = `${d.brand ? d.brand + ' ' : ''}${d.name}`;
    if (!what) continue;
    // si ya tienes el sustituto (o está en la lista de compra), no hace falta reponer
    if (d.replaceWith && findOwned(d.replaceWith, p)) continue;
    refill.push({ p, what, why: d.finished ? 'Se acabó' : d.low ? 'Casi vacío' : (productExpiry(p)?.days ?? 0) < 0 ? 'Caducado' : 'Caduca pronto' });
  }
  return { wish, refill, ask };
}
// "Comprado" en Reponer: añade el bote nuevo (sin abrir) y saca el viejo de la lista
export async function refillBought(p, oldFinished) {
  const d = p.data;
  const same = !d.replaceWith || d.replaceWith === `${d.brand ? d.brand + ' ' : ''}${d.name}`;
  const fresh = same
    ? { ...d, openedAt: null, low: false, finished: false, finishedAt: null, refilled: false, snoozeUntil: null, boughtAt: today() }
    : { name: d.replaceWith, brand: '', type: d.type, area: d.area, sub: d.sub, status: 'keep', slot: d.slot, step: d.step, stepPm: d.stepPm,
        amDays: d.amDays, pmDays: d.pmDays, tags: [], leaveOn: d.leaveOn, pao: 12, openedAt: null, low: false, finished: false, boughtAt: today(),
        note: `Sustituye a ${d.name}.` };
  await addItem('product', fresh);
  await saveItem(p, { refilled: true, ...(oldFinished && !d.finished ? { finished: true, finishedAt: today() } : {}) });
}
export async function refillSkip(p, mode) {
  if (mode === 'enough') await saveItem(p, { low: false, snoozeUntil: addDays(today(), 14) });
  else if (mode === 'never') await saveItem(p, { replaceWith: '', status: pStatus(p) === 'keep' ? 'useup' : pStatus(p), refilled: true });
}

// ---------------- Labios ----------------
export const lipsPlan = () => settings().lips || null;
export const lipTriggers = () => itemsOf('liptrigger');
export async function cureLips() {
  for (const p of products()) {
    if (pStatus(p) === 'pause') await saveItem(p, { status: p.data.afterCure || 'use' });
  }
  await saveSettings({ lips: { ...(lipsPlan() || {}), cured: true, curedAt: today() } });
}

// ---------------- IPL y exfoliación (48 h) ----------------
const lastLog = pred => itemsOf('carelog').filter(l => pred(l.data)).map(l => l.data.day).sort().pop() || null;
export function postIpl() {
  const day = lastLog(d => d.group === 'ipl');
  if (!day || diffDays(today(), day) >= 2) return null;
  const zones = itemsOf('carelog').filter(l => l.data.group === 'ipl' && l.data.day === day).map(l => l.data.name);
  return { day, zones, until: addDays(day, 2), first24: diffDays(today(), day) < 1 };
}
export function scrubBlock() {
  const ip = lastLog(d => d.group === 'ipl');
  if (ip && diffDays(today(), ip) < 2) return `Hiciste IPL el ${ip.split('-').reverse().slice(0, 2).join('/')}: no exfolies hasta el ${addDays(ip, 2).split('-').reverse().slice(0, 2).join('/')}.`;
  const soon = itemsOf('care').filter(z => z.data.group === 'ipl' && z.data.last).map(z => ({ z, st: careStatus(z) }))
    .filter(x => !x.st.restart && diffDays(x.st.next, today()) <= 2 && diffDays(x.st.next, today()) >= -3);
  if (soon.length) return `Te toca IPL (${soon.map(x => x.z.data.name).join(', ')}) en menos de 48 h: exfolia después de la sesión.`;
  return null;
}

// ---------------- Planes de cuidado ----------------
function planMatches(plan) {
  const pool = products().slice(); const used = new Set();
  return plan.products.map(pp => {
    const re = new RegExp(pp.match, 'i');
    const ex = pool.find(p => !used.has(p.id) && re.test(`${p.data.name} ${p.data.brand || ''}`));
    if (ex) used.add(ex.id);
    return { pp, ex };
  });
}
export function planPreview(plan) {
  const m = planMatches(plan);
  const careKeys = new Set(itemsOf('care').map(i => i.data.key));
  return {
    update: m.filter(x => x.ex), add: m.filter(x => !x.ex),
    care: plan.care.filter(k => !careKeys.has(k)),
    cats: plan.cats.filter(k => !S.cats.some(c => c.key === k)),
    tasks: plan.tasks.filter(t => !tasks().some(x => x.data.title === t.title)),
    guide: plan.guide,
    remove: (plan.remove || []).flatMap(r => { const re = new RegExp(r.match, 'i'); return products().filter(p => re.test(`${p.data.name} ${p.data.brand || ''}`) && (!r.status || pStatus(p) === r.status)); }),
  };
}
// Versión del plan ya aplicada (0 = nunca)
export const planVersionApplied = plan => settings().planVersions?.[plan.id] ?? ((settings().plans || []).includes(plan.id) ? 1 : 0);
export const planApplied = plan => planVersionApplied(plan) >= (plan.version || 1);
export async function applyPlan(plan) {
  for (const r of plan.remove || []) {
    const re = new RegExp(r.match, 'i');
    for (const p of products().filter(p => re.test(`${p.data.name} ${p.data.brand || ''}`) && (!r.status || pStatus(p) === r.status))) await deleteItem(p);
  }
  const pv = planPreview(plan);
  for (const { pp, ex } of [...pv.update, ...pv.add]) {
    const { match, ...fields } = pp;
    if (ex) {
      const d = ex.data;
      // Respeta el estado que hayas cambiado tú (p. ej. "Comprado"): solo se actualiza si sigue como lo dejó el plan
      const userChanged = d.planStatus !== undefined ? d.status !== d.planStatus
        : (fields.status === 'wish' && d.status && d.status !== 'wish') || ['drop'].includes(d.status) && fields.status !== 'drop';
      const status = userChanged ? d.status : fields.status;
      await saveItem(ex, { ...fields, status, planStatus: fields.status, price: d.price ?? fields.price ?? null, pao: d.pao ?? fields.pao ?? 12, tags: fields.tags || d.tags || [] });
    } else {
      await addItem('product', { tags: [], leaveOn: true, slot: 'none', openedAt: null, finished: false, low: false, price: null, ...fields, planStatus: fields.status, pao: 'pao' in fields ? fields.pao : 12 });
    }
  }
  if (pv.cats.length || pv.care.length) await applyTemplate(pv.cats, pv.care);
  for (const [key, patch] of Object.entries(plan.careUpdates || {})) {
    const it = itemsOf('care').find(i => i.data.key === key);
    if (it) await saveItem(it, patch);
  }
  for (const t of pv.tasks) await addItem('task', { title: t.title, prio: t.prio, est: t.est, due: t.dueToday ? today() : null, done: false });
  for (const g of plan.guide) {
    const ex = itemsOf('guide').find(i => i.data.gid === g.gid);
    ex ? await saveItem(ex, g) : await addItem('guide', g);
  }
  const s = settings();
  const extra = {};
  if (plan.settings?.lips && !s.lips) extra.lips = { ...plan.settings.lips, start: today() };
  await saveSettings({
    ...extra,
    noBuy: [...new Set([...(s.noBuy || []), ...(plan.noBuy || [])])].filter(x => !(plan.noBuyRemove || []).includes(x)),
    routineNotes: { ...(s.routineNotes || {}), ...(plan.routineNotes || {}) },
    plans: [...new Set([...(s.plans || []), plan.id])],
    planVersions: { ...(s.planVersions || {}), [plan.id]: plan.version || 1 },
  });
}

// Líneas de foco del plan de Hoy (pueden ser varias)
export function focusCats() {
  const s = settings();
  let keys = s.focusKeys;
  if (!Array.isArray(keys)) {
    keys = s.focusKey && s.focusKey !== 'none' ? [s.focusKey] : [];
    // por defecto, añade también lo de Mente con una meta grande (p. ej. estudiar 2 h)
    activeCats().filter(c => c.section === 'Mente' && c.type === 'minutes' && Number(c.target) >= 60).forEach(c => keys.push(c.key || c.id));
  }
  return [...new Set(keys)].map(k => S.cats.find(c => (c.key || c.id) === k && c.active)).filter(Boolean);
}
export const minutesOf = (c, v) => c.type === 'bool_minutes' ? Number(v?.min) || 0 : Number(v) || 0;

// Objetivo vinculado a un hábito: días cumplidos desde que empezó
export function goalHabit(g) {
  const cat = g.data.linkCat && S.cats.find(c => c.id === g.data.linkCat);
  if (!cat) return null;
  const start = g.data.start || (g.created_at || today()).slice(0, 10);
  const end = g.data.deadline || null;
  const elapsed = Math.max(1, diffDays(today(), start) + 1);
  let met = 0;
  for (let i = 0; i < elapsed; i++) if (isDone(cat, getVal(cat.id, addDays(start, i)))) met++;
  const planned = end ? Math.max(1, diffDays(end, start) + 1) : null;
  return { cat, met, elapsed, planned, streak: streak(cat), pct: planned ? met / planned : met / elapsed };
}

// ---------------- Tareas / plan del día ----------------
export const tasks = () => itemsOf('task');
export function dayPlan() {
  const open = tasks().filter(t => !t.data.done)
    .sort((a, b) => (a.data.due || '9999') .localeCompare(b.data.due || '9999') || (a.created_at || '').localeCompare(b.created_at || ''));
  const used = new Set();
  const take = (pred, n) => { const r = open.filter(t => !used.has(t.id) && pred(t)).slice(0, n); r.forEach(t => used.add(t.id)); return r; };
  const overdue = t => t.data.due && t.data.due <= today();
  let red = take(t => t.data.prio === 'urgente', 1);
  if (!red.length) red = take(t => overdue(t), 1);
  if (!red.length) red = take(t => t.data.prio === 'importante', 1);
  const orange = take(t => t.data.prio === 'importante' || t.data.prio === 'urgente', 2);
  const green = take(t => t.data.prio === 'pequena', 3);
  return { red, orange, green };
}

// ---------------- Tiempo (Open-Meteo) ----------------
export async function loadWeather() {
  const s = settings();
  const key = `ritual_wx_${s.lat}_${s.lon}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (c && Date.now() - c.t < 30 * 60000) return (S.weather = c.d);
  } catch { /* nada */ }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m,relative_humidity_2m,uv_index&daily=uv_index_max,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const r = await fetch(url); const j = await r.json();
    const d = {
      temp: j.current?.temperature_2m, hum: j.current?.relative_humidity_2m, uv: j.current?.uv_index,
      uvMax: j.daily?.uv_index_max?.[0], tMax: j.daily?.temperature_2m_max?.[0], tMin: j.daily?.temperature_2m_min?.[0],
    };
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch { /* nada */ }
    return (S.weather = d);
  } catch { return (S.weather = null); }
}
export function weatherTips(w) {
  if (!w) return [];
  const tips = [];
  const uv = w.uvMax ?? 0;
  if (uv >= 6) tips.push({ icon: 'sun', tone: 'warn', msg: `UV alto (${Math.round(uv)}). SPF generoso y reaplica cada 2 h si estás fuera.` });
  else if (uv >= 3) tips.push({ icon: 'sun', tone: 'accent', msg: `UV moderado (${Math.round(uv)}). Protector solar por la mañana; reaplica si pasas tiempo fuera.` });
  else tips.push({ icon: 'sun', tone: 'neutral', msg: `UV bajo (${Math.round(uv)}). El SPF diario sigue tocando.` });
  if (w.hum >= 70) tips.push({ icon: 'drop', tone: 'accent', msg: `Humedad ${w.hum}%: día de encrespamiento. Gel de más fijación o recogido flojo.` });
  else if (w.hum <= 30) tips.push({ icon: 'drop', tone: 'neutral', msg: `Aire seco (${w.hum}%): un poco más de crema en medios y puntas, y bálsamo labial.` });
  return tips;
}

// ---------------- Correlaciones ----------------
export function correlations(days = 90) {
  const targets = activeCats().filter(c => ['scale', 'number'].includes(c.type));
  const drivers = activeCats().filter(c => ['bool', 'bool_minutes', 'exercise', 'minutes'].includes(c.type));
  const out = [];
  const dayList = Array.from({ length: days }, (_, i) => addDays(today(), -i));
  for (const t of targets) {
    const tDays = dayList.filter(d => getVal(t.id, d) !== undefined);
    if (tDays.length < 8) continue;
    for (const dr of drivers) {
      const yes = [], no = [];
      for (const d of tDays) (isDone(dr, getVal(dr.id, d)) ? yes : no).push(Number(getVal(t.id, d)));
      if (yes.length < 4 || no.length < 4) continue;
      const my = yes.reduce((a, b) => a + b, 0) / yes.length;
      const mn = no.reduce((a, b) => a + b, 0) / no.length;
      const diff = my - mn;
      const rel = mn ? diff / Math.abs(mn) : 0;
      const strong = t.type === 'scale' ? Math.abs(diff) >= 0.5 : Math.abs(rel) >= 0.15;
      if (strong) out.push({ t, dr, my, mn, diff, rel, score: t.type === 'scale' ? Math.abs(diff) / 4 : Math.abs(rel), n: yes.length + no.length });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 6);
}
