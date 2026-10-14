-- PARTI independent talent intake. Safe to run more than once.

create table if not exists public.contractor_profiles (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('CREW-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))),
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
returns trigger language plpgsql security definer set search_path = public as $$
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
create trigger prepare_contractor_profile_trigger before insert on public.contractor_profiles
for each row execute function public.prepare_contractor_profile();

drop trigger if exists touch_contractor_profiles_updated_at on public.contractor_profiles;
create trigger touch_contractor_profiles_updated_at before update on public.contractor_profiles
for each row execute function public.touch_parti_updated_at();

alter table public.contractor_profiles enable row level security;
grant insert on public.contractor_profiles to anon, authenticated;
grant select, update on public.contractor_profiles to authenticated;

drop policy if exists "Anyone can submit a contractor profile" on public.contractor_profiles;
create policy "Anyone can submit a contractor profile" on public.contractor_profiles for insert to anon, authenticated
with check (char_length(legal_name) > 0 and char_length(email::text) > 2 and char_length(phone) >= 7 and char_length(home_base) > 0 and char_length(primary_role) > 0 and cardinality(services) > 0 and cardinality(rate_types) > 0 and char_length(experience_summary) >= 40);

drop policy if exists "Admins can read contractor profiles" on public.contractor_profiles;
create policy "Admins can read contractor profiles" on public.contractor_profiles
for select to authenticated using (public.is_parti_admin());

drop policy if exists "Admins can update contractor profiles" on public.contractor_profiles;
create policy "Admins can update contractor profiles" on public.contractor_profiles
for update to authenticated using (public.is_parti_admin()) with check (public.is_parti_admin());
