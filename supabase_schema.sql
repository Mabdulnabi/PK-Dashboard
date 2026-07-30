-- ══════════════════════════════════════════════════════════════
--  PRO KEYS — Supabase Database Schema
-- ══════════════════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. PROFILES (linked to auth.users) ──────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  role        text default 'member' check (role in ('admin','member')),
  avatar_url  text,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── 2. PRODUCTS (QuillBot, Grammarly, etc.) ─────────────────
create table public.products (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  color       text default '#EF4444',
  icon        text default 'apps',
  is_active   boolean default true,
  created_at  timestamptz default now()
);
alter table public.products enable row level security;
create policy "All authenticated users can view products" on public.products for select using (auth.role() = 'authenticated');
create policy "Admins can manage products" on public.products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Seed products
insert into public.products (name, color, icon) values
  ('QuillBot',         '#10B981', 'pencil'),
  ('Grammarly',        '#3B82F6', 'letter-case'),
  ('Turnitin',         '#8B5CF6', 'file-check'),
  ('Canva Pro',        '#00C4CC', 'photo'),
  ('Gemini Pro',       '#6366F1', 'sparkles'),
  ('Perplexity',       '#F59E0B', 'search'),
  ('GO Plus',          '#EF4444', 'circle-plus'),
  ('SciSpace',         '#14B8A6', 'microscope'),
  ('ChatGPT Plus',     '#10A37F', 'message-circle'),
  ('Gamma Pro',        '#EC4899', 'presentation');

-- ── 3. MY ACCOUNTS (shared credentials) ─────────────────────
create table public.my_accounts (
  id          uuid default uuid_generate_v4() primary key,
  product_id  uuid references public.products(id) on delete cascade,
  email       text not null,
  password    text not null,
  edu_account text,
  total_slots int  default 1,
  used_slots  int  default 0,
  notes       text,
  is_active   boolean default true,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);
alter table public.my_accounts enable row level security;
create policy "Authenticated users can view accounts" on public.my_accounts for select using (auth.role() = 'authenticated');
create policy "Admins can manage accounts" on public.my_accounts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── 4. CUSTOMERS ─────────────────────────────────────────────
create table public.customers (
  id           uuid default uuid_generate_v4() primary key,
  full_name    text not null,
  phone        text,
  email        text,
  telegram     text,
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now()
);
alter table public.customers enable row level security;
create policy "Authenticated users can view customers" on public.customers for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert customers" on public.customers for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update customers" on public.customers for update using (auth.role() = 'authenticated');

-- ── 5. SUBSCRIPTIONS ─────────────────────────────────────────
create table public.subscriptions (
  id            uuid default uuid_generate_v4() primary key,
  customer_id   uuid references public.customers(id) on delete cascade,
  product_id    uuid references public.products(id),
  account_id    uuid references public.my_accounts(id),
  period        text check (period in ('1 Month','3 Months','6 Months','1 Year')),
  amount_egp    numeric(10,2),
  payment_method text check (payment_method in ('InstaPay','Vodafone Cash','Binance Pay','Bybit','BEP20','PayPal','Cash','Other')),
  start_date    date not null,
  end_date      date not null,
  status        text default 'active' check (status in ('active','expired','cancelled','pending')),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);
alter table public.subscriptions enable row level security;
create policy "Authenticated users can view subscriptions" on public.subscriptions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert subscriptions" on public.subscriptions for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update subscriptions" on public.subscriptions for update using (auth.role() = 'authenticated');

-- Auto-update status based on end_date
create or replace function public.update_subscription_status()
returns void language plpgsql security definer as $$
begin
  update public.subscriptions
  set status = case
    when end_date < current_date then 'expired'
    else 'active'
  end
  where status not in ('cancelled');
end;
$$;

-- ── 6. TRANSACTIONS (financial tracking) ─────────────────────
create table public.transactions (
  id              uuid default uuid_generate_v4() primary key,
  type            text check (type in ('income','expense')),
  amount_egp      numeric(10,2) not null,
  description     text,
  subscription_id uuid references public.subscriptions(id),
  product_id      uuid references public.products(id),
  payment_method  text,
  transaction_date date default current_date,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now()
);
alter table public.transactions enable row level security;
create policy "Authenticated users can view transactions" on public.transactions for select using (auth.role() = 'authenticated');
create policy "Authenticated users can insert transactions" on public.transactions for insert with check (auth.role() = 'authenticated');

-- ── 7. ALERT SETTINGS ────────────────────────────────────────
create table public.alert_settings (
  id                  uuid default uuid_generate_v4() primary key,
  user_id             uuid references auth.users(id),
  notify_days_before  int[] default '{3,7,14}',
  telegram_chat_id    text,
  email_enabled       boolean default true,
  telegram_enabled    boolean default false,
  created_at          timestamptz default now()
);
alter table public.alert_settings enable row level security;
create policy "Users manage own alert settings" on public.alert_settings for all using (auth.uid() = user_id);

-- ── 8. USEFUL VIEWS ──────────────────────────────────────────

-- Subscriptions with all details
create view public.subscriptions_full as
select
  s.id, s.start_date, s.end_date, s.status, s.period,
  s.amount_egp, s.payment_method, s.notes, s.created_at,
  c.full_name  as customer_name,
  c.phone      as customer_phone,
  c.email      as customer_email,
  p.name       as product_name,
  p.color      as product_color,
  a.email      as account_email,
  (s.end_date - current_date) as days_remaining
from public.subscriptions s
join public.customers c on c.id = s.customer_id
join public.products  p on p.id = s.product_id
left join public.my_accounts a on a.id = s.account_id;

-- Dashboard KPIs
create view public.dashboard_kpis as
select
  (select count(*) from public.subscriptions where status = 'active')           as active_count,
  (select count(*) from public.subscriptions where status = 'expired')          as expired_count,
  (select count(*) from public.subscriptions where end_date between current_date and current_date + 7 and status = 'active') as expiring_7d,
  (select count(*) from public.customers)                                        as total_customers,
  (select coalesce(sum(amount_egp),0) from public.transactions where type='income' and date_trunc('month',transaction_date)=date_trunc('month',current_date)) as revenue_this_month,
  (select coalesce(sum(amount_egp),0) from public.transactions where type='expense' and date_trunc('month',transaction_date)=date_trunc('month',current_date)) as expenses_this_month;

