// Supabase Edge Function "calendar"
// Devuelve un calendario .ics con las próximas fechas de un perfil (cuidado, tareas, objetivos)
// para suscribirse desde Google Calendar o el Calendario del iPhone.
// IMPORTANTE: al crearla, desactiva "Verify JWT" (Google no puede enviar tu sesión).
// URL: https://<tu-proyecto>.supabase.co/functions/v1/calendar?p=<id del perfil>&t=<token secreto>
import { createClient } from 'npm:@supabase/supabase-js@2';

const pad = (n: number) => String(n).padStart(2, '0');
const dayStr = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return dayStr(d); };
const ics = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, m => '\\' + m).replace(/\n/g, '\\n');

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const p = url.searchParams.get('p'); const t = url.searchParams.get('t');
  if (!p || !t) return new Response('Falta el enlace completo', { status: 400 });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: prof } = await sb.from('profiles').select('id,name,settings').eq('id', p).maybeSingle();
  if (!prof || prof.settings?.calToken !== t) return new Response('No encontrado', { status: 404 });
  const { data: items } = await sb.from('items').select('id,kind,data').eq('profile_id', p).in('kind', ['care', 'task', 'goal']);

  const today = dayStr(new Date());
  const events: { id: string; day: string; title: string; desc?: string }[] = [];
  for (const it of items ?? []) {
    const d = it.data ?? {};
    if (it.kind === 'care') {
      if (!d.last) continue;
      const interval = d.group === 'ipl' ? (d.phase === 'mantenimiento' ? 28 : 14) : (Number(d.interval) || 7);
      let next = addDays(d.last, interval);
      if (next < today) next = today;
      events.push({ id: it.id, day: next, title: `${d.icon ?? ''} ${d.group === 'ipl' ? 'IPL · ' : ''}${d.name}`.trim(), desc: d.tip || '' });
      // y las dos siguientes repeticiones
      for (let k = 1; k <= 2; k++) events.push({ id: `${it.id}-${k}`, day: addDays(next, interval * k), title: `${d.icon ?? ''} ${d.group === 'ipl' ? 'IPL · ' : ''}${d.name}`.trim() });
    } else if (it.kind === 'task' && !d.done && d.due) {
      events.push({ id: it.id, day: d.due, title: `☐ ${d.title}`, desc: d.notes || '' });
    } else if (it.kind === 'goal' && !d.done && d.deadline) {
      events.push({ id: it.id, day: d.deadline, title: `🎯 ${d.title}` });
    }
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ritual//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:Ritual · ${ics(prof.name)}`, 'X-WR-TIMEZONE:Europe/Madrid', 'REFRESH-INTERVAL;VALUE=DURATION:PT4H', 'X-PUBLISHED-TTL:PT4H',
  ];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.id}@ritual`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${e.day.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${addDays(e.day, 1).replace(/-/g, '')}`,
      `SUMMARY:${ics(e.title)}`, ...(e.desc ? [`DESCRIPTION:${ics(e.desc)}`] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return new Response(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
});
