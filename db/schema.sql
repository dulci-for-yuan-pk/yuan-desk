-- ============================================================
-- Yuan Desk — database
-- Two hard-separated schemas:
--   desk : his private books and the agent operations tables
--   web  : only what the public yuan.pk form is allowed to write
--
-- Security stance: deny by default. RLS is on for every table with
-- NO policies, so the anon and authenticated roles can read nothing.
-- Only the service-role key (which lives in Netlify env vars, never in
-- the browser) bypasses RLS. The app's phone-side code never holds a key.
-- ============================================================

create schema if not exists desk;
create schema if not exists web;

-- Nothing public gets in through these schemas.
revoke all on schema desk from anon, authenticated;
revoke all on schema web  from anon, authenticated;
grant usage on schema desk to service_role;
grant usage on schema web  to service_role;

create extension if not exists "pgcrypto";

-- ---------- shared helper: keep updated_at honest ----------
create or replace function desk.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- PARTIES — customers and suppliers in one book, as a trader keeps them
-- ============================================================
create table if not exists desk.parties (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('customer','supplier')),
  name         text not null,
  city         text,
  phone        text,
  market       text,                       -- Yiwu district, for suppliers
  category     text,
  contact      text,                       -- WeChat / WhatsApp
  notes        text,
  opening      numeric(14,2) not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists parties_kind_name_uniq on desk.parties (kind, lower(name));

-- ============================================================
-- ORDERS — what his buyers have asked for
-- ============================================================
create table if not exists desk.orders (
  id           uuid primary key default gen_random_uuid(),
  no           text,
  order_date   date not null default current_date,
  party_id     uuid references desk.parties(id) on delete set null,
  party_name   text,
  city         text,
  phone        text,
  item         text,
  qty          numeric(14,2),
  value        numeric(14,2),
  status       text not null default 'new'
               check (status in ('new','quoted','approved','shipped','done','cancelled')),
  source       text not null default 'manual'
               check (source in ('manual','web','whatsapp','dulci')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists orders_status_idx on desk.orders (status);
create index if not exists orders_party_idx  on desk.orders (party_name);

-- ============================================================
-- INVOICES — numbered, with lines, exactly as his bill book worked
-- ============================================================
create table if not exists desk.invoices (
  id           uuid primary key default gen_random_uuid(),
  no           text not null,
  inv_date     date not null default current_date,
  due_date     date,
  party_id     uuid references desk.parties(id) on delete set null,
  party_name   text,
  discount     numeric(14,2) not null default 0,
  tax_pct      numeric(6,3)  not null default 0,
  advance      numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists invoices_no_uniq on desk.invoices (no);

create table if not exists desk.invoice_lines (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references desk.invoices(id) on delete cascade,
  item         text,
  qty          numeric(14,2) not null default 0,
  rate         numeric(14,2) not null default 0,
  sort         int not null default 0
);
create index if not exists invoice_lines_inv_idx on desk.invoice_lines (invoice_id);

-- ============================================================
-- PAYMENTS — money actually received or actually paid
-- ============================================================
create table if not exists desk.payments (
  id           uuid primary key default gen_random_uuid(),
  pay_date     date not null default current_date,
  party_id     uuid references desk.parties(id) on delete set null,
  party_name   text,
  party_kind   text check (party_kind in ('customer','supplier')),
  dir          text not null check (dir in ('in','out')),
  amount       numeric(14,2) not null default 0,
  method       text,
  invoice_no   text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists payments_party_idx on desk.payments (party_name);
create index if not exists payments_inv_idx   on desk.payments (invoice_no);

-- ============================================================
-- LEDGER — the cash book: everything in and out that is not a party payment
-- ============================================================
create table if not exists desk.ledger (
  id           uuid primary key default gen_random_uuid(),
  entry_date   date not null default current_date,
  dir          text not null check (dir in ('in','out')),
  amount       numeric(14,2) not null default 0,
  category     text,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists ledger_date_idx on desk.ledger (entry_date);

-- ============================================================
-- STOCK — the stock register, plus a movement history
-- ============================================================
create table if not exists desk.stock (
  id           uuid primary key default gen_random_uuid(),
  item         text not null,
  unit         text,
  in_qty       numeric(14,2) not null default 0,
  out_qty      numeric(14,2) not null default 0,
  unit_cost    numeric(14,2) not null default 0,
  sale_price   numeric(14,2) not null default 0,
  reorder      numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists desk.stock_moves (
  id           uuid primary key default gen_random_uuid(),
  stock_id     uuid references desk.stock(id) on delete cascade,
  move_date    date not null default current_date,
  dir          text not null check (dir in ('in','out')),
  qty          numeric(14,2) not null default 0,
  rate         numeric(14,2) not null default 0,
  ref          text,
  note         text,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- SHIPMENTS — a purchase on its way from Yiwu, with landed cost parts
-- ============================================================
create table if not exists desk.shipments (
  id            uuid primary key default gen_random_uuid(),
  no            text,
  supplier_id   uuid references desk.parties(id) on delete set null,
  supplier_name text,
  item          text,
  cost          numeric(14,2) not null default 0,   -- goods, in PKR
  freight       numeric(14,2) not null default 0,
  duty          numeric(14,2) not null default 0,
  clearing      numeric(14,2) not null default 0,
  awb           text,
  ship_date     date,
  eta           date,
  status        text not null default 'planned'
                check (status in ('planned','booked','sailing','port','cleared','delivered')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TRIPS and the sourcing plan built from the order book
-- ============================================================
create table if not exists desk.trips (
  id           uuid primary key default gen_random_uuid(),
  city         text not null default 'Yiwu',
  from_date    date,
  to_date      date,
  status       text not null default 'planning'
               check (status in ('planning','booked','travelling','done')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists desk.sourcing_plan (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid references desk.trips(id) on delete cascade,
  district      text,
  item          text,
  qty           numeric(14,2),
  target_cny    numeric(14,2),
  quoted_cny    numeric(14,2),
  supplier_name text,
  order_no      text,
  status        text not null default 'todo'
                check (status in ('todo','visited','quoted','bought','skipped')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists sourcing_trip_idx on desk.sourcing_plan (trip_id);

-- ============================================================
-- CONTENT — posts and videos waiting for his one tap
-- ============================================================
create table if not exists desk.content_items (
  id           uuid primary key default gen_random_uuid(),
  title        text,
  platform     text,
  status       text not null default 'draft'
               check (status in ('draft','ready','scheduled','published')),
  caption      text,
  media_url    text,
  thumb_url    text,
  scheduled_at timestamptz,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- AGENT OPERATIONS — this is what makes it an operations desk
-- ============================================================

-- what he said and what DULCi said
create table if not exists desk.conversation (
  id           bigserial primary key,
  role         text not null check (role in ('me','ag','sys')),
  text         text,
  image_url    text,
  audio_url    text,
  lang         text default 'ur',
  created_at   timestamptz not null default now()
);
create index if not exists conversation_created_idx on desk.conversation (created_at desc);

-- the app's inbox: replies, browser handoffs, record pushes, notes
create table if not exists desk.events (
  seq          bigserial primary key,
  kind         text not null,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

-- every DULCi job, what it did, what it cost
create table if not exists desk.runs (
  id           uuid primary key default gen_random_uuid(),
  kind         text,                       -- chat | schedule | webhook | trip-plan | content
  title        text,
  summary      text,
  status       text not null default 'running'
               check (status in ('running','done','failed','cancelled')),
  cost_usd     numeric(10,4),
  thread_url   text,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz
);
create index if not exists runs_started_idx on desk.runs (started_at desc);

-- anything DULCi may not finish alone waits here for one tap
create table if not exists desk.approvals (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,              -- publish | post | submit | payment | message
  title_ur     text, title_en text,
  detail_ur    text, detail_en text,
  amount       numeric(14,2),
  preview_url  text,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending'
               check (status in ('pending','approved','rejected','expired')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz
);
create index if not exists approvals_status_idx on desk.approvals (status, created_at desc);

-- what he asked for, with honest live status instead of silence
create table if not exists desk.tasks (
  id           uuid primary key default gen_random_uuid(),
  title_ur     text, title_en text,
  detail       text,
  status       text not null default 'queued'
               check (status in ('queued','working','blocked','done','failed')),
  progress     int not null default 0,
  blocked_why  text,
  run_id       uuid references desk.runs(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists tasks_status_idx on desk.tasks (status, created_at desc);

-- business details, fx rate, his preferences
create table if not exists desk.settings (
  key          text primary key,
  value        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- WEB — the only thing the public site may write into
-- ============================================================
create table if not exists web.enquiries (
  id           uuid primary key default gen_random_uuid(),
  name         text,
  phone        text,
  city         text,
  item         text,
  qty          text,
  message      text,
  source       text default 'yuan.pk',
  status       text not null default 'new'
               check (status in ('new','seen','quoted','ordered','closed')),
  promoted_order_id uuid,                  -- set when it becomes a real order
  created_at   timestamptz not null default now()
);
create index if not exists enquiries_status_idx on web.enquiries (status, created_at desc);

-- ============================================================
-- OFFLINE SYNC — every syncable row carries the id his phone generated,
-- so a record created with no signal in a Yiwu market lands exactly once.
-- ============================================================
do $$
declare r text;
begin
  foreach r in array array['parties','orders','invoices','payments','ledger',
                           'stock','shipments','trips','content_items','sourcing_plan']
  loop
    execute format('alter table desk.%I add column if not exists client_id text', r);
    execute format('create unique index if not exists %1$s_client_uniq
                    on desk.%1$I (client_id) where client_id is not null', r);
    execute format('alter table desk.%I add column if not exists deleted_at timestamptz', r);
  end loop;
end $$;

-- ============================================================
-- VIEWS — the arithmetic lives in the database so every reader agrees
-- ============================================================
create or replace view desk.v_invoice_totals as
select i.id, i.no, i.inv_date, i.due_date, i.party_name,
       coalesce(l.subtotal, 0) as subtotal,
       i.discount, i.tax_pct,
       round((coalesce(l.subtotal,0) - i.discount) * i.tax_pct / 100, 2) as tax_amount,
       round(coalesce(l.subtotal,0) - i.discount
             + (coalesce(l.subtotal,0) - i.discount) * i.tax_pct / 100, 2) as total,
       i.advance + coalesce(p.paid, 0) as paid,
       round(coalesce(l.subtotal,0) - i.discount
             + (coalesce(l.subtotal,0) - i.discount) * i.tax_pct / 100
             - i.advance - coalesce(p.paid,0), 2) as balance
from desk.invoices i
left join (
  select invoice_id, sum(qty * rate) as subtotal
  from desk.invoice_lines group by invoice_id
) l on l.invoice_id = i.id
left join (
  select invoice_no, sum(amount) as paid
  from desk.payments where dir = 'in' group by invoice_no
) p on p.invoice_no = i.no;

-- receivable per customer, payable per supplier
create or replace view desk.v_party_balance as
with inv as (
  select party_name, sum(total) as billed
  from desk.v_invoice_totals group by party_name
), pay as (
  select party_name, party_kind,
         sum(case when dir = 'in'  then amount else 0 end) as received,
         sum(case when dir = 'out' then amount else 0 end) as paid_out
  from desk.payments group by party_name, party_kind
), buy as (
  select supplier_name as party_name, sum(cost + freight + duty + clearing) as purchased
  from desk.shipments group by supplier_name
)
select p.id, p.kind, p.name,
       case when p.kind = 'customer'
            then p.opening + coalesce(i.billed,0) - coalesce(y.received,0)
            else p.opening + coalesce(b.purchased,0) - coalesce(y.paid_out,0)
       end as balance
from desk.parties p
left join inv i on lower(i.party_name) = lower(p.name)
left join pay y on lower(y.party_name) = lower(p.name)
left join buy b on lower(b.party_name) = lower(p.name);

create or replace view desk.v_cash as
select coalesce(sum(case when dir = 'in' then amount else -amount end), 0) as balance
from (
  select dir, amount from desk.ledger
  union all
  select dir, amount from desk.payments
) t;

-- ============================================================
-- LOCK IT DOWN — RLS on, no policies, service_role only
-- ============================================================
do $$
declare r record;
begin
  for r in
    select schemaname, tablename from pg_tables
    where schemaname in ('desk','web')
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    execute format('alter table %I.%I force row level security',  r.schemaname, r.tablename);
    execute format('revoke all on %I.%I from anon, authenticated', r.schemaname, r.tablename);
    execute format('grant all on %I.%I to service_role', r.schemaname, r.tablename);
  end loop;
end $$;

grant usage, select on all sequences in schema desk to service_role;
grant usage, select on all sequences in schema web  to service_role;
grant select on desk.v_invoice_totals, desk.v_party_balance, desk.v_cash to service_role;

-- updated_at triggers
do $$
declare r record;
begin
  for r in
    select c.relname as t, n.nspname as s
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attname = 'updated_at'
    where n.nspname in ('desk','web') and c.relkind = 'r'
  loop
    execute format(
      'drop trigger if exists touch_%1$s on %2$I.%1$I;
       create trigger touch_%1$s before update on %2$I.%1$I
       for each row execute function desk.touch_updated_at()', r.t, r.s);
  end loop;
end $$;

-- ============================================================
-- Seed his business details
-- ============================================================
insert into desk.settings (key, value) values
  ('business', jsonb_build_object(
     'name','Mirza Javaid Iqbal',
     'trade','Yuan.pk — China Sourcing & Import',
     'city','Multan, Pakistan',
     'phone','+92 300 630 7380',
     'web','yuan.pk')),
  ('fx', jsonb_build_object('pkr_per_cny', 40))
on conflict (key) do nothing;
