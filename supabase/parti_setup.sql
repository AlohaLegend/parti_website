create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.site_content (key, value)
values ('projects', '{}'::jsonb)
on conflict (key) do nothing;

alter table public.site_content enable row level security;

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
using (key = 'projects')
with check (key = 'projects');

drop policy if exists "Authenticated admins can insert project content" on public.site_content;
create policy "Authenticated admins can insert project content"
on public.site_content
for insert
to authenticated
with check (key = 'projects');

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
with check (bucket_id = 'project-images');

drop policy if exists "Authenticated admins can update project images" on storage.objects;
create policy "Authenticated admins can update project images"
on storage.objects
for update
to authenticated
using (bucket_id = 'project-images')
with check (bucket_id = 'project-images');

drop policy if exists "Authenticated admins can delete project images" on storage.objects;
create policy "Authenticated admins can delete project images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'project-images');
