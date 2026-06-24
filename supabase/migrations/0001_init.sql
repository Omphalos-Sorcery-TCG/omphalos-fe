-- Sorcery Omphalos — initial schema: user profiles + decks.
-- Apply by pasting into the Supabase dashboard SQL editor (Project → SQL Editor)
-- or via `supabase db push` if you link the project with the CLI.
--
-- Card data is static (served from /public), so only user-generated decks are
-- stored here. Row-Level Security scopes every row to its owning auth user.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.decks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  -- Card name of the chosen Avatar (cards are reference data, not FK'd here).
  avatar_card text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.deck_cards (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references public.decks (id) on delete cascade,
  card_name  text not null,
  section    text not null check (section in ('spellbook', 'atlas')),
  quantity   int  not null check (quantity between 1 and 99),
  unique (deck_id, card_name, section)
);

create index if not exists decks_user_id_idx     on public.decks (user_id);
create index if not exists deck_cards_deck_id_idx on public.deck_cards (deck_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists decks_touch_updated_at on public.decks;
create trigger decks_touch_updated_at
  before update on public.decks
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants
--
-- RLS only filters *rows*; a role still needs base table privileges to access
-- the table at all. Tables created via raw SQL don't get these automatically
-- (the dashboard table editor would). Only logged-in users manage decks, so we
-- grant to `authenticated` and leave `anon` without access.
-- ---------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.decks      to authenticated;
grant select, insert, update, delete on public.deck_cards to authenticated;
grant select, insert, update          on public.profiles   to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.decks      enable row level security;
alter table public.deck_cards enable row level security;

-- profiles: a user sees and edits only their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- decks: owner has full access
create policy "decks_select_own" on public.decks
  for select using (auth.uid() = user_id);
create policy "decks_insert_own" on public.decks
  for insert with check (auth.uid() = user_id);
create policy "decks_update_own" on public.decks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "decks_delete_own" on public.decks
  for delete using (auth.uid() = user_id);

-- deck_cards: access gated through ownership of the parent deck
create policy "deck_cards_select_own" on public.deck_cards
  for select using (
    exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );
create policy "deck_cards_modify_own" on public.deck_cards
  for all using (
    exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.decks d where d.id = deck_id and d.user_id = auth.uid())
  );
