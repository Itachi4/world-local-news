-- Store email digest preferences for users and anonymous subscribers
create table if not exists public.digest_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  user_id uuid null,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  categories text[] not null default array['general']::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_digest_subscriptions_email on public.digest_subscriptions (email);
create index if not exists idx_digest_subscriptions_active on public.digest_subscriptions (is_active);
create index if not exists idx_digest_subscriptions_frequency on public.digest_subscriptions (frequency);

alter table public.digest_subscriptions enable row level security;

-- Public can create/update their own email subscription preferences from the web app.
create policy "Digest subscriptions are insertable by anyone"
on public.digest_subscriptions
for insert
with check (true);

create policy "Digest subscriptions are updatable by anyone"
on public.digest_subscriptions
for update
using (true)
with check (true);

create policy "Digest subscriptions are selectable by service role only"
on public.digest_subscriptions
for select
using (false);

do $$
begin
  if not exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
  ) then
    create function public.update_updated_at_column()
    returns trigger as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$ language plpgsql set search_path = public;
  end if;
end $$;

-- Keep updated_at current on every update
create trigger set_digest_subscriptions_updated_at
before update on public.digest_subscriptions
for each row
execute function public.update_updated_at_column();
