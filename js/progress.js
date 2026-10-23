// Progreso en pestañas: Semana, Rachas, Ejercicio, Datos
import {
  S, activeCats, getVal, isDone, isHabit, streak, bestStreak, itemsOf, careStatus, products, productExpiry,
  correlations, catByKey, dayCompletion, upcomingEvents,
} from './store.js';
import { esc, $, today, addDays, diffDays, fmtShort, eur, num, parseDay, MONTHS } from './ui.js';
import { sectionColor, CARE_GROUP_COLORS } from './data.js';
import { topbar, rerender } from './app.js';

let heatCat = null;
const TABS = [['semana', 'Semana'], ['rachas', 'Rachas'], ['ejercicio', 'Ejercicio'], ['datos', 'Datos']];

export function renderProgress(view, sub = 'semana') {
  if (!TABS.some(([k]) => k === sub)) sub = 'semana';
  view.innerHTML = `${topbar()}
    <div class="page-title"><h1>Progreso</h1></div>
    <div class="seg">${TABS.map(([k, l]) => `<a href="#/progreso/${k}" class="${k === sub ? 'on' : ''}">${l}</a>`).join('')}</div>
    <div id="pBody"></div>`;
  ({ semana, rachas, ejercicio, datos })[sub]($('#pBody', view));
}

// ------------------------------------------------------------ SEMANA
function semana(root) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), -i));
  const habits = activeCats().filter(isHabit);
  const rows = habits.map(c => ({ c, n: days.filter(d => isDone(c, getVal(c.id, d))).length })).sort((a, b) => b.n - a.n);
  const avg = days.reduce((a, d) => a + dayCompletion(d), 0) / 7;
  const next = upcomingEvents(7).filter(e => e.kind === 'care');
  const exps = products().filter(p => !['drop', 'pause'].includes(p.data.status) && !p.data.finished).map(p => ({ p, e: productExpiry(p) })).filter(x => x.e && x.e.days <= 30);
  const expired = exps.filter(x => x.e.days < 0); const exp = exps.filter(x => x.e.days >= 0);
  const doneTasks = itemsOf('task').filter(t => t.data.done && t.data.doneAt && diffDays(today(), t.data.doneAt) < 7).length;
  const perDay = days.slice().reverse().map(d => ({ d, p: dayCompletion(d) }));
  const DOW = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  root.innerHTML = `
    <section class="card weekly">
      <h2>Tus últimos 7 días</h2>
      <div class="kpis"><div><b>${Math.round(avg * 100)}%</b><span>hábitos</span></div><div><b>${doneTasks}</b><span>tareas hechas</span></div>
        <div><b>${rows[0]?.n ?? 0}/7</b><span>${esc(rows[0]?.c.name || '—')}</span></div></div>
      <div style="display:flex;gap:6px;align-items:flex-end;height:70px">${perDay.map(x => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <div style="width:100%;height:${Math.max(4, x.p * 56)}px;background:rgba(255,255,255,${x.d === today() ? 1 : .55});border-radius:6px"></div>
        <span style="font-size:11px;font-weight:700">${DOW[parseDay(x.d).getDay()]}</span></div>`).join('')}</div>
    </section>
    ${rows.length ? `<div class="grid2">
      <section class="card"><h3 style="--c:#A8D5B5;color:var(--c-ink)">Lo mejor</h3>${rows.slice(0, 3).map(r => `<p class="small">${esc(r.c.icon)} ${esc(r.c.name)} <b>${r.n}/7</b></p>`).join('')}</section>
      <section class="card"><h3 style="--c:#EFA3AE;color:var(--c-ink)">A mejorar</h3>${rows.slice(-3).reverse().map(r => `<p class="small">${esc(r.c.icon)} ${esc(r.c.name)} <b>${r.n}/7</b></p>`).join('')}</section>
    </div>` : ''}
    <div class="section-head"><h2>La semana que viene</h2></div>
    <section class="card list">${next.length ? next.map(x => `<div class="li" style="--c:${CARE_GROUP_COLORS[x.group] || '#CFC7BE'}"><span class="swatch-dot"></span><span class="grow">${esc(x.title)}</span><span class="small muted">${x.day <= today() ? 'ya' : fmtShort(x.day)}</span></div>`).join('') : '<p class="muted small" style="padding:8px">Nada programado.</p>'}</section>
    ${expired.length ? `<a class="card flat" href="#/cuidado/inventario" style="display:block;text-decoration:none"><h3>🗑️ Ya caducados</h3><p class="small">${expired.map(x => esc(x.p.data.name)).join(', ')}</p><p class="small muted">Tíralos o, si la fecha de apertura está mal, corrígela en Inventario.</p></a>` : ''}
    ${exp.length ? `<section class="card flat"><h3>⏳ Caducan este mes</h3><p class="small">${exp.map(x => `${esc(x.p.data.name)} (${fmtShort(x.e.exp)})`).join(', ')}</p></section>` : ''}`;
}

// ------------------------------------------------------------ RACHAS + MAPA
function heatmap(cat) {
  const weeks = 16; const end = today();
  const endDow = (parseDay(end).getDay() + 6) % 7;
  const start = addDays(end, -(weeks * 7 - 1) + (6 - endDow));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const ds = addDays(start, w * 7 + d);
      if (ds > end) { cells.push('<i class="fut"></i>'); continue; }
      let l = 0;
      if (cat) { const v = getVal(cat.id, ds); l = cat.type === 'scale' ? (v ? Math.ceil(v / 5 * 4) : 0) : (isDone(cat, v) ? 4 : 0); }
      else l = Math.ceil(dayCompletion(ds) * 4);
      cells.push(`<i class="h${l}" title="${ds}"></i>`);
    }
    cols.push(`<div class="hcol">${cells.join('')}</div>`);
  }
  return `<div class="heat">${cols.join('')}</div>`;
}
function rachas(root) {
  const cats = activeCats();
  const cat = cats.find(c => c.id === heatCat);
  const col = cat ? sectionColor(cat.section) : 'var(--pc)';
  const streaks = cats.filter(isHabit).map(c => ({ c, s: streak(c), b: bestStreak(c) })).sort((a, b) => b.s - a.s || b.b - a.b);
  root.innerHTML = `
    <section class="card" style="--c:${col}">
      <h3>Mapa de 16 semanas</h3>
      <select class="input" id="heatSel"><option value="">Todos los hábitos</option>${cats.filter(c => c.type !== 'text').map(c => `<option value="${c.id}" ${c.id === heatCat ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
      ${heatmap(cat)}
      <div class="heat-legend"><span>menos</span><i></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>más</span></div>
    </section>
    <section class="card list">${streaks.map(({ c, s, b }) => `<div class="streak-row" style="--c:${sectionColor(c.section)}">
      <span class="ci">${esc(c.icon)}</span><span class="grow"><b>${esc(c.name)}</b><br><span class="small muted">récord ${b} días</span></span>
      <span class="streak-num">${s ? `${s}🔥` : '0'}</span></div>`).join('') || '<p class="muted">Sin hábitos.</p>'}</section>`;
  $('#heatSel', root).onchange = e => { heatCat = e.target.value || null; rerender(); };
}

// ------------------------------------------------------------ EJERCICIO
function ejercicio(root) {
  const ex = activeCats().find(c => c.type === 'exercise');
  if (!ex) { root.innerHTML = '<div class="card empty"><p>Activa la categoría Ejercicio para ver estadísticas.</p></div>'; return; }
  const month = today().slice(0, 7);
  const st = { crossfit: 0, correr: 0, casa: 0, km: 0, sessions: 0, sweat: 0 };
  const weeks = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const e of S.entries.values()) {
    if (e.category_id !== ex.id || !e.value?.type || e.value.type === 'descanso') continue;
    const ago = diffDays(today(), e.day); if (ago < 56) weeks[7 - Math.floor(ago / 7)] += Number(e.value.min) || 0;
    if (!e.day.startsWith(month)) continue;
    st[e.value.type] = (st[e.value.type] || 0) + (Number(e.value.min) || 0);
    st.km += Number(e.value.km) || 0; st.sessions++; if (e.value.sweat) st.sweat++;
  }
  const mx = Math.max(1, st.crossfit, st.correr, st.casa); const wmx = Math.max(1, ...weeks);
  root.innerHTML = `
    <section class="card plan">
      <h2 style="text-transform:uppercase;font-stretch:70%;font-weight:850">${MONTHS[parseDay(today()).getMonth()]}</h2>
      <div class="plan-goals" style="grid-template-columns:repeat(3,1fr)">
        <div class="goal-chip"><b>${st.sessions}</b><span>sesiones</span></div>
        <div class="goal-chip"><b>${num(st.crossfit + st.correr + st.casa)}′</b><span>minutos</span></div>
        <div class="goal-chip"><b>${num(st.km, 1)}</b><span>km</span></div></div>
    </section>
    <section class="card" style="--c:#F4A988"><h3>Por tipo este mes</h3>
      ${[['crossfit', 'CrossFit'], ['correr', 'Correr'], ['casa', 'En casa']].map(([k, l]) => `<div class="hbar"><span>${l}</span><div class="bar"><i style="width:${st[k] / mx * 100}%"></i></div><span class="small">${st[k]}′</span></div>`).join('')}
      <p class="small muted mt">${st.sweat} entrenos muy sudorosos este mes.</p></section>
    <section class="card" style="--c:#F4A988"><h3>Minutos por semana</h3>
      <div style="display:flex;gap:6px;align-items:flex-end;height:110px">${weeks.map((w, i) => `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
        <span style="font-size:11px;font-weight:700">${w || ''}</span><div style="width:100%;height:${Math.max(3, w / wmx * 80)}px;background:var(--c);opacity:${i === 7 ? 1 : .55};border-radius:6px"></div></div>`).join('')}</div>
      <p class="small muted">Últimas 8 semanas; la última es la actual.</p></section>`;
}

// ------------------------------------------------------------ DATOS
function datos(root) {
  const cats = activeCats();
  const month = today().slice(0, 7);
  const prev = (() => { const d = parseDay(today()); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  const spend = catByKey('spend') || cats.find(c => c.type === 'money');
  const sumSpend = m => spend ? [...S.entries.values()].filter(e => e.category_id === spend.id && e.day.startsWith(m)).reduce((a, e) => a + (Number(e.value?.amount) || 0), 0) : 0;
  const careSpend = m => products().filter(p => p.data.status !== 'wish' && ((p.data.boughtAt || '').startsWith(m) || (!p.data.priceEst && !p.data.boughtAt && (p.data.openedAt || '').startsWith(m)))).reduce((a, p) => a + (Number(p.data.price) || 0), 0)
    + itemsOf('dye').filter(d => d.data.day.startsWith(m)).reduce((a, d) => a + (Number(d.data.cost) || 0), 0);
  const corr = correlations();
  root.innerHTML = `
    <div class="section-head" style="margin-top:6px"><h2>Lo que dicen tus datos</h2></div>
    <section class="card">${corr.length ? corr.map(x => {
      const up = x.diff > 0;
      const amount = x.t.type === 'scale' ? `${up ? '+' : '−'}${num(Math.abs(x.diff), 1)}` : `${up ? '+' : '−'}${Math.round(Math.abs(x.rel) * 100)}%`;
      return `<div class="insight" style="--c:${up ? '#A8D5B5' : '#EFA3AE'}"><span class="delta">${amount}</span><span class="small">Tu <b>${esc(x.t.name.toLowerCase())}</b> es ${up ? 'más alto' : 'más bajo'} los días con <b>${esc(x.dr.name.toLowerCase())}</b>. <span class="muted">(${x.n} días)</span></span></div>`;
    }).join('') + '<p class="small muted mt-s">Son relaciones, no causas: tómalas como pistas.</p>'
      : '<p class="muted small">Cuando lleves un par de semanas apuntando ánimo, energía o estado de la piel junto a tus hábitos, aquí verás cosas como “tu piel está mejor los días que duermes 8 h”.</p>'}</section>
    <div class="section-head"><h2>Dinero</h2></div>
    <div class="grid2">
      ${spend ? `<section class="card" style="--c:#F2CF7E"><p class="small muted">Gasto del día, ${MONTHS[parseDay(today()).getMonth()]}</p><p class="kpis" style="display:block;margin:0"><b style="font-family:var(--display);font-size:30px;font-weight:850;font-stretch:70%;color:var(--c-ink)">${eur(sumSpend(month))}</b></p><p class="small muted">mes pasado ${eur(sumSpend(prev))}</p></section>` : ''}
      <section class="card" style="--c:#F2A9BC"><p class="small muted">Cuidado personal</p><p style="margin:0"><b style="font-family:var(--display);font-size:30px;font-weight:850;font-stretch:70%;color:var(--c-ink)">${eur(careSpend(month))}</b></p><p class="small muted">mes pasado ${eur(careSpend(prev))}</p></section>
    </div>
    ${spend ? `<p class="small muted">Días sin gastar este mes: <b>${[...S.entries.values()].filter(e => e.category_id === spend.id && e.day.startsWith(month) && Number(e.value?.amount) === 0).length}</b></p>` : ''}`;
}
