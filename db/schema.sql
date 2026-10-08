-- Meros P0 minimal Neon schema.
-- Operational metadata ONLY. Walrus is the durable memory store.
-- If this database is wiped, sessions/evidence metadata is lost but
-- Walrus memories remain.

create table if not exists users (
  id text primary key,               -- sha256 hex internal user id
  access_code_hash text not null,    -- db-scoped hash, never the raw code
  namespace text not null,           -- meros:user:<hash>
  created_at timestamptz not null default now()
);

create table if not exists memory_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id) on delete cascade,
  namespace text not null,
  type text not null default 'PROFILE',
  text text not null,
  status text not null default 'pending'
    check (status in ('pending','saving','stored','failed')),
  blob_id text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists memory_jobs_user_idx on memory_jobs (user_id, created_at desc);

-- Meros P5 multi-tenant foundation.
-- Relational records ONLY (identity registry + future auth/conversations).
-- Walrus remains the source of truth for long-term AI memory.
-- All IDs are immutable content-derived hex (see lib/tenant.ts); slugs and
-- names are presentation/routing and NEVER namespace keys.

create table if not exists organizations (
  id text primary key,               -- sha256-derived, immutable
  slug text not null unique,         -- public routing key (e.g. 'acme')
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id text primary key,               -- sha256-derived from slug, immutable
  organization_id text not null references organizations(id) on delete cascade,
  slug text not null unique,         -- public routing key (e.g. 'acme')
  name text not null,
  product_name text,
  product_description text,
  support_context text,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,               -- sha256-derived from (workspace_id, bootstrap hash), immutable
  workspace_id text not null references workspaces(id) on delete cascade,
  display_name text,                 -- nullable; bootstrap carries no name yet
  bootstrap_identity_hash text not null,  -- salted hash, NEVER the raw access code
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, bootstrap_identity_hash)
);

create index if not exists customers_workspace_idx on customers (workspace_id);
