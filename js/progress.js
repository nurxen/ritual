// Progreso: resumen semanal, rachas, mapa de calor, ejercicio, correlaciones, gasto
import {
  S, activeCats, getVal, isDone, isHabit, streak, bestStreak, itemsOf, careStatus, products, productExpiry,
  correlations, catByKey, dayCompletion,
} from './store.js';
import { esc, $, $$, today, addDays, diffDays, fmtShort, eur, num, parseDay, MONTHS } from './ui.js';
import { header, bindHeader, rerender } from './app.js';

let heatCat = null;

export function weeklySummaryHtml() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), -i));
  const habits = activeCats().filter(isHabit);
  const rows = habits.map(c => ({ c, n: days.filter(d => isDone(c, getVal(c.id, d))).length })).sort((a, b) => b.n - a.n);
  const avg = days.reduce((a, d) => a + dayCompletion(d), 0) / 7;
  const next = itemsOf('care').map(i => ({ i, st: careStatus(i) })).filter(x => diffDays(x.st.next, today()) <= 7)
    .sort((a, b) => a.st.next.localeCompare(b.st.next));
  const exp = products().map(p => ({ p, e: productExpiry(p) })).filter(x => x.e && x.e.days <= 30);
  const doneTasks = itemsOf('task').filter(t => t.data.done && t.data.doneAt && diffDays(today(), t.data.doneAt) < 7).length;
  const isSunday = parseDay(today()).getDay() === 0;
  return `<section class="card weekly ${isSunday ? 'highlight' : ''}">
    <p class="eyebrow">${isSunday ? 'Domingo · ' : ''}Últimos 7 días</p>
    <h2>Resumen semanal</h2>
    <div class="kpis"><div><b>${Math.round(avg * 100)}%</b><span>hábitos</span></div><div><b>${doneTasks}</b><span>tareas hechas</span></div>
      <div><b>${rows[0]?.n ?? 0}/7</b><span>${esc(rows[0]?.c.name || '—')}</span></div></div>
    ${rows.length ? `<p class="small"><b>Lo mejor:</b> ${rows.slice(0, 3).map(r => `${esc(r.c.name)} (${r.n}/7)`).join(', ')}</p>
    <p class="small"><b>A mejorar:</b> ${rows.slice(-3).reverse().map(r => `${esc(r.c.name)} (${r.n}/7)`).join(', ')}</p>` : ''}
    <p class="small"><b>La semana que viene:</b> ${next.length ? next.map(x => `${esc(x.i.data.group === 'ipl' ? 'IPL ' + x.i.data.name : x.i.data.name)} (${x.st.next <= today() ? 'ya' : fmtShort(x.st.next)})`).join(', ') : 'nada programado'}</p>
    ${exp.length ? `<p class="small"><b>Caducan pronto:</b> ${exp.map(x => esc(x.p.data.name)).join(', ')}</p>` : ''}
  </section>`;
}

function heatmap(cat) {
  const weeks = 16;
  const end = today();
  const endDow = (parseDay(end).getDay() + 6) % 7;
  const start = addDays(end, -(weeks * 7 - 1) + (6 - endDow));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const ds = addDays(start, w * 7 + d);
      if (ds > end) { cells.push('<i class="h0 fut"></i>'); continue; }
      let l = 0;
      if (cat) {
        const v = getVal(cat.id, ds);
        l = cat.type === 'scale' ? (v ? Math.ceil(v / 5 * 4) : 0) : (isDone(cat, v) ? 4 : 0);
      } else l = Math.ceil(dayCompletion(ds) * 4);
      cells.push(`<i class="h${l}" title="${ds}"></i>`);
    }
    cols.push(`<div class="hcol">${cells.join('')}</div>`);
  }
  return `<div class="heat">${cols.join('')}</div>`;
}

export function renderProgress(view) {
  const cats = activeCats();
  const habits = cats.filter(isHabit);
  const cat = cats.find(c => c.id === heatCat);
  const month = today().slice(0, 7);
  const prevMonth = (() => { const d = parseDay(today()); d.setMonth(d.getMonth() - 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();
  // Ejercicio del mes
  const ex = cats.find(c => c.type === 'exercise');
  const exStats = { crossfit: 0, correr: 0, casa: 0, km: 0, sessions: 0 };
  if (ex) for (const e of S.entries.values()) {
    if (e.category_id !== ex.id || !e.day.startsWith(month) || !e.value?.type || e.value.type === 'descanso') continue;
    exStats[e.value.type] = (exStats[e.value.type] || 0) + (Number(e.value.min) || 0);
    exStats.km += Number(e.value.km) || 0; exStats.sessions++;
  }
  const exMax = Math.max(1, exStats.crossfit, exStats.correr, exStats.casa);
  // Gasto diario
  const spend = catByKey('spend') || cats.find(c => c.type === 'money');
  const sumSpend = m => spend ? [...S.entries.values()].filter(e => e.category_id === spend.id && e.day.startsWith(m)).reduce((a, e) => a + (Number(e.value?.amount) || 0), 0) : 0;
  const careSpend = m => products().filter(p => (p.data.boughtAt || p.data.openedAt || '').startsWith(m)).reduce((a, p) => a + (Number(p.data.price) || 0), 0);
  const corr = correlations();
  const streaks = habits.map(c => ({ c, s: streak(c), b: bestStreak(c) })).sort((a, b) => b.s - a.s);

  view.innerHTML = `
    ${header('Progreso', 'Tus datos, sin juicios')}
    ${weeklySummaryHtml()}

    <h4 class="sec-title">Mapa de calor · 16 semanas</h4>
    <section class="card">
      <select class="input" id="heatSel"><option value="">Todos los hábitos</option>${cats.filter(c => c.type !== 'text').map(c => `<option value="${c.id}" ${c.id === heatCat ? 'selected' : ''}>${esc(c.icon)} ${esc(c.name)}</option>`).join('')}</select>
      ${heatmap(cat)}
      <div class="heat-legend"><span>menos</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>más</span></div>
    </section>

    <h4 class="sec-title">Rachas</h4>
    <section class="card list">${streaks.map(({ c, s, b }) => `<div class="li"><span class="ci">${esc(c.icon)}</span><span class="grow">${esc(c.name)}</span>
      <span class="streak ${s >= 7 ? 'hot' : ''}">${s > 0 ? `🔥 ${s}` : '—'}</span><span class="muted small">récord ${b}</span></div>`).join('') || '<p class="muted">Sin hábitos.</p>'}</section>

    ${ex ? `<h4 class="sec-title">Ejercicio · ${MONTHS[parseDay(today()).getMonth()]}</h4>
    <section class="card">
      <div class="kpis"><div><b>${exStats.sessions}</b><span>sesiones</span></div><div><b>${num(exStats.crossfit + exStats.correr + exStats.casa)}</b><span>minutos</span></div><div><b>${num(exStats.km, 1)}</b><span>km corriendo</span></div></div>
      ${[['crossfit', 'CrossFit'], ['correr', 'Correr'], ['casa', 'En casa']].map(([k, l]) => `<div class="hbar"><span>${l}</span><div class="bar"><i style="width:${exStats[k] / exMax * 100}%"></i></div><span class="small">${exStats[k]}′</span></div>`).join('')}
    </section>` : ''}

    <h4 class="sec-title">Lo que dicen tus datos</h4>
    <section class="card">${corr.length ? `<ul class="tips">${corr.map(x => {
      const better = x.diff > 0;
      const amount = x.t.type === 'scale' ? `${num(Math.abs(x.diff), 1)} puntos` : `un ${Math.round(Math.abs(x.rel) * 100)}%`;
      return `<li>Tu <b>${esc(x.t.name.toLowerCase())}</b> es ${amount} ${better ? 'más alto' : 'más bajo'} los días con <b>${esc(x.dr.name.toLowerCase())}</b>. <span class="muted small">(${x.n} días)</span></li>`;
    }).join('')}</ul><p class="small muted">Son relaciones, no causas: úsalas como pistas.</p>`
      : '<p class="muted small">Cuando lleves un par de semanas registrando ánimo, energía o estado de la piel junto a tus hábitos, aquí aparecerán relaciones como “tu piel está mejor los días que duermes 8 h”.</p>'}</section>

    <h4 class="sec-title">Dinero</h4>
    <section class="card">
      ${spend ? `<p>Gasto del día registrado este mes: <b>${eur(sumSpend(month))}</b> <span class="muted small">(mes pasado ${eur(sumSpend(prevMonth))})</span></p>
      <p class="small muted">Días sin gastar este mes: ${[...S.entries.values()].filter(e => e.category_id === spend.id && e.day.startsWith(month) && Number(e.value?.amount) === 0).length}</p>` : ''}
      <p>Productos de cuidado este mes: <b>${eur(careSpend(month))}</b> <span class="muted small">(mes pasado ${eur(careSpend(prevMonth))})</span></p>
    </section>`;
  bindHeader(view);
  $('#heatSel', view).onchange = e => { heatCat = e.target.value || null; rerender(); };
}
