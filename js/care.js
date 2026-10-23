// Sección Cuidado: portada con accesos y páginas (rutinas, IPL, tinte, calendarios, inventario, perfumes, looks, viaje, guía)
import {
  S, itemsOf, addItem, saveItem, deleteItem, careStatus, markCareDone, iplBlock, lastWorkout, products,
  productExpiry, routineProducts, checkRoutine, tagsFromIngredients, settings, saveSettings, catByKey, getVal, setVal,
  pStatus, pArea, shoppingList, refillBought, refillSkip, lipsPlan, lipTriggers, cureLips, scrubBlock, postIpl, streak,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, fmtShort, relDay, eur, formData, num } from './ui.js';
import {
  SAMPLE_PRODUCTS, SAMPLE_PERFUMES, SAMPLE_COMBOS, PERFUME_MOMENTS, TAG_LABELS, GUIDE, SOURCES, POST_GYM_PROTOCOL,
  CARE_CATALOG, CARE_GROUPS, CARE_GROUP_COLORS, DYE_TYPES, DYE_PLACES, STATUS, AREAS, MAKEUP_SUBS, DOW_SHORT, LIP_TRIGGERS,
} from './data.js';
import { topbar, rerender } from './app.js';

const PAGES = {
  rutinas: { t: 'Rutinas', e: '🫧', c: '#F2A9BC', d: 'Mañana, noche y post-Box' },
  labios: { t: 'Labios', e: '👄', c: '#EFA3AE', d: 'Plan para curarlos y cortar el hábito' },
  ipl: { t: 'IPL', e: '✨', c: '#D3AEE6', d: 'Philips Lumea por zonas' },
  tinte: { t: 'Tinte', e: '🎨', c: '#E8B796', d: 'Color, raíces e historial' },
  calendarios: { t: 'Calendarios', e: '🗓️', c: '#96D1CC', d: 'Mascarillas, brochas, uñas…' },
  inventario: { t: 'Inventario', e: '🧴', c: '#D6CFC6', d: 'Caducidad, compra y gasto' },
  perfumes: { t: 'Perfumes', e: '🌸', c: '#EFA3AE', d: 'Biblioteca y layering' },
  looks: { t: 'Looks', e: '💄', c: '#F2CF7E', d: 'Maquillaje guardado' },
  viaje: { t: 'Neceser', e: '🧳', c: '#A7BCEB', d: 'Lista para viajar' },
  guia: { t: 'Guía', e: '📖', c: '#A8C99A', d: 'Consejos de dermatólogos' },
};

export function renderCare(view, sub, sub2) {
  if (!PAGES[sub]) return hub(view);
  const P = PAGES[sub];
  view.innerHTML = `${topbar()}
    <a class="back" href="#/cuidado">${icon('left')} Cuidado</a>
    <div class="page-banner" style="--c:${P.c}"><h1>${P.t}</h1><p>${P.d}</p></div>
    <div id="careBody" style="--c:${P.c}"></div>`;
  const body = $('#careBody', view);
  ({ rutinas, labios, ipl, tinte, calendarios, inventario, perfumes, looks, viaje, guia })[sub](body, sub2);
}

function hub(view) {
  const am = catByKey('am_routine'); const pm = catByKey('pm_routine');
  const zones = itemsOf('care').filter(i => i.data.group === 'ipl');
  const zDue = zones.filter(z => careStatus(z).due).length;
  const block = iplBlock().length;
  const care = itemsOf('care').filter(i => !['ipl', 'tinte'].includes(i.data.group));
  const cDue = care.filter(i => careStatus(i).due).length;
  const exp = products().filter(p => (productExpiry(p)?.days ?? 999) <= 30).length;
  const dyes = itemsOf('dye').sort((a, b) => b.data.day.localeCompare(a.data.day));
  const roots = itemsOf('care').find(i => i.data.key === 'dye_roots');
  const status = {
    rutinas: am || pm ? `Mañana ${am && getVal(am.id, today()) ? '✓' : '·'}  Noche ${pm && getVal(pm.id, today()) ? '✓' : '·'}` : `${products().length} productos`,
    ipl: zones.length ? (zDue ? (block ? 'Toca, pero hoy no' : `${zDue} zonas tocan`) : 'Al día') : 'Sin zonas',
    tinte: dyes.length ? `Último ${relDay(dyes[0].data.day)}` : 'Sin registros',
    calendarios: cDue ? `${cDue} pendientes` : `${care.length} activos`,
    inventario: exp ? `${exp} caducan pronto` : `${products().filter(p => !p.data.finished).length} en uso`,
    perfumes: `${itemsOf('perfume').length} perfumes`,
    looks: `${itemsOf('combo').filter(c => c.data.type === 'look').length} looks`,
    viaje: 'Calcula cantidades',
    guia: `${GUIDE.length + itemsOf('guide').length} temas`,
    labios: lipStatusText(),
  };
  const shop = shoppingList();
  status.inventario = exp ? `${exp} caducan pronto` : shop.wish.length ? `${shop.wish.length} por comprar` : status.inventario;
  const badge = { ipl: zDue, calendarios: cDue, inventario: exp, tinte: roots && careStatus(roots).due ? 1 : 0 };
  const tileH = (k, cls = '') => `<a class="hub-tile ${cls}" href="#/cuidado/${k}" style="--c:${PAGES[k].c}">
      ${badge[k] ? `<span class="h-badge">${badge[k]}</span>` : ''}<span class="h-emoji">${PAGES[k].e}</span><b>${PAGES[k].t}</b><span>${status[k]}</span></a>`;
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Cuidado</h1></div>
    <div class="hub">
      ${tileH('rutinas', 'wide')}${lipsPlan() ? tileH('labios', 'wide') : ''}${tileH('ipl')}${tileH('tinte')}${tileH('calendarios')}${tileH('inventario')}
      ${tileH('perfumes')}${tileH('looks')}${tileH('viaje', 'light')}${tileH('guia', 'light')}
    </div>
    ${lipsPlan() ? '' : '<p class="small muted mt">¿Quieres el plan para curar labios? Actívalo desde Labios en <a href="#/cuidado/labios">este enlace</a>.</p>'}`;
}

// ------------------------------------------------------------------ RUTINAS
const DOW_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
let rDay = null;
function stepHtml(p, slot) {
  const d = p.data; const wish = pStatus(p) === 'wish';
  const days = slot === 'pm' ? d.pmDays : d.amDays;
  return `<li><span class="grow"><b>${esc(d.type || '')}</b>${wish ? ' <span class="pill accent">🛒 por comprar</span>' : ''}<br>
    ${esc(d.name)}${d.brand ? ` <span class="muted small">${esc(d.brand)}</span>` : ''}
    ${wish && d.meanwhile ? `<br><span class="small muted">Mientras tanto: ${esc(d.meanwhile)}</span>` : ''}
    ${Array.isArray(days) && days.length ? `<br><span class="small" style="color:var(--c-ink)">${days.length} ${slot === 'pm' ? 'noches' : 'días'} por semana</span>` : ''}
    ${d.note ? `<details class="small muted"><summary>Cómo usarlo</summary>${esc(d.note)}</details>` : ''}</span></li>`;
}
function rutinas(root) {
  const has = products().length > 0;
  const dow = rDay ?? new Date().getDay();
  const notes = settings().routineNotes || {};
  const block = (slot, title, catKey) => {
    const list = routineProducts(slot, dow);
    const rules = checkRoutine(slot);
    const cat = catByKey(catKey);
    const done = cat && getVal(cat.id, today());
    return `<section class="card">
      <div class="row between"><h3>${title}</h3>${cat && rDay === null ? `<button class="btn tiny ${done ? 'primary' : 'ghost'}" data-done="${cat.id}">${done ? '✓ Hecha' : 'Marcar hecha'}</button>` : ''}</div>
      ${notes[slot] ? `<p class="small muted">${esc(notes[slot])}</p>` : ''}
      ${list.length ? `<ol class="steps">${list.map(p => stepHtml(p, slot)).join('')}</ol>` : '<p class="muted small">Sin productos asignados a esta rutina.</p>'}
      ${rules.length ? rules.map(r => `<p class="note ${r.level}">${r.level === 'warn' ? '⚠️' : 'ℹ️'} ${esc(r.msg)}</p>`).join('')
        : list.length ? '<p class="note ok">✓ Rutina compatible: sin combinaciones irritantes.</p>' : ''}
    </section>`;
  };
  // Semana: qué productos con días van cada noche
  const rot = products().filter(p => !p.data.finished && !['drop', 'pause'].includes(pStatus(p)) && (p.data.slot === 'pm' || p.data.slot === 'both') && Array.isArray(p.data.pmDays) && p.data.pmDays.length);
  const order = [1, 2, 3, 4, 5, 6, 0];
  root.innerHTML = `
    ${!has ? `<div class="card empty"><p>Aún no tienes productos.</p>
      <button class="btn primary" id="loadSample">Cargar la lista de productos de ejemplo</button></div>` : ''}
    <div class="chips rail mb">${order.map(n => `<button class="chip ${n === dow ? 'on' : ''}" data-dow="${n}">${n === new Date().getDay() ? 'Hoy' : DOW_LONG[n].slice(0, 3)}</button>`).join('')}</div>
    ${rDay !== null && rDay !== new Date().getDay() ? `<p class="small muted">Viendo la rutina del ${DOW_LONG[dow]}.</p>` : ''}
    ${block('am', '☀️ Mañana', 'am_routine')}
    ${block('pm', '🌙 Noche', 'pm_routine')}
    ${rot.length ? `<section class="card"><h3>Tus noches de la semana</h3>
      <div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:6px;align-items:center;font-size:13px">
        <span></span>${order.map(n => `<b class="center" style="${n === new Date().getDay() ? 'color:var(--c-ink)' : ''}">${DOW_SHORT[n]}</b>`).join('')}
        ${rot.map(p => `<span style="font-weight:600">${esc(p.data.brand || p.data.name)}</span>${order.map(n => `<span class="center" style="height:22px;border-radius:7px;background:${p.data.pmDays.includes(n) ? 'var(--c)' : 'var(--soft)'}"></span>`).join('')}`).join('')}
      </div></section>` : ''}
    <section class="card"><h3>🏋️ Protocolo post-Box</h3><ol class="steps">${POST_GYM_PROTOCOL.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
    <p class="muted small center">Para cambiar el orden, los días o la rutina de un producto, edítalo en <a href="#/cuidado/inventario">Inventario</a>.</p>`;
  $('#loadSample', root)?.addEventListener('click', loadSamples);
  $$('[data-dow]', root).forEach(b => b.onclick = () => { const n = Number(b.dataset.dow); rDay = n === new Date().getDay() ? null : n; rerender(); });
  $$('[data-done]', root).forEach(b => b.onclick = async () => {
    const id = b.dataset.done; await setVal(id, !getVal(id, today()), today()); rerender();
  });
}

// ------------------------------------------------------------------ LABIOS
function lipStatusText() {
  const lp = lipsPlan(); if (!lp) return 'Sin activar';
  if (lp.cured) return 'Curados ✨';
  const cat = catByKey('lips');
  return `Día ${diffDays(today(), lp.start) + 1}${cat ? ` · racha ${streak(cat)}` : ''}`;
}
function labios(root) {
  const lp = lipsPlan();
  if (!lp) {
    root.innerHTML = `<div class="card empty"><p>Un plan de 2–3 semanas para curar los labios y dejar de morderlos o arrancarlos: registro de impulsos, bálsamo como “tic” y pausa de los productos que resecan.</p>
      <button class="btn color" id="startLips">Empezar el plan</button></div>`;
    $('#startLips', root).onclick = async () => {
      await saveSettings({ lips: { start: today(), cured: false } });
      if (!catByKey('lips')) { const { applyTemplate } = await import('./store.js'); await applyTemplate(['lips'], []); }
      rerender();
    };
    return;
  }
  const cat = catByKey('lips');
  const dayN = diffDays(today(), lp.start) + 1;
  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), -6 + i));
  const trig = lipTriggers();
  const wk = trig.filter(t => diffDays(today(), t.data.day) < 7);
  const stopped = wk.filter(t => t.data.outcome === 'frenado').length;
  const top = Object.entries(wk.reduce((a, t) => ({ ...a, [t.data.where]: (a[t.data.where] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0];
  const lipsP = products().filter(p => p.data.sub === 'Labios' || /labi|lip|b[aá]lsamo|gloss/i.test(`${p.data.type} ${p.data.name}`));
  const now = lipsP.filter(p => ['keep', 'use', 'useup'].includes(pStatus(p)) && !p.data.finished);
  const paused = lipsP.filter(p => pStatus(p) === 'pause');
  const todayDone = cat && getVal(cat.id, today());
  const DOWS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  root.innerHTML = `
    <section class="card plan">
      <div class="row between"><h2>${lp.cured ? 'Labios curados' : `Día ${dayN}`}</h2><span class="small" style="color:#C9C3BC">${lp.cured ? `desde el ${fmtShort(lp.curedAt)}` : 'meta: 14–21 días sin tocarlos'}</span></div>
      ${cat ? `<div style="display:flex;gap:6px;margin:14px 0 8px">${week.map(d => {
        const ok = getVal(cat.id, d);
        return `<div style="flex:1;text-align:center"><div style="height:34px;border-radius:10px;background:${ok ? '#AED6A4' : 'rgba(255,255,255,.1)'};display:grid;place-items:center;color:#3A3734;font-weight:800">${ok ? '✓' : ''}</div><span style="font-size:11px;color:#C9C3BC">${DOWS[parseInt(new Date(d + 'T12:00').getDay())]}</span></div>`;
      }).join('')}</div>
      <button class="btn block" id="lipToday" style="background:${todayDone ? '#AED6A4' : '#F3F0EB'};color:#3A3734">${todayDone ? '✓ Hoy no los he tocado' : 'Hoy no me he tocado los labios'}</button>
      <p class="note-line">Racha: ${streak(cat)} días. Si un día fallas, no pasa nada: mañana vuelves a empezar.</p>` : ''}
    </section>

    <div class="section-head"><h2>¿Has notado el impulso?</h2></div>
    <p class="small muted" style="margin-top:-6px">Apúntalo: solo con fijarte ya lo haces menos.</p>
    <div class="chips">${LIP_TRIGGERS.map(([k, l]) => `<button class="chip" data-trig="${k}">${l}</button>`).join('')}</div>
    ${wk.length ? `<div class="kpis mt"><div><b>${wk.length}</b><span>impulsos esta semana</span></div><div><b>${stopped}</b><span>frenados</span></div><div><b>${top ? esc((LIP_TRIGGERS.find(x => x[0] === top[0]) || ['', top[0]])[1].split(' ')[0]) : '—'}</b><span>${top ? 'situación más repetida' : ''}</span></div></div>` : ''}

    <section class="card mt"><h3>Cuando notes el impulso</h3>
      <ol class="steps">
        <li>Ponte bálsamo en vez de tocar la piel: se ablanda y deja de “pedirte” que la arranques.</li>
        <li>Junta los labios suavemente, apriétalos un poco y respira.</li>
        <li>Ten algo en las manos, o mastica chicle sin azúcar.</li>
        <li>¿Un pellejo? No lo arranques: bálsamo y, como mucho, cortaúñas limpio.</li>
      </ol></section>

    <section class="card"><h3>Día y noche</h3>
      <p class="small"><b>De día:</b> bálsamo reparador sin perfume, varias veces. <b>De noche:</b> capa gruesa de vaselina o Aquaphor (está en tu rutina de noche).</p>
      <p class="small"><b>Evita:</b> mentol, alcanfor o sabor (tipo Carmex), exfoliantes labiales y mates de larga duración. Bebe agua de sobra los días de CrossFit.</p>
    </section>

    ${now.length ? `<div class="section-head"><h2>Usa ahora</h2></div><div class="card list">${now.map(p => `<div class="li"><span>${STATUS[pStatus(p)].e}</span><span class="grow">${esc(p.data.name)} <span class="small muted">${esc(p.data.brand || '')}</span></span></div>`).join('')}</div>` : ''}
    ${paused.length ? `<div class="section-head"><h2>En pausa</h2><span class="small muted">${paused.length}</span></div><div class="card list">${paused.map(p => `<div class="li"><span>⏸️</span><span class="grow">${esc(p.data.name)} <span class="small muted">${esc(p.data.brand || '')}</span><br><span class="small muted">Al curarse: ${STATUS[p.data.afterCure || 'use'].l.toLowerCase()}</span></span></div>`).join('')}</div>` : ''}
    ${!lp.cured ? '<button class="btn ghost block mt" id="cured">Mis labios ya están curados</button>' : ''}
    <p class="small muted mt">Si cuesta mucho cortarlo, un psicólogo especializado en estos hábitos funciona muy bien. Si una herida por dentro no se cura en 2–3 semanas, consulta al médico o al dentista. <a href="#/cuidado/guia/p-labios">Guía completa</a></p>`;
  $('#lipToday', root)?.addEventListener('click', async () => { await setVal(cat.id, !todayDone, today()); if (!todayDone) toast('Un día más ✨'); rerender(); });
  $$('[data-trig]', root).forEach(b => b.onclick = () => sheet('¿Qué ha pasado?', `<div class="stack">
      <button class="btn color block" data-out="frenado" style="--c:#A8C99A">Lo he frenado (bálsamo, respirar…)</button>
      <button class="btn ghost block" data-out="tocado">Me los he tocado</button></div>`, body => {
    $$('[data-out]', body).forEach(x => x.onclick = async () => {
      await addItem('liptrigger', { day: today(), at: new Date().toISOString(), where: b.dataset.trig, outcome: x.dataset.out });
      closeSheet(); toast(x.dataset.out === 'frenado' ? '¡Bien frenado!' : 'Apuntado. Bálsamo y seguimos'); rerender();
    });
  }));
  $('#cured', root)?.addEventListener('click', async () => {
    if (await confirmBox(`Los ${paused.length} productos en pausa pasarán a su estado final (gastar o reponer).`, 'Están curados')) { await cureLips(); toast('¡Labios curados! ✨'); rerender(); }
  });
}

async function loadSamples() {
  for (const p of SAMPLE_PRODUCTS) await addItem('product', { ...p, openedAt: null, price: null, finished: false, low: false });
  if (!itemsOf('perfume').length) for (const p of SAMPLE_PERFUMES) await addItem('perfume', p);
  if (!itemsOf('combo').length) for (const c of SAMPLE_COMBOS) await addItem('combo', c);
  toast('Productos cargados ✨'); rerender();
}

// ------------------------------------------------------------------ IPL
function ipl(root) {
  const zones = itemsOf('care').filter(i => i.data.group === 'ipl');
  const block = iplBlock();
  const lw = lastWorkout();
  const s = settings();
  const nextDue = zones.map(z => careStatus(z)).filter(x => x.next).sort((a, b) => a.next.localeCompare(b.next))[0];
  root.innerHTML = `
    <section class="card ipl-status ${block.length ? 'blocked' : 'ok'}">
      <div class="row gap center">${block.length ? icon('lock', 'big') : '<span class="big-emoji">✨</span>'}
        <div><h2>${block.length ? 'Hoy no es buen momento' : 'Puedes hacer IPL'}</h2>
        <p class="small">Philips Lumea 9000, ${zones.length} zonas</p></div></div>
      ${block.map(b => `<p class="note warn">${esc(b.msg)}</p>`).join('')}
      ${lw ? `<p class="small">Último entreno registrado: ${lw.toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
    </section>

    <section class="card">
      <h3>Planifica entreno + IPL</h3>
      <ul class="tips">
        <li><b>El día de IPL:</b> entrena por la mañana y haz el IPL por la noche, con al menos 12 h entre medias. O descansa ese día.</li>
        <li><b>La víspera:</b> rasura las zonas para que la piel no esté recién irritada.</li>
        <li><b>El día después:</b> entreno suave o descanso; evita sauna y agua muy caliente.</li>
        <li><b>Exfoliación corporal:</b> deja 48 h antes y después del IPL. La app te avisa.</li>
        <li><b>Después:</b> crema sin perfume. 24 h sin desodorante, perfume ni bruma en la zona; 48 h sin exfoliante; SPF si va al sol.</li>
        <li><b>Sol:</b> protege las zonas tratadas, sobre todo las primeras 48 h.</li>
      </ul>
      ${nextDue ? `<p class="small">Próxima sesión: <b>${nextDue.next <= today() ? 'ya toca' : fmtShort(nextDue.next)}</b></p>` : ''}
    </section>

    <div class="section-head"><h2>Zonas</h2></div>
    <div class="zones">${zones.map(z => {
      const st = careStatus(z); const d = z.data;
      const total = d.phase === 'mantenimiento' ? 8 : 4;
      const n = d.phase === 'mantenimiento' ? Math.max(0, (d.sessions || 0) - 4) : (d.sessions || 0);
      return `<div class="zone ${st.tone}">
        <div class="row between"><b>${esc(d.name)}</b><span class="pill ${st.tone}">${esc(st.label)}</span></div>
        <p class="small muted">${esc(d.head || '')} · ${d.phase === 'mantenimiento' ? 'Mantenimiento (cada 4 sem.)' : 'Fase inicial (cada 2 sem.)'}</p>
        <div class="dots">${Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
        <p class="small">Última: ${d.last ? `${fmtShort(d.last)} (${relDay(d.last)})` : '—'}</p>
        <div class="row gap wrap mt-s">
          <button class="btn tiny ${block.length ? 'ghost' : 'primary'}" data-ipl="${z.id}">Sesión hecha hoy</button>
          <button class="btn tiny ghost" data-ipledit="${z.id}">Editar</button>
        </div></div>`;
    }).join('') || '<p class="muted">No tienes zonas IPL. Añádelas en Calendarios.</p>'}</div>

    <section class="card">
      <h3>Checklist antes de empezar</h3>
      <div class="list" id="preList">${[
        'No he entrenado en las últimas 12 h',
        'Zona rasurada (o cera hace +24 h)',
        'Piel limpia y seca: sin cremas, desodorante ni perfume',
        'Cristal y cabezal limpios',
        'Sin sol directo sin protección en 4 semanas',
        'Prueba de piel hecha si retomo tras el verano o tras sol',
      ].map((t, i) => `<label class="check-row"><input type="checkbox" data-pre="${i}"><span class="grow">${t}</span></label>`).join('')}</div>
      <p class="small muted mt-s">Después: limpia el cristal y el cabezal antes de guardarla.</p>
    </section>

    <section class="card">
      <h3>Sol y bronceado</h3>
      <p class="small muted">Si tomas el sol sin protección en las zonas, Philips recomienda esperar 4 semanas antes de retomar (2 semanas tras autobronceador).</p>
      <div class="grid2">
        <label class="field"><span>Último sol sin protección</span><input type="date" id="lastSun" value="${s.lastSun || ''}"></label>
        <label class="field"><span>Último autobronceador</span><input type="date" id="lastTan" value="${s.lastSelfTan || ''}"></label>
      </div>
    </section>
    <p class="small muted center">Fuentes: <a href="${SOURCES.lumea_freq.u}" target="_blank" rel="noopener">${esc(SOURCES.lumea_freq.t)}</a> · <a href="${SOURCES.lumea_prep.u}" target="_blank" rel="noopener">${esc(SOURCES.lumea_prep.t)}</a></p>`;

  $$('[data-ipl]', root).forEach(b => b.onclick = async () => {
    const z = S.items.find(i => i.id === b.dataset.ipl);
    if (block.length && !confirm('La app no lo recomienda ahora mismo. ¿Registrar igualmente?')) return;
    await markCareDone(z); toast(`IPL ${z.data.name} registrada`); rerender();
  });
  $$('[data-ipledit]', root).forEach(b => b.onclick = () => iplEdit(S.items.find(i => i.id === b.dataset.ipledit)));
  $('#lastSun', root).onchange = e => saveSettings({ lastSun: e.target.value || null }).then(rerender);
  $('#lastTan', root).onchange = e => saveSettings({ lastSelfTan: e.target.value || null }).then(rerender);
}

function iplEdit(z) {
  const d = z.data;
  sheet(`IPL · ${d.name}`, `
    <div class="stack">
      <label class="field"><span>Nombre de la zona</span><input name="name" value="${esc(d.name)}"></label>
      <label class="field"><span>Cabezal</span><input name="head" value="${esc(d.head || '')}"></label>
      <label class="field"><span>Fase</span><select name="phase" class="input">
        <option value="inicial" ${d.phase !== 'mantenimiento' ? 'selected' : ''}>Inicial (cada 2 semanas)</option>
        <option value="mantenimiento" ${d.phase === 'mantenimiento' ? 'selected' : ''}>Mantenimiento (cada 4 semanas)</option></select></label>
      <div class="grid2">
        <label class="field"><span>Sesiones hechas</span><input type="number" name="sessions" value="${d.sessions || 0}"></label>
        <label class="field"><span>Última sesión</span><input type="date" name="last" value="${d.last || ''}"></label>
      </div>
      <button class="btn ghost" id="restart">Reiniciar fase inicial</button>
      <div class="row gap"><button class="btn danger ghost" id="del">${icon('trash')}</button><button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => { const f = formData(body); await saveItem(z, { ...f, last: f.last || null }); closeSheet(); rerender(); };
    $('#restart', body).onclick = async () => { await saveItem(z, { phase: 'inicial', sessions: 0, last: null }); closeSheet(); toast('Fase inicial reiniciada'); rerender(); };
    $('#del', body).onclick = async () => { if (await confirmBox(`Borrar la zona ${d.name}`)) { await deleteItem(z); rerender(); } };
  });
}

// ------------------------------------------------------------------ CALENDARIOS
function calendarios(root) {
  const all = itemsOf('care');
  const groups = [...new Set(all.map(i => i.data.group))];
  const missing = CARE_CATALOG.filter(c => !all.some(i => i.data.key === c.key));
  root.innerHTML = `
    ${groups.map(g => `<div class="section-head"><h2>${esc(CARE_GROUPS[g] || g)}</h2></div><div class="card list">${all.filter(i => i.data.group === g).map(i => {
      const st = careStatus(i);
      return `<div class="li"><span class="ci">${esc(i.data.icon || '•')}</span>
        <div class="grow"><div>${esc(i.data.name)}</div><div class="small muted">${i.data.group === 'ipl' ? (i.data.phase === 'mantenimiento' ? 'cada 4 semanas' : 'cada 2 semanas') : `cada ${i.data.interval} días`} · última ${i.data.last ? fmtShort(i.data.last) : '—'}</div>
        ${i.data.tip ? `<div class="small muted">${esc(i.data.tip)}</div>` : ''}</div>
        <span class="pill ${st.tone}">${esc(st.label)}</span>
        ${i.data.group === 'ipl' ? '' : `<button class="icon-btn" data-ok="${i.id}" aria-label="Hecho">${icon('check')}</button>`}
        <button class="icon-btn" data-ed="${i.id}" aria-label="Editar">${icon('edit')}</button></div>`;
    }).join('')}</div>`).join('') || '<p class="muted">Sin calendarios todavía.</p>'}
    <div class="row gap mt"><button class="btn primary grow" id="addCare">${icon('plus')} Nuevo calendario</button></div>
    ${missing.length ? `<div class="section-head"><h2>Sugerencias</h2></div><div class="chips wrap">${missing.map(c => `<button class="chip" data-add="${c.key}">${c.icon} ${esc(c.name)}</button>`).join('')}</div>` : ''}`;
  $$('[data-ok]', root).forEach(b => b.onclick = async () => {
    const it = S.items.find(i => i.id === b.dataset.ok);
    const blk = it.data.key === 'body_scrub' ? scrubBlock() : null;
    if (blk && !(await confirmBox(blk, 'Registrar igualmente'))) return;
    await markCareDone(it); toast('Registrado'); rerender();
  });
  $$('[data-ed]', root).forEach(b => b.onclick = () => {
    const it = S.items.find(i => i.id === b.dataset.ed);
    it.data.group === 'ipl' ? iplEdit(it) : careEdit(it);
  });
  $('#addCare', root).onclick = () => careEdit(null);
  $$('[data-add]', root).forEach(b => b.onclick = async () => {
    const c = CARE_CATALOG.find(x => x.key === b.dataset.add);
    await addItem('care', c.group === 'ipl'
      ? { key: c.key, group: 'ipl', name: c.name, icon: c.icon, head: c.head, phase: 'inicial', sessions: 0, interval: 14, last: null }
      : { key: c.key, group: c.group, name: c.name, icon: c.icon, interval: c.interval, last: null, tip: c.tip || '' });
    rerender();
  });
}

function careEdit(it) {
  const d = it?.data || { name: '', icon: '✨', group: 'piel', interval: 7, last: null };
  sheet(it ? 'Editar calendario' : 'Nuevo calendario', `
    <div class="stack">
      <div class="grid-icon"><label class="field"><span>Icono</span><input name="icon" maxlength="4" value="${esc(d.icon)}"></label>
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name)}" placeholder="Pre-poo, mascarilla de arcilla…"></label></div>
      <label class="field"><span>Grupo</span><select name="group" class="input">${Object.entries(CARE_GROUPS).filter(([k]) => k !== 'ipl').map(([k, v]) => `<option value="${k}" ${d.group === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <div class="grid2"><label class="field"><span>Cada (días)</span><input type="number" name="interval" value="${d.interval}"></label>
      <label class="field"><span>Última vez</span><input type="date" name="last" value="${d.last || ''}"></label></div>
      <label class="field"><span>Nota / consejo</span><input name="tip" value="${esc(d.tip || '')}"></label>
      <div class="row gap">${it ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.name) return toast('Ponle un nombre');
      const data = { ...f, interval: f.interval || 7, last: f.last || null };
      it ? await saveItem(it, data) : await addItem('care', data);
      closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox(`Borrar "${d.name}"`)) { await deleteItem(it); rerender(); } });
  });
}

// ------------------------------------------------------------------ INVENTARIO
let invTab = 'productos'; let invStatus = 'all'; let invArea = 'all';
function inventario(root) {
  const list = products();
  const counts = Object.fromEntries(Object.keys(STATUS).map(k => [k, list.filter(p => pStatus(p) === k && !p.data.finished).length]));
  const shop = shoppingList();
  const noBuy = settings().noBuy || [];
  const check = list.filter(p => !p.data.finished && !p.data.unopened && pStatus(p) !== 'wish' && !/desmaquill|remover/i.test(`${p.data.type} ${p.data.name}`) && /m[aá]scara|gloss|lip oil|aceite labial|larga duraci|tinte|labial l[ií]quido/i.test(`${p.data.type} ${p.data.name}`) && (!p.data.openedAt || (productExpiry(p)?.days ?? 1) < 0));
  root.innerHTML = `
    <div class="seg">${[['productos', 'Mis productos'], ['compra', `Compra${shop.wish.length + shop.refill.length ? ` (${shop.wish.length + shop.refill.length})` : ''}`], ['gasto', 'Gasto']].map(([k, l]) => `<button class="${invTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="invBody"></div>`;
  const body = $('#invBody', root);
  $$('[data-tab]', root).forEach(b => b.onclick = () => { invTab = b.dataset.tab; rerender(); });

  if (invTab === 'compra') {
    const byStore = {};
    shop.wish.forEach(p => { (byStore[p.data.store || 'Sin tienda'] ||= []).push(p); });
    const total = shop.wish.reduce((a, p) => a + (Number(p.data.price) || 0), 0);
    body.innerHTML = `
      ${Object.keys(byStore).length ? Object.entries(byStore).map(([st, ps]) => `<div class="section-head"><h2>🛒 ${esc(st)}</h2><span class="small muted">${ps.length}</span></div>
        <div class="card list">${ps.map(p => `<div class="li"><div class="grow"><b>${esc(p.data.name)}</b> <span class="small muted">${esc(p.data.brand || '')}</span>
          ${p.data.note ? `<details class="small muted"><summary>Por qué</summary>${esc(p.data.note)}</details>` : ''}</div>
          ${p.data.price ? `<span class="small" style="font-weight:700">${eur(p.data.price)}</span>` : ''}
          <button class="btn tiny" data-bought="${p.id}">Comprado</button></div>`).join('')}</div>`).join('')
        : '<div class="card empty"><p>No tienes nada pendiente de comprar.</p></div>'}
      ${total ? `<p class="small muted">Total con precio conocido: <b>${eur(total)}</b></p>` : ''}
      ${shop.refill.length ? `<div class="section-head"><h2>Reponer</h2><span class="small muted">${shop.refill.length}</span></div>
        <p class="small muted" style="margin-top:-6px">Cuando lo compres, pulsa Comprado: sale de aquí y el bote nuevo entra en tu inventario.</p>
        <div class="card list">${shop.refill.map(x => `<div class="li"><span>${STATUS[pStatus(x.p)].e}</span><div class="grow"><b>${esc(x.what)}</b><br><span class="small muted">${x.why}: ${esc(x.p.data.name)}</span></div>
          <button class="btn tiny" data-refill="${x.p.id}">Comprado</button><button class="icon-btn" data-skip="${x.p.id}" aria-label="Quitar de Reponer">${icon('x')}</button></div>`).join('')}</div>` : ''}
      ${noBuy.length ? `<div class="section-head"><h2>No comprar</h2></div><section class="card" style="--c:#EFA3AE"><ul class="tips">${noBuy.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        <button class="btn tiny ghost" id="editNoBuy">Editar lista</button></section>` : '<button class="btn tiny ghost" id="editNoBuy">Añadir lista de “no comprar”</button>'}`;
    $$('[data-refill]', body).forEach(b => b.onclick = () => {
      const p = S.items.find(i => i.id === b.dataset.refill);
      if (p.data.finished) { refillBought(p, true).then(() => { toast('Bote nuevo en tu inventario'); rerender(); }); return; }
      sheet('¿Y el que tienes ahora?', `<div class="stack">
        <button class="btn primary block" data-old="keep">Lo sigo usando hasta acabarlo</button>
        <button class="btn ghost block" data-old="done">Ya está acabado o lo he tirado</button>
        <p class="small muted">El nuevo queda en tu inventario sin abrir. Pon la fecha cuando lo abras.</p></div>`, sb => {
        $$('[data-old]', sb).forEach(x => x.onclick = async () => { await refillBought(p, x.dataset.old === 'done'); closeSheet(); toast('Bote nuevo en tu inventario'); rerender(); });
      });
    });
    $$('[data-skip]', body).forEach(b => b.onclick = () => {
      const p = S.items.find(i => i.id === b.dataset.skip);
      sheet('Quitar de Reponer', `<div class="stack">
        <button class="btn ghost block" data-mode="enough">Aún me queda: recuérdamelo en 2 semanas</button>
        <button class="btn ghost block" data-mode="never">No lo voy a reponer</button>
        <button class="btn ghost block" data-mode="edit">Editar el producto (fecha, estado…)</button></div>`, sb => {
        $$('[data-mode]', sb).forEach(x => x.onclick = async () => {
          if (x.dataset.mode === 'edit') return productEdit(p);
          await refillSkip(p, x.dataset.mode); closeSheet(); toast('Quitado de Reponer'); rerender();
        });
      });
    });
    $$('[data-bought]', body).forEach(b => b.onclick = async () => {
      const p = S.items.find(i => i.id === b.dataset.bought);
      await saveItem(p, { status: p.data.onBuy || 'keep', boughtAt: today() });
      toast('¡A tu neceser! Apunta la fecha cuando lo abras'); rerender();
    });
    $('#editNoBuy', body)?.addEventListener('click', () => sheet('No comprar', `<label class="field"><span>Una cosa por línea</span><textarea class="input" rows="10" id="nb">${esc(noBuy.join('\n'))}</textarea></label><button class="btn primary block mt" id="ok">Guardar</button>`, sb => {
      $('#ok', sb).onclick = async () => { await saveSettings({ noBuy: $('#nb', sb).value.split('\n').map(x => x.trim()).filter(Boolean) }); closeSheet(); rerender(); };
    }));
    return;
  }

  if (invTab === 'gasto') {
    const month = today().slice(0, 7);
    const spentMonth = list.filter(p => (p.data.boughtAt || p.data.openedAt || '').startsWith(month)).reduce((a, p) => a + (Number(p.data.price) || 0), 0);
    const done = list.filter(p => p.data.finished);
    body.innerHTML = `<section class="card"><p>Este mes: <b>${eur(spentMonth)}</b></p>
      ${done.filter(p => p.data.price && p.data.openedAt && p.data.finishedAt).map(p => {
        const days = Math.max(1, diffDays(p.data.finishedAt, p.data.openedAt));
        return `<p class="small">${esc(p.data.name)}: duró ${days} días · <b>${eur(p.data.price / days * 30)}/mes</b></p>`;
      }).join('') || '<p class="small muted">Cuando marques un producto como terminado (con precio y fecha de apertura), verás cuánto te cuesta al mes y podrás comparar marcas.</p>'}</section>
      ${done.length ? `<div class="section-head"><h2>Terminados</h2></div><div class="card list">${done.map(p => `<button class="li" data-p="${p.id}"><span class="grow">${esc(p.data.name)}</span><span class="small muted">${fmtShort(p.data.finishedAt)}</span></button>`).join('')}</div>` : ''}`;
    $$('[data-p]', body).forEach(b => b.onclick = () => productEdit(S.items.find(i => i.id === b.dataset.p)));
    return;
  }

  const filtered = list.filter(p => !p.data.finished && pStatus(p) !== 'wish' && (invStatus === 'all' || pStatus(p) === invStatus) && (invArea === 'all' || pArea(p) === invArea));
  const areas = AREAS.filter(a => list.some(p => pArea(p) === a && !p.data.finished && pStatus(p) !== 'wish'));
  const row = p => {
    const e = productExpiry(p); const st = STATUS[pStatus(p)];
    const exp = !e ? '' : e.days < 0 ? '<span class="pill warn">Caducado</span>' : e.days <= 30 ? `<span class="pill accent">${e.days} d</span>` : '';
    return `<button class="li prod" data-p="${p.id}"><span class="stat" title="${st.d}" style="--c:${st.c}">${st.e}</span><div class="grow"><div>${esc(p.data.name)}</div>
      <div class="small muted">${[p.data.brand, p.data.type].filter(Boolean).map(esc).join(', ')}${p.data.low ? ' · <b>casi vacío</b>' : ''}</div>
      ${p.data.note ? `<div class="small" style="color:var(--ink-2);margin-top:2px">${esc(p.data.note.length > 90 ? p.data.note.slice(0, 90) + '…' : p.data.note)}</div>` : ''}</div>${exp}</button>`;
  };
  const groups = [];
  for (const a of (invArea === 'all' ? AREAS : [invArea])) {
    const ps = filtered.filter(p => pArea(p) === a);
    if (!ps.length) continue;
    if (a === 'Maquillaje') {
      for (const sub of [...MAKEUP_SUBS, '']) {
        const sp = ps.filter(p => (p.data.sub || '') === sub || (sub === '' && !MAKEUP_SUBS.includes(p.data.sub)));
        if (sp.length) groups.push([`Maquillaje${sub ? ' · ' + sub : ''}`, sp]);
      }
    } else groups.push([a, ps]);
  }
  body.innerHTML = `
    <div class="row gap"><button class="btn primary grow" id="addP">${icon('plus')} Producto</button><button class="btn ghost" id="scanP">${icon('scan')} Escanear</button></div>
    ${check.length ? `<section class="card flat mt" style="--c:#EFA3AE"><h3>🧹 Revisa la higiene (${check.length})</h3><p class="small">Máscaras: fuera a los 3–6 meses de abrirlas. Glosses y labiales líquidos: fuera si llevan más de un año. Estos no tienen fecha de apertura o ya han caducado.</p>
      <button class="btn small color" id="hyg" style="--c:#EFA3AE">Revisarlos uno a uno</button></section>` : ''}
    ${(() => { const all = list.filter(p => pStatus(p) === 'useup'); const gone = all.filter(p => p.data.finished).length;
      return all.length ? `<section class="card mt"><div class="row between"><h3>🟡 Gastando lo que tienes</h3><b>${gone}/${all.length}</b></div><div class="bar big" style="--c:#F2CF7E"><i style="width:${gone / all.length * 100}%"></i></div>
        <p class="small muted mt-s">Marca “Terminado” cada vez que acabes uno. Cuando la barra llegue al final, tu neceser será solo de los buenos.</p></section>` : ''; })()}
    <div class="chips rail mt">${[['all', `Todos ${list.filter(p => !p.data.finished && pStatus(p) !== 'wish').length}`], ...Object.entries(STATUS).filter(([k]) => k !== 'wish' && counts[k]).map(([k, v]) => [k, `${v.e} ${v.l} ${counts[k]}`])]
      .map(([k, l]) => `<button class="chip ${invStatus === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
    <div class="chips rail mt-s">${['all', ...areas].map(a => `<button class="chip small ${invArea === a ? 'on' : ''}" data-ar="${esc(a)}">${a === 'all' ? 'Todas las zonas' : esc(a)}</button>`).join('')}</div>
    ${invStatus !== 'all' ? `<p class="small muted mt-s">${STATUS[invStatus].d}.</p>` : ''}
    ${groups.map(([t, ps]) => `<div class="section-head"><h2>${esc(t)}</h2><span class="small muted">${ps.length}</span></div><div class="card list">${ps.map(row).join('')}</div>`).join('')
      || '<div class="card empty mt"><p>No hay productos con este filtro.</p></div>'}
    ${!list.length ? `<div class="card empty mt"><button class="btn ghost" id="loadSample">Cargar productos de ejemplo</button></div>` : ''}`;
  $('#hyg', body)?.addEventListener('click', () => hygieneSheet(check));
  $('#addP', body).onclick = () => productEdit(null);
  $('#scanP', body).onclick = () => scanBarcode();
  $('#loadSample', body)?.addEventListener('click', loadSamples);
  $$('[data-st]', body).forEach(b => b.onclick = () => { invStatus = b.dataset.st; rerender(); });
  $$('[data-ar]', body).forEach(b => b.onclick = () => { invArea = b.dataset.ar; rerender(); });
  $$('[data-p]', body).forEach(b => b.onclick = () => productEdit(S.items.find(i => i.id === b.dataset.p)));
}

function hygieneSheet(list) {
  sheet('Revisa la higiene', `<p class="small muted">Pon cuándo lo abriste (aproximado vale). Si no lo sabes y tiene pinta de llevar más de un año, o huele a cera o a rancio, tíralo.</p>
    <div class="list">${list.map(p => `<div class="li" style="flex-wrap:wrap" data-h="${p.id}"><div class="grow" style="min-width:60%"><b>${esc(p.data.name)}</b> <span class="small muted">${esc(p.data.brand || '')}</span></div>
      <input type="month" class="input" style="width:150px" data-month value="${p.data.openedAt ? p.data.openedAt.slice(0, 7) : ''}" aria-label="Mes de apertura">
      <div class="chips" style="width:100%"><button class="chip small" data-act="new">Sin abrir</button><button class="chip small" data-act="bin">🗑️ Lo tiro</button></div></div>`).join('')}</div>
    <button class="btn primary block mt" id="hygOk">Guardar</button>`, body => {
    const acts = {};
    $$('[data-act]', body).forEach(b => b.onclick = () => {
      const id = b.closest('[data-h]').dataset.h; const a = b.dataset.act;
      acts[id] = acts[id] === a ? null : a;
      $$('[data-act]', b.closest('[data-h]')).forEach(x => x.classList.toggle('on', acts[id] === x.dataset.act));
    });
    $('#hygOk', body).onclick = async () => {
      for (const row of $$('[data-h]', body)) {
        const p = S.items.find(i => i.id === row.dataset.h); const a = acts[p.id]; const m = $('[data-month]', row).value;
        if (a === 'bin') await saveItem(p, { finished: true, finishedAt: today(), status: 'drop', refilled: true });
        else if (a === 'new') await saveItem(p, { unopened: true });
        else if (m) await saveItem(p, { openedAt: `${m}-01`, unopened: false });
      }
      closeSheet(); toast('Revisado'); rerender();
    };
  });
}

function productEdit(p, prefill = {}) {
  const d = { slot: 'none', step: 5, tags: [], leaveOn: true, pao: 12, status: 'use', ...(p?.data || {}), ...prefill };
  const dayPick = (name, sel) => `<div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(n => `<label class="chip check small"><input type="checkbox" name="${name}" data-multi="1" value="${n}" ${(sel || []).includes(n) ? 'checked' : ''}>${DOW_SHORT[n]}</label>`).join('')}</div>`;
  sheet(p ? 'Editar producto' : 'Nuevo producto', `
    <div class="stack">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name || '')}"></label>
      <div class="grid2"><label class="field"><span>Marca</span><input name="brand" value="${esc(d.brand || '')}"></label>
      <label class="field"><span>Tipo</span><input name="type" list="ptypes" value="${esc(d.type || '')}"></label></div>
      <datalist id="ptypes">${['Limpiador', 'Aceite limpiador', 'Tónico', 'Sérum', 'Hidratante', 'Contorno de ojos', 'Protector solar', 'Crema de noche', 'Oclusivo', 'Exfoliante', 'Mascarilla', 'Skin tint', 'Corrector', 'Polvos', 'Colorete en crema', 'Iluminador líquido', 'Máscara', 'Gel de cejas', 'Bálsamo', 'Gloss', 'Corporal', 'Champú', 'Gel', 'Uñas'].map(t => `<option value="${t}">`).join('')}</datalist>
      <div class="field"><span>Estado</span><div class="chips">${Object.entries(STATUS).map(([k, v]) => `<label class="chip check"><input type="radio" name="status" value="${k}" ${d.status === k ? 'checked' : ''}>${v.e} ${v.l}</label>`).join('')}</div></div>
      <div class="grid2"><label class="field"><span>Zona</span><select name="area">${AREAS.map(a => `<option ${(d.area || pArea({ data: d })) === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
      <label class="field"><span>Grupo (maquillaje)</span><select name="sub"><option value="">—</option>${MAKEUP_SUBS.map(a => `<option ${d.sub === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label></div>
      <label class="field"><span>Cómo usarlo / notas</span><textarea class="input" name="note" rows="3">${esc(d.note || '')}</textarea></label>
      <label class="field"><span>Cuando se acabe, comprar</span><input name="replaceWith" value="${esc(d.replaceWith || '')}" placeholder="El mismo, u otro producto"></label>
      <h3 class="mt">Rutina</h3>
      <div class="grid2"><label class="field"><span>Rutina</span><select name="slot">
        ${[['none', 'Ninguna'], ['am', 'Mañana'], ['pm', 'Noche'], ['both', 'Mañana y noche']].map(([k, l]) => `<option value="${k}" ${d.slot === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Orden (1 = primero)</span><input type="number" name="step" value="${d.step ?? 5}"></label></div>
      <div class="field"><span>Mañanas que toca (ninguno marcado = todas)</span>${dayPick('amDays', d.amDays)}</div>
      <div class="field"><span>Noches que toca (ninguno marcado = todas)</span>${dayPick('pmDays', d.pmDays)}</div>
      <div class="field"><span>Ingredientes clave</span><div class="chips">${Object.entries(TAG_LABELS).map(([k, l]) => `<label class="chip check small"><input type="checkbox" name="tags" data-multi="1" value="${k}" ${d.tags?.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
      <label class="check-row"><input type="checkbox" name="leaveOn" ${d.leaveOn ? 'checked' : ''}><span>Se deja puesto (no se aclara)</span></label>
      <h3 class="mt">Caducidad y compra</h3>
      <div class="grid3"><label class="field"><span>Abierto el</span><input type="date" name="openedAt" value="${d.openedAt || ''}"></label>
      <label class="field"><span>PAO (meses)</span><input type="number" name="pao" value="${d.pao ?? ''}"></label>
      <label class="field"><span>Precio €</span><input type="number" step="0.01" name="price" value="${d.price ?? ''}"></label></div>
      <div class="grid2"><label class="field"><span>Tienda</span><input name="store" list="stores" value="${esc(d.store || '')}"></label>
      <label class="field"><span>Enlace</span><input name="url" type="url" value="${esc(d.url || '')}" placeholder="https://…"></label></div>
      <datalist id="stores"><option value="Primor"><option value="Mercadona"><option value="Druni"><option value="Farmacia"><option value="Online"></datalist>
      ${d.ingredients ? `<details><summary class="small">Ingredientes (INCI)</summary><p class="small muted">${esc(d.ingredients)}</p></details>` : ''}
      <div class="row gap wrap"><label class="check-row"><input type="checkbox" name="low" ${d.low ? 'checked' : ''}><span>Casi vacío</span></label>
      <label class="check-row"><input type="checkbox" name="finished" ${d.finished ? 'checked' : ''}><span>Terminado</span></label>
      <label class="check-row"><input type="checkbox" name="mini" ${d.mini ? 'checked' : ''}><span>Tengo versión mini</span></label></div>
      <div class="row gap">${p ? `<button class="btn danger ghost" id="del" aria-label="Borrar">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.name) return toast('Ponle un nombre');
      const radio = $('[name=status]:checked', body);
      const days = k => (f[k] || []).map(Number);
      const data = { ...f, unopened: f.openedAt ? false : !!d.unopened, status: radio ? radio.value : 'use', amDays: days('amDays'), pmDays: days('pmDays'), tags: f.tags || [], openedAt: f.openedAt || null, ingredients: d.ingredients || '', barcode: d.barcode || '' };
      if (f.finished && !d.finished) data.finishedAt = today();
      if (!f.finished) data.finishedAt = null;
      if (f.price && !d.boughtAt) data.boughtAt = f.openedAt || today();
      p ? await saveItem(p, data) : await addItem('product', data);
      closeSheet(); toast('Guardado'); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox(`Se borrará "${d.name}".`)) { await deleteItem(p); rerender(); } });
  });
}

// Escáner de código de barras + Open Beauty Facts
async function lookupBarcode(code) {
  try {
    const r = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,ingredients_text,product_name_es`);
    const j = await r.json();
    if (j.status !== 1) return null;
    const pr = j.product;
    return { name: pr.product_name_es || pr.product_name || '', brand: (pr.brands || '').split(',')[0], ingredients: pr.ingredients_text || '', tags: tagsFromIngredients(pr.ingredients_text || '') };
  } catch { return null; }
}
function loadScript(src) {
  return new Promise((res, rej) => { if (window.Html5Qrcode) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
function scanBarcode() {
  let scanner = null;
  sheet('Escanear producto', `
    <div id="reader" class="reader"></div>
    <p class="small muted">Apunta al código de barras del bote. Los datos vienen de Open Beauty Facts (base de datos abierta); si no está, rellénalo a mano.</p>
    <label class="field"><span>O escribe el código</span><input id="codeIn" inputmode="numeric"></label>
    <button class="btn primary block" id="codeOk">Buscar</button>`, async body => {
    const found = async code => {
      try { await scanner?.stop(); } catch { /* nada */ }
      toast('Buscando…');
      const info = await lookupBarcode(code);
      if (!info) toast('No está en la base de datos: rellénalo a mano');
      productEdit(null, { barcode: code, ...(info || {}) });
    };
    $('#codeOk', body).onclick = () => { const c = $('#codeIn', body).value.trim(); if (c) found(c); };
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
      scanner = new window.Html5Qrcode('reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 120 } }, code => found(code));
      const obs = new MutationObserver(() => { if (!document.body.contains(body)) { scanner.stop().catch(() => {}); obs.disconnect(); } });
      obs.observe(document.body, { childList: true });
    } catch { $('#reader', body).innerHTML = '<p class="muted small">No se pudo abrir la cámara. Escribe el código.</p>'; }
  });
}

// ------------------------------------------------------------------ PERFUMES
let pMoment = 'Todos';
function perfumes(root) {
  const list = itemsOf('perfume');
  const combos = itemsOf('combo').filter(c => c.data.type === 'layering');
  const filtered = pMoment === 'Todos' ? list : list.filter(p => (p.data.moments || []).includes(pMoment));
  root.innerHTML = `
    <div class="chips scroll">${['Todos', ...PERFUME_MOMENTS].map(m => `<button class="chip ${m === pMoment ? 'on' : ''}" data-m="${m}">${m}</button>`).join('')}</div>
    <div class="perfumes">${filtered.map(p => `<button class="perfume" data-pf="${p.id}">
      <span class="pf-role">${esc(p.data.role || '')}</span><b>${esc(p.data.name)}</b>
      <span class="small muted">${esc(p.data.family || '')}</span>
      <span class="chips">${(p.data.moments || []).map(m => `<span class="chip small on">${esc(m)}</span>`).join('')}</span>
      ${p.data.note ? `<span class="small">${esc(p.data.note)}</span>` : ''}</button>`).join('') || '<p class="muted">Sin perfumes en este momento.</p>'}</div>
    <button class="btn ghost block mt" id="addPf">${icon('plus')} Perfume</button>
    <div class="section-head"><h2>Combos de layering</h2></div>
    ${combos.map(comboCard).join('') || '<p class="muted">Aún no hay combos.</p>'}
    <button class="btn ghost block" data-newcombo="layering">${icon('plus')} Combo de layering</button>
    <p class="small muted mt">Truco: el perfume dura más sobre piel hidratada. Pulveriza en cuello, nuca y detrás de las rodillas, sin frotar.</p>`;
  $$('[data-m]', root).forEach(b => b.onclick = () => { pMoment = b.dataset.m; rerender(); });
  $$('[data-pf]', root).forEach(b => b.onclick = () => perfumeEdit(S.items.find(i => i.id === b.dataset.pf)));
  $('#addPf', root).onclick = () => perfumeEdit(null);
  bindCombos(root);
  if (!list.length && !combos.length) root.insertAdjacentHTML('afterbegin', `<div class="card empty"><button class="btn primary" id="ls2">Cargar mis perfumes y combos de ejemplo</button></div>`);
  $('#ls2', root)?.addEventListener('click', async () => {
    for (const p of SAMPLE_PERFUMES) await addItem('perfume', p);
    if (!itemsOf('combo').length) for (const c of SAMPLE_COMBOS) await addItem('combo', c);
    rerender();
  });
}
function perfumeEdit(p) {
  const d = p?.data || { moments: [] };
  sheet(p ? 'Editar perfume' : 'Nuevo perfume', `
    <div class="stack">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name || '')}"></label>
      <div class="grid2"><label class="field"><span>Marca</span><input name="brand" value="${esc(d.brand || '')}"></label>
      <label class="field"><span>Papel</span><input name="role" list="roles" value="${esc(d.role || '')}"></label></div>
      <datalist id="roles"><option value="Signature"><option value="Diario / dupe"><option value="Fresco"><option value="Bruma"></datalist>
      <label class="field"><span>Familia olfativa</span><input name="family" list="fams" value="${esc(d.family || '')}"></label>
      <datalist id="fams">${['Floral', 'Floral amaderada', 'Oriental floral', 'Ámbar / oriental', 'Cítrica', 'Fresca / acuática', 'Gourmand', 'Chipre', 'Amaderada', 'Almizclada limpia'].map(f => `<option value="${f}">`).join('')}</datalist>
      <div class="field"><span>Momentos</span><div class="chips wrap">${PERFUME_MOMENTS.map(m => `<label class="chip check"><input type="checkbox" name="moments" data-multi="1" value="${m}" ${d.moments?.includes(m) ? 'checked' : ''}>${m}</label>`).join('')}</div></div>
      <label class="field"><span>Nota</span><input name="note" value="${esc(d.note || '')}"></label>
      <div class="row gap">${p ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => { const f = formData(body); if (!f.name) return; p ? await saveItem(p, f) : await addItem('perfume', f); closeSheet(); rerender(); };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox(`Borrar "${d.name}"`)) { await deleteItem(p); rerender(); } });
  });
}

// ------------------------------------------------------------------ LOOKS / COMBOS
function comboCard(c) {
  return `<div class="card combo"><div class="row between"><h3>${esc(c.data.name)}</h3><button class="icon-btn" data-combo="${c.id}">${icon('edit')}</button></div>
    <ol class="steps">${(c.data.steps || []).map(s => `<li>${esc(s)}</li>`).join('')}</ol>${c.data.notes ? `<p class="small muted">${esc(c.data.notes)}</p>` : ''}</div>`;
}
function bindCombos(root) {
  $$('[data-combo]', root).forEach(b => b.onclick = () => comboEdit(S.items.find(i => i.id === b.dataset.combo)));
  $$('[data-newcombo]', root).forEach(b => b.onclick = () => comboEdit(null, b.dataset.newcombo));
}
function comboEdit(c, type) {
  const d = c?.data || { type, steps: [] };
  sheet(c ? 'Editar' : (d.type === 'look' ? 'Nuevo look' : 'Nuevo combo'), `
    <div class="stack">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name || '')}"></label>
      <label class="field"><span>Pasos (uno por línea)</span><textarea name="steps" rows="6" class="input">${esc((d.steps || []).join('\n'))}</textarea></label>
      <label class="field"><span>Notas</span><input name="notes" value="${esc(d.notes || '')}"></label>
      <div class="row gap">${c ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.name) return;
      const data = { type: d.type, name: f.name, notes: f.notes, steps: f.steps.split('\n').map(s => s.trim()).filter(Boolean) };
      c ? await saveItem(c, data) : await addItem('combo', data); closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox(`Borrar "${d.name}"`)) { await deleteItem(c); rerender(); } });
  });
}
function looks(root) {
  const list = itemsOf('combo').filter(c => c.data.type === 'look');
  root.innerHTML = `${list.map(comboCard).join('') || '<div class="card empty"><button class="btn primary" id="ls3">Cargar looks de ejemplo</button></div>'}
    <button class="btn ghost block" data-newcombo="look">${icon('plus')} Nuevo look</button>
    <section class="card mt"><h3>Clean girl, en corto</h3><ul class="tips">
      <li>Piel jugosa: hidratante + SPF, corrector solo donde haga falta.</li>
      <li>Cejas peinadas hacia arriba con gel transparente.</li>
      <li>Colorete en crema y bálsamo labial.</li>
      <li>Uñas cortas, neutras y cutículas hidratadas.</li>
      <li>Sleek bun para ir rápida, pero alterna con peinados flojos para no tirar del pelo.</li></ul></section>`;
  bindCombos(root);
  $('#ls3', root)?.addEventListener('click', async () => { for (const c of SAMPLE_COMBOS.filter(x => x.type === 'look')) await addItem('combo', c); rerender(); });
}

// ------------------------------------------------------------------ VIAJE / NECESER
const USE_ML = { 'Limpiador': 1.5, 'Sérum': 0.5, 'Hidratante': 1, 'Protector solar': 1.5, 'Contorno de ojos': 0.2, 'Crema de noche': 1, 'Oclusivo': 0.5, 'Corporal': 5, 'Pelo': 3, 'Tónico': 2 };
let tripDays = 3;
function viaje(root) {
  const list = products().filter(p => !p.data.finished);
  const perfs = itemsOf('perfume');
  const extras = ['Cepillo y peine', 'Gomas sin metal / scrunchie', 'Difusor', 'Discos desmaquillantes', 'Bálsamo labial', 'Cuchilla', 'Cepillo de dientes y pasta', 'Retenedores y su caja', 'Suplementos (creatina, magnesio, colágeno)'];
  const est = p => {
    const per = USE_ML[p.data.type]; if (!per) return '';
    const uses = p.data.slot === 'both' ? 2 : 1;
    const ml = Math.ceil(per * uses * tripDays * 1.2);
    const bottle = ml <= 10 ? '10 ml' : ml <= 30 ? '30 ml' : ml <= 50 ? '50 ml' : '100 ml';
    return `<span class="small muted">~${ml} ml → bote ${bottle}</span>`;
  };
  root.innerHTML = `
    <section class="card"><h3>Modo neceser</h3>
      <div class="row gap center"><span>Me voy</span><input type="number" class="input num" id="tripDays" value="${tripDays}" min="1"><span>días</span></div>
      <p class="small muted">Lista con todo lo que usas, y cuánto rellenar en botes de viaje (con un 20% de margen).</p></section>
    <div class="card list" id="tripList">
      ${list.map(p => `<label class="check-row"><input type="checkbox"><span class="grow">${esc(p.data.name)}<br>${est(p)}</span></label>`).join('')}
      ${perfs.map(p => `<label class="check-row"><input type="checkbox"><span class="grow">Perfume · ${esc(p.data.name)}${(p.data.role || '').includes('dupe') ? ' <span class="small muted">(el ideal para viajar)</span>' : ''}</span></label>`).join('')}
      ${extras.map(x => `<label class="check-row"><input type="checkbox"><span class="grow">${esc(x)}</span></label>`).join('')}
    </div>
    <button class="btn ghost block mt" id="copyTrip">${icon('copy')} Copiar lista</button>`;
  $('#tripDays', root).onchange = e => { tripDays = Math.max(1, Number(e.target.value) || 1); rerender(); };
  $('#copyTrip', root).onclick = async () => {
    const txt = $$('#tripList .check-row', root).map(r => '☐ ' + r.innerText.replace(/\n/g, ' ')).join('\n');
    try { await navigator.clipboard.writeText(`Neceser · ${tripDays} días\n${txt}`); toast('Lista copiada'); } catch { toast('No se pudo copiar'); }
  };
}

// ------------------------------------------------------------------ GUÍA
function guia(root, topic) {
  const mine = itemsOf('guide').map(i => i.data);
  const g = mine.find(x => x.gid === topic) || GUIDE.find(x => x.id === topic);
  if (g) {
    root.innerHTML = `
      <a class="back" href="#/cuidado/guia">${icon('left')} Todos los temas</a>
      <div class="row gap mb"><span class="big-emoji">${g.icon}</span><h2 style="--c:${g.color};color:var(--c-ink)">${esc(g.title)}</h2></div>
      <div style="--c:${g.color}">${g.body.map(b => `<div class="tipcard">${b}</div>`).join('')}</div>
      ${g.src?.length ? `<div class="sources">Fuentes:${g.src.map(k => `<a href="${SOURCES[k].u}" target="_blank" rel="noopener">${esc(SOURCES[k].t)}</a>`).join('')}</div>` : ''}
      ${g.gid ? '<p class="small muted mt">Parte de tu plan personal.</p>' : ''}`;
    return;
  }
  const hidden = new Set(mine.map(x => x.replaces).filter(Boolean));
  const tile = x => `<a class="guide-tile" href="#/cuidado/guia/${x.gid || x.id}" style="--c:${x.color}">
      <span class="g-emoji">${x.icon}</span><b>${esc(x.title)}</b><span>${esc(x.lead)}</span></a>`;
  root.innerHTML = `
    ${mine.length ? `<div class="section-head" style="margin-top:0"><h2>Tu plan personal</h2></div><div class="guide-grid">${mine.map(tile).join('')}</div>
      <div class="section-head"><h2>Guía general</h2></div>` : ''}
    <p class="small muted">Basado en la Academia Americana de Dermatología, el NHS y las instrucciones de Philips. No sustituye a una consulta: si tienes brotes fuertes, irritación que no se va o dudas médicas, ve a tu dermatólogo.</p>
    <div class="guide-grid mt">${GUIDE.filter(x => !hidden.has(x.id)).map(tile).join('')}</div>`;
}

// ------------------------------------------------------------------ TINTE
const ROOT_TYPES = ['Permanente', 'Semipermanente', 'Mechas / balayage', 'Decoloración', 'Henna / vegetal'];
function tinte(root) {
  const dyes = itemsOf('dye').sort((a, b) => b.data.day.localeCompare(a.data.day));
  const last = dyes[0];
  const cals = itemsOf('care').filter(i => i.data.group === 'tinte');
  const missing = CARE_CATALOG.filter(c => c.group === 'tinte' && !cals.some(i => i.data.key === c.key));
  const year = today().slice(0, 4);
  const spent = dyes.filter(d => d.data.day.startsWith(year)).reduce((a, d) => a + (Number(d.data.cost) || 0), 0);
  root.innerHTML = `
    <section class="card" style="display:flex;gap:14px;align-items:center">
      <div style="width:64px;height:64px;border-radius:50%;flex:none;background:${esc(last?.data.color || '#6B4A33')};border:3px solid var(--surface);box-shadow:0 0 0 1.5px var(--line)"></div>
      <div class="grow">${last ? `<h3>${esc(last.data.shade || last.data.type)}</h3><p class="small muted">${esc(last.data.brand || '')} ${esc(last.data.type)}, ${esc(last.data.place)} · ${relDay(last.data.day)}</p>`
        : '<h3>Tu color</h3><p class="small muted">Registra tu primer tinte para llevar el historial.</p>'}</div>
    </section>
    <button class="btn color block" id="addDye">${icon('plus')} Registrar tinte</button>
    ${cals.length ? `<div class="section-head"><h2>Próximos</h2></div><div class="card list">${cals.map(i => {
      const st = careStatus(i);
      return `<div class="li"><span class="ci">${esc(i.data.icon)}</span><div class="grow"><div>${esc(i.data.name)}</div><div class="small muted">cada ${i.data.interval} días · última ${i.data.last ? fmtShort(i.data.last) : '—'}</div></div><span class="pill ${st.tone}">${st.label}</span></div>`;
    }).join('')}</div>` : ''}
    ${missing.length ? `<div class="chips mt">${missing.map(c => `<button class="chip" data-addc="${c.key}">${c.icon} Añadir ${esc(c.name.toLowerCase())}</button>`).join('')}</div>` : ''}
    ${dyes.length ? `<div class="section-head"><h2>Historial</h2><span class="small muted">${eur(spent)} en ${year}</span></div>
    <div class="dye-hist">${dyes.map(d => `<button class="dye-card" data-dye="${d.id}" style="--dye:${esc(d.data.color || '#6B4A33')}"><div class="sw"></div><div class="body"><b>${esc(d.data.shade || d.data.type)}</b>
      <span class="muted">${fmtShort(d.data.day)} · ${esc(d.data.place)}</span>${d.data.cost ? `<br>${eur(d.data.cost)}` : ''}</div></button>`).join('')}</div>` : ''}
    <a class="card flat" href="#/cuidado/guia/tinte" style="display:block;text-decoration:none;margin-top:14px">
      <h3>🎨 Antes de teñirte</h3><p class="small">Prueba de alergia 48 h antes, máximo tres tonos de diferencia y cuidado extra con los rizos. Ver la guía completa.</p></a>`;
  $('#addDye', root).onclick = () => dyeEdit(null);
  $$('[data-dye]', root).forEach(b => b.onclick = () => dyeEdit(S.items.find(i => i.id === b.dataset.dye)));
  $$('[data-addc]', root).forEach(b => b.onclick = async () => {
    const c = CARE_CATALOG.find(x => x.key === b.dataset.addc);
    await addItem('care', { key: c.key, group: c.group, name: c.name, icon: c.icon, interval: c.interval, last: null, tip: c.tip || '' });
    rerender();
  });
}
function dyeEdit(it) {
  const d = it?.data || { day: today(), type: 'Permanente', place: 'En casa', color: '#6B4A33' };
  sheet(it ? 'Editar tinte' : 'Registrar tinte', `<div class="stack">
    <div class="grid2"><label class="field"><span>Fecha</span><input type="date" name="day" value="${d.day}"></label>
      <label class="field"><span>Color aproximado</span><input type="color" name="color" value="${esc(d.color || '#6B4A33')}" style="width:100%;border-radius:12px;height:46px"></label></div>
    <label class="field"><span>Tono</span><input name="shade" value="${esc(d.shade || '')}" placeholder="6.0 rubio oscuro, castaño chocolate…"></label>
    <label class="field"><span>Marca / producto</span><input name="brand" value="${esc(d.brand || '')}"></label>
    <div class="field"><span>Tipo</span><div class="chips">${DYE_TYPES.map(t => `<label class="chip check"><input type="radio" name="type" value="${t}" ${d.type === t ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
    <div class="field"><span>Dónde</span><div class="chips">${DYE_PLACES.map(t => `<label class="chip check"><input type="radio" name="place" value="${t}" ${d.place === t ? 'checked' : ''}>${t}</label>`).join('')}</div></div>
    <div class="grid2"><label class="field"><span>Coste €</span><input type="number" step="0.01" name="cost" value="${d.cost ?? ''}"></label>
      <label class="field"><span>Tiempo de pose (min)</span><input type="number" name="pose" value="${d.pose ?? ''}"></label></div>
    <label class="check-row"><input type="checkbox" name="patch" ${d.patch ? 'checked' : ''}><span>Hice la prueba de alergia 48 h antes</span></label>
    <label class="field"><span>Notas (cómo quedó, qué cambiarías)</span><textarea class="input" name="notes" rows="3">${esc(d.notes || '')}</textarea></label>
    <div class="row gap">${it ? `<button class="btn danger ghost" id="del" aria-label="Borrar">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div></div>`, body => {
    $('#save', body).onclick = async () => {
      const f = {};
      $$('[name]', body).forEach(el => {
        if (el.type === 'radio') { if (el.checked) f[el.name] = el.value; }
        else if (el.type === 'checkbox') f[el.name] = el.checked;
        else f[el.name] = el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
      });
      if (!f.day) return toast('Pon la fecha');
      if (!it && !f.patch) toast('Recuerda: prueba de alergia 48 h antes la próxima vez');
      it ? await saveItem(it, f) : await addItem('dye', f);
      const key = ROOT_TYPES.includes(f.type) ? 'dye_roots' : 'dye_gloss';
      const cal = itemsOf('care').find(i => i.data.key === key);
      if (cal && (!cal.data.last || cal.data.last < f.day)) await saveItem(cal, { last: f.day });
      closeSheet(); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox('Se borrará este registro de tinte.')) { await deleteItem(it); rerender(); } });
  });
}
