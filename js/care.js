// Sección Cuidado: portada con accesos y páginas (rutinas, IPL, tinte, calendarios, inventario, perfumes, looks, viaje, guía)
import {
  S, itemsOf, addItem, saveItem, deleteItem, careStatus, markCareDone, iplBlock, lastWorkout, products,
  productExpiry, routineProducts, checkRoutine, tagsFromIngredients, settings, saveSettings, catByKey, getVal, setVal,
} from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, addDays, diffDays, fmtShort, relDay, eur, formData, num } from './ui.js';
import {
  SAMPLE_PRODUCTS, SAMPLE_PERFUMES, SAMPLE_COMBOS, PERFUME_MOMENTS, TAG_LABELS, GUIDE, SOURCES, POST_GYM_PROTOCOL,
  CARE_CATALOG, CARE_GROUPS, CARE_GROUP_COLORS, DYE_TYPES, DYE_PLACES,
} from './data.js';
import { topbar, rerender } from './app.js';

const PAGES = {
  rutinas: { t: 'Rutinas', e: '🫧', c: '#D4627F', d: 'Mañana, noche y post-Box' },
  ipl: { t: 'IPL', e: '✨', c: '#9B5BBF', d: 'Philips Lumea por zonas' },
  tinte: { t: 'Tinte', e: '🎨', c: '#B8673A', d: 'Color, raíces e historial' },
  calendarios: { t: 'Calendarios', e: '🗓️', c: '#2E8C8C', d: 'Mascarillas, brochas, uñas…' },
  inventario: { t: 'Inventario', e: '🧴', c: '#4A4540', d: 'Caducidad, compra y gasto' },
  perfumes: { t: 'Perfumes', e: '🌸', c: '#C2475B', d: 'Biblioteca y layering' },
  looks: { t: 'Looks', e: '💄', c: '#D49A1C', d: 'Maquillaje guardado' },
  viaje: { t: 'Neceser', e: '🧳', c: '#3D5BC9', d: 'Lista para viajar' },
  guia: { t: 'Guía', e: '📖', c: '#5E8C4A', d: 'Consejos de dermatólogos' },
};

export function renderCare(view, sub, sub2) {
  if (!PAGES[sub]) return hub(view);
  const P = PAGES[sub];
  view.innerHTML = `${topbar()}
    <a class="back" href="#/cuidado">${icon('left')} Cuidado</a>
    <div class="page-banner" style="--c:${P.c}"><h1>${P.t}</h1><p>${P.d}</p></div>
    <div id="careBody" style="--c:${P.c}"></div>`;
  const body = $('#careBody', view);
  ({ rutinas, ipl, tinte, calendarios, inventario, perfumes, looks, viaje, guia })[sub](body, sub2);
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
    guia: `${GUIDE.length} temas`,
  };
  const badge = { ipl: zDue, calendarios: cDue, inventario: exp, tinte: roots && careStatus(roots).due ? 1 : 0 };
  const tileH = (k, cls = '') => `<a class="hub-tile ${cls}" href="#/cuidado/${k}" style="--c:${PAGES[k].c}">
      ${badge[k] ? `<span class="h-badge">${badge[k]}</span>` : ''}<span class="h-emoji">${PAGES[k].e}</span><b>${PAGES[k].t}</b><span>${status[k]}</span></a>`;
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Cuidado</h1></div>
    <div class="hub">
      ${tileH('rutinas', 'wide')}${tileH('ipl')}${tileH('tinte')}${tileH('calendarios')}${tileH('inventario')}
      ${tileH('perfumes')}${tileH('looks')}${tileH('viaje', 'light')}${tileH('guia', 'light')}
    </div>`;
}

// ------------------------------------------------------------------ RUTINAS
function rutinas(root) {
  const has = products().length > 0;
  const block = (slot, title, catKey) => {
    const list = routineProducts(slot);
    const rules = checkRoutine(slot);
    const cat = catByKey(catKey);
    const done = cat && getVal(cat.id, today());
    return `<section class="card">
      <div class="row between"><h3>${title}</h3>${cat ? `<button class="btn tiny ${done ? 'primary' : 'ghost'}" data-done="${cat.id}">${done ? '✓ Hecha' : 'Marcar hecha'}</button>` : ''}</div>
      ${list.length ? `<ol class="steps">${list.map(p => `<li><span><b>${esc(p.data.type || '')}</b><br>${esc(p.data.name)}${p.data.brand ? ` <span class="muted small">${esc(p.data.brand)}</span>` : ''}</span></li>`).join('')}</ol>`
        : '<p class="muted small">Sin productos asignados a esta rutina.</p>'}
      ${rules.length ? rules.map(r => `<p class="note ${r.level}">${r.level === 'warn' ? '⚠️' : 'ℹ️'} ${esc(r.msg)}</p>`).join('')
        : list.length ? '<p class="note ok">✓ Rutina compatible: sin combinaciones irritantes.</p>' : ''}
    </section>`;
  };
  root.innerHTML = `
    ${!has ? `<div class="card empty"><p>Aún no tienes productos.</p>
      <button class="btn primary" id="loadSample">Cargar la lista de productos de ejemplo</button>
      <p class="muted small">CeraVe, Bioderma, The Ordinary, Deliplus, Neutrogena… Luego puedes editar o borrar.</p></div>` : ''}
    ${block('am', '☀️ Mañana', 'am_routine')}
    ${block('pm', '🌙 Noche', 'pm_routine')}
    <section class="card"><h3>🏋️ Protocolo post-Box</h3><ol class="steps">${POST_GYM_PROTOCOL.map(s => `<li>${esc(s)}</li>`).join('')}</ol></section>
    <p class="muted small center">Para cambiar el orden o la rutina de un producto, edítalo en <a href="#/cuidado/inventario">Inventario</a>.</p>`;
  $('#loadSample', root)?.addEventListener('click', loadSamples);
  $$('[data-done]', root).forEach(b => b.onclick = async () => {
    const id = b.dataset.done; await setVal(id, !getVal(id, today()), today()); rerender();
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
        <li><b>Exfoliación corporal:</b> nunca el mismo día que el IPL en esa zona.</li>
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
  $$('[data-ok]', root).forEach(b => b.onclick = async () => { await markCareDone(S.items.find(i => i.id === b.dataset.ok)); toast('Registrado'); rerender(); });
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
function inventario(root) {
  const list = products();
  const active = list.filter(p => !p.data.finished);
  const done = list.filter(p => p.data.finished);
  const shop = list.filter(p => p.data.low || p.data.finished || (productExpiry(p)?.days ?? 999) <= 30);
  const byStore = {};
  shop.forEach(p => { (byStore[p.data.store || 'Sin tienda'] ||= []).push(p); });
  const month = today().slice(0, 7);
  const spentMonth = list.filter(p => (p.data.boughtAt || p.data.openedAt || '').startsWith(month)).reduce((a, p) => a + (Number(p.data.price) || 0), 0);

  const row = p => {
    const e = productExpiry(p);
    const st = !e ? '' : e.days < 0 ? '<span class="pill warn">Caducado</span>' : e.days <= 30 ? `<span class="pill accent">${e.days} d</span>` : `<span class="pill">${fmtShort(e.exp)}</span>`;
    return `<button class="li prod" data-p="${p.id}"><div class="grow"><div>${esc(p.data.name)}</div>
      <div class="small muted">${[p.data.brand, p.data.type, p.data.store].filter(Boolean).map(esc).join(' · ')}${p.data.low ? ' · <b>casi vacío</b>' : ''}</div></div>${st}</button>`;
  };
  root.innerHTML = `
    <div class="row gap"><button class="btn primary grow" id="addP">${icon('plus')} Producto</button><button class="btn ghost" id="scanP">${icon('scan')} Escanear</button></div>
    ${!list.length ? `<div class="card empty mt"><button class="btn ghost" id="loadSample">Cargar productos de ejemplo</button></div>` : ''}
    <div class="section-head"><h2>En uso (${active.length})</h2></div>
    <div class="card list">${active.map(row).join('') || '<p class="muted">Nada aún.</p>'}</div>
    ${shop.length ? `<div class="section-head"><h2>Lista de la compra</h2></div><div class="card">${Object.entries(byStore).map(([st, ps]) => `<p class="small"><b>${esc(st)}</b></p><ul class="tips">${ps.map(p => `<li>${esc(p.data.name)}${p.data.url ? ` · <a href="${esc(p.data.url)}" target="_blank" rel="noopener">enlace</a>` : ''}</li>`).join('')}</ul>`).join('')}</div>` : ''}
    <div class="section-head"><h2>Gasto en cuidado</h2></div>
    <div class="card"><p>Este mes: <b>${eur(spentMonth)}</b></p>
      ${done.filter(p => p.data.price && p.data.openedAt && p.data.finishedAt).map(p => {
        const days = Math.max(1, diffDays(p.data.finishedAt, p.data.openedAt));
        return `<p class="small">${esc(p.data.name)}: duró ${days} días · <b>${eur(p.data.price / days * 30)}/mes</b></p>`;
      }).join('') || '<p class="small muted">Cuando marques un producto como terminado (con precio y fecha de apertura), verás cuánto te cuesta al mes y podrás comparar marcas.</p>'}
    </div>
    ${done.length ? `<div class="section-head"><h2>Terminados</h2></div><div class="card list">${done.map(row).join('')}</div>` : ''}`;
  $('#addP', root).onclick = () => productEdit(null);
  $('#scanP', root).onclick = () => scanBarcode();
  $('#loadSample', root)?.addEventListener('click', loadSamples);
  $$('[data-p]', root).forEach(b => b.onclick = () => productEdit(S.items.find(i => i.id === b.dataset.p)));
}

function productEdit(p, prefill = {}) {
  const d = { slot: 'none', step: 5, tags: [], leaveOn: true, pao: 12, ...(p?.data || {}), ...prefill };
  sheet(p ? 'Editar producto' : 'Nuevo producto', `
    <div class="stack">
      <label class="field"><span>Nombre</span><input name="name" value="${esc(d.name || '')}"></label>
      <div class="grid2"><label class="field"><span>Marca</span><input name="brand" value="${esc(d.brand || '')}"></label>
      <label class="field"><span>Tipo</span><input name="type" list="ptypes" value="${esc(d.type || '')}"></label></div>
      <datalist id="ptypes">${['Limpiador', 'Tónico', 'Sérum', 'Hidratante', 'Contorno de ojos', 'Protector solar', 'Crema de noche', 'Oclusivo', 'Exfoliante', 'Mascarilla', 'Corporal', 'Pelo', 'Uñas', 'Maquillaje', 'Labios'].map(t => `<option value="${t}">`).join('')}</datalist>
      <div class="grid2"><label class="field"><span>Rutina</span><select name="slot" class="input">
        ${[['none', 'Ninguna'], ['am', 'Mañana'], ['pm', 'Noche'], ['both', 'Mañana y noche']].map(([k, l]) => `<option value="${k}" ${d.slot === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Orden (1 = primero)</span><input type="number" name="step" value="${d.step ?? 5}"></label></div>
      <div class="field"><span>Ingredientes clave</span><div class="chips wrap">${Object.entries(TAG_LABELS).map(([k, l]) => `<label class="chip check"><input type="checkbox" name="tags" data-multi="1" value="${k}" ${d.tags?.includes(k) ? 'checked' : ''}>${l}</label>`).join('')}</div></div>
      <label class="check-row"><input type="checkbox" name="leaveOn" ${d.leaveOn ? 'checked' : ''}><span>Se deja puesto (no se aclara)</span></label>
      <div class="grid3"><label class="field"><span>Abierto el</span><input type="date" name="openedAt" value="${d.openedAt || ''}"></label>
      <label class="field"><span>PAO (meses)</span><input type="number" name="pao" value="${d.pao ?? ''}"></label>
      <label class="field"><span>Precio €</span><input type="number" step="0.01" name="price" value="${d.price ?? ''}"></label></div>
      <div class="grid2"><label class="field"><span>Tienda</span><input name="store" list="stores" value="${esc(d.store || '')}"></label>
      <label class="field"><span>Enlace</span><input name="url" type="url" value="${esc(d.url || '')}" placeholder="https://…"></label></div>
      <datalist id="stores"><option value="Primor"><option value="Mercadona"><option value="Druni"><option value="Farmacia"><option value="Amazon"></datalist>
      <label class="field"><span>Notas</span><input name="note" value="${esc(d.note || '')}"></label>
      ${d.ingredients ? `<details><summary class="small">Ingredientes (INCI)</summary><p class="small muted">${esc(d.ingredients)}</p></details>` : ''}
      <div class="row gap wrap"><label class="check-row"><input type="checkbox" name="low" ${d.low ? 'checked' : ''}><span>Casi vacío</span></label>
      <label class="check-row"><input type="checkbox" name="finished" ${d.finished ? 'checked' : ''}><span>Terminado</span></label>
      <label class="check-row"><input type="checkbox" name="mini" ${d.mini ? 'checked' : ''}><span>Tengo versión mini</span></label></div>
      <div class="row gap">${p ? `<button class="btn danger ghost" id="del">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="save">Guardar</button></div>
    </div>`, body => {
    $('#save', body).onclick = async () => {
      const f = formData(body); if (!f.name) return toast('Ponle un nombre');
      const data = { ...f, tags: f.tags || [], openedAt: f.openedAt || null, ingredients: d.ingredients || '', barcode: d.barcode || '' };
      if (f.finished && !d.finished) data.finishedAt = today();
      if (!f.finished) data.finishedAt = null;
      if (f.price && !d.boughtAt) data.boughtAt = f.openedAt || today();
      p ? await saveItem(p, data) : await addItem('product', data);
      closeSheet(); toast('Guardado'); rerender();
    };
    $('#del', body)?.addEventListener('click', async () => { if (await confirmBox(`Borrar "${d.name}"`)) { await deleteItem(p); rerender(); } });
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
  const g = GUIDE.find(x => x.id === topic);
  if (g) {
    root.innerHTML = `
      <a class="back" href="#/cuidado/guia">${icon('left')} Todos los temas</a>
      <div class="row gap mb"><span class="big-emoji">${g.icon}</span><h2 style="color:${g.color}">${esc(g.title)}</h2></div>
      <div style="--c:${g.color}">${g.body.map(b => `<div class="tipcard">${b}</div>`).join('')}</div>
      ${g.src.length ? `<div class="sources">Fuentes:${g.src.map(k => `<a href="${SOURCES[k].u}" target="_blank" rel="noopener">${esc(SOURCES[k].t)}</a>`).join('')}</div>` : ''}`;
    return;
  }
  root.innerHTML = `
    <p class="small muted">Basado en la Academia Americana de Dermatología, el NHS y las instrucciones de Philips. No sustituye a una consulta: si tienes brotes fuertes, irritación que no se va o dudas médicas, ve a tu dermatólogo.</p>
    <div class="guide-grid mt">${GUIDE.map(x => `<a class="guide-tile" href="#/cuidado/guia/${x.id}" style="--c:${x.color}">
      <span class="g-emoji">${x.icon}</span><b>${esc(x.title)}</b><span>${esc(x.lead)}</span></a>`).join('')}</div>`;
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
