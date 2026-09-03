create extension if not exists citext;

create table if not exists public.admin_users (
  email citext primary key,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.admin_users (email, display_name, is_active)
values
  ('liammoherlihy@gmail.com', 'Liam', true),
  ('liam@letsparti.co', 'Liam', true),
  ('masyn@letsparti.co', 'Masyn', true),
  ('ria@letsparti.co', 'Ria', true),
  ('bttags@letsparti.co', 'BT Tags', true),
  ('luca@letsparti.co', 'Luca', true)
on conflict (email) do update
set
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_parti_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where email = coalesce(auth.jwt() ->> 'email', '')::citext
      and is_active = true
  )
$$;

grant execute on function public.is_parti_admin() to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update on public.site_content to authenticated;

insert into public.site_content (key, value)
values ('projects', '{}'::jsonb)
on conflict (key) do nothing;

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "Admins can read admin allowlist" on public.admin_users;
create policy "Admins can read admin allowlist"
on public.admin_users
for select
to authenticated
using (public.is_parti_admin());

drop policy if exists "Public can read project content" on public.site_content;
create policy "Public can read project content"
on public.site_content
for select
using (key = 'projects');

drop policy if exists "Authenticated admins can update project content" on public.site_content;
create policy "Authenticated admins can update project content"
on public.site_content
for update
to authenticated
using (key = 'projects' and public.is_parti_admin())
with check (key = 'projects' and public.is_parti_admin());

drop policy if exists "Authenticated admins can insert project content" on public.site_content;
create policy "Authenticated admins can insert project content"
on public.site_content
for insert
to authenticated
with check (key = 'projects' and public.is_parti_admin());

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "Public can read project images" on storage.objects;
create policy "Public can read project images"
on storage.objects
for select
using (bucket_id = 'project-images');

drop policy if exists "Authenticated admins can upload project images" on storage.objects;
create policy "Authenticated admins can upload project images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'project-images' and public.is_parti_admin());

drop policy if exists "Authenticated admins can update project images" on storage.objects;
create policy "Authenticated admins can update project images"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-images' and public.is_parti_admin())
with check (bucket_id = 'project-images' and public.is_parti_admin());

drop policy if exists "Authenticated admins can delete project images" on storage.objects;
create policy "Authenticated admins can delete project images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-images' and public.is_parti_admin());

-- Client inquiry portal ------------------------------------------------------

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default (
    'PARTI-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  email citext not null check (char_length(email::text) between 3 and 180),
  company text not null check (char_length(company) between 1 and 160),
  phone text check (phone is null or char_length(phone) <= 40),
  website text check (website is null or char_length(website) <= 500),
  project_name text not null check (char_length(project_name) between 1 and 180),
  project_type text not null check (char_length(project_type) between 1 and 120),
  location text not null check (char_length(location) between 1 and 180),
  event_date date,
  timing_flexibility text not null default 'not_set',
  brief text not null check (char_length(brief) between 1 and 4000),
  services text[] not null default '{}',
  success_definition text check (success_definition is null or char_length(success_definition) <= 2200),
  budget_range text not null,
  budget_approved text not null,
  project_stage text not null,
  decision_process text check (decision_process is null or char_length(decision_process) <= 1800),
  source text not null,
  source_detail text check (source_detail is null or char_length(source_detail) <= 1800),
  partnership_interest boolean not null default false,
  attribution jsonb not null default '{}'::jsonb,
  fit_score integer not null default 0 check (fit_score between 0 and 100),
  recommended_path text not null default 'manual_review',
  status text not null default 'new' check (status in ('new', 'reviewing', 'discovery_recommended', 'consultation_ready', 'not_ready', 'converted')),
  internal_notes text not null default '',
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.inquiries
  add column if not exists partnership_interest boolean not null default false;

create index if not exists inquiries_submitted_at_idx on public.inquiries (submitted_at desc);
create index if not exists inquiries_status_idx on public.inquiries (status);
create index if not exists inquiries_event_date_idx on public.inquiries (event_date);

create or replace function public.prepare_parti_inquiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status := 'new';
  new.internal_notes := '';
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists prepare_parti_inquiry_trigger on public.inquiries;
create trigger prepare_parti_inquiry_trigger
before insert on public.inquiries
for each row execute function public.prepare_parti_inquiry();

create or replace function public.touch_parti_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_inquiries_updated_at on public.inquiries;
create trigger touch_inquiries_updated_at before update on public.inquiries
for each row execute function public.touch_parti_updated_at();

alter table public.inquiries enable row level security;
grant insert on public.inquiries to anon, authenticated;
grant select, update, delete on public.inquiries to authenticated;

drop policy if exists "Anyone can submit a PARTI inquiry" on public.inquiries;
create policy "Anyone can submit a PARTI inquiry"
on public.inquiries for insert to anon, authenticated
with check (
  char_length(contact_name) > 0
  and char_length(email::text) > 2
  and char_length(company) > 0
  and char_length(project_name) > 0
  and cardinality(services) > 0
);

drop policy if exists "Admins can read inquiries" on public.inquiries;
create policy "Admins can read inquiries" on public.inquiries
for select to authenticated using (public.is_parti_admin());

drop policy if exists "Admins can update inquiries" on public.inquiries;
create policy "Admins can update inquiries" on public.inquiries
for update to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());

-- Dynamic workback planner ---------------------------------------------------

create table if not exists public.workback_projects (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  project_name text not null,
  event_date date not null,
  template_key text not null default 'full',
  owner text,
  status text not null default 'planning',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workback_tasks (
  id uuid primary key default gen_random_uuid(),
  workback_id uuid not null references public.workback_projects(id) on delete cascade,
  phase text not null,
  title text not null,
  owner_role text,
  due_date date not null,
  sort_order integer not null default 0,
  is_complete boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists touch_workback_projects_updated_at on public.workback_projects;
create trigger touch_workback_projects_updated_at before update on public.workback_projects
for each row execute function public.touch_parti_updated_at();
drop trigger if exists touch_workback_tasks_updated_at on public.workback_tasks;
create trigger touch_workback_tasks_updated_at before update on public.workback_tasks
for each row execute function public.touch_parti_updated_at();

alter table public.workback_projects enable row level security;
alter table public.workback_tasks enable row level security;
grant select, insert, update, delete on public.workback_projects to authenticated;
grant select, insert, update, delete on public.workback_tasks to authenticated;

drop policy if exists "Admins manage workback projects" on public.workback_projects;
create policy "Admins manage workback projects" on public.workback_projects
for all to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());
drop policy if exists "Admins manage workback tasks" on public.workback_tasks;
create policy "Admins manage workback tasks" on public.workback_tasks
for all to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());

-- Internal staffing and package model ---------------------------------------

create table if not exists public.operations_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists touch_operations_settings_updated_at on public.operations_settings;
create trigger touch_operations_settings_updated_at before update on public.operations_settings
for each row execute function public.touch_parti_updated_at();
alter table public.operations_settings enable row level security;
grant select, insert, update on public.operations_settings to authenticated;
drop policy if exists "Admins manage operations settings" on public.operations_settings;
create policy "Admins manage operations settings" on public.operations_settings
for all to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());
