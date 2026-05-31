-- =============================================================================
-- Run this entire file in the Supabase SQL Editor (once, on a fresh project).
-- Dashboard → SQL Editor → New query → paste → Run
-- =============================================================================

-- 1. profiles ─────────────────────────────────────────────────────────────────
-- Extends auth.users with a username and a role field.

create table public.profiles (
  id         uuid references auth.users on delete cascade primary key,
  username   text not null default '',
  role       text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. solutions ────────────────────────────────────────────────────────────────
-- One row per submitted solution. No status column — everything is live immediately.

create table public.solutions (
  id          uuid default gen_random_uuid() primary key,
  book_id     text not null,
  page_number int  not null,
  question    text not null,
  explanation text not null,
  answer      text not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  created_at  timestamptz default now()
);

create index solutions_book_page_idx on public.solutions (book_id, page_number);


-- 3. Row-Level Security ───────────────────────────────────────────────────────

alter table public.profiles  enable row level security;
alter table public.solutions enable row level security;

-- profiles: anyone can read, owners can update their own row
create policy "Public profiles read"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- solutions: anyone can read all
create policy "Public solutions read"
  on public.solutions for select using (true);

-- solutions: authenticated users can insert (must set their own user_id)
create policy "Authenticated users can insert"
  on public.solutions for insert to authenticated
  with check (auth.uid() = user_id);

-- solutions: users can delete their own entries
create policy "Users delete own solutions"
  on public.solutions for delete
  using (auth.uid() = user_id);

-- solutions: admin can delete any entry
create policy "Admins delete any solution"
  on public.solutions for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );


-- =============================================================================
-- After running this migration:
-- 1. Register your admin account on the site.
-- 2. In Supabase: Table Editor → profiles → find your row → set role = 'admin'
-- =============================================================================
