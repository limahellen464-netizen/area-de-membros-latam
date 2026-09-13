-- Move admin auth + Perfect Pay webhook secret out of Supabase Edge
-- Function env vars and into admin_settings, so they're fully manageable
-- from the admin panel itself (no Supabase dashboard/CLI access needed
-- after the initial deploy).
--
-- Default admin password after this migration: "admin123" — log in and
-- change it immediately in /admin/configuracoes.
insert into public.admin_settings (key, value)
values
  ('admin.password_hash', to_jsonb(encode(digest('admin123', 'sha256'), 'hex'))),
  ('perfectpay.webhook_token', to_jsonb(encode(gen_random_bytes(24), 'hex')))
on conflict (key) do nothing;
