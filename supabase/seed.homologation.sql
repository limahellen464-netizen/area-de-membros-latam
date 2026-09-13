insert into public.purchases
  (email, buyer_name, product_settings_id, gateway_purchase_id, status, amount, currency, metadata)
select
  'preview.miembros@recuperaatuexahora.test',
  'Lead Teste LATAM',
  id,
  'homologation-' || slug,
  'active',
  47.97,
  'USD',
  '{"source":"homologation_only","remove_before_commercial_launch":true}'::jsonb
from public.product_settings
where slug in (
  'el-codigo-de-la-reconquista',
  'el-juego-de-los-celos-y-la-reconquista',
  'acelerador-emocional-10x',
  'kit-reconquista'
)
on conflict (gateway_purchase_id) do nothing;
