-- =====================================================================
--  RITUAL · Daily tracker  ·  Esquema de base de datos para Supabase
--  Pega TODO este archivo en Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) PERFILES (los 4 usuarios: Nuria, ML, Luis, Serra)
create table if not exists public.profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  color       text not null default '#B89F8A',
  avatar      text,                        -- emoji o imagen pequeña (data URL)
  settings    jsonb not null default '{}', -- objetivos de ejercicio, proyecto, etc.
  onboarded   boolean not null default false,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- 2) CATEGORÍAS (hábitos / registros diarios configurables por perfil)
--    type: bool | number | scale | text | minutes | bool_minutes | money | exercise
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  key         text,                        -- identificador interno de las plantillas
  name        text not null,
  icon        text default '•',
  type        text not null default 'bool',
  section     text not null default 'Hábitos',
  unit        text,
  target      numeric,
  active      boolean not null default true,
  sort        int not null default 0,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists categories_profile_idx on public.categories(profile_id);

-- 3) REGISTROS DIARIOS (un valor por categoría y día)
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  day         date not null,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  unique (category_id, day)
);
create index if not exists entries_profile_day_idx on public.entries(profile_id, day);

-- 4) ITEMS (todo lo demás, flexible): tareas, objetivos, productos, perfumes,
--    calendarios de cuidado (IPL, mascarillas, brochas, peluquería...),
--    combos de layering, looks, vocabulario de inglés...
create table if not exists public.items (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  data        jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists items_profile_kind_idx on public.items(profile_id, kind);

-- 5) SEGURIDAD: solo quien haya iniciado sesión (vuestra cuenta común) puede leer/escribir
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.entries    enable row level security;
alter table public.items      enable row level security;

drop policy if exists "auth all" on public.profiles;
drop policy if exists "auth all" on public.categories;
drop policy if exists "auth all" on public.entries;
drop policy if exists "auth all" on public.items;

create policy "auth all" on public.profiles   for all to authenticated using (true) with check (true);
create policy "auth all" on public.categories for all to authenticated using (true) with check (true);
create policy "auth all" on public.entries    for all to authenticated using (true) with check (true);
create policy "auth all" on public.items      for all to authenticated using (true) with check (true);

-- 6) LOS 4 PERFILES INICIALES (se pueden renombrar y personalizar desde la app)
insert into public.profiles (name, color, avatar, sort)
select * from (values
  ('Nuria', '#C9A99A', '🤍', 1),
  ('ML',    '#A9B39B', '🌿', 2),
  ('Luis',  '#9AA7B3', '🌊', 3),
  ('Serra', '#B8A08A', '☕', 4)
) as v(name, color, avatar, sort)
where not exists (select 1 from public.profiles);
