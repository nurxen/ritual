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
}

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
      : { key: c.key, group: c.group, name: c.name, icon: c.icon, interval: c.interval, last: null, tip: c.tip || '' },
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
    case 'exercise': return !!v.type && (v.type === 'descanso' || Number(v.min) > 0);
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
  if (!d.last) return { label: 'Lista para empezar', tone: 'accent', next: today(), due: true };
  const since = diffDays(today(), d.last);
  if (since > interval * 2) return { label: 'Reinicia la fase inicial', tone: 'warn', next: today(), due: true, restart: true };
  const next = addDays(d.last, interval);
  const n = diffDays(next, today());
  if (n > win) return { label: `En ${n} días`, tone: 'neutral', next, due: false };
  if (n >= -win) return { label: n === 0 ? 'Toca hoy' : (n > 0 ? `Toca (margen ${n} d)` : `Toca (${-n} d tarde)`), tone: 'accent', next, due: true };
  return { label: `Atrasada ${-n} d`, tone: 'warn', next, due: true, late: true };
}

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
  await addItem('carelog', { careId: it.id, day, name: d.name, group: d.group });
}
export const careLogs = () => itemsOf('carelog');

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
export function routineProducts(slot) {
  return products().filter(p => !p.data.finished && (p.data.slot === slot || p.data.slot === 'both'))
    .sort((a, b) => (a.data.step ?? 5) - (b.data.step ?? 5));
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
