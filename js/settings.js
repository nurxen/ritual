// Menú de opciones (⋯), mis categorías, Google Calendar, apariencia y datos
import * as db from './db.js';
import { CONFIG } from './config.js';
import {
  S, saveCategory, deleteCategory, moveCategory, applyTemplate, upcomingEvents, calToken, resetCalToken,
  planPreview, applyPlan, planApplied,
} from './store.js';
import { PLANS } from './plans.js';
import { STATUS } from './data.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays } from './ui.js';
import { CATALOG, SECTIONS, TYPE_INFO, EMOJIS, sectionColor } from './data.js';
import { topbar, rerender, profileEditor, renderPicker, applyTheme } from './app.js';

// ------------------------------------------------------------------ MENÚ ⋯
export function openMenu() {
  const theme = localStorage.getItem('ritual_theme') || 'auto';
  sheet('Opciones', `
    <div class="card list menu-list" style="margin:0">
      <a class="li" href="#/ajustes/categorias" data-go><span class="ci">⚙︎</span><span class="grow">Mis categorías y hábitos</span>${icon('right')}</a>
      <button class="li" id="oPlans"><span class="ci">📋</span><span class="grow">Planes de cuidado</span>${icon('right')}</button>
      <a class="li" href="#/ajustes/calendario" data-go><span class="ci">📅</span><span class="grow">Conectar con Google Calendar</span>${icon('right')}</a>
      <button class="li" id="oProfile"><span class="ci">🙂</span><span class="grow">Editar perfil y plan de Hoy</span>${icon('right')}</button>
      <button class="li" id="oSwitch"><span class="ci">⇄</span><span class="grow">Cambiar de perfil</span>${icon('right')}</button>
      <button class="li" id="oExport"><span class="ci">⤓</span><span class="grow">Descargar copia de mis datos</span>${icon('right')}</button>
      ${db.DEMO ? '' : `<button class="li" id="oOut"><span class="ci">⎋</span><span class="grow">Cerrar sesión</span>${icon('right')}</button>`}
    </div>
    <h3 class="mt">Apariencia</h3>
    <div class="seg mt-s">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div>
    <p class="small muted center">Ritual v4 · ${db.DEMO ? 'modo demo' : 'conectado a Supabase'}</p>`, body => {
    $$('[data-go]', body).forEach(a => a.addEventListener('click', () => closeSheet()));
    $$('[data-theme-set]', body).forEach(b => b.onclick = () => {
      localStorage.setItem('ritual_theme', b.dataset.themeSet); applyTheme();
      $$('[data-theme-set]', body).forEach(x => x.classList.toggle('on', x === b));
    });
    $('#oProfile', body).onclick = profileEditor;
    $('#oPlans', body).onclick = () => sheet('Planes de cuidado', `<div class="stack">${PLANS.map(p => `<button class="card" data-pl="${p.id}" style="text-align:left;margin:0">
        <h3>${esc(p.title)}</h3><p class="small muted">${esc(p.summary)}</p><p class="small"><b>${planApplied(p) ? '✓ Aplicado a tu perfil' : 'Sin aplicar'}</b></p></button>`).join('')}</div>`, b2 => {
      $$('[data-pl]', b2).forEach(x => x.onclick = () => planSheet(PLANS.find(p => p.id === x.dataset.pl)));
    });
    $('#oSwitch', body).onclick = () => { closeSheet(); location.hash = ''; renderPicker(); };
    $('#oExport', body).onclick = exportData;
    $('#oOut', body)?.addEventListener('click', async () => { await db.signOut(); localStorage.removeItem('ritual_last_profile'); location.hash = ''; location.reload(); });
  });
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
}
function exportData() {
  const data = { profile: S.profile, categories: S.cats, entries: [...S.entries.values()], items: S.items, exportedAt: new Date().toISOString() };
  download(`ritual-${S.profile.name}-${today()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function renderSettings(view, sub) {
  if (sub === 'calendario') return calendarPage(view);
  return categoriesPage(view);
}

// ------------------------------------------------------------------ GOOGLE CALENDAR
function icsText() {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ritual//ES', 'CALSCALE:GREGORIAN', `X-WR-CALNAME:Ritual · ${S.profile.name}`];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  for (const ev of upcomingEvents(90)) {
    lines.push('BEGIN:VEVENT', `UID:${ev.id}-${ev.day}@ritual`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ev.day.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(ev.day, 1).replace(/-/g, '')}`,
      `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
async function calendarPage(view) {
  const live = !db.DEMO;
  let feed = '';
  if (live) feed = `${CONFIG.SUPABASE_URL}/functions/v1/calendar?p=${S.profile.id}&t=${await calToken()}`;
  const webcal = feed.replace(/^https:/, 'webcal:');
  const n = upcomingEvents(90).length;
  view.innerHTML = `${topbar()}
    <a class="back" href="#/agenda">${icon('left')} Agenda</a>
    <div class="page-banner" style="--c:#A7BCEB"><h1>Google Calendar</h1><p>Lleva tus fechas de cuidado, tareas y objetivos a tu calendario.</p></div>

    <section class="card">
      <h3>1. Suscripción automática</h3>
      <p class="small">Tu calendario se actualiza solo con lo que vayas registrando: IPL, raíces, mascarillas, peluquería, tareas con fecha… Google lo refresca cada pocas horas (no al instante).</p>
      ${live ? `
        <div class="stack mt-s">
          <a class="btn color" style="--c:#A7BCEB" href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}" target="_blank" rel="noopener">Añadir a Google Calendar</a>
          <a class="btn ghost" href="${esc(webcal)}">Añadir a Calendario de iPhone</a>
          <button class="btn ghost" id="copyFeed">${icon('copy')} Copiar enlace</button>
        </div>
        <p class="small muted mt">Si el botón no abre Google: en calendar.google.com (ordenador) → “Otros calendarios” → + → “Desde URL” → pega el enlace.</p>
        <p class="small muted">Requiere instalar una vez la función <b>calendar</b> en Supabase (está explicado en la guía de actualización). El enlace es privado: no lo compartas.</p>
        <button class="btn tiny ghost" id="resetFeed">Crear un enlace nuevo (invalida el anterior)</button>`
        : '<p class="note">Disponible cuando la app está conectada a Supabase.</p>'}
    </section>

    <section class="card">
      <h3>2. Descargar archivo</h3>
      <p class="small">Un archivo .ics con los próximos 90 días (${n} eventos) para importarlo una vez en Google Calendar: Ajustes → Importar y exportar → Importar. No se actualiza solo.</p>
      <button class="btn ghost block" id="ics">Descargar .ics</button>
    </section>

    <section class="card">
      <h3>3. Evento a evento</h3>
      <p class="small">En Agenda, cada evento tiene un botón <b>G+</b> que lo abre en Google Calendar para guardarlo.</p>
      <a class="btn ghost block" href="#/agenda">Ir a Agenda</a>
    </section>`;
  $('#copyFeed', view)?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(feed); toast('Enlace copiado'); } catch { toast('No se pudo copiar'); } });
  $('#resetFeed', view)?.addEventListener('click', async () => { if (await confirmBox('El enlace actual dejará de funcionar y tendrás que volver a añadirlo.', 'Crear nuevo')) { await resetCalToken(); rerender(); } });
  $('#ics', view).onclick = () => download(`ritual-${S.profile.name}.ics`, icsText(), 'text/calendar');
}

// ------------------------------------------------------------------ CATEGORÍAS
const rank = s => { const i = SECTIONS.indexOf(s); return i < 0 ? 99 : i; };
function categoriesPage(view) {
  const secs = [...new Set(S.cats.map(c => c.section))].sort((a, b) => rank(a) - rank(b));
  const missing = CATALOG.filter(c => !S.cats.some(x => x.key === c.key));
  const missSecs = [...new Set(missing.map(c => c.section))];
  view.innerHTML = `${topbar()}
    <a class="back" href="#/hoy">${icon('left')} Hoy</a>
    <div class="page-title"><h1>Mis hábitos</h1></div>
    <button class="btn primary block" id="newCat">${icon('plus')} Crear hábito</button>
    <p class="small muted mt-s">Apaga el interruptor para ocultar un hábito de Hoy sin perder su historial. Toca uno para editarlo, moverlo o borrarlo.</p>
    ${secs.map(sec => `<div class="section-head" style="--c:${sectionColor(sec)}"><h2 style="color:var(--c-ink)">${esc(sec)}</h2></div>
      <div class="card list" style="--c:${sectionColor(sec)}">${S.cats.filter(c => c.section === sec).map(c => `
        <div class="cat-row ${c.active ? '' : 'off'}">
          <button class="row gap grow" data-ed="${c.id}" style="text-align:left"><span class="ci">${esc(c.icon)}</span>
            <span class="grow"><b>${esc(c.name)}</b><br><span class="small muted">${TYPE_INFO[c.type]?.label || c.type}${c.target ? `, meta ${c.target}` : ''}</span></span></button>
          <label class="switch" aria-label="Activo"><input type="checkbox" data-act="${c.id}" ${c.active ? 'checked' : ''}><i></i></label>
        </div>`).join('')}</div>`).join('')}
    ${missing.length ? `<div class="section-head"><h2>Ideas para añadir</h2></div>
      ${missSecs.map(sec => `<p class="small muted" style="margin:10px 2px 6px;font-weight:700;--c:${sectionColor(sec)};color:var(--c-ink)">${esc(sec)}</p>
      <div class="chips">${missing.filter(c => c.section === sec).map(c => `<button class="chip" data-addk="${c.key}">${c.icon} ${esc(c.name)} ${icon('plus')}</button>`).join('')}</div>`).join('')}` : ''}`;
  $$('[data-act]', view).forEach(b => b.onchange = async () => { const c = S.cats.find(x => x.id === b.dataset.act); await saveCategory({ id: c.id, active: b.checked }); rerender(); });
  $$('[data-ed]', view).forEach(b => b.onclick = () => catWizard(S.cats.find(x => x.id === b.dataset.ed)));
  $('#newCat', view).onclick = () => catWizard(null);
  $$('[data-addk]', view).forEach(b => b.onclick = async () => { await applyTemplate([b.dataset.addk], []); toast('Hábito añadido'); rerender(); });
}

function previewTile(d) {
  const col = sectionColor(d.section || 'Hábitos');
  const sub = { number: `0 ${esc(d.unit || '')}`, minutes: '0′', money: '0,00 €', scale: '', text: 'Toca para escribir', exercise: 'CrossFit 60′', bool_minutes: '', bool: '' }[d.type] || '';
  return `<div class="tile" style="--c:${col}"><div class="t-top"><span class="t-emoji">${esc(d.icon || '✨')}</span>${['bool', 'bool_minutes'].includes(d.type) ? `<span class="t-check">${icon('check')}</span>` : ''}</div>
    <span class="t-name">${esc(d.name || 'Nombre')}</span>${sub ? `<span class="t-val">${sub}</span>` : ''}
    ${d.type === 'scale' ? '<div class="scale-mini"><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div>' : ''}</div>`;
}

// Asistente en 2 pasos: tipo → detalles (con vista previa)
function catWizard(c) {
  const d = c ? { ...c } : { icon: '✨', type: null, section: 'Cuerpo', name: '', unit: '', target: null };
  let step = c ? 2 : 1;
  const secs = [...new Set([...SECTIONS, ...S.cats.map(x => x.section)])];
  const draw = body => {
    if (step === 1) {
      body.innerHTML = `<div class="steps-dots"><i class="on"></i><i></i></div>
        <p class="muted">¿Cómo quieres apuntarlo?</p>
        <div class="type-grid">${Object.entries(TYPE_INFO).map(([k, t]) => `<button class="type-card ${d.type === k ? 'on' : ''}" data-ty="${k}">
          <span class="ty-icon">${t.icon}</span><b>${t.label}</b><span>${t.desc}</span><span><i>${t.ex}</i></span></button>`).join('')}</div>`;
      $$('[data-ty]', body).forEach(b => b.onclick = () => { d.type = b.dataset.ty; step = 2; draw(body); });
      return;
    }
    const needsUnit = d.type === 'number';
    const needsTarget = ['number', 'minutes'].includes(d.type);
    body.innerHTML = `${c ? '' : '<div class="steps-dots"><i class="on"></i><i class="on"></i></div>'}
      <div class="preview-wrap" id="pv">${previewTile(d)}</div>
      <div class="stack mt">
        <label class="field"><span>Nombre</span><input id="nm" value="${esc(d.name)}" placeholder="Meditar, vitamina D, llamar a casa…"></label>
        <div class="field"><span>Icono</span><div class="emoji-grid">${EMOJIS.map(e => `<button class="${e === d.icon ? 'on' : ''}" data-em="${e}">${e}</button>`).join('')}</div>
          <input class="input mt-s" id="emo" maxlength="4" placeholder="O escribe cualquier emoji" value="${EMOJIS.includes(d.icon) ? '' : esc(d.icon)}"></div>
        <div class="field"><span>Sección (define el color)</span><div class="chips">${secs.map(s => `<button class="chip ${d.section === s ? 'c-on' : ''}" data-sec="${esc(s)}" style="--c:${sectionColor(s)}"><span class="swatch-dot"></span>${esc(s)}</button>`).join('')}</div>
          <input class="input mt-s" id="newSec" placeholder="O crea una sección nueva"></div>
        ${needsUnit || needsTarget ? `<div class="grid2">${needsUnit ? `<label class="field"><span>Unidad</span><input id="un" value="${esc(d.unit || '')}" placeholder="vasos, km…"></label>` : ''}
          ${needsTarget ? `<label class="field"><span>Meta diaria</span><input type="number" id="tg" value="${d.target ?? ''}"></label>` : ''}</div>` : ''}
        ${c ? `<div class="row gap"><button class="btn ghost grow" id="up">${icon('up')} Subir</button><button class="btn ghost grow" id="down">${icon('down')} Bajar</button></div>` : ''}
        <div class="row gap">${c ? `<button class="btn danger ghost" id="del" aria-label="Borrar">${icon('trash')}</button>` : '<button class="btn ghost" id="backStep">Atrás</button>'}
          <button class="btn primary grow" id="save">${c ? 'Guardar cambios' : 'Crear hábito'}</button></div>
        ${c ? `<p class="small muted">Tipo: ${TYPE_INFO[d.type]?.label}. El tipo no se puede cambiar porque afectaría al historial.</p>` : ''}
      </div>`;
    const pv = () => { $('#pv', body).innerHTML = previewTile(d); };
    $('#nm', body).oninput = e => { d.name = e.target.value; pv(); };
    $$('[data-em]', body).forEach(b => b.onclick = () => { d.icon = b.dataset.em; $$('[data-em]', body).forEach(x => x.classList.toggle('on', x === b)); $('#emo', body).value = ''; pv(); });
    $('#emo', body).oninput = e => { if (e.target.value) { d.icon = e.target.value; $$('[data-em]', body).forEach(x => x.classList.remove('on')); pv(); } };
    $$('[data-sec]', body).forEach(b => b.onclick = () => { d.section = b.dataset.sec; $('#newSec', body).value = ''; $$('[data-sec]', body).forEach(x => x.classList.toggle('c-on', x === b)); pv(); });
    $('#newSec', body).oninput = e => { if (e.target.value.trim()) { d.section = e.target.value.trim(); $$('[data-sec]', body).forEach(x => x.classList.remove('c-on')); pv(); } };
    $('#un', body)?.addEventListener('input', e => { d.unit = e.target.value; pv(); });
    $('#tg', body)?.addEventListener('input', e => { d.target = e.target.value === '' ? null : Number(e.target.value); });
    $('#backStep', body)?.addEventListener('click', () => { step = 1; draw(body); });
    $('#up', body)?.addEventListener('click', async () => { await moveCategory(c.id, -1); toast('Movido arriba'); rerender(); });
    $('#down', body)?.addEventListener('click', async () => { await moveCategory(c.id, 1); toast('Movido abajo'); rerender(); });
    $('#save', body).onclick = async () => {
      if (!d.name.trim()) return toast('Ponle un nombre');
      const data = { name: d.name.trim(), icon: d.icon || '•', section: d.section || 'Hábitos', unit: d.unit || null, target: d.target ?? null };
      if (c) await saveCategory({ id: c.id, ...data }); else await saveCategory({ ...data, type: d.type, key: null });
      closeSheet(); toast(c ? 'Cambios guardados' : 'Hábito creado'); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => {
      if (await confirmBox(`Se borrará "${c.name}" con todo su historial. Si solo quieres ocultarlo, apaga su interruptor.`)) { await deleteCategory(c.id); rerender(); }
    });
  };
  sheet(c ? 'Editar hábito' : 'Nuevo hábito', '', draw);
}

// ------------------------------------------------------------------ PLAN: revisar y aplicar
export function planSheet(plan) {
  const pv = planPreview(plan);
  const cnt = k => [...pv.update, ...pv.add].filter(x => x.pp.status === k).length;
  const line = x => `<div class="li"><span>${STATUS[x.pp.status]?.e || '•'}</span><div class="grow"><b>${esc(x.pp.name)}</b> <span class="small muted">${esc(x.pp.brand || '')}</span>
    ${x.ex && x.ex.data.name !== x.pp.name ? `<br><span class="small muted">Actualiza tu “${esc(x.ex.data.name)}”</span>` : ''}</div></div>`;
  sheet(plan.title, `<div class="stack">
    ${planApplied(plan) ? '<p class="note ok">Ya lo aplicaste. Si lo vuelves a aplicar, se actualizan los productos sin borrar tus fechas, precios ni historial.</p>' : ''}
    <p class="small">${esc(plan.summary)}</p>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div><b>${cnt('keep')}</b><span>✅ repones</span></div><div><b>${cnt('useup')}</b><span>🟡 gastar</span></div><div><b>${cnt('wish')}</b><span>🛒 comprar</span></div>
      <div><b>${cnt('pause')}</b><span>⏸️ en pausa</span></div><div><b>${cnt('drop')}</b><span>❌ lo dejas</span></div><div><b>${plan.guide.length}</b><span>temas de guía</span></div>
    </div>
    <details><summary><b>${pv.update.length} productos que ya tenías</b> se actualizan</summary><div class="list">${pv.update.map(line).join('') || '<p class="small muted">Ninguno</p>'}</div></details>
    <details><summary><b>${pv.add.length} productos nuevos</b> en tu inventario</summary><div class="list">${pv.add.map(line).join('')}</div></details>
    <ul class="tips small">
      <li>Rutina nueva con doble limpieza y noches por días (CeraVe, niacinamida…).</li>
      <li>Plan de labios: hábito diario 👄, registro de impulsos y pausa de los labiales que resecan.</li>
      ${pv.care.length ? `<li>Calendarios: lavado a fondo del pelo y lavar el rodillo, cada semana.</li>` : ''}
      <li>Exfoliante corporal 1–2 veces por semana y nunca 48 h antes ni después del IPL.</li>
      ${pv.tasks.length ? `<li>${pv.tasks.length} tareas para hoy, como revisar máscaras y glosses.</li>` : ''}
      <li>Lista de “no comprar” y tu lista de la compra con precios.</li>
    </ul>
    <p class="small muted">No se borra nada. Si algún producto no es exactamente el tuyo, lo editas o lo borras después en Inventario.</p>
    <button class="btn primary block" id="applyPlan">${planApplied(plan) ? 'Volver a aplicar' : 'Aplicar a mi perfil'}</button>
  </div>`, body => {
    $('#applyPlan', body).onclick = async e => {
      e.target.disabled = true; e.target.textContent = 'Aplicando…';
      await applyPlan(plan);
      closeSheet(); toast('Plan aplicado ✨'); location.hash = '#/cuidado'; rerender();
    };
  });
}
