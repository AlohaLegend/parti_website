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

-- Independent contractor intake ---------------------------------------------

create table if not exists public.contractor_profiles (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default (
    'CREW-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  ),
  legal_name text not null check (char_length(legal_name) between 1 and 140),
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 100),
  email citext not null check (char_length(email::text) between 3 and 180),
  phone text not null check (char_length(phone) between 7 and 40),
  home_base text not null check (char_length(home_base) between 1 and 180),
  business_name text check (business_name is null or char_length(business_name) <= 180),
  entity_type text not null check (entity_type in ('sole_proprietor','single_member_llc','llc','partnership','corporation','other','not_established')),
  website text check (website is null or char_length(website) <= 500),
  portfolio_url text check (portfolio_url is null or char_length(portfolio_url) <= 500),
  social_url text check (social_url is null or char_length(social_url) <= 500),
  primary_role text not null check (char_length(primary_role) between 1 and 160),
  services text[] not null default '{}',
  years_experience text not null,
  experience_summary text not null check (char_length(experience_summary) between 40 and 4000),
  notable_work text check (notable_work is null or char_length(notable_work) <= 2500),
  markets text[] not null default '{}',
  rate_types text[] not null default '{}',
  rates jsonb not null default '{}'::jsonb,
  availability jsonb not null default '{}'::jsonb,
  business_independence jsonb not null default '{}'::jsonb,
  insurance jsonb not null default '{}'::jsonb,
  safety_credentials text[] not null default '{}',
  equipment text check (equipment is null or char_length(equipment) <= 2500),
  reference_contact jsonb not null default '{}'::jsonb,
  additional_notes text check (additional_notes is null or char_length(additional_notes) <= 2500),
  attribution jsonb not null default '{}'::jsonb,
  completeness_score integer not null default 0 check (completeness_score between 0 and 100),
  review_flags text[] not null default '{}',
  status text not null default 'new' check (status in ('new','reviewing','needs_info','eligible_pool','hold','engaged','declined')),
  classification_status text not null default 'unreviewed' check (classification_status in ('unreviewed','contractor_candidate','employee_review','counsel_review')),
  internal_notes text not null default '',
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists contractor_profiles_submitted_at_idx on public.contractor_profiles (submitted_at desc);
create index if not exists contractor_profiles_status_idx on public.contractor_profiles (status);
create index if not exists contractor_profiles_email_idx on public.contractor_profiles (email);

create or replace function public.prepare_contractor_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  flags text[] := '{}';
  score integer := 55;
begin
  if new.entity_type = 'not_established' then flags := array_append(flags, 'No established business entity'); end if;
  if coalesce(new.business_independence->>'other_clients', '') in ('not_currently', 'no') then flags := array_append(flags, 'No current outside clientele'); end if;
  if coalesce(new.business_independence->>'can_decline', '') <> 'yes' then flags := array_append(flags, 'Limited ability to decline projects'); end if;
  if coalesce(new.business_independence->>'can_negotiate', '') = 'no' then flags := array_append(flags, 'Rates or scope not independently negotiated'); end if;
  if coalesce(new.business_independence->>'advertises', '') = 'no' then flags := array_append(flags, 'No public business presence'); end if;
  if coalesce(new.business_independence->>'own_tools', '') = 'no' then flags := array_append(flags, 'Does not normally provide tools'); end if;
  if coalesce(new.business_independence->>'work_location', '') = 'parti_location' then flags := array_append(flags, 'Work primarily at PARTI location'); end if;
  if coalesce(new.business_independence->>'business_registration', '') in ('in_progress', 'none') then flags := array_append(flags, 'Business registration requires review'); end if;
  if coalesce(new.insurance->>'general_liability', '') in ('none', 'not_applicable') then flags := array_append(flags, 'General liability coverage requires review'); end if;
  if coalesce(new.insurance->>'workers_comp', '') = 'unsure' then flags := array_append(flags, 'Workers'' compensation status unclear'); end if;
  if coalesce(new.insurance->>'driving', '') = 'yes_personal' then flags := array_append(flags, 'Vehicle use and insurance require review'); end if;

  if new.portfolio_url is not null or new.website is not null then score := score + 8; end if;
  if new.notable_work is not null then score := score + 7; end if;
  if coalesce(new.reference_contact->>'name', '') <> '' and coalesce(new.reference_contact->>'contact', '') <> '' then score := score + 6; end if;
  if coalesce(new.insurance->>'general_liability', '') = 'current' then score := score + 8; end if;
  if coalesce(new.business_independence->>'other_clients', '') like 'yes%' then score := score + 6; end if;
  if coalesce(new.business_independence->>'advertises', '') = 'yes' then score := score + 5; end if;
  if cardinality(new.safety_credentials) > 0 and not ('None' = any(new.safety_credentials)) then score := score + 5; end if;

  new.review_flags := flags;
  new.completeness_score := least(100, score);
  new.status := 'new';
  new.classification_status := 'unreviewed';
  new.internal_notes := '';
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists prepare_contractor_profile_trigger on public.contractor_profiles;
create trigger prepare_contractor_profile_trigger
before insert on public.contractor_profiles
for each row execute function public.prepare_contractor_profile();

drop trigger if exists touch_contractor_profiles_updated_at on public.contractor_profiles;
create trigger touch_contractor_profiles_updated_at before update on public.contractor_profiles
for each row execute function public.touch_parti_updated_at();

alter table public.contractor_profiles enable row level security;
grant insert on public.contractor_profiles to anon, authenticated;
grant select, update on public.contractor_profiles to authenticated;

drop policy if exists "Anyone can submit a contractor profile" on public.contractor_profiles;
create policy "Anyone can submit a contractor profile"
on public.contractor_profiles for insert to anon, authenticated
with check (
  char_length(legal_name) > 0
  and char_length(email::text) > 2
  and char_length(phone) >= 7
  and char_length(home_base) > 0
  and char_length(primary_role) > 0
  and cardinality(services) > 0
  and cardinality(rate_types) > 0
  and char_length(experience_summary) >= 40
);

drop policy if exists "Admins can read contractor profiles" on public.contractor_profiles;
create policy "Admins can read contractor profiles" on public.contractor_profiles
for select to authenticated using (public.is_parti_admin());

drop policy if exists "Admins can update contractor profiles" on public.contractor_profiles;
create policy "Admins can update contractor profiles" on public.contractor_profiles
for update to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());
