// Agenda: calendario del mes, próximos eventos (con Google Calendar) y tareas
import {
  S, activeCats, getVal, isDone, dayCompletion, itemsOf, addItem, saveItem, deleteItem, tasks, catByKey, upcomingEvents,
  completeTask, markCareDone,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, parseDay, dayStr, fmtShort, MONTHS, formData } from './ui.js';
import { CARE_GROUP_COLORS } from './data.js';
import { topbar, rerender, go } from './app.js';

const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const gDate = d => d.replace(/-/g, '');
export function gcalLink(ev) {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: ev.title, dates: `${gDate(ev.day)}/${gDate(addDays(ev.day, 1))}`,
    details: 'Desde Ritual', ctz: 'Europe/Madrid',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
const evColor = ev => ev.kind === 'event' ? '#E8C979' : ev.kind === 'care' ? (CARE_GROUP_COLORS[ev.group] || '#CFC7BE') : ev.kind === 'goal' ? '#F2CF7E' : '#A7BCEB';

export function renderAgenda(view, sub = 'calendario') {
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Agenda</h1></div>
    <div class="seg"><a href="#/agenda/calendario" class="${sub !== 'tareas' ? 'on' : ''}">Calendario</a><a href="#/agenda/tareas" class="${sub === 'tareas' ? 'on' : ''}">Tareas</a></div>
    <div id="agBody"></div>`;
  (sub === 'tareas' ? tareas : calendario)($('#agBody', view));
}

// ------------------------------------------------------------ CALENDARIO
const DOWL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MON3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dayName = ds => { const d = parseDay(ds); return `${DOWL[d.getDay()]} ${d.getDate()} ${MON3[d.getMonth()]}`; };
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export function dayTitle(ds) {
  const n = diffDays(ds, today());
  if (n === 0) return `Hoy · ${dayName(ds)}`;
  if (n === 1) return `Mañana · ${dayName(ds)}`;
  if (n === -1) return `Ayer · ${dayName(ds)}`;
  return `${cap(dayName(ds))}${n > 1 ? ` · en ${n} días` : ''}`;
}
const KIND_TAG = ev => ev.kind === 'task' ? 'Tarea' : ev.kind === 'event' ? 'Evento' : ev.kind === 'goal' ? 'Objetivo' : ev.group === 'ipl' ? 'IPL' : 'Cuidado';
function evRow(ev) {
  const t = ev.kind === 'task' ? S.items.find(i => i.id === ev.id) : null;
  const act = t ? `<button class="checkbox" data-agtask="${t.id}" aria-label="Hecha">${icon('check')}</button>`
    : ev.careId && ev.day === today() ? `<button class="btn tiny" data-agcare="${ev.careId}">Hecho</button>` : `<span class="ag-dot"></span>`;
  const meta = [KIND_TAG(ev), ev.time ? `desde las ${ev.time}` : '', ev.min ? `${ev.min} min` : '', ev.late ? `<b class="warn-text">${ev.kind === 'task' ? `vencida el ${fmtShort(ev.due)}` : 'atrasado'}</b>` : ''].filter(Boolean).join(' · ');
  return `<div class="ag-item" style="--c:${evColor(ev)}">${act}
    <div class="grow"><div>${ev.icon ? esc(ev.icon) + ' ' : ''}${esc(ev.title.replace(/ · \d\d:\d\d$/, ''))}</div><div class="small muted">${meta}</div>
    ${ev.why ? `<details class="why"><summary class="small muted">Por qué este día</summary><p class="small muted">${esc(ev.why)}</p></details>` : ''}</div>
    <a class="gcal" href="${gcalLink(ev)}" target="_blank" rel="noopener" title="Añadir a Google Calendar" aria-label="Añadir a Google Calendar">G+</a></div>`;
}
function dayCard(ds, evs, big) {
  return `<section class="card ag-day ${big ? 'big' : ''}"><h3>${dayTitle(ds)}</h3>
    ${evs.length ? evs.map(evRow).join('') : '<p class="small muted">Nada programado.</p>'}</section>`;
}
let calMonth = null; let calCat = 'all'; let selDay = null; let moreDays = false;
function calendario(root) {
  if (!calMonth) { const d = new Date(); calMonth = [d.getFullYear(), d.getMonth()]; }
  const [y, m] = calMonth;
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cats = activeCats().filter(c => c.type !== 'text');
  const cat = cats.find(c => c.id === calCat);
  const logs = itemsOf('carelog');
  const evs = upcomingEvents(400);
  const on = ds => evs.filter(e => e.day === ds);
  const period = catByKey('period');
  const t = today(); const tm = addDays(t, 1);
  const cells = Array.from({ length: startOffset }, () => '<div class="cday empty"></div>');
  for (let d = 1; d <= daysIn; d++) {
    const ds = dayStr(new Date(y, m, d)); const future = ds > t;
    let lv = 0;
    if (!future) {
      if (cat) { const v = getVal(cat.id, ds); lv = cat.type === 'scale' ? (v ? Math.ceil(v / 5 * 4) : 0) : (isDone(cat, v) ? 4 : 0); }
      else lv = Math.ceil(dayCompletion(ds) * 4);
    }
    const n = future || ds === t ? on(ds).length : 0;
    cells.push(`<button class="cday l${lv} ${ds === t ? 'today' : ''} ${future ? 'future' : ''} ${ds === selDay ? 'sel' : ''}" data-day="${ds}"><span>${d}</span>${n ? `<span class="cnt">${n}</span>` : ''}${period && getVal(period.id, ds) ? '<i class="pd"></i>' : ''}</button>`);
  }
  const next = [];
  for (let i = 2; i <= (moreDays ? 30 : 9); i++) { const ds = addDays(t, i); const l = on(ds); if (l.length) next.push(dayCard(ds, l)); }
  let sel = '';
  if (selDay && selDay !== t && selDay !== tm) {
    if (selDay > t) sel = `<div id="selDay">${dayCard(selDay, on(selDay), true)}</div>`;
    else {
      const done = logs.filter(l => l.data.day === selDay);
      const hs = activeCats().filter(c => isDone(c, getVal(c.id, selDay)));
      sel = `<section class="card ag-day big" id="selDay"><h3>${dayTitle(selDay)}</h3>
        <p class="small">${hs.length ? `Hecho: ${hs.map(c => esc(c.icon)).join(' ')}` : 'No apuntaste hábitos.'}</p>
        ${done.length ? `<p class="small">Cuidados: ${done.map(l => esc(l.data.name)).join(', ')}</p>` : ''}
        <button class="btn ghost block" id="editDay">Ver o editar ese día</button></section>`;
    }
  }
  root.innerHTML = `
    ${dayCard(t, on(t), true)}
    ${dayCard(tm, on(tm))}
    <div class="section-head"><h2>Próximos días</h2><a href="#/ajustes/calendario">Google Calendar</a></div>
    ${next.join('') || '<p class="muted small">Nada más en estos días.</p>'}
    <button class="btn ghost block" id="moreD">${moreDays ? 'Ver menos' : 'Ver hasta 30 días'}</button>
    <div class="section-head"><h2>Mes</h2></div>
    <section class="card">
      <div class="row between"><button class="icon-btn" id="pm" aria-label="Mes anterior">${icon('left')}</button>
        <h2 class="cap">${MONTHS[m]} ${y}</h2><button class="icon-btn" id="nm" aria-label="Mes siguiente">${icon('right')}</button></div>
      <div class="cal-head">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal">${cells.join('')}</div>
      <p class="small muted mt-s">Toca un día para ver qué hay. El número es cuántas cosas tienes ese día; el color de los días pasados, cuánto cumpliste.</p>
      <select class="input mt-s" id="calCat"><option value="all">Color: % de hábitos del día</option>
        ${cats.map(c => `<option value="${c.id}" ${c.id === calCat ? 'selected' : ''}>Color: ${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
    </section>
    ${sel}`;
  $('#pm', root).onclick = () => { calMonth = m === 0 ? [y - 1, 11] : [y, m - 1]; rerender(); };
  $('#nm', root).onclick = () => { calMonth = m === 11 ? [y + 1, 0] : [y, m + 1]; rerender(); };
  $('#calCat', root).onchange = e => { calCat = e.target.value; rerender(); };
  $('#moreD', root).onclick = () => { moreDays = !moreDays; rerender(); };
  $$('.cday[data-day]', root).forEach(b => b.onclick = () => {
    selDay = b.dataset.day; rerender();
    setTimeout(() => document.getElementById('selDay')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  });
  $('#editDay', root)?.addEventListener('click', () => { S.date = selDay; go('#/hoy'); });
  $$('[data-agtask]', root).forEach(b => b.onclick = async () => { b.classList.add('on'); await completeTask(S.items.find(i => i.id === b.dataset.agtask)); toast('Tarea hecha'); setTimeout(rerender, 300); });
  $$('[data-agcare]', root).forEach(b => b.onclick = async () => { await markCareDone(S.items.find(i => i.id === b.dataset.agcare)); toast('Registrado'); rerender(); });
}

// ------------------------------------------------------------ TAREAS
const PRIOS = [['urgente', '🔴', 'No posponer', '#EFA3AE'], ['importante', '🟠', 'Importantes', '#F2CF7E'], ['pequena', '🟢', 'Pequeñas', '#A8C99A']];
let showDone = false;
function tareas(root) {
  const list = tasks();
  const open = list.filter(t => !t.data.done);
  const done = list.filter(t => t.data.done).sort((a, b) => (b.data.doneAt || '').localeCompare(a.data.doneAt || ''));
  const line = t => `<div class="li task ${t.data.done ? 'is-done' : ''}">
    <button class="checkbox ${t.data.done ? 'on' : ''}" data-tg="${t.id}" aria-label="Completar">${icon('check')}</button>
    <button class="grow" data-ed="${t.id}"><div>${esc(t.data.title)}</div>
    <div class="small muted">${[t.data.est ? `${t.data.est} min` : '', t.data.due ? (t.data.due < today() && !t.data.done ? `<b class="warn-text">vencida ${fmtShort(t.data.due)}</b>` : fmtShort(t.data.due)) : ''].filter(Boolean).join(', ')}</div></button>
    ${t.data.due && !t.data.done ? `<a class="gcal" href="${gcalLink({ title: t.data.title, day: t.data.due })}" target="_blank" rel="noopener" aria-label="Añadir a Google Calendar">G+</a>` : ''}</div>`;
  root.innerHTML = `
    <form class="card quick-add" id="qa">
      <input class="input" name="title" placeholder="Nueva tarea" autocomplete="off">
      <div class="chips" id="prioChips">${PRIOS.map(([k, e, l]) => `<button type="button" class="chip ${k === 'importante' ? 'on' : ''}" data-p="${k}">${e} ${l}</button>`).join('')}</div>
      <div class="row gap"><input class="input" type="number" name="est" placeholder="Minutos" inputmode="numeric"><input class="input" type="date" name="due"><button class="btn primary" type="submit" aria-label="Añadir">${icon('plus')}</button></div>
    </form>
    ${PRIOS.map(([k, e, l, c]) => {
      const ts = open.filter(t => t.data.prio === k);
      return `<div class="prio-head" style="--c:${c};color:var(--c-ink)">${e} ${l} <span class="muted">${ts.length}</span></div><div class="card list">${ts.map(line).join('') || '<p class="muted small" style="padding:8px">Nada por aquí.</p>'}</div>`;
    }).join('')}
    ${done.length ? `<button class="btn ghost block mt" id="tgDone">${showDone ? 'Ocultar' : 'Ver'} completadas (${done.length})</button>
    ${showDone ? `<div class="card list mt-s">${done.slice(0, 50).map(line).join('')}</div>` : ''}` : ''}`;
  let prio = 'importante';
  $$('[data-p]', root).forEach(b => b.onclick = () => { prio = b.dataset.p; $$('[data-p]', root).forEach(x => x.classList.toggle('on', x === b)); });
  $('#qa', root).onsubmit = async e => {
    e.preventDefault(); const f = formData(e.target); if (!f.title) return;
    await addItem('task', { title: f.title, prio, est: f.est, due: f.due || null, done: false });
    toast('Tarea añadida'); rerender(); setTimeout(() => $('#qa input[name=title]')?.focus(), 50);
  };
  $$('[data-tg]', root).forEach(b => b.onclick = async () => {
    const t = S.items.find(i => i.id === b.dataset.tg);
    await completeTask(t, !t.data.done); rerender();
  });
  $$('[data-ed]', root).forEach(b => b.onclick = () => taskEdit(S.items.find(i => i.id === b.dataset.ed)));
  $('#tgDone', root)?.addEventListener('click', () => { showDone = !showDone; rerender(); });
}
function taskEdit(t) {
  const d = t.data;
  sheet('Tarea', `<div class="stack">
    <label class="field"><span>Título</span><input name="title" value="${esc(d.title)}"></label>
    <label class="field"><span>Prioridad</span><select name="prio">${PRIOS.map(([k, e, l]) => `<option value="${k}" ${d.prio === k ? 'selected' : ''}>${e} ${l}</option>`).join('')}</select></label>
    <div class="grid2"><label class="field"><span>Minutos</span><input type="number" name="est" value="${d.est ?? ''}"></label>
    <label class="field"><span>Fecha límite</span><input type="date" name="due" value="${d.due || ''}"></label></div>
    <label class="field"><span>Notas</span><textarea class="input" name="notes" rows="3">${esc(d.notes || '')}</textarea></label>
    <div class="row gap"><button class="btn danger ghost" id="del" aria-label="Borrar">${icon('trash')}</button><button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('#save', body).onclick = async () => { const f = formData(body); await saveItem(t, { ...f, due: f.due || null }); closeSheet(); rerender(); };
    $('#del', body).onclick = async () => { if (await confirmBox('Se borrará la tarea.')) { await deleteItem(t); rerender(); } };
  });
}
