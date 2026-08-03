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

-- ══════════════════════════════════════════════════════════════
--  EXTENDED SCHEMA — Member Portal Tables
-- ══════════════════════════════════════════════════════════════

-- ── 9. SHOP TOOLS ────────────────────────────────────────────
create table public.shop_tools (
  id            uuid default uuid_generate_v4() primary key,
  name          text not null,
  description   text,
  image_url     text,
  video_url     text,
  category_slug text default 'shared' check (category_slug in ('shared','private','bundle')),
  is_active     boolean default true,
  sort_order    int  default 0,
  created_at    timestamptz default now()
);

-- ── 10. MEMBERS ──────────────────────────────────────────────
create table public.members (
  id                 uuid default uuid_generate_v4() primary key,
  email              text not null unique,
  full_name          text,
  member_code        text unique,
  plan_slug          text default 'basic' check (plan_slug in ('basic','vip','private')),
  avatar_url         text,
  device_fingerprint text,
  is_active          boolean default true,
  created_at         timestamptz default now()
);

-- ── 11. TOOL PURCHASES ───────────────────────────────────────
create table public.tool_purchases (
  id             uuid default uuid_generate_v4() primary key,
  member_id      uuid references public.members(id) on delete cascade,
  shop_tool_id   uuid references public.shop_tools(id),
  tool_name      text,
  duration_label text,
  amount_egp     numeric(10,2),
  payment_method text,
  status         text default 'pending' check (status in ('pending','confirmed','cancelled','expired')),
  expires_at     timestamptz,
  created_at     timestamptz default now()
);
create index on public.tool_purchases(member_id, status);

-- ── 12. TOOL SERVERS ─────────────────────────────────────────
create table public.tool_servers (
  id                      uuid default uuid_generate_v4() primary key,
  shop_tool_id            uuid references public.shop_tools(id),
  tool_name               text not null,
  server_label            text not null,
  tier_required           text default 'basic' check (tier_required in ('basic','vip','private')),
  max_concurrent_users    int  default 1,
  session_data_encrypted  text,  -- JSON: { cookies, localStorage, indexedDB }
  proxy_host              text,
  proxy_port              int,
  proxy_username          text,
  proxy_password_encrypted text,
  status                  text default 'active' check (status in ('active','inactive','maintenance')),
  created_at              timestamptz default now()
);
create index on public.tool_servers(shop_tool_id, status);

-- ── 13. USER SERVER SESSIONS ─────────────────────────────────
create table public.user_server_sessions (
  id                 uuid default uuid_generate_v4() primary key,
  user_id            uuid references public.members(id) on delete cascade,
  server_id          uuid references public.tool_servers(id) on delete cascade,
  status             text default 'active' check (status in ('active','expired','cancelled')),
  device_fingerprint text,
  started_at         timestamptz default now(),
  last_active_at     timestamptz default now(),
  expires_at         timestamptz
);
-- Critical index: used in every session check and concurrent-user count
create index on public.user_server_sessions(user_id, status, expires_at);
create index on public.user_server_sessions(server_id, status, expires_at);

-- ── 14. SERVER USAGE LOGS (Audit Trail) ──────────────────────
create table public.server_usage_logs (
  id                 uuid default uuid_generate_v4() primary key,
  member_id          uuid references public.members(id),
  server_id          uuid references public.tool_servers(id),
  session_id         uuid,
  action             text not null,  -- connect, disconnect, keepalive, session_reuse
  ip_address         text,
  user_agent         text,
  device_fingerprint text,
  tool_name          text,
  server_label       text,
  meta               jsonb default '{}',
  created_at         timestamptz default now()
);
create index on public.server_usage_logs(member_id, created_at desc);

-- ── 15. PAYMENTS ─────────────────────────────────────────────
create table public.payments (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.members(id) on delete cascade,
  amount         numeric(10,2) not null,
  currency       text default 'egp',
  gateway        text,  -- instapay, vodafone, coupon, etc.
  status         text default 'pending' check (status in ('pending','completed','failed','refunded')),
  credits        numeric(10,2),
  pack_id        uuid references public.shop_tools(id),
  transaction_id text,
  created_at     timestamptz default now()
);
create index on public.payments(user_id, status);

-- ── 16. ACCOUNT DELIVERIES ───────────────────────────────────
create table public.account_deliveries (
  id            uuid default uuid_generate_v4() primary key,
  purchase_id   uuid references public.tool_purchases(id) on delete cascade unique,
  delivery_type text check (delivery_type in ('account','key')),
  email         text,
  password_enc  text,
  key_enc       text,
  notes         text,
  source        text default 'manual' check (source in ('manual','stock')),
  delivered_at  timestamptz default now(),
  viewed_at     timestamptz
);

-- ── 17. MEMBER NOTIFICATIONS ─────────────────────────────────
create table public.member_notifications (
  id         uuid default uuid_generate_v4() primary key,
  member_id  uuid references public.members(id) on delete cascade,
  title      text,
  title_en   text,
  message    text,
  message_en text,
  type       text default 'info' check (type in ('info','success','warning','error')),
  is_read    boolean default false,
  created_at timestamptz default now()
);
create index on public.member_notifications(member_id, is_read, created_at desc);

-- ── 18. SUPPORT TICKETS ──────────────────────────────────────
create table public.support_tickets (
  id         uuid default uuid_generate_v4() primary key,
  member_id  uuid references public.members(id) on delete cascade,
  subject    text not null,
  message    text not null,
  priority   text default 'normal' check (priority in ('low','normal','high','urgent')),
  category   text default 'general' check (category in ('general','subscription','payment')),
  status     text default 'open' check (status in ('open','in_progress','resolved','closed')),
  reply      text,
  replied_by uuid,
  replied_at timestamptz,
  created_at timestamptz default now()
);
create index on public.support_tickets(member_id, status);
create index on public.support_tickets(status, created_at desc);

create table public.ticket_messages (
  id            uuid default uuid_generate_v4() primary key,
  ticket_id     uuid references public.support_tickets(id) on delete cascade,
  sender_type   text check (sender_type in ('member','admin')),
  message       text not null,
  sender_name   text,
  sender_avatar text,
  created_at    timestamptz default now()
);
create index on public.ticket_messages(ticket_id, created_at);

create table public.ticket_attachments (
  id          uuid default uuid_generate_v4() primary key,
  ticket_id   uuid references public.support_tickets(id) on delete cascade,
  file_path   text not null,
  file_name   text,
  file_type   text,
  file_size   bigint,
  uploaded_by text check (uploaded_by in ('member','admin')),
  created_at  timestamptz default now()
);

-- ── 19. RPC STUBS (reference only — implement in Supabase SQL editor) ──
-- create or replace function public.member_login(p_email text, p_password text, p_ip text, p_ua text)
--   returns jsonb language plpgsql security definer as $$ ... $$;
--
-- create or replace function public.verify_member_session(p_token text)
--   returns jsonb language plpgsql security definer as $$ ... $$;

-- Dashboard KPIs
create view public.dashboard_kpis as
select
  (select count(*) from public.subscriptions where status = 'active')           as active_count,
  (select count(*) from public.subscriptions where status = 'expired')          as expired_count,
  (select count(*) from public.subscriptions where end_date between current_date and current_date + 7 and status = 'active') as expiring_7d,
  (select count(*) from public.customers)                                        as total_customers,
  (select coalesce(sum(amount_egp),0) from public.transactions where type='income' and date_trunc('month',transaction_date)=date_trunc('month',current_date)) as revenue_this_month,
  (select coalesce(sum(amount_egp),0) from public.transactions where type='expense' and date_trunc('month',transaction_date)=date_trunc('month',current_date)) as expenses_this_month;

