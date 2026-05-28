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
