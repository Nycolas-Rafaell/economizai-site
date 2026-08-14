-- Execute uma vez no SQL Editor do Supabase.
create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, offer_id)
);

create index if not exists user_favorites_user_created_idx
  on public.user_favorites (user_id, created_at desc);

alter table public.user_favorites enable row level security;

-- O servidor usa a chave secreta e valida a sessão antes de alterar favoritos.
-- Estas políticas também permitem o uso seguro da tabela pelo usuário autenticado no futuro.
drop policy if exists "Usuário vê os próprios favoritos" on public.user_favorites;
create policy "Usuário vê os próprios favoritos" on public.user_favorites
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Usuário inclui os próprios favoritos" on public.user_favorites;
create policy "Usuário inclui os próprios favoritos" on public.user_favorites
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Usuário remove os próprios favoritos" on public.user_favorites;
create policy "Usuário remove os próprios favoritos" on public.user_favorites
  for delete to authenticated using (auth.uid() = user_id);
