// PLANES: ideas para quedar, con mapa, carruseles por tipo y "Elígeme uno"
import { S, itemsOf, addItem, saveItem, deleteItem } from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox, today, diffDays, relDay, linkSource } from './ui.js';
import { topbar, rerender } from './app.js';

const COSTS = [[0, 'Gratis'], [15, 'Hasta 15 €'], [35, '15–35 €'], [99, 'Más de 35 €']];
const COST_SHORT = { 0: 'Gratis', 15: '≤ 15 €', 35: '15–35 €', 99: '+35 €' };
const OTYPES = [['activo', '🏃', 'Activo', '#7CC6BF'], ['comer', '🍽️', 'Comer y tardeo', '#F2CF7E'], ['paseo', '🚶', 'Paseo', '#A8C99A'], ['naturaleza', '🌲', 'Naturaleza', '#86B98A'],
  ['cultura', '🏛️', 'Cultura', '#A7BCEB'], ['manual', '🎨', 'Manualidades', '#F2A9BC'], ['noche', '🌙', 'Noche', '#B9A6E0'], ['relax', '🧖', 'Relax', '#D6CFC6']];
const OSEAS = [['todo', 'Todo el año'], ['invierno', 'Invierno'], ['navidad', 'Navidad'], ['primavera', 'Primavera'], ['verano', 'Verano'], ['otono', 'Otoño']];
const OMOVE = [['metro', '🚇 Metro'], ['cercanias', '🚆 Cercanías'], ['coche', '🚗 Coche']];
const MADRID = [40.4168, -3.7038];

export const seasonsNow = () => {
  const m = new Date().getMonth(); const d = new Date().getDate();
  const s = m === 11 || m <= 1 ? ['invierno'] : m <= 4 ? ['primavera'] : m <= 8 ? ['verano'] : ['otono'];
  if ((m === 10 && d >= 25) || m === 11 || (m === 0 && d <= 6)) s.push('navidad');
  return s;
};
const T = d => OTYPES.find(t => (d.types || [])[0] === t[0]) || ['', '📍', 'Plan', '#D6CFC6'];
const inCity = ll => ll && ll[0] > 40.3 && ll[0] < 40.56 && ll[1] > -3.86 && ll[1] < -3.54;
const fits = (d, now) => (d.seasons || ['todo']).some(x => x === 'todo' || now.includes(x));

let oCost = null; let oType = null; let oNoCar = false; let oAll = false; let oPick = null;
let oView = 'mapa'; let oZoom = 'city';

function filtered() {
  const now = seasonsNow();
  return itemsOf('outing').filter(({ data: d }) =>
    (oCost === null || d.cost === oCost) && (!oType || (d.types || []).includes(oType)) &&
    !(oNoCar && d.move === 'coche') && (oAll || fits(d, now)));
}

const card = o => {
  const d = o.data; const [, e, , c] = T(d);
  return `<button class="ocard" data-out="${o.id}" style="--c:${c}">
    <span class="oc-top"><span class="oc-e">${e}</span>${d.fav ? '<span class="oc-fav">♥</span>' : ''}</span>
    <b>${esc(d.name)}</b>
    <span class="oc-foot"><span class="oc-price">${COST_SHORT[d.cost] ?? ''}</span>${d.count ? `<span class="oc-done">✓${d.count}</span>` : ''}</span>
    <span class="oc-zone">${esc(d.zone || '')}</span></button>`;
};
const rail = (title, list, sub = '') => list.length ? `<div class="rail-head"><h2>${title}</h2><span class="small muted">${sub || list.length}</span></div>
  <div class="rail">${list.map(card).join('')}</div>` : '';

export function renderPlanes(view) {
  const now = seasonsNow();
  const all = itemsOf('outing');
  const list = filtered();
  const pick = oPick && all.find(o => o.id === oPick);
  const chip = (on, attr, label) => `<button class="chip ${on ? 'on' : ''}" ${attr}>${label}</button>`;
  const nowLbl = now.map(x => OSEAS.find(s => s[0] === x)[1].toLowerCase()).join(' y ');
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Planes</h1></div>
    <section class="card plan pick-hero">
      ${pick ? `<span class="small" style="color:#CFC7BE;letter-spacing:.08em;text-transform:uppercase">¿Y si hacéis…?</span>
        <button class="pick-card" data-out="${pick.id}" style="--c:${T(pick.data)[3]}"><span class="pk-e">${T(pick.data)[1]}</span>
          <span class="grow"><b>${esc(pick.data.name)}</b><span>${[COST_SHORT[pick.data.cost], pick.data.zone, pick.data.dur].filter(Boolean).map(esc).join(' · ')}</span></span>${icon('right')}</button>
        <button class="btn block mt-s" id="oRandom" style="background:rgba(255,255,255,.12);color:#F3F0EB">🎲 Otro</button>`
      : `<h3 style="color:#F3F0EB;margin:0">¿Qué hacemos?</h3>
        <p class="small" style="color:#CFC7BE;margin:4px 0 12px">${list.length} planes encajan con tus filtros${oAll ? '' : ` y con ${nowLbl}`}.</p>
        <button class="btn block" id="oRandom" style="background:#F3F0EB;color:#3A3734" ${list.length ? '' : 'disabled'}>🎲 Elígeme uno</button>`}
    </section>
    <div class="fscroll">${chip(oCost === null, 'data-oc=""', 'Cualquier precio')}${COSTS.map(([v, l]) => chip(oCost === v, `data-oc="${v}"`, l)).join('')}</div>
    <div class="fscroll">${chip(!oType, 'data-ot=""', 'Todo')}${OTYPES.map(([k, e, l]) => chip(oType === k, `data-ot="${k}"`, `${e} ${l}`)).join('')}</div>
    <div class="fscroll">${chip(oNoCar, 'data-onocar', '🚇 Sin coche')}${chip(oAll, 'data-oall', '📅 Cualquier época')}</div>
    <div class="seg mt-s"><button class="${oView === 'ideas' ? 'on' : ''}" data-ov="ideas">Ideas</button><button class="${oView === 'mapa' ? 'on' : ''}" data-ov="mapa">${icon('pin')} Mapa</button></div>
    <div id="oBody"></div>
    <button class="btn primary block mt" id="oAdd">${icon('plus')} Guardar un plan</button>
    <p class="small muted center">¿Lo has visto en TikTok, Instagram o Maps? Copia el enlace y pégalo aquí.</p>`;
  const body = $('#oBody', view);
  if (!list.length) body.innerHTML = `<div class="card empty"><p>${all.length ? 'Ningún plan con esos filtros.' : 'Aún no hay planes guardados.'}</p></div>`;
  else if (oView === 'mapa') mapView(body, list);
  else {
    const seasonal = list.filter(o => !(o.data.seasons || ['todo']).includes('todo') && fits(o.data, now));
    const byType = OTYPES.map(([k, e, l]) => [`${e} ${l}`, list.filter(o => (o.data.types || [])[0] === k)]);
    const other = list.filter(o => !OTYPES.some(t => t[0] === (o.data.types || [])[0]));
    body.innerHTML = [
      rail('♥ Favoritos', list.filter(o => o.data.fav)),
      rail('Guardados por ti', list.filter(o => !o.data.idea)),
      rail(`De temporada`, seasonal, nowLbl),
      oCost === null ? rail('Gratis', list.filter(o => o.data.cost === 0)) : '',
      ...(oType ? [] : byType.map(([t, l]) => rail(t, l))),
      oType ? rail('Todos', list) : rail('Otros', other),
    ].join('');
  }
  $$('[data-oc]', view).forEach(b => b.onclick = () => { oCost = b.dataset.oc === '' ? null : Number(b.dataset.oc); oPick = null; rerender(); });
  $$('[data-ot]', view).forEach(b => b.onclick = () => { oType = b.dataset.ot || null; oPick = null; rerender(); });
  $('[data-onocar]', view).onclick = () => { oNoCar = !oNoCar; oPick = null; rerender(); };
  $('[data-oall]', view).onclick = () => { oAll = !oAll; oPick = null; rerender(); };
  $$('[data-ov]', view).forEach(b => b.onclick = () => { oView = b.dataset.ov; rerender(); });
  $('#oRandom', view)?.addEventListener('click', () => {
    // pesa más lo que nunca habéis hecho o hace tiempo, y los favoritos
    const w = o => (o.data.lastDone ? Math.min(60, diffDays(today(), o.data.lastDone)) / 3 : 20) + (o.data.fav ? 10 : 0) + 1;
    const arr = list.length > 1 ? list.filter(o => o.id !== oPick) : list;
    let r = Math.random() * arr.reduce((a, o) => a + w(o), 0);
    oPick = (arr.find(o => (r -= w(o)) <= 0) || arr[0]).id; rerender(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#oAdd', view).onclick = () => outEdit(null);
  bindCards(view);
}
const bindCards = root => $$('[data-out]', root).forEach(b => b.onclick = () => outView(S.items.find(i => i.id === b.dataset.out)));

// ---------- Mapa (Leaflet + OpenStreetMap, se carga solo al abrirlo)
let LP = null; let MAP = null;
export const loadLeaflet = () => LP ||= new Promise((res, rej) => {
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(l);
  const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.onload = () => res(window.L); s.onerror = () => { LP = null; rej(new Error('leaflet')); }; document.head.appendChild(s);
});
const isDark = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches); };
// Mapa de OpenStreetMap (gratis y sin clave). En modo oscuro se oscurece con un filtro.
const tiles = L => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  { maxZoom: 19, attribution: '© OpenStreetMap', className: isDark() ? 'tiles-dark' : 'tiles-soft' });
const pinIcon = (L, d, big) => L.divIcon({ className: 'opin', html: `<span style="--c:${T(d)[3]}" class="${big ? 'big' : ''}">${T(d)[1]}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] });

async function mapView(body, list) {
  const pts = list.filter(o => o.data.ll); const loose = list.filter(o => !o.data.ll);
  const far = pts.filter(o => !inCity(o.data.ll)).length;
  body.innerHTML = `<div class="omap-wrap"><div id="omap" class="omap"><div class="center-screen" style="min-height:100%"><div class="loader"></div></div></div>
      <div class="omap-ctl"><button class="chip ${oZoom === 'city' ? 'on' : ''}" data-oz="city">Madrid</button><button class="chip ${oZoom === 'all' ? 'on' : ''}" data-oz="all">Toda la zona${far ? ` (+${far})` : ''}</button></div></div>
    <p class="small muted">${pts.length} en el mapa. Toca un pin para ver el plan.</p>
    ${rail('Sin sitio fijo', loose, 'en cualquier parte')}`;
  bindCards(body);
  $$('[data-oz]', body).forEach(b => b.onclick = () => { oZoom = b.dataset.oz; rerender(); });
  const el = $('#omap', body);
  const L = await loadLeaflet().catch(() => null);
  if (!el.isConnected) return;
  if (!L) { el.innerHTML = '<p class="small muted center" style="padding:40px 16px">No se ha podido cargar el mapa. Comprueba la conexión.</p>'; return; }
  el.innerHTML = '';
  try { MAP?.remove(); } catch { /* ya no existe */ }
  MAP = L.map(el, { zoomControl: false, tap: true }).setView(MADRID, 11);
  tiles(L).addTo(MAP);
  pts.forEach(o => L.marker(o.data.ll, { icon: pinIcon(L, o.data, o.id === oPick) }).addTo(MAP).on('click', () => outView(o)));
  MAP.invalidateSize();
  const focus = oZoom === 'city' ? pts.filter(o => inCity(o.data.ll)) : pts;
  if (focus.length > 1) MAP.fitBounds(focus.map(o => o.data.ll), { padding: [30, 30], maxZoom: 14 });
  else if (focus.length === 1) MAP.setView(focus[0].data.ll, 14);
  autoLocate(L);
}
// Los sitios guardados sin coordenadas se buscan solos (uno por segundo, como pide OpenStreetMap)
let locating = false;
async function autoLocate(L) {
  if (locating) return; locating = true;
  const todo = itemsOf('outing').filter(o => o.data.geo === 'auto' && !o.data.ll);
  for (const o of todo) {
    const p = await geocode(o.data.q || `${o.data.name}, Madrid`, true);
    if (p === undefined) break; // sin conexión: lo intenta otro día
    await saveItem(o, p ? { ll: p, geo: 'ok' } : { geo: 'fail' });
    if (p && MAP && L && filtered().includes(o)) L.marker(p, { icon: pinIcon(L, o.data) }).addTo(MAP).on('click', () => outView(o));
    await new Promise(r => setTimeout(r, 1100));
  }
  locating = false;
}

// ---------- Ficha del plan
const mapQuery = d => d.q || [d.name, d.zone && !/vari|cualquier|casa/i.test(d.zone) ? d.zone : '', 'Madrid'].filter(Boolean).join(', ');
function outView(o) {
  if (!o) return;
  const d = o.data; const src = d.url ? linkSource(d.url) : null;
  const q = encodeURIComponent(mapQuery(d));
  const embed = `https://maps.google.com/maps?q=${q}${d.ll ? `&ll=${d.ll.join(',')}&z=15` : '&z=12'}&hl=es&output=embed`;
  const dest = d.ll ? d.ll.join(',') : mapQuery(d);
  const noPlace = !d.ll && !d.q;
  sheet(d.name, `<div class="stack">
    ${noPlace ? '' : `<iframe class="omap-embed" src="${esc(embed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>`}
    <div class="chips">${[COSTS.find(x => x[0] === d.cost)?.[1], ...(d.types || []).map(t => { const x = OTYPES.find(y => y[0] === t); return x && `${x[1]} ${x[2]}`; }), ...(d.seasons || []).filter(t => t !== 'todo').map(t => OSEAS.find(x => x[0] === t)?.[1]), OMOVE.find(m => m[0] === d.move)?.[1], d.dur].filter(Boolean).map(t => `<span class="chip small on">${esc(t)}</span>`).join('')}</div>
    ${d.zone ? `<p class="small"><b>Dónde:</b> ${esc(d.zone)}</p>` : ''}
    ${d.notes ? `<p class="small">${esc(d.notes)}</p>` : ''}
    ${d.list ? `<p class="small muted">De tu lista de Maps: ${esc(d.list)}</p>` : ''}
    ${d.geo === 'fail' ? '<p class="small muted">No lo he encontrado en el mapa: en Editar puedes poner el pin.</p>' : ''}
    <div class="row gap">
      ${noPlace ? '' : `<a class="btn ghost grow" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=${d.move === 'coche' ? 'driving' : 'transit'}" target="_blank" rel="noopener">🧭 Cómo llegar</a>`}
      ${d.url ? `<a class="btn ghost grow" href="${esc(d.url)}" target="_blank" rel="noopener">${src?.e || '🔗'} ${esc(src?.l || 'Enlace')}</a>` : ''}</div>
    <p class="small muted">${d.count ? `Lo habéis hecho ${d.count} ${d.count === 1 ? 'vez' : 'veces'}${d.lastDone ? `, la última ${relDay(d.lastDone)}` : ''}.` : 'Aún no lo habéis hecho.'}</p>
    <button class="btn primary block" id="oDone">✓ Lo hemos hecho hoy</button>
    <div class="row gap"><button class="btn ghost grow" id="oFav">${d.fav ? '♥ Quitar de favoritos' : '♡ Favorito'}</button><button class="btn ghost grow" id="oEdit">${icon('edit')} Editar</button></div></div>`, body => {
    $('#oDone', body).onclick = async () => { await saveItem(o, { lastDone: today(), count: d.lastDone === today() ? (d.count || 1) : (d.count || 0) + 1 }); closeSheet(); toast('Apuntado ✓'); rerender(); };
    $('#oFav', body).onclick = async () => { await saveItem(o, { fav: !d.fav }); closeSheet(); rerender(); };
    $('#oEdit', body).onclick = () => { closeSheet(); setTimeout(() => outEdit(o), 200); };
  });
}

// ---------- Guardar / editar
const llFromUrl = u => {
  const m = (u || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || (u || '').match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || (u || '').match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};
async function geocode(text, bounded = false) {
  try {
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 5000);
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=es&accept-language=es&viewbox=-4.6,41.2,-3.0,39.9${bounded ? '&bounded=1' : ''}&q=${encodeURIComponent(text)}`, { signal: ctl.signal });
    const j = await r.json();
    return j[0] ? [Number(Number(j[0].lat).toFixed(5)), Number(Number(j[0].lon).toFixed(5))] : null;
  } catch { return undefined; }
}
function outEdit(o) {
  const d = o?.data || { cost: 0, types: [], seasons: ['todo'], move: 'metro' };
  let ll = d.ll || null; let mini = null; let marker = null;
  const radio = (name, opts, val) => opts.map(([k, l]) => `<label class="chip check small"><input type="radio" name="${name}" value="${k}" ${String(val) === String(k) ? 'checked' : ''}>${esc(l)}</label>`).join('');
  const multi = (name, opts, vals) => opts.map(([k, l]) => `<label class="chip check small"><input type="checkbox" name="${name}" value="${k}" ${(vals || []).includes(k) ? 'checked' : ''}>${esc(l)}</label>`).join('');
  sheet(o ? 'Editar plan' : 'Guardar un plan', `<div class="stack">
    <label class="field"><span>Enlace (Google Maps, TikTok, Instagram, web…)</span>
      <div class="row gap"><input class="input grow" id="oUrl" inputmode="url" value="${esc(d.url || '')}" placeholder="https://…"><button type="button" class="btn ghost" id="oPaste">Pegar</button></div></label>
    <label class="field"><span>Qué es</span><input id="oName" value="${esc(d.name || '')}" placeholder="Taller de cerámica, mirador, brunch…"></label>
    <label class="field"><span>Dónde (sitio, calle o barrio)</span><input id="oZone" value="${esc(d.zone || '')}" placeholder="Mercado de San Miguel, Lavapiés…"></label>
    <div class="field"><span>En el mapa</span>
      <div id="oMini" class="omini"></div>
      <div class="row gap mt-s"><button type="button" class="btn small ghost grow" id="oFind">🔎 Buscar "Dónde"</button><button type="button" class="btn small ghost" id="oNoPin">Sin sitio fijo</button></div>
      <span class="small muted" id="oPinTxt">${ll ? 'Pin puesto. Toca el mapa para moverlo.' : 'Toca el mapa para poner el pin, o busca por "Dónde".'}</span></div>
    <div class="field"><span>Precio por persona</span><div class="chips">${radio('cost', COSTS, d.cost)}</div></div>
    <div class="field"><span>Tipo</span><div class="chips">${multi('types', OTYPES.map(([k, e, l]) => [k, `${e} ${l}`]), d.types)}</div></div>
    <div class="field"><span>Cuándo</span><div class="chips">${multi('seasons', OSEAS, d.seasons)}</div></div>
    <div class="field"><span>Cómo se llega</span><div class="chips">${radio('move', OMOVE, d.move)}</div></div>
    <label class="field"><span>Notas</span><textarea class="input" id="oNotes" rows="2" placeholder="Reservar antes, horario, precio exacto…">${esc(d.notes || '')}</textarea></label>
    <div class="row gap">${o ? `<button class="btn danger ghost" id="oDel">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="oSave">Guardar</button></div></div>`, async body => {
    const urlIn = $('#oUrl', body); const txt = $('#oPinTxt', body);
    const setPin = (p, msg) => {
      ll = p; txt.textContent = msg || (p ? 'Pin puesto. Toca el mapa para moverlo.' : 'Sin pin: saldrá en "Sin sitio fijo".');
      if (!mini) return;
      if (marker) { marker.remove(); marker = null; }
      if (p) { marker = window.L.marker(p, { icon: pinIcon(window.L, { types: chosenTypes() }) }).addTo(mini); mini.setView(p, Math.max(mini.getZoom(), 14)); }
    };
    const chosenTypes = () => $$('input[name=types]', body).filter(i => i.checked).map(i => i.value);
    const fromUrl = () => { const p = llFromUrl(urlIn.value); if (p) setPin(p, 'Ubicación sacada del enlace de Maps.'); };
    urlIn.addEventListener('change', fromUrl);
    $('#oPaste', body).onclick = async () => {
      try { const t = (await navigator.clipboard.readText()).trim(); const m = t.match(/https?:\/\/\S+/); if (m) { urlIn.value = m[0]; fromUrl(); } else toast('No hay ningún enlace copiado'); }
      catch { urlIn.focus(); toast('Mantén pulsado el campo y pulsa Pegar'); }
    };
    $('#oFind', body).onclick = async () => {
      const q = $('#oZone', body).value.trim() || $('#oName', body).value.trim();
      if (!q) return toast('Escribe primero "Dónde"');
      txt.textContent = 'Buscando…';
      const p = await geocode(`${q}, Madrid`) || await geocode(q);
      p ? setPin(p, 'Encontrado. Si no es justo ahí, toca el mapa para moverlo.') : (txt.textContent = 'No lo encuentro: toca el mapa para poner el pin.');
    };
    $('#oNoPin', body).onclick = () => setPin(null);
    const L = await loadLeaflet().catch(() => null);
    const el = $('#oMini', body);
    if (L && el?.isConnected) {
      mini = L.map(el, { zoomControl: false, attributionControl: false }).setView(ll || MADRID, ll ? 14 : 11);
      tiles(L).addTo(mini);
      mini.on('click', e => setPin([Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5))]));
      if (ll) setPin(ll);
      setTimeout(() => mini.invalidateSize(), 350);
    } else if (el) el.innerHTML = '<p class="small muted center" style="padding:30px 10px">Mapa no disponible sin conexión.</p>';
    $('#oSave', body).onclick = async () => {
      const url = urlIn.value.trim(); const src = linkSource(url);
      const name = $('#oName', body).value.trim(); const zone = $('#oZone', body).value.trim();
      if (!name && !url) return toast('Pon qué es o pega un enlace');
      if (!ll && !o && zone && txt.textContent.indexOf('Sin pin') < 0) ll = await geocode(`${zone}, Madrid`);
      const pickAll = n => $$(`input[name=${n}]`, body).filter(i => i.checked).map(i => i.value);
      const data = { name: name || (src ? `Plan de ${src.l}` : 'Plan'), url: url || null, zone, notes: $('#oNotes', body).value.trim(),
        cost: Number($('input[name=cost]:checked', body)?.value ?? 0), types: pickAll('types'), seasons: pickAll('seasons').length ? pickAll('seasons') : ['todo'],
        move: $('input[name=move]:checked', body)?.value || 'metro', ll: ll || null, geo: ll ? 'ok' : (d.geo === 'auto' ? 'fail' : d.geo || null) };
      if (!o) data.idea = false;
      o ? await saveItem(o, data) : await addItem('outing', data);
      closeSheet(); toast('Plan guardado'); rerender();
    };
    $('#oDel', body)?.addEventListener('click', async () => { if (await confirmBox('Borrar este plan')) { await deleteItem(o); closeSheet(); rerender(); } });
  });
}

// ---------- Tarjeta para Hoy: de jueves a domingo propone un plan para el finde
export function planInvite() {
  const dow = new Date().getDay();
  if (![4, 5, 6, 0].includes(dow)) return '';
  const now = seasonsNow();
  const l = itemsOf('outing').filter(o => fits(o.data, now) && o.data.cost <= 15);
  if (!l.length) return '';
  const seed = [...today()].reduce((a, c) => a + c.charCodeAt(0), 0);
  const o = l[seed % l.length];
  return `<a class="card invite" href="#/planes" style="--c:${T(o.data)[3]}"><span class="pk-e">${T(o.data)[1]}</span>
    <span class="grow"><span class="small muted">${dow === 0 ? '¿Plan para hoy?' : '¿Plan para el finde?'}</span><br><b>${esc(o.data.name)}</b><br><span class="small muted">${COST_SHORT[o.data.cost]} · ${esc(o.data.zone || '')}</span></span>${icon('right')}</a>`;
}
