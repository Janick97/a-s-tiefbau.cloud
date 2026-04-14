-- =====================================================================
-- Supabase Auth + Profiles Migration for a-s-tiefbau.cloud
-- Run this ONCE in the Supabase SQL editor (Project -> SQL -> New query)
-- =====================================================================

-- 1) Profiles table: extends auth.users with app-specific fields
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  full_name    text,
  role         text not null default 'user'
                 check (role in ('admin','user')),
  position     text
                 check (position in ('Bauleiter','Monteur','Oberfläche','Büro') or position is null),
  phone        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_role_idx     on public.profiles(role);
create index if not exists profiles_position_idx on public.profiles(position);

-- 2) Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 3) Auto-create profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) Row Level Security
alter table public.profiles enable row level security;

-- Helper: current user is admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active = true
  );
$$;

-- SELECT: logged-in users can read all profiles (needed for dropdowns like Bauleiter-list)
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- UPDATE: own row OR admin
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (
    auth.uid() = id
    or public.is_admin()
  );

-- Prevent non-admins from elevating their own role/position/is_active
drop policy if exists "profiles_block_self_privilege_escalation" on public.profiles;
create policy "profiles_block_self_privilege_escalation"
  on public.profiles for update
  to authenticated
  using (true)
  with check (
    public.is_admin()
    or (
      role = (select role from public.profiles where id = auth.uid())
      and is_active = (select is_active from public.profiles where id = auth.uid())
    )
  );

-- INSERT: only admins can insert profiles directly (normal flow is via trigger)
drop policy if exists "profiles_insert_admin" on public.profiles;
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

-- DELETE: only admins
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- =====================================================================
-- AFTER RUNNING: create your first admin user manually
-- 1. Authentication -> Add user -> your email + password
-- 2. SQL Editor:
--      update public.profiles
--      set role = 'admin', position = 'Büro', full_name = 'Janick'
--      where email = 'your@email';
-- =====================================================================
