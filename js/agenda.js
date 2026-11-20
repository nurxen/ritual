// Agenda: calendario del mes, próximos eventos (con Google Calendar) y tareas
import {
  S, activeCats, getVal, isDone, dayCompletion, itemsOf, addItem, saveItem, deleteItem, tasks, catByKey, upcomingEvents,
  completeTask, markCareDone,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, parseDay, dayStr, fmtShort, MONTHS, formData, linkSource, relDay } from './ui.js';
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
    <div class="seg"><a href="#/agenda/calendario" class="${!['tareas', 'planes'].includes(sub) ? 'on' : ''}">Calendario</a><a href="#/agenda/tareas" class="${sub === 'tareas' ? 'on' : ''}">Tareas</a><a href="#/agenda/planes" class="${sub === 'planes' ? 'on' : ''}">Planes</a></div>
    <div id="agBody"></div>`;
  (sub === 'tareas' ? tareas : sub === 'planes' ? planes : calendario)($('#agBody', view));
}

// ------------------------------------------------------------ PLANES (qué hacer cuando quedas)
const COSTS = [[0, 'Gratis'], [15, 'Hasta 15 €'], [35, '15–35 €'], [99, 'Más de 35 €']];
const OTYPES = [['activo', '🏃 Activo'], ['comer', '🍽️ Comer y tardeo'], ['paseo', '🚶 Paseo'], ['naturaleza', '🌲 Naturaleza'], ['cultura', '🏛️ Cultura'], ['manual', '🎨 Manualidades'], ['noche', '🌙 Noche'], ['relax', '🧖 Relax']];
const OSEAS = [['todo', 'Todo el año'], ['invierno', 'Invierno'], ['navidad', 'Navidad'], ['primavera', 'Primavera'], ['verano', 'Verano'], ['otono', 'Otoño']];
const OMOVE = [['metro', '🚇 Metro'], ['cercanias', '🚆 Cercanías'], ['coche', '🚗 Coche']];
const seasonsNow = () => { const m = new Date().getMonth(); const d = new Date().getDate();
  const s = m === 11 || m <= 1 ? ['invierno'] : m <= 4 ? ['primavera'] : m <= 8 ? ['verano'] : ['otono'];
  if ((m === 10 && d >= 25) || m === 11 || (m === 0 && d <= 6)) s.push('navidad');
  return s; };
let oCost = null; let oType = null; let oNoCar = false; let oAll = false; let oPick = null;
const oEmoji = d => (OTYPES.find(t => (d.types || [])[0] === t[0])?.[1] || '📍').split(' ')[0];
const mapsUrl = d => d.url || (d.q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.q)}` : null);
function outCard(o, big = false) {
  const d = o.data; const c = COSTS.find(x => x[0] === d.cost);
  return `<button class="card outing ${big ? 'big' : ''}" data-out="${o.id}">
    <span class="o-e">${oEmoji(d)}</span>
    <span class="grow"><b>${d.fav ? '♥ ' : ''}${esc(d.name)}</b><br>
      <span class="small muted">${[c?.[1], d.zone, OMOVE.find(m => m[0] === d.move)?.[1], d.dur].filter(Boolean).map(esc).join(' · ')}</span>
      ${d.count ? `<br><span class="small">✓ ${d.count} ${d.count === 1 ? 'vez' : 'veces'}${d.lastDone ? `, la última ${relDay(d.lastDone)}` : ''}</span>` : ''}</span></button>`;
}
function planes(root) {
  const now = seasonsNow();
  const all = itemsOf('outing');
  const fit = o => {
    const d = o.data;
    if (oCost !== null && d.cost !== oCost) return false;
    if (oType && !(d.types || []).includes(oType)) return false;
    if (oNoCar && d.move === 'coche') return false;
    if (!oAll && !(d.seasons || ['todo']).some(x => x === 'todo' || now.includes(x))) return false;
    return true;
  };
  const list = all.filter(fit);
  const seasonal = list.filter(o => !(o.data.seasons || ['todo']).includes('todo'));
  const mine = list.filter(o => !o.data.idea && !seasonal.includes(o));
  const rest = list.filter(o => o.data.idea && !seasonal.includes(o)).sort((a, b) => (a.data.cost - b.data.cost) || ((b.data.fav ? 1 : 0) - (a.data.fav ? 1 : 0)));
  const pick = oPick && all.find(o => o.id === oPick);
  const chip = (on, attr, label) => `<button class="chip small" ${attr} style="${on ? 'background:#F3F0EB;color:#3A3734;border-color:#F3F0EB' : 'background:transparent;color:#F3F0EB;border-color:rgba(255,255,255,.25)'}">${label}</button>`;
  root.innerHTML = `
    <section class="card plan">
      <h3 style="color:#F3F0EB">¿Qué hacemos?</h3>
      <p class="small" style="color:#CFC7BE">${oAll ? 'Mostrando todas las temporadas.' : `Solo lo que encaja ahora (${now.map(x => OSEAS.find(s => s[0] === x)[1].toLowerCase()).join(' y ')}).`}</p>
      <div class="chips mt-s">${chip(oCost === null, 'data-oc=""', 'Cualquier precio')}${COSTS.map(([v, l]) => chip(oCost === v, `data-oc="${v}"`, l)).join('')}</div>
      <div class="chips mt-s">${chip(!oType, 'data-ot=""', 'Todo')}${OTYPES.map(([k, l]) => chip(oType === k, `data-ot="${k}"`, l)).join('')}</div>
      <div class="chips mt-s">${chip(oNoCar, 'data-onocar', '🚇 Sin coche')}${chip(oAll, 'data-oall', '📅 Todas las temporadas')}</div>
      <button class="btn block mt" id="oRandom" style="background:#F3F0EB;color:#3A3734" ${list.length ? '' : 'disabled'}>🎲 Elígeme uno (${list.length})</button>
      ${pick ? `<div class="mt">${outCard(pick, true)}</div>` : ''}
    </section>
    <button class="btn primary block" id="oAdd">${icon('plus')} Guardar un plan</button>
    <p class="small muted">¿Lo has visto en TikTok, Instagram o Google Maps? Compartir → Copiar enlace → aquí, "Guardar un plan" y "Pegar".</p>
    ${seasonal.length ? `<div class="section-head"><h2>De temporada</h2><span class="small muted">${seasonal.length}</span></div><div class="stack">${seasonal.map(o => outCard(o)).join('')}</div>` : ''}
    ${mine.length ? `<div class="section-head"><h2>Guardados por ti</h2><span class="small muted">${mine.length}</span></div><div class="stack">${mine.map(o => outCard(o)).join('')}</div>` : ''}
    ${rest.length ? `<div class="section-head"><h2>Ideas</h2><span class="small muted">${rest.length}</span></div><div class="stack">${rest.map(o => outCard(o)).join('')}</div>` : ''}
    ${!list.length ? `<p class="muted center">${all.length ? 'Ningún plan con esos filtros.' : 'Aún no hay planes guardados.'}</p>` : ''}`;
  $$('[data-oc]', root).forEach(b => b.onclick = () => { oCost = b.dataset.oc === '' ? null : Number(b.dataset.oc); oPick = null; rerender(); });
  $$('[data-ot]', root).forEach(b => b.onclick = () => { oType = b.dataset.ot || null; oPick = null; rerender(); });
  $('[data-onocar]', root).onclick = () => { oNoCar = !oNoCar; oPick = null; rerender(); };
  $('[data-oall]', root).onclick = () => { oAll = !oAll; oPick = null; rerender(); };
  $('#oRandom', root)?.addEventListener('click', () => {
    // pesa más lo que nunca habéis hecho o hace tiempo, y los favoritos
    const w = o => (o.data.lastDone ? Math.min(60, diffDays(today(), o.data.lastDone)) / 3 : 20) + (o.data.fav ? 10 : 0) + 1;
    const arr = list.length > 1 ? list.filter(o => o.id !== oPick) : list;
    let r = Math.random() * arr.reduce((a, o) => a + w(o), 0);
    oPick = (arr.find(o => (r -= w(o)) <= 0) || arr[0]).id; rerender();
  });
  $('#oAdd', root).onclick = () => outEdit(null);
  $$('[data-out]', root).forEach(b => b.onclick = () => outView(S.items.find(i => i.id === b.dataset.out)));
}
function outView(o) {
  const d = o.data; const url = mapsUrl(d); const src = d.url ? linkSource(d.url) : { e: '📍', l: 'Google Maps' };
  sheet(d.name, `<div class="stack">
    <div class="chips">${[COSTS.find(x => x[0] === d.cost)?.[1], ...(d.types || []).map(t => OTYPES.find(x => x[0] === t)?.[1]), ...(d.seasons || []).map(t => OSEAS.find(x => x[0] === t)?.[1]), OMOVE.find(m => m[0] === d.move)?.[1], d.dur].filter(Boolean).map(t => `<span class="chip small on">${esc(t)}</span>`).join('')}</div>
    ${d.zone ? `<p class="small"><b>Dónde:</b> ${esc(d.zone)}</p>` : ''}
    ${d.notes ? `<p class="small">${esc(d.notes)}</p>` : ''}
    ${url ? `<a class="btn ghost block" href="${esc(url)}" target="_blank" rel="noopener">${src?.e || '🔗'} Ver en ${esc(src?.l || 'el enlace')}</a>` : ''}
    <p class="small muted">${d.count ? `Lo habéis hecho ${d.count} ${d.count === 1 ? 'vez' : 'veces'}${d.lastDone ? `, la última ${relDay(d.lastDone)}` : ''}.` : 'Aún no lo habéis hecho.'}</p>
    <button class="btn primary block" id="oDone">✓ Lo hemos hecho hoy</button>
    <div class="row gap"><button class="btn ghost grow" id="oFav">${d.fav ? '♥ Quitar de favoritos' : '♡ Favorito'}</button><button class="btn ghost grow" id="oEdit">${icon('edit')} Editar</button></div></div>`, body => {
    $('#oDone', body).onclick = async () => { await saveItem(o, { lastDone: today(), count: d.lastDone === today() ? (d.count || 1) : (d.count || 0) + 1 }); closeSheet(); toast('Apuntado'); rerender(); };
    $('#oFav', body).onclick = async () => { await saveItem(o, { fav: !d.fav }); closeSheet(); rerender(); };
    $('#oEdit', body).onclick = () => { closeSheet(); setTimeout(() => outEdit(o), 200); };
  });
}
function outEdit(o) {
  const d = o?.data || { cost: 0, types: [], seasons: ['todo'], move: 'metro' };
  const radio = (name, opts, val) => opts.map(([k, l]) => `<label class="chip check small"><input type="radio" name="${name}" value="${k}" ${String(val) === String(k) ? 'checked' : ''}>${esc(l)}</label>`).join('');
  const multi = (name, opts, vals) => opts.map(([k, l]) => `<label class="chip check small"><input type="checkbox" name="${name}" data-multi="1" value="${k}" ${(vals || []).includes(k) ? 'checked' : ''}>${esc(l)}</label>`).join('');
  sheet(o ? 'Editar plan' : 'Guardar un plan', `<div class="stack">
    <label class="field"><span>Enlace (Google Maps, TikTok, Instagram, web…)</span>
      <div class="row gap"><input class="input grow" name="url" id="oUrl" inputmode="url" value="${esc(d.url || '')}" placeholder="https://…"><button type="button" class="btn ghost" id="oPaste">Pegar</button></div></label>
    <label class="field"><span>Qué es</span><input name="name" value="${esc(d.name || '')}" placeholder="Taller de cerámica, mirador, brunch…"></label>
    <label class="field"><span>Dónde</span><input name="zone" value="${esc(d.zone || '')}" placeholder="Barrio o sitio"></label>
    <div class="field"><span>Precio por persona</span><div class="chips">${radio('cost', COSTS, d.cost)}</div></div>
    <div class="field"><span>Tipo</span><div class="chips">${multi('types', OTYPES, d.types)}</div></div>
    <div class="field"><span>Cuándo</span><div class="chips">${multi('seasons', OSEAS, d.seasons)}</div></div>
    <div class="field"><span>Cómo se llega</span><div class="chips">${radio('move', OMOVE, d.move)}</div></div>
    <label class="field"><span>Notas</span><textarea class="input" name="notes" rows="2" placeholder="Reservar antes, horario, precio exacto…">${esc(d.notes || '')}</textarea></label>
    <div class="row gap">${o ? `<button class="btn danger ghost" id="oDel">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="oSave">Guardar</button></div></div>`, body => {
    const urlIn = $('#oUrl', body);
    $('#oPaste', body).onclick = async () => {
      try { const t = (await navigator.clipboard.readText()).trim(); const m = t.match(/https?:\/\/\S+/); if (m) urlIn.value = m[0]; else toast('No hay ningún enlace copiado'); }
      catch { urlIn.focus(); toast('Mantén pulsado el campo y pulsa Pegar'); }
    };
    $('#oSave', body).onclick = async () => {
      const f = formData(body); const url = (f.url || '').trim(); const src = linkSource(url);
      if (!f.name && !url) return toast('Pon qué es o pega un enlace');
      const pickAll = n => $$(`input[name=${n}]`, body).filter(i => i.checked).map(i => i.value);
      const data = { name: f.name || (src ? `Plan de ${src.l}` : 'Plan'), url: url || null, zone: f.zone || '', notes: f.notes || '',
        cost: Number($('input[name=cost]:checked', body)?.value ?? 0), types: pickAll('types'), seasons: pickAll('seasons').length ? pickAll('seasons') : ['todo'],
        move: $('input[name=move]:checked', body)?.value || 'metro' };
      if (!o) data.idea = false;
      o ? await saveItem(o, data) : await addItem('outing', data);
      closeSheet(); toast('Plan guardado'); rerender();
    };
    $('#oDel', body)?.addEventListener('click', async () => { if (await confirmBox('Borrar este plan')) { await deleteItem(o); closeSheet(); rerender(); } });
  });
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
