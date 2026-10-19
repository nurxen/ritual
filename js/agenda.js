// Agenda: calendario del mes, próximos eventos (con Google Calendar) y tareas
import {
  S, activeCats, getVal, isDone, dayCompletion, itemsOf, addItem, saveItem, deleteItem, tasks, catByKey, upcomingEvents,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, parseDay, dayStr, fmtShort, MONTHS, formData } from './ui.js';
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
const evColor = ev => ev.kind === 'care' ? (CARE_GROUP_COLORS[ev.group] || '#7A7068') : ev.kind === 'goal' ? '#D49A1C' : '#3D5BC9';

export function renderAgenda(view, sub = 'calendario') {
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Agenda</h1></div>
    <div class="seg"><a href="#/agenda/calendario" class="${sub !== 'tareas' ? 'on' : ''}">Calendario</a><a href="#/agenda/tareas" class="${sub === 'tareas' ? 'on' : ''}">Tareas</a></div>
    <div id="agBody"></div>`;
  (sub === 'tareas' ? tareas : calendario)($('#agBody', view));
}

// ------------------------------------------------------------ CALENDARIO
let calMonth = null; let calCat = 'all';
function calendario(root) {
  if (!calMonth) { const d = new Date(); calMonth = [d.getFullYear(), d.getMonth()]; }
  const [y, m] = calMonth;
  const startOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cats = activeCats().filter(c => c.type !== 'text');
  const cat = cats.find(c => c.id === calCat);
  const logs = itemsOf('carelog');
  const evs = upcomingEvents(400);
  const period = catByKey('period');
  const cells = Array.from({ length: startOffset }, () => '<div class="cday empty"></div>');
  for (let d = 1; d <= daysIn; d++) {
    const ds = dayStr(new Date(y, m, d)); const future = ds > today();
    let lv = 0;
    if (!future) {
      if (cat) { const v = getVal(cat.id, ds); lv = cat.type === 'scale' ? (v ? Math.ceil(v / 5 * 4) : 0) : (isDone(cat, v) ? 4 : 0); }
      else lv = Math.ceil(dayCompletion(ds) * 4);
    }
    const mk = [];
    logs.filter(l => l.data.day === ds).slice(0, 2).forEach(l => mk.push(`<i class="mk" style="--c:${CARE_GROUP_COLORS[l.data.group] || '#7A7068'}"></i>`));
    if (period && getVal(period.id, ds)) mk.push('<i class="mk" style="--c:#C2475B"></i>');
    evs.filter(e => e.day === ds).slice(0, 2).forEach(e => mk.push(`<i class="mk" style="--c:${evColor(e)}"></i>`));
    cells.push(`<button class="cday l${lv} ${ds === today() ? 'today' : ''} ${future ? 'future' : ''}" data-day="${ds}"><span>${d}</span><span class="mks">${mk.slice(0, 3).join('')}</span></button>`);
  }
  const soon = upcomingEvents(30);
  root.innerHTML = `
    <section class="card">
      <div class="row between"><button class="icon-btn" id="pm" aria-label="Mes anterior">${icon('left')}</button>
        <h2 class="cap">${MONTHS[m]} ${y}</h2><button class="icon-btn" id="nm" aria-label="Mes siguiente">${icon('right')}</button></div>
      <select class="input mt-s" id="calCat"><option value="all">Color: % de hábitos del día</option>
        ${cats.map(c => `<option value="${c.id}" ${c.id === calCat ? 'selected' : ''}>Color: ${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
      <div class="cal-head">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal">${cells.join('')}</div>
      <div class="legend"><span><i class="mk" style="--c:${CARE_GROUP_COLORS.ipl}"></i>IPL</span><span><i class="mk" style="--c:${CARE_GROUP_COLORS.pelo}"></i>Pelo</span><span><i class="mk" style="--c:${CARE_GROUP_COLORS.tinte}"></i>Tinte</span>${period ? '<span><i class="mk" style="--c:#C2475B"></i>Periodo</span>' : ''}<span><i class="mk" style="--c:#3D5BC9"></i>Tarea</span></div>
      <p class="small muted mt-s">Toca un día pasado para ver o editar sus hábitos.</p>
    </section>
    <div class="section-head"><h2>Próximos 30 días</h2><a href="#/ajustes/calendario">Google Calendar</a></div>
    <section class="card list">${soon.length ? soon.map(ev => {
      const d = parseDay(ev.day);
      return `<div class="event" style="--c:${evColor(ev)}"><div class="ev-date"><b>${d.getDate()}</b><span>${ev.day === today() ? 'hoy' : DOW[d.getDay()]}</span></div>
        <span class="ev-bar"></span><div class="grow"><div>${esc(ev.icon)} ${esc(ev.title)}</div>${ev.late ? '<div class="small warn-text">Atrasado</div>' : ''}</div>
        <a class="gcal" href="${gcalLink(ev)}" target="_blank" rel="noopener" title="Añadir a Google Calendar" aria-label="Añadir a Google Calendar">G+</a></div>`;
    }).join('') : '<p class="muted small">Nada programado. Los calendarios de cuidado aparecen aquí cuando les pones una fecha de última vez.</p>'}</section>`;
  $('#pm', root).onclick = () => { calMonth = m === 0 ? [y - 1, 11] : [y, m - 1]; rerender(); };
  $('#nm', root).onclick = () => { calMonth = m === 11 ? [y + 1, 0] : [y, m + 1]; rerender(); };
  $('#calCat', root).onchange = e => { calCat = e.target.value; rerender(); };
  $$('.cday[data-day]', root).forEach(b => b.onclick = () => { if (b.classList.contains('future')) return; S.date = b.dataset.day; go('#/hoy'); });
}

// ------------------------------------------------------------ TAREAS
const PRIOS = [['urgente', '🔴', 'No posponer', '#C2475B'], ['importante', '🟠', 'Importantes', '#D49A1C'], ['pequena', '🟢', 'Pequeñas', '#5E8C4A']];
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
      return `<div class="prio-head" style="color:${c}">${e} ${l} <span class="muted">${ts.length}</span></div><div class="card list">${ts.map(line).join('') || '<p class="muted small" style="padding:8px">Nada por aquí.</p>'}</div>`;
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
    await saveItem(t, { done: !t.data.done, doneAt: !t.data.done ? today() : null }); rerender();
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
