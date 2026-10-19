// Capa de datos: Supabase si está configurado, si no localStorage (modo demo)
import { CONFIG } from './config.js';

export const DEMO = !CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON_KEY;
let sb = null;

export const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  }));

// ---------- Demo (localStorage) ----------
const LS_KEY = 'ritual_demo_db_v1';
function lsLoad() {
  let db;
  try { db = JSON.parse(localStorage.getItem(LS_KEY)); } catch { db = null; }
  if (!db) {
    db = { profiles: [], categories: [], entries: [], items: [] };
    [['Nuria', '#C9A99A', '🤍'], ['ML', '#A9B39B', '🌿'], ['Luis', '#9AA7B3', '🌊'], ['Serra', '#B8A08A', '☕']]
      .forEach(([name, color, avatar], i) => db.profiles.push({
        id: uuid(), name, color, avatar, settings: {}, onboarded: false, sort: i + 1, created_at: new Date().toISOString(),
      }));
    lsSave(db);
  }
  return db;
}
function lsSave(db) { try { localStorage.setItem(LS_KEY, JSON.stringify(db)); } catch (e) { console.warn(e); } }
const match = (row, eqs) => Object.entries(eqs).every(([k, v]) => row[k] === v);

// ---------- Init ----------
export async function init() {
  if (DEMO) return;
  const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  sb = mod.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

// ---------- Auth ----------
export async function getSession() {
  if (DEMO) return { demo: true };
  const { data } = await sb.auth.getSession();
  return data.session;
}
export async function signIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
export async function signOut() { if (!DEMO) await sb.auth.signOut(); }

// ---------- CRUD ----------
export async function select(table, eqs = {}, opts = {}) {
  if (DEMO) {
    let rows = lsLoad()[table].filter(r => match(r, eqs));
    if (opts.gte) rows = rows.filter(r => r[opts.gte[0]] >= opts.gte[1]);
    return rows.map(r => ({ ...r }));
  }
  const out = []; const size = 1000;
  for (let from = 0; ; from += size) {
    let q = sb.from(table).select('*');
    for (const [k, v] of Object.entries(eqs)) q = q.eq(k, v);
    if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
    q = q.order('id').range(from, from + size - 1);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < size) break;
  }
  return out;
}

export async function insert(table, rows) {
  const arr = (Array.isArray(rows) ? rows : [rows]).map(r => ({ id: uuid(), ...r }));
  if (DEMO) {
    const db = lsLoad(); const now = new Date().toISOString();
    arr.forEach(r => db[table].push({ created_at: now, ...r }));
    lsSave(db); return arr;
  }
  const { data, error } = await sb.from(table).insert(arr).select();
  if (error) throw error;
  return data;
}

export async function update(table, id, patch) {
  if (DEMO) {
    const db = lsLoad(); const r = db[table].find(x => x.id === id);
    if (r) Object.assign(r, patch); lsSave(db); return r;
  }
  const { data, error } = await sb.from(table).update(patch).eq('id', id).select();
  if (error) throw error;
  return data[0];
}

export async function remove(table, id) {
  if (DEMO) {
    const db = lsLoad(); db[table] = db[table].filter(r => r.id !== id);
    if (table === 'categories') db.entries = db.entries.filter(e => e.category_id !== id);
    if (table === 'profiles') ['categories', 'entries', 'items'].forEach(t => { db[t] = db[t].filter(r => r.profile_id !== id); });
    lsSave(db); return;
  }
  const { error } = await sb.from(table).delete().eq('id', id);
  if (error) throw error;
}

// Un registro por categoría y día
export async function upsertEntry(row) {
  if (DEMO) {
    const db = lsLoad();
    let r = db.entries.find(e => e.category_id === row.category_id && e.day === row.day);
    if (r) Object.assign(r, row, { updated_at: new Date().toISOString() });
    else { r = { id: uuid(), updated_at: new Date().toISOString(), ...row }; db.entries.push(r); }
    lsSave(db); return { ...r };
  }
  const { data, error } = await sb.from('entries')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'category_id,day' }).select();
  if (error) throw error;
  return data[0];
}

export async function deleteEntry(category_id, day) {
  if (DEMO) {
    const db = lsLoad(); db.entries = db.entries.filter(e => !(e.category_id === category_id && e.day === day));
    lsSave(db); return;
  }
  const { error } = await sb.from('entries').delete().eq('category_id', category_id).eq('day', day);
  if (error) throw error;
}
