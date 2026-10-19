// Más: tareas, objetivos, inglés, categorías, apariencia, datos
import * as db from './db.js';
import {
  S, itemsOf, addItem, saveItem, deleteItem, tasks, saveCategory, deleteCategory, moveCategory, catByKey, getVal, setVal,
  streak, applyTemplate,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, fmtShort, relDay, formData } from './ui.js';
import { CATALOG, TYPES, SECTIONS, ENGLISH_IDEAS } from './data.js';
import { header, bindHeader, rerender, go, profileEditor, renderPicker, applyTheme } from './app.js';

export function renderMore(view, sub) {
  const pages = { tareas, objetivos, ingles, categorias };
  if (pages[sub]) {
    const titles = { tareas: 'Tareas', objetivos: 'Objetivos', ingles: 'Inglés', categorias: 'Mis categorías' };
    view.innerHTML = `${header(titles[sub], '')}<a class="back" href="#/mas">${icon('left')} Más</a><div id="moreBody"></div>`;
    bindHeader(view);
    return pages[sub]($('#moreBody', view));
  }
  const open = tasks().filter(t => !t.data.done).length;
  const goals = itemsOf('goal').filter(g => !g.data.done).length;
  const theme = localStorage.getItem('ritual_theme') || 'auto';
  view.innerHTML = `${header('Más', '')}
    <div class="card list menu">
      <a class="li" href="#/mas/tareas"><span class="ci">☐</span><span class="grow">Tareas pendientes</span><span class="muted">${open}</span>${icon('right')}</a>
      <a class="li" href="#/mas/objetivos"><span class="ci">🎯</span><span class="grow">Objetivos personales</span><span class="muted">${goals}</span>${icon('right')}</a>
      <a class="li" href="#/mas/ingles"><span class="ci">🇬🇧</span><span class="grow">Mejorar inglés</span>${icon('right')}</a>
      <a class="li" href="#/mas/categorias"><span class="ci">⚙︎</span><span class="grow">Mis categorías y hábitos</span>${icon('right')}</a>
    </div>
    <h4 class="sec-title">Apariencia</h4>
    <div class="seg">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div>
    <h4 class="sec-title">Cuenta</h4>
    <div class="card list menu">
      <button class="li" id="mProfile"><span class="ci">🤍</span><span class="grow">Editar perfil, color, imagen y objetivos</span>${icon('right')}</button>
      <button class="li" id="mSwitch"><span class="ci">⇄</span><span class="grow">Cambiar de perfil</span>${icon('right')}</button>
      <button class="li" id="mExport"><span class="ci">⤓</span><span class="grow">Descargar copia de mis datos</span>${icon('right')}</button>
      ${db.DEMO ? '' : `<button class="li" id="mOut"><span class="ci">⎋</span><span class="grow">Cerrar sesión</span>${icon('right')}</button>`}
    </div>
    <p class="small muted center mt">Ritual · ${db.DEMO ? 'modo demo (datos en este navegador)' : 'conectado a Supabase'}</p>`;
  bindHeader(view);
  $$('[data-theme-set]', view).forEach(b => b.onclick = () => { localStorage.setItem('ritual_theme', b.dataset.themeSet); applyTheme(); rerender(); });
  $('#mProfile', view).onclick = profileEditor;
  $('#mSwitch', view).onclick = () => { location.hash = ''; renderPicker(); };
  $('#mExport', view).onclick = exportData;
  $('#mOut', view)?.addEventListener('click', async () => { await db.signOut(); localStorage.removeItem('ritual_last_profile'); location.hash = ''; location.reload(); });
}

function exportData() {
  const data = { profile: S.profile, categories: S.cats, entries: [...S.entries.values()], items: S.items, exportedAt: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = `ritual-${S.profile.name}-${today()}.json`; a.click();
}

// ------------------------------------------------------------------ TAREAS
const PRIOS = [['urgente', '🔴 No posponer'], ['importante', '🟠 Importante'], ['pequena', '🟢 Pequeña']];
let showDone = false;
function tareas(root) {
  const list = tasks();
  const open = list.filter(t => !t.data.done);
  const done = list.filter(t => t.data.done).sort((a, b) => (b.data.doneAt || '').localeCompare(a.data.doneAt || ''));
  const line = t => `<div class="li task ${t.data.done ? 'is-done' : ''}">
    <button class="checkbox ${t.data.done ? 'on' : ''}" data-tg="${t.id}" aria-label="Completar">${icon('check')}</button>
    <button class="grow left" data-ed="${t.id}"><div>${esc(t.data.title)}</div>
    <div class="small muted">${[t.data.est ? `${t.data.est} min` : '', t.data.due ? (t.data.due < today() && !t.data.done ? `<b class="warn-text">vencida ${fmtShort(t.data.due)}</b>` : fmtShort(t.data.due)) : ''].filter(Boolean).join(' · ')}</div></button></div>`;
  root.innerHTML = `
    <form class="card quick-add" id="qa">
      <input class="input" name="title" placeholder="Nueva tarea…" autocomplete="off">
      <div class="row gap wrap">
        <select class="input" name="prio">${PRIOS.map(([k, l]) => `<option value="${k}" ${k === 'importante' ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input class="input num" type="number" name="est" placeholder="min" inputmode="numeric">
        <input class="input" type="date" name="due">
        <button class="btn primary" type="submit">${icon('plus')}</button>
      </div>
    </form>
    ${PRIOS.map(([k, l]) => {
      const ts = open.filter(t => t.data.prio === k);
      return `<h4 class="sec-title">${l} <span class="muted">${ts.length}</span></h4><div class="card list">${ts.map(line).join('') || '<p class="muted small">Nada por aquí.</p>'}</div>`;
    }).join('')}
    ${done.length ? `<button class="btn ghost block mt" id="tgDone">${showDone ? 'Ocultar' : 'Ver'} completadas (${done.length})</button>
    ${showDone ? `<div class="card list mt-s">${done.slice(0, 50).map(line).join('')}</div>` : ''}` : ''}`;
  $('#qa', root).onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target); if (!f.title) return;
    await addItem('task', { title: f.title, prio: f.prio, est: f.est, due: f.due || null, done: false });
    rerender(); setTimeout(() => $('#qa input[name=title]')?.focus(), 50);
  };
  $$('[data-tg]', root).forEach(b => b.onclick = async () => {
    const t = S.items.find(i => i.id === b.dataset.tg);
    await saveItem(t, { done: !t.data.done, doneAt: !t.data.done ? today() : null }); rerender();
  });
  $$('[data-ed]', root).forEach(b => b.onclick = () => taskEdit(S.items.find(i => i.id === b.dataset.ed)));
  $('#tgDone', root)?.addEventListener('click', () => { showDone = !showDone; rerender(); });
}
function taskEdit(t) {
  const d = t.data;
  sheet('Tarea', `<div class="stack">
    <label class="field"><span>Título</span><input name="title" value="${esc(d.title)}"></label>
    <label class="field"><span>Prioridad</span><select class="input" name="prio">${PRIOS.map(([k, l]) => `<option value="${k}" ${d.prio === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="grid2"><label class="field"><span>Minutos estimados</span><input type="number" name="est" value="${d.est ?? ''}"></label>
    <label class="field"><span>Fecha límite</span><input type="date" name="due" value="${d.due || ''}"></label></div>
    <label class="field"><span>Notas</span><textarea class="input" name="notes" rows="3">${esc(d.notes || '')}</textarea></label>
    <div class="row gap"><button class="btn danger ghost" id="del">${icon('trash')}</button><button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('#save', body).onclick = async () => { const f = formData(body); await saveItem(t, { ...f, due: f.due || null }); closeSheet(); rerender(); };
    $('#del', body).onclick = async () => { if (await confirmBox('Borrar la tarea')) { await deleteItem(t); rerender(); } };
  });
}

// ------------------------------------------------------------------ OBJETIVOS
function objetivos(root) {
  const list = itemsOf('goal').sort((a, b) => (a.data.done - b.data.done) || (a.data.deadline || '9').localeCompare(b.data.deadline || '9'));
  root.innerHTML = `
    <button class="btn primary block" id="addG">${icon('plus')} Nuevo objetivo</button>
    ${list.map(g => {
      const d = g.data; const left = d.deadline ? diffDays(d.deadline, today()) : null;
      const steps = d.steps || []; const sd = steps.filter(s => s.done).length;
      const pct = steps.length ? Math.round(sd / steps.length * 100) : (d.progress || 0);
      return `<section class="card goal ${d.done ? 'is-done' : ''}">
        <div class="row between"><h3>${esc(d.title)}</h3><button class="icon-btn" data-ge="${g.id}">${icon('edit')}</button></div>
        ${d.why ? `<p class="small muted">${esc(d.why)}</p>` : ''}
        <div class="bar big"><i style="width:${pct}%"></i></div>
        <p class="small">${pct}%${left !== null ? ` · ${left >= 0 ? `quedan ${left} días` : 'fecha pasada'}` : ''}</p>
        ${steps.length ? `<div class="list">${steps.map((s, i) => `<label class="check-row"><input type="checkbox" data-gs="${g.id}" data-i="${i}" ${s.done ? 'checked' : ''}><span class="grow">${esc(s.t)}</span></label>`).join('')}</div>` : ''}
      </section>`;
    }).join('') || '<p class="muted center mt">Define 2–3 objetivos para este trimestre. Divídelos en pasos pequeños.</p>'}`;
  $('#addG', root).onclick = () => goalEdit(null);
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
    <label class="field"><span>Pasos (uno por línea)</span><textarea class="input" name="steps" rows="5">${esc((d.steps || []).map(s => s.t).join('\n'))}</textarea></label>
    <label class="field"><span>Progreso manual (si no usas pasos): <b id="pv">${d.progress || 0}%</b></span><input type="range" name="progress" min="0" max="100" step="5" value="${d.progress || 0}"></label>
    <label class="check-row"><input type="checkbox" name="done" ${d.done ? 'checked' : ''}><span>Conseguido 🎉</span></label>
    <div class="row gap">${g ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('[name=progress]', body).oninput = e => { $('#pv', body).textContent = e.target.value + '%'; };
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.title) return;
      const old = d.steps || [];
      const steps = f.steps.split('\n').map(s => s.trim()).filter(Boolean).map(t => ({ t, done: !!old.find(o => o.t === t)?.done }));
      const data = { ...f, progress: Number(f.progress) || 0, steps, deadline: f.deadline || null };
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
function categorias(root) {
  const missing = CATALOG.filter(c => !S.cats.some(x => x.key === c.key));
  root.innerHTML = `
    <p class="small muted">Activa, desactiva, ordena o crea tus propias categorías. Las desactivadas no salen en Hoy pero guardan su historial.</p>
    <div class="card list">${S.cats.map((c, i) => `<div class="li cat ${c.active ? '' : 'off'}">
      <span class="ci">${esc(c.icon)}</span><div class="grow"><div>${esc(c.name)}</div><div class="small muted">${esc(c.section)} · ${TYPES[c.type] || c.type}</div></div>
      <button class="icon-btn" data-up="${c.id}" ${i === 0 ? 'disabled' : ''}>${icon('up')}</button>
      <button class="icon-btn" data-down="${c.id}" ${i === S.cats.length - 1 ? 'disabled' : ''}>${icon('down')}</button>
      <label class="switch"><input type="checkbox" data-act="${c.id}" ${c.active ? 'checked' : ''}><i></i></label>
      <button class="icon-btn" data-ed="${c.id}">${icon('edit')}</button></div>`).join('') || '<p class="muted">Sin categorías.</p>'}</div>
    <button class="btn primary block mt" id="newCat">${icon('plus')} Crear categoría</button>
    ${missing.length ? `<h4 class="sec-title">Añadir del catálogo</h4><div class="chips wrap">${missing.map(c => `<button class="chip" data-addk="${c.key}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>` : ''}`;
  $$('[data-up]', root).forEach(b => b.onclick = async () => { await moveCategory(b.dataset.up, -1); rerender(); });
  $$('[data-down]', root).forEach(b => b.onclick = async () => { await moveCategory(b.dataset.down, 1); rerender(); });
  $$('[data-act]', root).forEach(b => b.onchange = async () => { const c = S.cats.find(x => x.id === b.dataset.act); await saveCategory({ id: c.id, active: b.checked }); rerender(); });
  $$('[data-ed]', root).forEach(b => b.onclick = () => catEdit(S.cats.find(x => x.id === b.dataset.ed)));
  $('#newCat', root).onclick = () => catEdit(null);
  $$('[data-addk]', root).forEach(b => b.onclick = async () => { await applyTemplate([b.dataset.addk], []); toast('Añadida'); rerender(); });
}
function catEdit(c) {
  const d = c || { icon: '✨', type: 'bool', section: 'Hábitos' };
  const secs = [...new Set([...SECTIONS, ...S.cats.map(x => x.section)])];
  sheet(c ? 'Editar categoría' : 'Nueva categoría', `<div class="stack">
    <div class="grid-icon"><label class="field"><span>Icono</span><input name="icon" maxlength="4" value="${esc(d.icon)}"></label>
    <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name || '')}" placeholder="Meditar, vitamina D…"></label></div>
    <label class="field"><span>Tipo</span><select class="input" name="type" ${c ? 'disabled' : ''}>${Object.entries(TYPES).map(([k, l]) => `<option value="${k}" ${d.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Sección</span><input name="section" list="secs" value="${esc(d.section)}"></label>
    <datalist id="secs">${secs.map(s => `<option value="${esc(s)}">`).join('')}</datalist>
    <div class="grid2"><label class="field"><span>Unidad</span><input name="unit" value="${esc(d.unit || '')}" placeholder="vasos, km…"></label>
    <label class="field"><span>Meta diaria</span><input type="number" name="target" value="${d.target ?? ''}"></label></div>
    <div class="row gap">${c ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.name) return toast('Ponle un nombre');
      const data = { name: f.name, icon: f.icon || '•', section: f.section || 'Hábitos', unit: f.unit || null, target: f.target };
      if (c) await saveCategory({ id: c.id, ...data }); else await saveCategory({ ...data, type: f.type, key: null });
      closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => {
      if (await confirmBox(`Borrar "${d.name}" y todo su historial. Si solo quieres ocultarla, desactívala.`)) { await deleteCategory(c.id); rerender(); }
    });
  });
}
