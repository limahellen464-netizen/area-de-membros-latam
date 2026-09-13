create extension if not exists pgcrypto;

create table if not exists public.product_settings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  product_name text not null,
  product_description text not null default '',
  product_image_path text,
  product_kind text not null default 'main',
  gateway_product_id text unique,
  checkout_url text,
  access_url text,
  is_visible boolean not null default true,
  display_order integer not null default 0,
  consultoria_config jsonb not null default '{"enabled":false}'::jsonb,
  upsell_cta_config jsonb not null default '{"enabled":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sections (
  id uuid primary key default gen_random_uuid(),
  product_settings_id uuid not null references public.product_settings(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  section_number text not null,
  image_path text,
  status text not null default 'in_production',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(product_settings_id, slug)
);

create table if not exists public.product_modules (
  id uuid primary key default gen_random_uuid(),
  product_settings_id uuid not null references public.product_settings(id) on delete cascade,
  section_id uuid references public.product_sections(id) on delete set null,
  slug text not null,
  module_name text not null,
  module_order integer not null default 0,
  media_status text not null default 'in_production',
  is_published boolean not null default false,
  video_url text,
  pdf_file_path text,
  audio_file_path text,
  cover_image_path text,
  has_video boolean not null default false,
  has_pdf boolean not null default false,
  has_audio boolean not null default false,
  consultoria_config jsonb not null default '{"enabled":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_settings_id, slug)
);

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.product_modules(id) on delete cascade,
  section_id uuid references public.product_sections(id) on delete cascade,
  title text not null,
  material_type text not null check (material_type in ('pdf','audio')),
  file_path text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  buyer_name text,
  product_settings_id uuid not null references public.product_settings(id) on delete cascade,
  gateway_purchase_id text unique,
  status text not null default 'active',
  amount numeric(10,2),
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_email_idx on public.purchases (lower(email));
create index if not exists purchases_product_idx on public.purchases (product_settings_id);

create table if not exists public.module_completions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  module_id uuid not null references public.product_modules(id) on delete cascade,
  product_settings_id uuid not null references public.product_settings(id) on delete cascade,
  completed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists module_completions_email_module_uidx
  on public.module_completions (lower(email), module_id);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  email text,
  action text not null,
  product_settings_id uuid references public.product_settings(id) on delete set null,
  module_id uuid references public.product_modules(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null unique,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

insert into storage.buckets (id, name, public)
values
  ('latam-product-images', 'latam-product-images', true),
  ('latam-product-pdfs', 'latam-product-pdfs', false),
  ('latam-product-audios', 'latam-product-audios', false)
on conflict (id) do nothing;

alter table public.product_settings enable row level security;
alter table public.product_sections enable row level security;
alter table public.product_modules enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.purchases enable row level security;
alter table public.module_completions enable row level security;
alter table public.access_logs enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_settings enable row level security;
alter table public.webhook_events enable row level security;
