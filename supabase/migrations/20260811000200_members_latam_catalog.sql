insert into public.product_settings
  (id, slug, product_name, product_description, product_image_path, product_kind, gateway_product_id, is_visible, display_order)
values
  ('5b4f7475-d8cc-46d6-99d7-6a7a8c47b101', 'el-codigo-de-la-reconquista', 'El Codigo de la Reconquista', 'Metodo principal para reconstruir atraccion y recuperar control emocional.', 'product-images/codigo-reconquista.png', 'main', 'latam-codigo-pending', true, 1),
  ('ab9d9354-3230-4a5b-9794-4d5534556202', 'el-juego-de-los-celos-y-la-reconquista', 'El Juego de los Celos y la Reconquista', 'Contenido complementario sobre celos, posicionamiento y respuesta emocional.', 'product-images/jogo-do-ciume.png', 'bonus', 'latam-celos-pending', true, 2),
  ('e52d528e-c521-461d-a5f8-2cc2cdd76303', 'acelerador-emocional-10x', 'Acelerador Emocional 10X', 'Audio de apoyo para bajar ansiedad y actuar con claridad.', 'product-images/modelos-de-texto.png', 'audio', 'latam-acelerador-pending', true, 3),
  ('54e50bda-18db-4bdc-90ec-02ac84467404', 'kit-reconquista', 'Kit Reconquista', 'Guias, audios y materiales practicos para sostener el proceso.', 'product-images/kit-reconquista.png', 'kit', 'latam-kit-pending', true, 4)
on conflict (id) do nothing;

insert into public.admin_settings (key, value)
values
  ('site.brand_name', '"El Codigo de la Reconquista"'::jsonb),
  ('site.brand_subtitle', '"Area de miembros"'::jsonb),
  ('site.support_email', '"soporte@recuperaatuexahora.com"'::jsonb),
  ('site.consultoria_enabled', 'false'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
