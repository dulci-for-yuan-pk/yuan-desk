-- ============================================================
-- Yuan Desk — the RPC gateway
--
-- Why this exists instead of a service-role key:
-- a service key can do anything to the whole database, and it would have to
-- be copied out of the dashboard by hand. This gives the app ONE function
-- with a fixed list of permitted actions and tables. The publishable key
-- alone is useless — every call must also carry the app secret, which lives
-- only in Netlify's environment variables.
--
-- So: a leaked page source leaks nothing, and a leaked publishable key
-- still cannot read a single row of his books.
-- ============================================================

-- Postgres 17 has sha256() built in, so no extension is needed and the
-- function works regardless of where pgcrypto happens to be installed.

-- the shared secret, stored hashed
create table if not exists desk.app_auth (
  id          int primary key default 1 check (id = 1),
  secret_hash text not null,
  rotated_at  timestamptz not null default now()
);
alter table desk.app_auth enable row level security;
revoke all on desk.app_auth from anon, authenticated;

create or replace function desk.set_app_secret(p_secret text)
returns void language sql security definer set search_path = desk, public as $$
  insert into desk.app_auth (id, secret_hash, rotated_at)
  values (1, encode(sha256(p_secret::bytea), 'hex'), now())
  on conflict (id) do update
    set secret_hash = encode(sha256(p_secret::bytea), 'hex'), rotated_at = now();
$$;

create or replace function desk.check_secret(p_secret text)
returns boolean language sql security definer stable set search_path = desk, public as $$
  select exists (
    select 1 from desk.app_auth
    where id = 1
      and secret_hash = encode(sha256(coalesce(p_secret, '')::bytea), 'hex')
  );
$$;

-- ---------- which tables the gateway may touch, and by which key ----------
create or replace function desk.allowed(p_table text)
returns text language sql immutable as $$
  select case p_table
    when 'parties' then 'client_id' when 'orders' then 'client_id'
    when 'invoices' then 'client_id' when 'payments' then 'client_id'
    when 'ledger' then 'client_id' when 'stock' then 'client_id'
    when 'shipments' then 'client_id' when 'trips' then 'client_id'
    when 'content_items' then 'client_id' when 'sourcing_plan' then 'client_id'
    when 'runs' then 'id' when 'tasks' then 'id' when 'approvals' then 'id'
    else null end;
$$;

-- ============================================================
-- The single entry point
-- ============================================================
create or replace function public.yd_call(p_secret text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = desk, public
as $fn$
declare
  v_tbl   text;
  v_key   text;
  v_cols  text;
  v_out   jsonb;
  v_id    uuid;
  v_seq   bigint;
begin
  if not desk.check_secret(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'unauthorised');
  end if;

  ------------------------------------------------------------------
  -- READ EVERYTHING (his books, in one round trip)
  ------------------------------------------------------------------
  if p_action = 'read_all' then
    return jsonb_build_object('ok', true, 'data', jsonb_build_object(
      'parties',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.parties where deleted_at is null
                      order by created_at desc limit 2000) x),
      'orders',    (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.orders where deleted_at is null
                      order by created_at desc limit 2000) x),
      'invoices',  (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('invoice_lines',
                      (select coalesce(jsonb_agg(to_jsonb(l) order by l.sort), '[]'::jsonb)
                       from desk.invoice_lines l where l.invoice_id = x.id))), '[]'::jsonb)
                    from (select * from desk.invoices where deleted_at is null
                          order by created_at desc limit 2000) x),
      'payments',  (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.payments where deleted_at is null
                      order by created_at desc limit 2000) x),
      'ledger',    (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.ledger where deleted_at is null
                      order by created_at desc limit 2000) x),
      'stock',     (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.stock where deleted_at is null
                      order by created_at desc limit 2000) x),
      'shipments', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.shipments where deleted_at is null
                      order by created_at desc limit 2000) x),
      'trips',     (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.trips where deleted_at is null
                      order by created_at desc limit 2000) x),
      'content_items', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.content_items where deleted_at is null
                      order by created_at desc limit 2000) x),
      'sourcing_plan', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                      select * from desk.sourcing_plan where deleted_at is null
                      order by created_at desc limit 500) x)
    ));
  end if;

  ------------------------------------------------------------------
  -- UPSERT one record into an allowed table
  ------------------------------------------------------------------
  if p_action = 'upsert' then
    v_tbl := p_payload->>'table';
    v_key := desk.allowed(v_tbl);
    if v_key is null then return jsonb_build_object('ok', false, 'error', 'table-not-allowed'); end if;

    -- only columns that actually exist on that table, and never these
    select string_agg(quote_ident(k), ', ') into v_cols
    from jsonb_object_keys(p_payload->'row') k
    where k in (select column_name from information_schema.columns
                where table_schema = 'desk' and table_name = v_tbl)
      and k not in ('created_at');
    if v_cols is null then return jsonb_build_object('ok', false, 'error', 'no-columns'); end if;

    execute format(
      'update desk.%1$I t set (%2$s) = (select %2$s from
         jsonb_populate_record(null::desk.%1$I, $1)) where t.%3$I::text = $2 returning to_jsonb(t)',
      v_tbl, v_cols, v_key)
      into v_out using p_payload->'row', p_payload->'row'->>v_key;

    if v_out is null then
      execute format(
        'insert into desk.%1$I as t (%2$s) select %2$s from
           jsonb_populate_record(null::desk.%1$I, $1) returning to_jsonb(t)',
        v_tbl, v_cols)
        into v_out using p_payload->'row';
    end if;
    return jsonb_build_object('ok', true, 'row', v_out);
  end if;

  ------------------------------------------------------------------
  -- INVOICE LINES — replaced wholesale, because an invoice is one document
  ------------------------------------------------------------------
  if p_action = 'set_lines' then
    v_id := (p_payload->>'invoice_id')::uuid;
    delete from desk.invoice_lines where invoice_id = v_id;
    insert into desk.invoice_lines (invoice_id, item, qty, rate, sort)
    select v_id, l->>'item', coalesce((l->>'qty')::numeric, 0),
           coalesce((l->>'rate')::numeric, 0), coalesce((l->>'sort')::int, 0)
    from jsonb_array_elements(coalesce(p_payload->'lines', '[]'::jsonb)) l;
    return jsonb_build_object('ok', true);
  end if;

  ------------------------------------------------------------------
  -- SOFT DELETE — a stale phone must never resurrect a deleted row
  ------------------------------------------------------------------
  if p_action = 'soft_delete' then
    v_tbl := p_payload->>'table';
    v_key := desk.allowed(v_tbl);
    if v_key is null then return jsonb_build_object('ok', false, 'error', 'table-not-allowed'); end if;
    execute format('update desk.%I set deleted_at = now() where %I::text = $1', v_tbl, v_key)
      using p_payload->>'id';
    return jsonb_build_object('ok', true);
  end if;

  ------------------------------------------------------------------
  -- EVENTS — the app's inbox from DULCi
  ------------------------------------------------------------------
  if p_action = 'append_event' then
    insert into desk.events (kind, payload)
    values (p_payload->>'kind', coalesce(p_payload->'payload', '{}'::jsonb))
    returning seq into v_seq;
    return jsonb_build_object('ok', true, 'seq', v_seq);
  end if;

  if p_action = 'events_since' then
    return jsonb_build_object('ok', true, 'events', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.seq), '[]'::jsonb) from (
        select seq, kind, payload, created_at from desk.events
        where seq > coalesce((p_payload->>'since')::bigint, 0)
        order by seq limit 200) x));
  end if;

  ------------------------------------------------------------------
  -- CONVERSATION
  ------------------------------------------------------------------
  if p_action = 'append_message' then
    insert into desk.conversation (role, text, image_url, audio_url, lang)
    values (coalesce(p_payload->>'role', 'me'), p_payload->>'text',
            p_payload->>'image_url', p_payload->>'audio_url',
            coalesce(p_payload->>'lang', 'ur'));
    return jsonb_build_object('ok', true);
  end if;

  if p_action = 'messages' then
    return jsonb_build_object('ok', true, 'messages', (
      select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb) from (
        select * from desk.conversation order by created_at desc
        limit coalesce((p_payload->>'limit')::int, 40)) x));
  end if;

  ------------------------------------------------------------------
  -- OPERATIONS DESK
  ------------------------------------------------------------------
  if p_action = 'ops' then
    return jsonb_build_object('ok', true,
      'runs', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                 select * from desk.runs order by started_at desc limit 40) x),
      'approvals', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                 select * from desk.approvals order by created_at desc limit 40) x),
      'tasks', (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
                 select * from desk.tasks order by created_at desc limit 40) x));
  end if;

  if p_action = 'decide_approval' then
    update desk.approvals
       set status = case when p_payload->>'status' = 'approved' then 'approved' else 'rejected' end,
           decided_at = now()
     where id = (p_payload->>'id')::uuid
    returning to_jsonb(desk.approvals.*) into v_out;
    return jsonb_build_object('ok', true, 'row', v_out);
  end if;

  if p_action = 'cancel_task' then
    update desk.tasks set status = 'failed', blocked_why = 'cancelled by him'
     where id = (p_payload->>'id')::uuid;
    return jsonb_build_object('ok', true);
  end if;

  ------------------------------------------------------------------
  -- WEBSITE INTAKE — the only thing the public form can reach
  ------------------------------------------------------------------
  if p_action = 'add_enquiry' then
    insert into web.enquiries (name, phone, city, item, qty, message, source)
    values (p_payload->>'name', p_payload->>'phone', p_payload->>'city',
            p_payload->>'item', p_payload->>'qty', p_payload->>'message',
            coalesce(p_payload->>'source', 'yuan.pk'))
    returning to_jsonb(web.enquiries.*) into v_out;
    return jsonb_build_object('ok', true, 'row', v_out);
  end if;

  if p_action = 'enquiries' then
    return jsonb_build_object('ok', true, 'enquiries', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
        select * from web.enquiries order by created_at desc limit 100) x));
  end if;

  if p_action = 'settings' then
    return jsonb_build_object('ok', true, 'settings', (
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from desk.settings));
  end if;

  if p_action = 'ping' then
    return jsonb_build_object('ok', true, 'at', now());
  end if;

  return jsonb_build_object('ok', false, 'error', 'unknown-action');
end
$fn$;

-- The gateway is the ONLY thing the publishable key may call, and it still
-- demands the app secret on every request.
revoke all on function public.yd_call(text, text, jsonb) from public;
grant execute on function public.yd_call(text, text, jsonb) to anon, authenticated, service_role;

-- these must never be callable from outside
revoke all on function desk.set_app_secret(text) from anon, authenticated;
revoke all on function desk.check_secret(text) from anon, authenticated;
