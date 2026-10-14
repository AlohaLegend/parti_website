-- PARTI employee candidate intake. Safe to run more than once.

create table if not exists public.employee_intakes (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('CAREER-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
  legal_name text not null check (char_length(legal_name) between 1 and 140),
  preferred_name text check (preferred_name is null or char_length(preferred_name) <= 100),
  email citext not null check (char_length(email::text) between 3 and 180),
  phone text not null check (char_length(phone) between 7 and 40),
  location text not null check (char_length(location) between 1 and 180),
  profile_url text check (profile_url is null or char_length(profile_url) <= 500),
  role_title text not null check (char_length(role_title) between 1 and 180),
  employment_type text not null check (employment_type in ('full_time','part_time','either')),
  worked_with_parti boolean not null default false,
  parti_capacity text check (parti_capacity is null or char_length(parti_capacity) <= 500),
  start_date date not null,
  role_questions text check (role_questions is null or char_length(role_questions) <= 2000),
  role_snapshot jsonb not null default '{}'::jsonb,
  contribution jsonb not null default '{}'::jsonb,
  compensation jsonb not null default '{}'::jsonb,
  working_conditions jsonb not null default '{}'::jsonb,
  decision_factors jsonb not null default '{}'::jsonb,
  attribution jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','reviewing','needs_info','terms_review','offer_ready','hold','closed')),
  review_decision text not null default 'unreviewed' check (review_decision in ('unreviewed','approved_now','review_later','not_approved')),
  review_owner text not null default '',
  review_date date,
  review_prerequisite text not null default '',
  review_explanation text not null default '',
  internal_notes text not null default '',
  submitted_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists employee_intakes_submitted_at_idx on public.employee_intakes (submitted_at desc);
create index if not exists employee_intakes_status_idx on public.employee_intakes (status);
create index if not exists employee_intakes_email_idx on public.employee_intakes (email);

create or replace function public.prepare_employee_intake()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.status := 'new';
  new.review_decision := 'unreviewed';
  new.review_owner := '';
  new.review_date := null;
  new.review_prerequisite := '';
  new.review_explanation := '';
  new.internal_notes := '';
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists prepare_employee_intake_trigger on public.employee_intakes;
create trigger prepare_employee_intake_trigger before insert on public.employee_intakes
for each row execute function public.prepare_employee_intake();

drop trigger if exists touch_employee_intakes_updated_at on public.employee_intakes;
create trigger touch_employee_intakes_updated_at before update on public.employee_intakes
for each row execute function public.touch_parti_updated_at();

alter table public.employee_intakes enable row level security;
grant insert on public.employee_intakes to anon, authenticated;
grant select, update on public.employee_intakes to authenticated;

drop policy if exists "Anyone can submit an employee intake" on public.employee_intakes;
create policy "Anyone can submit an employee intake" on public.employee_intakes for insert to anon, authenticated
with check (
  char_length(legal_name) > 0
  and char_length(email::text) > 2
  and char_length(phone) >= 7
  and char_length(location) > 0
  and char_length(role_title) > 0
  and employment_type in ('full_time','part_time','either')
  and char_length(coalesce(contribution->>'day_one_ownership', '')) >= 40
  and jsonb_array_length(coalesce(compensation->'priorities', '[]'::jsonb)) between 1 and 5
  and char_length(coalesce(decision_factors->>'say_yes', '')) >= 20
);

drop policy if exists "Admins can read employee intakes" on public.employee_intakes;
create policy "Admins can read employee intakes" on public.employee_intakes
for select to authenticated using (public.is_parti_admin());

drop policy if exists "Admins can update employee intakes" on public.employee_intakes;
create policy "Admins can update employee intakes" on public.employee_intakes
for update to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());
