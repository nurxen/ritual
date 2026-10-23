// Mente: foco (estudiar, leer, arte, proyecto), inglés y objetivos
import {
  S, itemsOf, addItem, saveItem, deleteItem, catByKey, getVal, setVal, streak, applyTemplate, activeCats, isDone, goalHabit, focusCats,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, formData, num } from './ui.js';
import { ENGLISH_IDEAS, sectionColor } from './data.js';
import { topbar, rerender, habitSheet } from './app.js';

const MIND = '#A7BCEB';
export function renderMente(view, sub = 'foco') {
  if (!['foco', 'ingles', 'objetivos'].includes(sub)) sub = 'foco';
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Mente</h1></div>
    <div class="seg"><a href="#/mente/foco" class="${sub === 'foco' ? 'on' : ''}">Foco</a><a href="#/mente/ingles" class="${sub === 'ingles' ? 'on' : ''}">Inglés</a><a href="#/mente/objetivos" class="${sub === 'objetivos' ? 'on' : ''}">Objetivos</a></div>
    <div id="mBody" style="--c:${MIND}"></div>`;
  ({ foco, ingles, objetivos })[sub]($('#mBody', view));
}

// ------------------------------------------------------------------ FOCO (temporizador)
const TK = 'ritual_timer';
const mindCats = () => activeCats().filter(c => ['minutes', 'bool_minutes'].includes(c.type) && c.section === 'Mente');
const minsOf = (c, d) => { const v = getVal(c.id, d); return c.type === 'bool_minutes' ? Number(v?.min) || 0 : Number(v) || 0; };
async function addMinutes(c, m) {
  const v = getVal(c.id, today());
  if (c.type === 'bool_minutes') await setVal(c.id, { done: true, min: (Number(v?.min) || 0) + m }, today());
  else await setVal(c.id, (Number(v) || 0) + m, today());
}
let tick = null;
function foco(root) {
  const cats = mindCats();
  let t = null; try { t = JSON.parse(localStorage.getItem(TK) || 'null'); } catch { t = null; }
  if (t && t.pid !== S.profile.id) t = null;
  // por defecto: lo que tenga la meta más grande (p. ej. estudiar), o tu primera línea de foco
  let selId = t?.cid || [...cats].sort((a, b) => (Number(b.target) || 0) - (Number(a.target) || 0))[0]?.id || focusCats()[0]?.id || cats[0]?.id;
  const elapsed = () => t ? Math.floor(((t.running ? Date.now() - t.start : 0) + (t.acc || 0)) / 1000) : 0;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const week = c => Array.from({ length: 7 }, (_, i) => minsOf(c, addDays(today(), -i))).reduce((a, b) => a + b, 0);
  root.innerHTML = cats.length ? `
    <section class="card plan timer">
      <div class="chips" style="justify-content:center">${cats.map(c => `<button class="chip ${c.id === selId ? 'on' : ''}" data-sel="${c.id}" style="${c.id === selId ? 'background:#F3F0EB;color:#3A3734;border-color:#F3F0EB' : 'background:transparent;color:#F3F0EB;border-color:rgba(255,255,255,.25)'}">${esc(c.icon)} ${esc(c.name)}</button>`).join('')}</div>
      <div class="t-big" id="clock">${fmt(elapsed())}</div>
      <div class="row gap" style="justify-content:center">
        ${t?.running ? `<button class="btn" id="pause" style="background:#F3F0EB;color:#3A3734">${icon('pause')} Pausa</button>` : `<button class="btn" id="start" style="background:#F3F0EB;color:#3A3734">${icon('play')} ${t ? 'Seguir' : 'Empezar'}</button>`}
        ${t ? '<button class="btn" id="stop" style="background:rgba(255,255,255,.12);color:#F3F0EB">Terminar y guardar</button>' : ''}
      </div>
      <p class="note-line center">Al terminar, los minutos se suman a tu registro de hoy.</p>
    </section>
    <div class="section-head"><h2>Hoy</h2><span class="small muted">semana</span></div>
    <div class="tiles">${cats.map(c => {
      const m = minsOf(c, today()); const col = sectionColor(c.section);
      return `<button class="tile ${isDone(c, getVal(c.id, today())) ? 'done' : ''}" data-open="${c.id}" style="--c:${col}"><div class="t-top"><span class="t-emoji">${esc(c.icon)}</span></div>
        <span class="t-name">${esc(c.name)}</span><span class="t-val">${m}′</span><span class="t-sub">${week(c)}′ esta semana · 🔥${streak(c)}</span>
        ${c.target ? `<div class="bar"><i style="width:${Math.min(100, m / c.target * 100)}%"></i></div>` : ''}</button>`;
    }).join('')}</div>
    <p class="small muted mt">El Foco usa tus categorías de la sección Mente con minutos. Puedes añadir más en Ajustes → Mis categorías.</p>`
    : '<div class="card empty"><p>No tienes categorías de Mente con minutos.</p><button class="btn primary" id="addStudy">Añadir Estudiar</button></div>';
  const save = () => localStorage.setItem(TK, JSON.stringify(t));
  $$('[data-sel]', root).forEach(b => b.onclick = () => { selId = b.dataset.sel; if (t) { t.cid = selId; save(); } rerender(); });
  $('#start', root)?.addEventListener('click', () => { t = { ...(t || { acc: 0 }), pid: S.profile.id, cid: selId, running: true, start: Date.now() }; save(); rerender(); });
  $('#pause', root)?.addEventListener('click', () => { t.acc = (t.acc || 0) + (Date.now() - t.start); t.running = false; save(); rerender(); });
  $('#stop', root)?.addEventListener('click', async () => {
    const m = Math.round(elapsed() / 60); const c = S.cats.find(x => x.id === (t.cid || selId));
    localStorage.removeItem(TK); t = null;
    if (m > 0 && c) { await addMinutes(c, m); toast(`${m} min guardados en ${c.name}`); } else toast('Menos de un minuto: no se guarda');
    rerender();
  });
  $$('[data-open]', root).forEach(b => b.onclick = () => habitSheet(S.cats.find(c => c.id === b.dataset.open), today(), rerender));
  $('#addStudy', root)?.addEventListener('click', async () => { await applyTemplate(['study'], []); rerender(); });
  clearInterval(tick);
  if (t?.running) tick = setInterval(() => { const el = document.getElementById('clock'); if (!el) return clearInterval(tick); el.textContent = fmt(elapsed()); }, 1000);
}

function objetivos(root) {
  const list = itemsOf('goal').sort((a, b) => (a.data.done - b.data.done) || (a.data.deadline || '9').localeCompare(b.data.deadline || '9'));
  root.innerHTML = `
    <button class="btn primary block" id="addG">${icon('plus')} Nuevo objetivo</button>
    ${list.map(g => {
      const d = g.data; const left = d.deadline ? diffDays(d.deadline, today()) : null;
      const steps = d.steps || []; const sd = steps.filter(s => s.done).length;
      const gh = goalHabit(g);
      const ws = t => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z]+/).filter(w => w.length > 4);
      const sug = !gh && !d.done ? activeCats().find(c => !['text', 'scale', 'money'].includes(c.type) && ws(c.name).some(w => ws(d.title).includes(w))) : null;
      const pct = gh ? Math.round(gh.pct * 100) : steps.length ? Math.round(sd / steps.length * 100) : (d.progress || 0);
      return `<section class="card goal ${d.done ? 'is-done' : ''}">
        <div class="row between"><h3>${esc(d.title)}</h3><button class="icon-btn" data-ge="${g.id}">${icon('edit')}</button></div>
        ${d.why ? `<p class="small muted">${esc(d.why)}</p>` : ''}
        <div class="bar big"><i style="width:${pct}%"></i></div>
        <p class="small">${pct}%${left !== null ? ` · ${left >= 0 ? `quedan ${left} días` : 'fecha pasada'}` : ''}</p>
        ${sug ? `<button class="btn small color block mt-s" data-link="${g.id}" data-cat="${sug.id}" style="--c:#A7BCEB">Vincular con ${esc(sug.icon)} ${esc(sug.name)} para medirlo solo</button>` : ''}
        ${gh ? `<div class="kpis"><div><b>${gh.met}/${gh.elapsed}</b><span>días cumplidos</span></div><div><b>🔥${gh.streak}</b><span>racha</span></div><div><b>${gh.planned ? gh.planned - gh.elapsed : '—'}</b><span>días por delante</span></div></div>
          <p class="small muted">Se cumple el día que completas ${esc(gh.cat.icon)} ${esc(gh.cat.name)}${gh.cat.target ? ` (${gh.cat.target}${gh.cat.type === 'number' ? ' ' + esc(gh.cat.unit || '') : ' min'})` : ''}. Se apunta en Hoy o con el temporizador de Foco.</p>` : ''}
        ${steps.length ? `<div class="list">${steps.map((s, i) => `<label class="check-row"><input type="checkbox" data-gs="${g.id}" data-i="${i}" ${s.done ? 'checked' : ''}><span class="grow">${esc(s.t)}</span></label>`).join('')}</div>` : ''}
      </section>`;
    }).join('') || '<p class="muted center mt">Define 2–3 objetivos para este trimestre. Divídelos en pasos pequeños.</p>'}`;
  $('#addG', root).onclick = () => goalEdit(null);
  $$('[data-link]', root).forEach(b => b.onclick = async () => {
    const g = S.items.find(i => i.id === b.dataset.link);
    await saveItem(g, { linkCat: b.dataset.cat, start: g.data.start || (g.created_at || today()).slice(0, 10) });
    toast('Objetivo vinculado'); rerender();
  });
  $$('[data-ge]', root).forEach(b => b.onclick = () => goalEdit(S.items.find(i => i.id === b.dataset.ge)));
  $$('[data-gs]', root).forEach(b => b.onchange = async () => {
    const g = S.items.find(i => i.id === b.dataset.gs); const steps = [...g.data.steps];
    steps[b.dataset.i] = { ...steps[b.dataset.i], done: b.checked };
    await saveItem(g, { steps, done: steps.every(s => s.done) }); rerender();
  });
}
function goalEdit(g) {
  const d = g?.data || { steps: [] };
  sheet(g ? 'Editar objetivo' : 'Nuevo objetivo', `<div class="stack">
    <label class="field"><span>Objetivo</span><input name="title" value="${esc(d.title || '')}" placeholder="Correr 10 km, B2 de inglés…"></label>
    <label class="field"><span>¿Por qué es importante?</span><input name="why" value="${esc(d.why || '')}"></label>
    <label class="field"><span>Fecha objetivo</span><input type="date" name="deadline" value="${d.deadline || ''}"></label>
    <label class="field"><span>Vincular a un hábito diario (el progreso se calcula solo)</span><select name="linkCat"><option value="">— Sin vincular —</option>
      ${activeCats().filter(c => !['text', 'scale', 'money'].includes(c.type)).map(c => `<option value="${c.id}" ${d.linkCat === c.id ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Desde</span><input type="date" name="start" value="${d.start || (g?.created_at || '').slice(0, 10) || today()}"></label>
    <label class="field"><span>Pasos (uno por línea)</span><textarea class="input" name="steps" rows="5">${esc((d.steps || []).map(s => s.t).join('\n'))}</textarea></label>
    <label class="field"><span>Progreso manual (si no usas pasos): <b id="pv">${d.progress || 0}%</b></span><input type="range" name="progress" min="0" max="100" step="5" value="${d.progress || 0}"></label>
    <label class="check-row"><input type="checkbox" name="done" ${d.done ? 'checked' : ''}><span>Conseguido 🎉</span></label>
    <div class="row gap">${g ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('[name=progress]', body).oninput = e => { $('#pv', body).textContent = e.target.value + '%'; };
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.title) return;
      const old = d.steps || [];
      const steps = f.steps.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ t, done: !!old.find(o => o.t === t)?.done }));
      const data = { ...f, progress: Number(f.progress) || 0, steps, deadline: f.deadline || null, linkCat: f.linkCat || null, start: f.start || today() };
      g ? await saveItem(g, data) : await addItem('goal', data); closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox('Borrar el objetivo')) { await deleteItem(g); rerender(); } });
  });
}

// ------------------------------------------------------------------ INGLÉS
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
function ingles(root) {
  let cat = catByKey('english');
  const vocab = itemsOf('vocab');
  const due = vocab.filter(v => !v.data.next || v.data.next <= today());
  const mins = cat ? Number(getVal(cat.id, today())) || 0 : 0;
  const idea = ENGLISH_IDEAS[new Date().getDate() % ENGLISH_IDEAS.length];
  const week = cat ? Array.from({ length: 7 }, (_, i) => Number(getVal(cat.id, addDays(today(), -i))) || 0).reduce((a, b) => a + b, 0) : 0;
  root.innerHTML = `
    <section class="card">
      ${cat ? `<div class="kpis"><div><b>${mins}′</b><span>hoy</span></div><div><b>${week}′</b><span>esta semana</span></div><div><b>🔥 ${streak(cat)}</b><span>racha</span></div></div>
      <div class="row gap mt-s">${[10, 15, 30].map(n => `<button class="btn ghost grow" data-addm="${n}">+${n} min</button>`).join('')}</div>`
        : `<p class="muted">Activa la categoría Inglés para registrar minutos.</p><button class="btn ghost" id="addEng">Activar</button>`}
    </section>
    <section class="card"><p class="eyebrow">Idea de hoy</p><p>${esc(idea)}</p></section>
    <h4 class="sec-title">Vocabulario <span class="muted">${vocab.length}</span></h4>
    <div class="row gap"><button class="btn primary grow" id="review" ${due.length ? '' : 'disabled'}>Repasar (${due.length})</button><button class="btn ghost" id="addW">${icon('plus')} Palabra</button></div>
    <div class="card list mt-s">${vocab.slice().reverse().map(v => `<button class="li" data-w="${v.id}"><div class="grow"><b>${esc(v.data.word)}</b> — ${esc(v.data.meaning)}${v.data.example ? `<div class="small muted">${esc(v.data.example)}</div>` : ''}</div><span class="small muted">nivel ${v.data.box || 0}</span></button>`).join('') || '<p class="muted small">Añade palabras o frases que quieras recordar. El repaso usa repetición espaciada: las que aciertas vuelven cada vez más tarde.</p>'}</div>`;
  $$('[data-addm]', root).forEach(b => b.onclick = async () => { await setVal(cat.id, mins + Number(b.dataset.addm), today()); toast('Minutos añadidos'); rerender(); });
  $('#addEng', root)?.addEventListener('click', async () => { await applyTemplate(['english'], []); rerender(); });
  $('#addW', root).onclick = () => wordEdit(null);
  $$('[data-w]', root).forEach(b => b.onclick = () => wordEdit(S.items.find(i => i.id === b.dataset.w)));
  $('#review', root).onclick = () => review(due);
}
function wordEdit(w) {
  const d = w?.data || {};
  sheet(w ? 'Editar palabra' : 'Nueva palabra', `<div class="stack">
    <label class="field"><span>Inglés</span><input name="word" value="${esc(d.word || '')}"></label>
    <label class="field"><span>Significado</span><input name="meaning" value="${esc(d.meaning || '')}"></label>
    <label class="field"><span>Ejemplo</span><input name="example" value="${esc(d.example || '')}"></label>
    <div class="row gap">${w ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.word) return;
      w ? await saveItem(w, f) : await addItem('vocab', { ...f, box: 0, next: today() }); closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox('Borrar la palabra')) { await deleteItem(w); rerender(); } });
  });
}
function review(list) {
  const queue = list.slice().sort(() => Math.random() - 0.5); let i = 0; let ok = 0;
  const draw = body => {
    if (i >= queue.length) { body.innerHTML = `<p class="center big-emoji">✨</p><p class="center">${ok} de ${queue.length} bien</p><button class="btn primary block" id="fin">Terminar</button>`; $('#fin', body).onclick = () => { closeSheet(); rerender(); }; return; }
    const v = queue[i];
    body.innerHTML = `<div class="flash"><p class="small muted">${i + 1} / ${queue.length}</p><h2>${esc(v.data.word)}</h2>
      <div id="ans" hidden><p>${esc(v.data.meaning)}</p>${v.data.example ? `<p class="small muted">${esc(v.data.example)}</p>` : ''}</div>
      <button class="btn ghost block" id="show">Ver respuesta</button>
      <div class="row gap" id="grade" hidden><button class="btn ghost grow" id="no">No me acordaba</button><button class="btn primary grow" id="yes">Lo sabía</button></div></div>`;
    $('#show', body).onclick = () => { $('#ans', body).hidden = false; $('#grade', body).hidden = false; $('#show', body).hidden = true; };
    const grade = async good => {
      const box = good ? Math.min(5, (v.data.box || 0) + 1) : 0; if (good) ok++;
      await saveItem(v, { box, next: addDays(today(), BOX_DAYS[box] || 1) }); i++; draw(body);
    };
    $('#yes', body).onclick = () => grade(true); $('#no', body).onclick = () => grade(false);
  };
  sheet('Repaso', '', draw);
}

// ------------------------------------------------------------------ CATEGORÍAS