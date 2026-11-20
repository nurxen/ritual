// Listas editables desde la app: cualquier lista de contenido (kit de uñas, compras, reglas…)
// se puede añadir, cambiar, reordenar y borrar sin tocar el código. Se guardan en los ajustes del perfil.
import { settings, saveSettings } from './store.js';
import { esc, $, $$, icon, toast, sheet, closeSheet, confirmBox } from './ui.js';
import { rerender } from './app.js';

let editing = null; // lista que está en modo edición
const REG = new Map();
const keyOf = p => p.join('.');

export function getAt(path, def) {
  let o = settings();
  for (const k of path) { if (o == null) return def; o = o[k]; }
  return o ?? def;
}
export async function setAt(path, val) {
  const top = path[0];
  if (path.length === 1) return saveSettings({ [top]: val });
  const root = structuredClone(settings()[top] ?? {});
  let o = root;
  for (const k of path.slice(1, -1)) { o[k] ??= {}; o = o[k]; }
  o[path.at(-1)] = val;
  await saveSettings({ [top]: root });
}

// fields: [{ i: posición en la fila (null si la fila es solo texto), l: etiqueta, t: 'text'|'area'|'color'|'colors'|'emoji' }]
// wrap: 'list' | 'ul' | 'sws' | 'ol'
export function edCard({ title, path, fields, row, def = [], note = '', wrap = 'list', add = 'Añadir', cls = '', head = '' }) {
  const k = keyOf(path);
  REG.set(k, { path, fields, def, title });
  const list = getAt(path, def) || [];
  const on = editing === k;
  let body;
  if (on) {
    body = `<p class="small muted">Toca una fila para cambiarla, moverla o borrarla.</p>
      <div class="ed-list">${list.map((x, i) => `<button class="ed-row" data-ed="${k}" data-ei="${i}"><span class="grow">${row(x, i)}</span>${icon('right')}</button>`).join('')}</div>
      <div class="row gap mt-s"><button class="btn ghost grow" data-edadd="${k}">${icon('plus')} ${esc(add)}</button><button class="btn primary" data-eddone>Listo</button></div>`;
  } else {
    const rows = list.map((x, i) => row(x, i));
    body = !list.length ? '<p class="small muted">Vacío. Toca el lápiz para añadir.</p>'
      : wrap === 'ul' ? `<ul class="tips">${rows.map(r => `<li>${r}</li>`).join('')}</ul>`
      : wrap === 'ol' ? `<ol class="steps">${rows.map(r => `<li><span class="grow">${r}</span></li>`).join('')}</ol>`
      : wrap === 'sws' ? `<div class="sws">${rows.join('')}</div>`
      : `<div class="list">${rows.join('')}</div>`;
  }
  return `<section class="card ${cls}"><div class="card-head"><h3>${esc(title)}</h3>${head}${on ? '' : `<button class="ed-btn" data-edon="${k}" aria-label="Editar">${icon('edit')}</button>`}</div>${note}${body}</section>`;
}

// Un texto suelto editable (una nota, una frase)
export function edNote(path, label, def = '', cls = 'small muted') {
  const k = keyOf(path);
  REG.set(k, { path, note: true, title: label, def });
  const v = getAt(path, def);
  return `<p class="${cls} ed-note" data-ednote="${k}">${v ? esc(v) : `<span class="muted">Añadir ${esc(label.toLowerCase())}</span>`} <span class="ed-pen">${icon('edit')}</span></p>`;
}

export function bindEd(root) {
  $$('[data-edon]', root).forEach(b => b.onclick = () => { editing = b.dataset.edon; rerender(); });
  $$('[data-eddone]', root).forEach(b => b.onclick = () => { editing = null; rerender(); });
  $$('[data-ei]', root).forEach(b => b.onclick = () => rowSheet(REG.get(b.dataset.ed), Number(b.dataset.ei)));
  $$('[data-edadd]', root).forEach(b => b.onclick = () => rowSheet(REG.get(b.dataset.edadd), null));
  $$('[data-ednote]', root).forEach(b => b.onclick = () => {
    const r = REG.get(b.dataset.ednote);
    sheet(r.title, `<div class="stack"><textarea class="input" id="edN" rows="4">${esc(getAt(r.path, r.def) || '')}</textarea>
      <button class="btn primary block" id="edNOk">Guardar</button></div>`, body => {
      $('#edNOk', body).onclick = async () => { await setAt(r.path, $('#edN', body).value.trim()); closeSheet(); rerender(); };
    });
  });
}

const colorsField = (name, cs) => `<div class="ed-colors" data-colors="${name}">${(cs || []).map(c => `<span class="ed-c"><input type="color" value="${esc(c)}"><button type="button" class="ed-cx" aria-label="Quitar">×</button></span>`).join('')}<button type="button" class="ed-cadd" aria-label="Añadir color">${icon('plus')}</button></div>`;

function rowSheet(r, idx) {
  const list = [...(getAt(r.path, r.def) || [])];
  const x = idx === null ? (r.fields[0].i === null ? '' : []) : list[idx];
  const val = f => f.i === null ? x : x?.[f.i];
  const field = (f, n) => {
    const v = val(f);
    if (f.t === 'colors') return `<div class="field"><span>${esc(f.l)}</span>${colorsField('f' + n, v || [])}</div>`;
    if (f.t === 'color') return `<label class="field"><span>${esc(f.l)}</span><input type="color" name="f${n}" value="${esc(v || '#8B5A3C')}" style="height:44px;width:100%"></label>`;
    if (f.t === 'area') return `<label class="field"><span>${esc(f.l)}</span><textarea class="input" name="f${n}" rows="3">${esc(v || '')}</textarea></label>`;
    return `<label class="field"><span>${esc(f.l)}</span><input name="f${n}" value="${esc(v || '')}" ${f.t === 'emoji' ? 'maxlength="4" style="width:80px"' : ''}></label>`;
  };
  sheet(idx === null ? `Añadir a ${r.title}` : 'Editar', `<div class="stack">
    ${r.fields.map(field).join('')}
    ${idx !== null ? `<div class="row gap"><button class="btn ghost grow" id="edUp" ${idx === 0 ? 'disabled' : ''}>${icon('up')} Subir</button><button class="btn ghost grow" id="edDown" ${idx === list.length - 1 ? 'disabled' : ''}>${icon('down')} Bajar</button></div>` : ''}
    <div class="row gap">${idx !== null ? `<button class="btn danger ghost" id="edDel">${icon('trash')}</button>` : ''}<button class="btn primary grow" id="edOk">Guardar</button></div></div>`, body => {
    $$('[data-colors]', body).forEach(w => {
      const bindX = () => $$('.ed-cx', w).forEach(b => b.onclick = () => b.parentElement.remove());
      bindX();
      $('.ed-cadd', w).onclick = () => { const s = document.createElement('span'); s.className = 'ed-c'; s.innerHTML = '<input type="color" value="#8B5A3C"><button type="button" class="ed-cx" aria-label="Quitar">×</button>'; w.insertBefore(s, $('.ed-cadd', w)); bindX(); };
    });
    const save = async l => { await setAt(r.path, l); closeSheet(); rerender(); };
    $('#edOk', body).onclick = async () => {
      let nx = r.fields[0].i === null ? '' : [...(Array.isArray(x) ? x : [])];
      r.fields.forEach((f, n) => {
        const v = f.t === 'colors' ? $$(`[data-colors="f${n}"] input[type=color]`, body).map(i => i.value) : ($(`[name="f${n}"]`, body).value || '').trim();
        if (f.i === null) nx = v; else nx[f.i] = v;
      });
      const main = r.fields[0].i === null ? nx : nx[r.fields[0].i];
      if (!main || (Array.isArray(main) && !main.length)) return toast(`Rellena "${r.fields[0].l}"`);
      if (idx === null) list.push(nx); else list[idx] = nx;
      save(list);
    };
    $('#edUp', body)?.addEventListener('click', () => { [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]; save(list); });
    $('#edDown', body)?.addEventListener('click', () => { [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]]; save(list); });
    $('#edDel', body)?.addEventListener('click', async () => { if (await confirmBox('Quitar esta fila')) { list.splice(idx, 1); save(list); } });
  });
}
