with section_seed(product_slug, section_slug, title, description, section_number, display_order) as (
  values
    ('el-codigo-de-la-reconquista', 'bienvenida', 'Bienvenida', 'Orientacion inicial antes de empezar el metodo.', '01', 1),
    ('el-codigo-de-la-reconquista', 'oxitocina-y-dopamina', 'Oxitocina y Dopamina', 'La base emocional y neuroquimica de la reconexion.', '02', 2),
    ('el-codigo-de-la-reconquista', 'fundamentos-de-la-reconexion', 'Fundamentos de la Reconexion', 'Principios practicos para no actuar desde ansiedad o presion.', '03', 3),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'Jornada Practica Diaria', 'Plan de continuidad para los proximos dias.', '04', 4),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'Contenido Principal', 'Aulas y materiales del producto complementario.', '01', 1),
    ('acelerador-emocional-10x', 'audio-book', 'Audio Book', 'Material de apoyo emocional.', '01', 1),
    ('kit-reconquista', 'contenidos', 'Contenidos', 'Materiales complementarios del Kit Reconquista.', '01', 1)
)
insert into public.product_sections
  (product_settings_id, slug, title, description, section_number, display_order, status)
select product_settings.id, section_seed.section_slug, section_seed.title, section_seed.description, section_seed.section_number, section_seed.display_order, 'in_production'
from section_seed
join public.product_settings on product_settings.slug = section_seed.product_slug
on conflict (product_settings_id, slug) do nothing;

with lesson_seed(product_slug, section_slug, lesson_slug, title, lesson_type, display_order) as (
  values
    ('el-codigo-de-la-reconquista', 'bienvenida', 'introduccion-al-codigo', 'Introduccion a El Codigo de la Reconquista', 'video', 1),
    ('el-codigo-de-la-reconquista', 'bienvenida', 'compromiso', 'Compromiso', 'video', 2),
    ('el-codigo-de-la-reconquista', 'oxitocina-y-dopamina', 'la-quimica-del-amor', 'La Quimica del Amor', 'video', 1),
    ('el-codigo-de-la-reconquista', 'oxitocina-y-dopamina', 'la-oxitocina', 'La Oxitocina', 'video', 2),
    ('el-codigo-de-la-reconquista', 'oxitocina-y-dopamina', 'la-dopamina', 'La Dopamina', 'video', 3),
    ('el-codigo-de-la-reconquista', 'fundamentos-de-la-reconexion', 'equilibrio-emocional', 'Equilibrio Emocional', 'video', 1),
    ('el-codigo-de-la-reconquista', 'fundamentos-de-la-reconexion', 'el-territorio-peligroso-de-acertar', 'El Peligroso Territorio de Acertar', 'video', 2),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-1', 'Dia 1: Autoconfianza Inquebrantable', 'video', 1),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-2', 'Dia 2: Control Emocional', 'video', 2),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-3', 'Dia 3: Presencia y Postura', 'video', 3),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-4', 'Dia 4: Silencio Estrategico', 'video', 4),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-5', 'Dia 5: Reencuadre Mental', 'video', 5),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-6', 'Dia 6: Rutina de Estabilidad', 'video', 6),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-7', 'Dia 7: Mensaje sin Presion', 'video', 7),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-8', 'Dia 8: Lectura de Respuestas', 'video', 8),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-9', 'Dia 9: Atraccion Natural', 'video', 9),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-10', 'Dia 10: Reconstruccion de Valor', 'video', 10),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-11', 'Dia 11: Limites y Seguridad', 'video', 11),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-12', 'Dia 12: Preparacion para Reencuentro', 'video', 12),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-13', 'Dia 13: Conversacion Guiada', 'video', 13),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-14', 'Dia 14: Plano de Continuidad', 'video', 14),
    ('el-codigo-de-la-reconquista', 'jornada-practica-diaria', 'dia-15', 'Dia 15: Cierre del Modulo', 'video', 15),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'introduccion', 'Introduccion', 'audio', 1),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'como-funcionan-los-celos', 'Como funcionan los celos en la mente femenina', 'pdf', 2),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'los-cinco-tipos-de-celos', 'Los 5 tipos de celos', 'pdf', 3),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'posicionamiento-silencioso', 'Posicionamiento silencioso en el dia a dia', 'pdf', 4),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'redes-sociales', 'El poder de las redes sociales', 'pdf', 5),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'el-poder-del-silencio', 'El poder del silencio', 'pdf', 6),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'alto-nivel-del-retorno', 'El alto nivel del retorno', 'pdf', 7),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'si-ella-no-reacciona', 'Que hacer si ella no reacciona', 'pdf', 8),
    ('el-juego-de-los-celos-y-la-reconquista', 'contenido-principal', 'preguntas-frecuentes', 'Preguntas frecuentes', 'pdf', 9),
    ('acelerador-emocional-10x', 'audio-book', 'audio-book-30-minutos', 'Audio Book 30 minutos', 'audio', 1),
    ('kit-reconquista', 'contenidos', 'tecnica-5-4-3-2-1', 'Tecnica 5 4 3 2 1', 'audio', 1),
    ('kit-reconquista', 'contenidos', 'kit-sos-ansiedad', 'Kit SOS Ansiedad', 'audio', 2),
    ('kit-reconquista', 'contenidos', 'audio-hipnotico', 'Audio Hipnotico Activador de Memoria Emocional', 'audio', 3),
    ('kit-reconquista', 'contenidos', 'mensajes-de-oro', 'Kit de Mensajes de Oro', 'pdf', 4),
    ('kit-reconquista', 'contenidos', 'quiebre-de-resistencia', 'Manual de Quiebre de Resistencia', 'pdf', 5),
    ('kit-reconquista', 'contenidos', 'encuentro-perfecto', 'Guion del Encuentro Perfecto', 'pdf', 6),
    ('kit-reconquista', 'contenidos', 'anti-rechazo', 'Protocolo Anti Rechazo', 'pdf', 7)
)
insert into public.product_modules
  (product_settings_id, section_id, slug, module_name, module_order, media_status, is_published, has_video, has_pdf, has_audio)
select
  product_settings.id,
  product_sections.id,
  lesson_seed.lesson_slug,
  lesson_seed.title,
  lesson_seed.display_order,
  'in_production',
  false,
  lesson_seed.lesson_type = 'video',
  lesson_seed.lesson_type = 'pdf',
  lesson_seed.lesson_type = 'audio'
from lesson_seed
join public.product_settings on product_settings.slug = lesson_seed.product_slug
join public.product_sections
  on product_sections.product_settings_id = product_settings.id
 and product_sections.slug = lesson_seed.section_slug
on conflict (product_settings_id, slug) do nothing;
