-- ============================================================================
-- Area de membros LATAM: schema limpo + seed de homologacao.
-- Projeto alvo: reconquista-latam / phvybounxmtrbohbfxsl
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.product_settings (
  id uuid primary key default gen_random_uuid(),
  cakto_product_id text not null unique,
  product_name text not null,
  product_description text,
  product_image_url text,
  visible boolean not null default true,
  checkout_url text,
  display_order integer not null default 0,
  pdf_file_path text,
  rating numeric(2,1),
  reviews_count integer,
  product_kind text,
  consultoria_config jsonb,
  upsell_cta_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_settings_rating_range check (rating is null or (rating >= 0 and rating <= 5)),
  constraint product_settings_reviews_count_nonneg check (reviews_count is null or reviews_count >= 0)
);

create table if not exists public.product_modules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product_settings(id) on delete cascade,
  module_name text not null default 'Nova aula',
  pdf_file_path text,
  video_url text,
  audio_file_path text,
  is_published boolean not null default false,
  display_order integer not null default 0,
  section_id uuid,
  section_order integer not null default 0,
  consultoria_config jsonb,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.product_settings(id) on delete cascade,
  section_key text not null,
  number text not null,
  title text not null,
  subtitle text,
  kind text not null default 'track',
  status text not null default 'in_production',
  display_order integer not null default 0,
  sequential boolean not null default false,
  in_production_copy text,
  archived boolean not null default false,
  image_url text,
  icon_key text,
  accent_color text,
  consultoria_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, section_key)
);

alter table public.product_modules
  drop constraint if exists product_modules_section_id_fkey;
alter table public.product_modules
  add constraint product_modules_section_id_fkey
  foreign key (section_id) references public.product_sections(id);

create table if not exists public.lesson_materials (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.product_sections(id) on delete cascade,
  module_id uuid references public.product_modules(id) on delete cascade,
  title text not null,
  kind text not null default 'pdf',
  file_path text,
  external_url text,
  display_order integer not null default 0,
  state text not null default 'coming-soon',
  created_at timestamptz not null default now(),
  constraint lesson_materials_target_check check (section_id is not null or module_id is not null)
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  product_name text not null,
  product_description text,
  product_image_url text,
  access_url text,
  purchase_date timestamptz not null default now(),
  transaction_id text,
  status text not null default 'active',
  product_settings_id uuid references public.product_settings(id),
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.module_completions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  module_id uuid not null references public.product_modules(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique(email, module_id)
);

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  cakto_product_id text,
  action text not null default 'login',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text not null
);

create table if not exists public.webhook_events (
  event_id text primary key,
  gateway text not null,
  received_at timestamptz not null default now(),
  processed boolean not null default false,
  payload jsonb
);

create table if not exists public.quiz_funnel_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_name text not null,
  session_id text not null,
  path text,
  referrer_host text,
  device_type text,
  attribution jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

-- Compatibilidade com o primeiro schema LATAM criado durante homologacao.
-- Ele usava nomes mais novos (gateway_product_id, is_visible, etc.), enquanto
-- as Edge Functions do painel brasileiro ainda esperam o schema legado.
alter table public.product_settings add column if not exists cakto_product_id text;
alter table public.product_settings add column if not exists slug text;
alter table public.product_settings add column if not exists gateway_product_id text;
alter table public.product_settings add column if not exists product_image_path text;
alter table public.product_settings add column if not exists product_image_url text;
alter table public.product_settings add column if not exists visible boolean;
alter table public.product_settings add column if not exists is_visible boolean;
alter table public.product_settings add column if not exists access_url text;
alter table public.product_settings add column if not exists pdf_file_path text;
alter table public.product_settings add column if not exists rating numeric(2,1);
alter table public.product_settings add column if not exists reviews_count integer;
alter table public.product_settings add column if not exists consultoria_config jsonb;
alter table public.product_settings add column if not exists upsell_cta_config jsonb;
alter table public.product_settings alter column slug drop not null;

update public.product_settings
set
  cakto_product_id = coalesce(cakto_product_id, gateway_product_id, slug, id::text),
  slug = coalesce(slug, cakto_product_id, gateway_product_id, id::text),
  gateway_product_id = coalesce(gateway_product_id, cakto_product_id, slug, id::text),
  product_image_url = coalesce(product_image_url, product_image_path),
  product_image_path = coalesce(product_image_path, product_image_url),
  visible = coalesce(visible, is_visible, true),
  is_visible = coalesce(is_visible, visible, true)
where cakto_product_id is null
   or slug is null
   or gateway_product_id is null
   or product_image_url is null
   or product_image_path is null
   or visible is null
   or is_visible is null;

alter table public.product_modules add column if not exists product_id uuid;
alter table public.product_modules add column if not exists product_settings_id uuid;
alter table public.product_modules add column if not exists slug text;
alter table public.product_modules add column if not exists display_order integer;
alter table public.product_modules add column if not exists module_order integer;
alter table public.product_modules add column if not exists media_status text;
alter table public.product_modules add column if not exists section_order integer;
alter table public.product_modules add column if not exists cover_image_url text;
alter table public.product_modules add column if not exists cover_image_path text;
alter table public.product_modules add column if not exists has_video boolean;
alter table public.product_modules add column if not exists has_pdf boolean;
alter table public.product_modules add column if not exists has_audio boolean;
alter table public.product_modules add column if not exists consultoria_config jsonb;
alter table public.product_modules alter column product_settings_id drop not null;
alter table public.product_modules alter column slug drop not null;

update public.product_modules
set
  product_id = coalesce(product_id, product_settings_id),
  product_settings_id = coalesce(product_settings_id, product_id),
  display_order = coalesce(display_order, module_order, 0),
  module_order = coalesce(module_order, display_order, 0),
  section_order = coalesce(section_order, module_order, display_order, 0),
  cover_image_url = coalesce(cover_image_url, cover_image_path),
  cover_image_path = coalesce(cover_image_path, cover_image_url),
  media_status = coalesce(media_status, 'in_production'),
  has_video = coalesce(has_video, video_url is not null),
  has_pdf = coalesce(has_pdf, pdf_file_path is not null),
  has_audio = coalesce(has_audio, audio_file_path is not null),
  consultoria_config = coalesce(consultoria_config, '{"enabled": false}'::jsonb)
where product_id is null
   or product_settings_id is null
   or display_order is null
   or module_order is null
   or section_order is null
   or cover_image_url is null
   or cover_image_path is null
   or media_status is null
   or has_video is null
   or has_pdf is null
   or has_audio is null
   or consultoria_config is null;

alter table public.product_sections add column if not exists product_id uuid;
alter table public.product_sections add column if not exists product_settings_id uuid;
alter table public.product_sections add column if not exists section_key text;
alter table public.product_sections add column if not exists slug text;
alter table public.product_sections add column if not exists number text;
alter table public.product_sections add column if not exists section_number text;
alter table public.product_sections add column if not exists subtitle text;
alter table public.product_sections add column if not exists description text;
alter table public.product_sections add column if not exists kind text;
alter table public.product_sections add column if not exists sequential boolean;
alter table public.product_sections add column if not exists in_production_copy text;
alter table public.product_sections add column if not exists archived boolean;
alter table public.product_sections add column if not exists image_url text;
alter table public.product_sections add column if not exists image_path text;
alter table public.product_sections add column if not exists icon_key text;
alter table public.product_sections add column if not exists accent_color text;
alter table public.product_sections add column if not exists consultoria_config jsonb;
alter table public.product_sections add column if not exists updated_at timestamptz;
alter table public.product_sections alter column product_settings_id drop not null;
alter table public.product_sections alter column slug drop not null;
alter table public.product_sections alter column section_number drop not null;

update public.product_sections
set
  product_id = coalesce(product_id, product_settings_id),
  product_settings_id = coalesce(product_settings_id, product_id),
  section_key = coalesce(section_key, slug, id::text),
  slug = coalesce(slug, section_key, id::text),
  number = coalesce(number, section_number, ''),
  section_number = coalesce(section_number, number, ''),
  subtitle = coalesce(subtitle, description),
  description = coalesce(description, subtitle, ''),
  kind = coalesce(kind, 'track'),
  sequential = coalesce(sequential, false),
  archived = coalesce(archived, false),
  image_url = coalesce(image_url, image_path),
  image_path = coalesce(image_path, image_url),
  updated_at = coalesce(updated_at, created_at, now())
where product_id is null
   or product_settings_id is null
   or section_key is null
   or slug is null
   or number is null
   or section_number is null
   or subtitle is null
   or description is null
   or kind is null
   or sequential is null
   or archived is null
   or image_url is null
   or image_path is null
   or updated_at is null;

alter table public.lesson_materials add column if not exists kind text;
alter table public.lesson_materials add column if not exists external_url text;
alter table public.lesson_materials add column if not exists state text;

update public.lesson_materials
set
  kind = coalesce(kind, material_type, 'pdf'),
  state = coalesce(state, case when is_published then 'ready' else 'coming-soon' end)
where kind is null
   or state is null;

alter table public.purchases add column if not exists buyer_email text;
alter table public.purchases add column if not exists email text;
alter table public.purchases add column if not exists product_name text;
alter table public.purchases add column if not exists product_description text;
alter table public.purchases add column if not exists product_image_url text;
alter table public.purchases add column if not exists access_url text;
alter table public.purchases add column if not exists purchase_date timestamptz;
alter table public.purchases add column if not exists transaction_id text;
alter table public.purchases add column if not exists gateway_purchase_id text;
alter table public.purchases add column if not exists raw_payload jsonb;
alter table public.purchases add column if not exists metadata jsonb;
alter table public.purchases add column if not exists currency text;
alter table public.purchases alter column email drop not null;

update public.purchases p
set
  buyer_email = coalesce(p.buyer_email, p.email),
  email = coalesce(p.email, p.buyer_email),
  transaction_id = coalesce(p.transaction_id, p.gateway_purchase_id),
  gateway_purchase_id = coalesce(p.gateway_purchase_id, p.transaction_id),
  raw_payload = coalesce(p.raw_payload, p.metadata),
  metadata = coalesce(p.metadata, p.raw_payload, '{}'::jsonb),
  currency = coalesce(p.currency, 'USD'),
  purchase_date = coalesce(p.purchase_date, p.created_at, now()),
  product_name = coalesce(p.product_name, ps.product_name),
  product_description = coalesce(p.product_description, ps.product_description),
  product_image_url = coalesce(p.product_image_url, ps.product_image_url, ps.product_image_path),
  access_url = coalesce(p.access_url, ps.access_url)
from public.product_settings ps
where p.product_settings_id = ps.id
  and (
    p.buyer_email is null
    or p.email is null
    or p.transaction_id is null
    or p.gateway_purchase_id is null
    or p.raw_payload is null
    or p.metadata is null
    or p.currency is null
    or p.purchase_date is null
    or p.product_name is null
    or p.product_description is null
    or p.product_image_url is null
    or p.access_url is null
  );

alter table public.admin_settings
  alter column value type text
  using trim(both '"' from value::text);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_settings_cakto_product_id_key'
      and conrelid = 'public.product_settings'::regclass
  ) then
    alter table public.product_settings
      add constraint product_settings_cakto_product_id_key unique (cakto_product_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_sections_product_id_section_key_key'
      and conrelid = 'public.product_sections'::regclass
  ) then
    alter table public.product_sections
      add constraint product_sections_product_id_section_key_key unique (product_id, section_key);
  end if;
end $$;

create index if not exists idx_purchases_buyer_email on public.purchases (buyer_email);
create index if not exists idx_purchases_product_settings_id on public.purchases (product_settings_id);
create unique index if not exists idx_purchases_transaction_id_unique
  on public.purchases(transaction_id)
  where transaction_id is not null;
create index if not exists idx_access_logs_email on public.access_logs (email);
create index if not exists idx_access_logs_action on public.access_logs (action);
create index if not exists idx_access_logs_created on public.access_logs (created_at);
create index if not exists product_sections_product_order_idx on public.product_sections(product_id, display_order);
create index if not exists product_modules_product_order_idx on public.product_modules(product_id, display_order);
create index if not exists product_modules_section_order_idx on public.product_modules(section_id, section_order) where section_id is not null;
create index if not exists lesson_materials_section_idx on public.lesson_materials(section_id, display_order);
create index if not exists lesson_materials_module_idx on public.lesson_materials(module_id, display_order);
create index if not exists idx_quiz_funnel_events_created_at on public.quiz_funnel_events(created_at desc);
create index if not exists idx_quiz_funnel_events_event_name on public.quiz_funnel_events(event_name);
create index if not exists idx_quiz_funnel_events_session_id on public.quiz_funnel_events(session_id);
create index if not exists idx_quiz_funnel_events_campaign on public.quiz_funnel_events((attribution ->> 'utm_campaign'));

alter table public.product_settings enable row level security;
alter table public.product_modules enable row level security;
alter table public.product_sections enable row level security;
alter table public.lesson_materials enable row level security;
alter table public.purchases enable row level security;
alter table public.module_completions enable row level security;
alter table public.access_logs enable row level security;
alter table public.admin_settings enable row level security;
alter table public.webhook_events enable row level security;
alter table public.quiz_funnel_events enable row level security;

drop policy if exists "Allow public read visible products" on public.product_settings;
create policy "Allow public read visible products"
  on public.product_settings for select to anon, authenticated using (true);

drop policy if exists "Allow public read modules" on public.product_modules;
create policy "Allow public read modules"
  on public.product_modules for select to anon, authenticated using (true);

drop policy if exists "Allow public read sections" on public.product_sections;
create policy "Allow public read sections"
  on public.product_sections for select to anon, authenticated using (true);

drop policy if exists "Allow public read materials" on public.lesson_materials;
create policy "Allow public read materials"
  on public.lesson_materials for select to anon, authenticated using (true);

drop policy if exists "Allow public insert logs" on public.access_logs;
create policy "Allow public insert logs"
  on public.access_logs for insert to anon, authenticated with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-pdfs', 'product-pdfs', false, 524288000, array['application/pdf']),
  ('product-audios', 'product-audios', false, 524288000, array['audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/ogg','audio/webm']),
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Service role manage product-images" on storage.objects;
create policy "Service role manage product-images"
  on storage.objects for all to service_role
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Service role manage product-pdfs" on storage.objects;
create policy "Service role manage product-pdfs"
  on storage.objects for all to service_role
  using (bucket_id = 'product-pdfs')
  with check (bucket_id = 'product-pdfs');

drop policy if exists "Service role manage product-audios" on storage.objects;
create policy "Service role manage product-audios"
  on storage.objects for all to service_role
  using (bucket_id = 'product-audios')
  with check (bucket_id = 'product-audios');

-- Recria apenas o catalogo seed LATAM de homologacao para evitar conflito com
-- uma primeira carga parcial que usava outros UUIDs para as mesmas secoes.
delete from public.lesson_materials
where coalesce(module_id, '00000000-0000-0000-0000-000000000000'::uuid) in (
  select id from public.product_modules
  where coalesce(product_id, product_settings_id) in (
    '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
    'ab9d9354-3230-4a5b-9794-4d5534556202',
    'e52d528e-c521-461d-a5f8-2cc2cdd76303',
    '54e50bda-18db-4bdc-90ec-02ac84467404'
  )
)
or coalesce(section_id, '00000000-0000-0000-0000-000000000000'::uuid) in (
  select id from public.product_sections
  where coalesce(product_id, product_settings_id) in (
    '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
    'ab9d9354-3230-4a5b-9794-4d5534556202',
    'e52d528e-c521-461d-a5f8-2cc2cdd76303',
    '54e50bda-18db-4bdc-90ec-02ac84467404'
  )
);

delete from public.product_modules
where coalesce(product_id, product_settings_id) in (
  '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
  'ab9d9354-3230-4a5b-9794-4d5534556202',
  'e52d528e-c521-461d-a5f8-2cc2cdd76303',
  '54e50bda-18db-4bdc-90ec-02ac84467404'
);

delete from public.product_sections
where coalesce(product_id, product_settings_id) in (
  '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
  'ab9d9354-3230-4a5b-9794-4d5534556202',
  'e52d528e-c521-461d-a5f8-2cc2cdd76303',
  '54e50bda-18db-4bdc-90ec-02ac84467404'
);

delete from public.purchases
where coalesce(product_settings_id, '00000000-0000-0000-0000-000000000000'::uuid) in (
  '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
  'ab9d9354-3230-4a5b-9794-4d5534556202',
  'e52d528e-c521-461d-a5f8-2cc2cdd76303',
  '54e50bda-18db-4bdc-90ec-02ac84467404'
)
or buyer_email = 'preview.miembros@recuperaatuexahora.test'
or email = 'preview.miembros@recuperaatuexahora.test';

delete from public.product_settings
where id in (
  '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
  'ab9d9354-3230-4a5b-9794-4d5534556202',
  'e52d528e-c521-461d-a5f8-2cc2cdd76303',
  '54e50bda-18db-4bdc-90ec-02ac84467404'
)
or cakto_product_id in (
  'latam-codigo-reconquista',
  'latam-juego-celos',
  'latam-acelerador-emocional-10x',
  'latam-kit-reconquista'
)
or gateway_product_id in (
  'latam-codigo-reconquista',
  'latam-juego-celos',
  'latam-acelerador-emocional-10x',
  'latam-kit-reconquista'
)
or slug in (
  'latam-codigo-reconquista',
  'latam-juego-celos',
  'latam-acelerador-emocional-10x',
  'latam-kit-reconquista'
);

insert into public.admin_settings (key, value)
values
  ('admin_password', '$2a$10$UBZJqaXfDUnqWWMONXWxMOwddXX4n3Zct01bYie6kEjdfb4dzqaGq'),
  ('site.consultoria_enabled', 'false'),
  ('site.consultoria_url', ''),
  ('site.support_whatsapp_url', ''),
  ('site.quotes_json', '["Mantén la calma. La estrategia empieza cuando dejas de reaccionar.","Tu postura vale más que cualquier mensaje enviado con ansiedad."]')
on conflict (key) do update set value = excluded.value;

insert into public.product_settings (
  id, cakto_product_id, product_name, product_description, visible, checkout_url,
  display_order, rating, reviews_count, product_kind
) values
  ('5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'latam-codigo-reconquista', 'El Código de la Reconquista', 'El método principal para reconstruir atracción, recuperar control emocional y avanzar con una estrategia clara.', true, null, 0, 4.9, 11939, 'main'),
  ('ab9d9354-3230-4a5b-9794-4d5534556202', 'latam-juego-celos', 'El Juego de los Celos y la Reconquista', 'Contenido complementario sobre celos, posicionamiento y respuesta emocional sin exagerar.', true, null, 1, 4.9, 3120, 'bonus'),
  ('e52d528e-c521-461d-a5f8-2cc2cdd76303', 'latam-acelerador-emocional-10x', 'Acelerador Emocional 10X', 'Audio de apoyo para bajar la ansiedad, recuperar el centro emocional y volver a actuar con claridad.', true, null, 2, 4.8, 980, 'complementary'),
  ('54e50bda-18db-4bdc-90ec-02ac84467404', 'latam-kit-reconquista', 'Kit Reconquista', 'Guías, audios y materiales prácticos para sostener tu proceso con más orden emocional.', true, null, 3, 4.8, 840, 'complementary')
on conflict (id) do update set
  cakto_product_id = excluded.cakto_product_id,
  product_name = excluded.product_name,
  product_description = excluded.product_description,
  visible = excluded.visible,
  display_order = excluded.display_order,
  rating = excluded.rating,
  reviews_count = excluded.reviews_count,
  product_kind = excluded.product_kind,
  updated_at = now();

insert into public.product_sections (
  id, product_id, section_key, number, title, subtitle, kind, status, display_order, sequential, in_production_copy
) values
  ('9d5d41cb-5ef5-4cc3-9325-7a4c6b3b6401', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'bienvenida', '01', 'Bienvenida', 'Orientación inicial antes de empezar el método.', 'welcome', 'in_production', 0, false, 'Contenido en producción.'),
  ('7b87e9ee-93dc-4551-819d-590d0f053a02', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'oxitocina-y-dopamina', '02', 'Oxitocina y Dopamina', 'La base emocional y neuroquímica de la reconexión.', 'track', 'in_production', 1, false, 'Contenido en producción.'),
  ('d4f4d44a-dce5-4477-af7e-e69b3dd83203', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'fundamentos-de-la-reconexion', '03', 'Fundamentos de la Reconexión', 'Principios prácticos para no actuar desde la ansiedad o la presión.', 'track', 'in_production', 2, false, 'Contenido en producción.'),
  ('2b8a5679-9794-4354-b34e-4e8c8c145201', 'ab9d9354-3230-4a5b-9794-4d5534556202', 'contenido-principal', '01', 'El Juego de los Celos y la Reconquista', 'Contenidos', 'track', 'in_production', 0, false, 'Contenido en producción.'),
  ('e32059eb-f06c-4dc6-a882-8bf78d4f6301', 'e52d528e-c521-461d-a5f8-2cc2cdd76303', 'audio-book', '01', 'Audio Book', 'Material de apoyo emocional.', 'coming-soon', 'in_production', 0, false, 'Contenido en producción.'),
  ('779ba2b5-8505-4dff-bf15-d35b8f417401', '54e50bda-18db-4bdc-90ec-02ac84467404', 'contenidos', '01', 'Contenidos', 'Materiales complementarios del Kit Reconquista.', 'coming-soon', 'in_production', 0, false, 'Contenido en producción.')
on conflict (product_id, section_key) do update set
  number = excluded.number,
  title = excluded.title,
  subtitle = excluded.subtitle,
  kind = excluded.kind,
  status = excluded.status,
  display_order = excluded.display_order,
  sequential = excluded.sequential,
  in_production_copy = excluded.in_production_copy,
  updated_at = now();

insert into public.product_modules (
  id, product_id, section_id, module_name, display_order, section_order, is_published
) values
  ('a7c2f9bf-2d65-4ca2-a1b5-8ec5a7b5a101', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '9d5d41cb-5ef5-4cc3-9325-7a4c6b3b6401', 'Introducción a El Código de la Reconquista', 0, 0, false),
  ('eda81650-fb83-4b41-a17c-2d3bbde3c103', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '7b87e9ee-93dc-4551-819d-590d0f053a02', 'La Química del Amor', 1, 0, false),
  ('b20c2e52-04cc-4ea9-89d1-615dcf078104', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '7b87e9ee-93dc-4551-819d-590d0f053a02', 'La Oxitocina', 2, 1, false),
  ('2f3ed60d-e3e2-4f7c-9ef8-8194f86d1105', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '7b87e9ee-93dc-4551-819d-590d0f053a02', 'La Dopamina', 3, 2, false),
  ('6c1d7957-b8ef-46e8-a7a5-2469e20d1106', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '7b87e9ee-93dc-4551-819d-590d0f053a02', 'Equilibrio Emocional', 4, 3, false),
  ('02729b4d-2c7c-4a24-9830-cf5a9f5e1107', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', '7b87e9ee-93dc-4551-819d-590d0f053a02', 'El Peligroso Territorio de Acertar', 5, 4, false),
  ('d634e699-0940-40d2-9022-48b36b5d7f02', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Compromiso', 6, 0, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000001', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 1: Autoconfianza Inquebrantable', 7, 1, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000002', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 2: Control Emocional', 8, 2, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000003', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 3: Presencia y Postura', 9, 3, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000004', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 4: Silencio Estratégico', 10, 4, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000005', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 5: Reencuadre Mental', 11, 5, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000006', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 6: Rutina de Estabilidad', 12, 6, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000007', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 7: Mensaje sin Presión', 13, 7, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000008', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 8: Lectura de Respuestas', 14, 8, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000009', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 9: Atracción Natural', 15, 9, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000010', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 10: Reconstrucción de Valor', 16, 10, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000011', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 11: Límites y Seguridad', 17, 11, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000012', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 12: Preparación para Reencuentro', 18, 12, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000013', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 13: Conversación Guiada', 19, 13, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000014', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 14: Plan de Continuidad', 20, 14, false),
  ('77ed9e07-7f84-4ec9-a1c7-40a3d2000015', '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'd4f4d44a-dce5-4477-af7e-e69b3dd83203', 'Día 15: Cierre del Módulo', 21, 15, false),
  ('b4702e8a-70bf-49dc-83b0-8117cc2c5201', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Introducción', 0, 0, false),
  ('e5e71a50-81e7-45a1-8b14-e77c00a45202', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Cómo funcionan los celos en la mente femenina', 1, 1, false),
  ('85a9287a-7640-4707-b660-2d665cb85203', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Los 5 tipos de celos', 2, 2, false),
  ('acfd8227-0aa1-492f-a5cf-a3d251285204', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Posicionamiento silencioso en el día a día', 3, 3, false),
  ('a7f4834f-e119-47ff-94a0-a956f1255205', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'El poder de las redes sociales', 4, 4, false),
  ('715630d2-b72f-4492-b65e-4df7e19c5206', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'El poder del silencio', 5, 5, false),
  ('d476e96e-1e8a-402a-863d-4a6b78345207', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'El alto nivel del retorno', 6, 6, false),
  ('20d78594-8706-4d26-a878-69d9755e5208', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Qué hacer si ella no reacciona', 7, 7, false),
  ('54fd6321-8e7f-4ee1-8a2a-7135b0cf5209', 'ab9d9354-3230-4a5b-9794-4d5534556202', '2b8a5679-9794-4354-b34e-4e8c8c145201', 'Preguntas frecuentes', 8, 8, false),
  ('d3acc7cf-699a-4e52-90ab-92d95a716301', 'e52d528e-c521-461d-a5f8-2cc2cdd76303', 'e32059eb-f06c-4dc6-a882-8bf78d4f6301', 'Audio Book de 30 minutos', 0, 0, false),
  ('edb161a6-3b8a-440c-b702-4d0b18487401', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Técnica 5 4 3 2 1', 0, 0, false),
  ('9ed0fb48-418f-4692-8437-10224b6d7402', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Kit SOS Ansiedad', 1, 1, false),
  ('7f2fdd38-53ac-4197-812d-d7d7b6457403', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Audio Hipnótico Activador de Memoria Emocional', 2, 2, false),
  ('1288cfa3-bda5-4b68-8d7d-4e759d5d7404', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Kit de Mensajes de Oro', 3, 3, false),
  ('dc9b8500-3f7d-4b6e-81fe-f5c847377405', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Manual de Quiebre de Resistencia', 4, 4, false),
  ('a779f838-5b63-4101-bff4-7b962e2a7406', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Guion del Encuentro Perfecto', 5, 5, false),
  ('ca8dc1b8-23d2-4bd1-a0e9-480eab497407', '54e50bda-18db-4bdc-90ec-02ac84467404', '779ba2b5-8505-4dff-bf15-d35b8f417401', 'Protocolo Anti Rechazo', 6, 6, false)
on conflict (id) do update set
  product_id = excluded.product_id,
  section_id = excluded.section_id,
  module_name = excluded.module_name,
  display_order = excluded.display_order,
  section_order = excluded.section_order,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.purchases (
  buyer_email, product_name, product_description, product_image_url, transaction_id,
  status, product_settings_id, raw_payload
)
select
  'preview.miembros@recuperaatuexahora.test',
  'El Código de la Reconquista',
  'Compra sintética exclusiva de homologación técnica.',
  '',
  'latam-preview-homologation',
  'active',
  '5b4f7475-d8cc-46d6-99d7-6a7a8c47b101',
  '{"source":"homologation","market":"es_global"}'::jsonb
where not exists (
  select 1
  from public.purchases
  where transaction_id = 'latam-preview-homologation'
);
