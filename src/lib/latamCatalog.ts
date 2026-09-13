import type { Purchase } from "@/components/premium/types";
import type { SectionKind } from "@/config/courseSections";
import { resolveProductImage } from "./productImageOverrides";
import { resolveSectionImage } from "./sectionImageOverrides";

export const HOMOLOGATION_EMAIL = "preview.miembros@recuperaatuexahora.test";

export type LatamLesson = {
  id: string;
  slug: string;
  title: string;
  type: "video" | "pdf" | "audio";
  status: "production";
};

export type LatamSection = {
  id: string;
  slug: string;
  number: string;
  title: string;
  description: string;
  imageUrl?: string;
  lessons: LatamLesson[];
};

export type LatamProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  kind: "main" | "bonus" | "audio" | "kit";
  unlocked: boolean;
  sections: LatamSection[];
};

const lesson = (
  id: string,
  slug: string,
  title: string,
  type: LatamLesson["type"] = "video",
): LatamLesson => ({
  id,
  slug,
  title,
  type,
  status: "production",
});

export const latamProducts: LatamProduct[] = [
  {
    id: "5b4f7475-d8cc-46d6-99d7-6a7a8c47b101",
    slug: "el-codigo-de-la-reconquista",
    title: "El Código de la Reconquista",
    description:
      "El método principal para reconstruir atracción, recuperar control emocional y avanzar con una estrategia clara.",
    imageUrl: "/product-images/codigo-reconquista.png",
    kind: "main",
    unlocked: true,
    sections: [
      {
        id: "9d5d41cb-5ef5-4cc3-9325-7a4c6b3b6401",
        slug: "bienvenida",
        number: "01",
        title: "Bienvenida",
        description: "Orientación inicial antes de empezar el método.",
        imageUrl: "/product-images/codigo-reconquista.png",
        lessons: [
          lesson(
            "a7c2f9bf-2d65-4ca2-a1b5-8ec5a7b5a101",
            "introduccion-al-codigo",
            "Introducción a El Código de la Reconquista",
          ),
        ],
      },
      {
        id: "7b87e9ee-93dc-4551-819d-590d0f053a02",
        slug: "oxitocina-y-dopamina",
        number: "02",
        title: "Oxitocina y Dopamina",
        description: "La base emocional y neuroquímica de la reconexión.",
        imageUrl: "/product-images/jogo-ciume-section.png",
        lessons: [
          lesson("eda81650-fb83-4b41-a17c-2d3bbde3c103", "la-quimica-del-amor", "La Química del Amor"),
          lesson("b20c2e52-04cc-4ea9-89d1-615dcf078104", "la-oxitocina", "La Oxitocina"),
          lesson("2f3ed60d-e3e2-4f7c-9ef8-8194f86d1105", "la-dopamina", "La Dopamina"),
          lesson("6c1d7957-b8ef-46e8-a7a5-2469e20d1106", "equilibrio-emocional", "Equilibrio Emocional"),
          lesson(
            "02729b4d-2c7c-4a24-9830-cf5a9f5e1107",
            "el-territorio-peligroso-de-acertar",
            "El Peligroso Territorio de Acertar",
          ),
        ],
      },
      {
        id: "d4f4d44a-dce5-4477-af7e-e69b3dd83203",
        slug: "fundamentos-de-la-reconexion",
        number: "03",
        title: "Fundamentos de la Reconexión",
        description: "Principios prácticos para no actuar desde la ansiedad o la presión.",
        imageUrl: "/product-images/codigo-reconquista.png",
        lessons: [
          lesson("d634e699-0940-40d2-9022-48b36b5d7f02", "compromiso", "Compromiso"),
          ...Array.from({ length: 15 }, (_, index) =>
          lesson(
            `77ed9e07-7f84-4ec9-a1c7-40a3d2${String(index + 1).padStart(4, "0")}`,
            `dia-${index + 1}`,
            `Día ${index + 1}: ${
              [
                "Autoconfianza Inquebrantable",
                "Control Emocional",
                "Presencia y Postura",
                "Silencio Estratégico",
                "Reencuadre Mental",
                "Rutina de Estabilidad",
                "Mensaje sin Presión",
                "Lectura de Respuestas",
                "Atracción Natural",
                "Reconstrucción de Valor",
                "Límites y Seguridad",
                "Preparación para Reencuentro",
                "Conversación Guiada",
                "Plan de Continuidad",
                "Cierre del Módulo",
              ][index]
            }`,
          ),
        )],
      },
    ],
  },
  {
    id: "ab9d9354-3230-4a5b-9794-4d5534556202",
    slug: "el-juego-de-los-celos-y-la-reconquista",
    title: "El Juego de los Celos y la Reconquista",
    description:
      "Contenido complementario sobre celos, posicionamiento y respuesta emocional sin exagerar.",
    imageUrl: "/product-images/jogo-do-ciume.png",
    kind: "bonus",
    unlocked: true,
    sections: [
      {
        id: "2b8a5679-9794-4354-b34e-4e8c8c145201",
        slug: "contenido-principal",
        number: "01",
        title: "El Juego de los Celos y la Reconquista",
        description: "Contenidos",
        imageUrl: "/product-images/jogo-do-ciume.png",
        lessons: [
          lesson("b4702e8a-70bf-49dc-83b0-8117cc2c5201", "introduccion", "Introducción", "audio"),
          lesson("e5e71a50-81e7-45a1-8b14-e77c00a45202", "como-funcionan-los-celos", "Cómo funcionan los celos en la mente femenina", "pdf"),
          lesson("85a9287a-7640-4707-b660-2d665cb85203", "los-cinco-tipos-de-celos", "Los 5 tipos de celos", "pdf"),
          lesson("acfd8227-0aa1-492f-a5cf-a3d251285204", "posicionamiento-silencioso", "Posicionamiento silencioso en el día a día", "pdf"),
          lesson("a7f4834f-e119-47ff-94a0-a956f1255205", "redes-sociales", "El poder de las redes sociales", "pdf"),
          lesson("715630d2-b72f-4492-b65e-4df7e19c5206", "el-poder-del-silencio", "El poder del silencio", "pdf"),
          lesson("d476e96e-1e8a-402a-863d-4a6b78345207", "alto-nivel-del-retorno", "El alto nivel del retorno", "pdf"),
          lesson("20d78594-8706-4d26-a878-69d9755e5208", "si-ella-no-reacciona", "Qué hacer si ella no reacciona", "pdf"),
          lesson("54fd6321-8e7f-4ee1-8a2a-7135b0cf5209", "preguntas-frecuentes", "Preguntas frecuentes", "pdf"),
        ],
      },
    ],
  },
  {
    id: "e52d528e-c521-461d-a5f8-2cc2cdd76303",
    slug: "acelerador-emocional-10x",
    title: "Acelerador Emocional 10X",
    description:
      "Audio de apoyo para bajar la ansiedad, recuperar el centro emocional y volver a actuar con claridad.",
    imageUrl: "/product-images/modelos-de-texto.png",
    kind: "audio",
    unlocked: false,
    sections: [
      {
        id: "e32059eb-f06c-4dc6-a882-8bf78d4f6301",
        slug: "audio-book",
        number: "01",
        title: "Audio Book",
        description: "Material de apoyo emocional.",
        imageUrl: "/product-images/modelos-de-texto.png",
        lessons: [
          lesson("d3acc7cf-699a-4e52-90ab-92d95a716301", "audio-book-30-minutos", "Audio Book de 30 minutos", "audio"),
        ],
      },
    ],
  },
  {
    id: "54e50bda-18db-4bdc-90ec-02ac84467404",
    slug: "kit-reconquista",
    title: "Kit Reconquista",
    description:
      "Guías, audios y materiales prácticos para sostener tu proceso con más orden emocional.",
    imageUrl: "/product-images/kit-reconquista.png",
    kind: "kit",
    unlocked: false,
    sections: [
      {
        id: "779ba2b5-8505-4dff-bf15-d35b8f417401",
        slug: "contenidos",
        number: "01",
        title: "Contenidos",
        description: "Materiales complementarios del Kit Reconquista.",
        imageUrl: "/product-images/kit-reconquista.png",
        lessons: [
          lesson("edb161a6-3b8a-440c-b702-4d0b18487401", "tecnica-5-4-3-2-1", "Técnica 5 4 3 2 1", "audio"),
          lesson("9ed0fb48-418f-4692-8437-10224b6d7402", "kit-sos-ansiedad", "Kit SOS Ansiedad", "audio"),
          lesson("7f2fdd38-53ac-4197-812d-d7d7b6457403", "audio-hipnotico", "Audio Hipnótico Activador de Memoria Emocional", "audio"),
          lesson("1288cfa3-bda5-4b68-8d7d-4e759d5d7404", "mensajes-de-oro", "Kit de Mensajes de Oro", "pdf"),
          lesson("dc9b8500-3f7d-4b6e-81fe-f5c847377405", "quiebre-de-resistencia", "Manual de Quiebre de Resistencia", "pdf"),
          lesson("a779f838-5b63-4101-bff4-7b962e2a7406", "encuentro-perfecto", "Guion del Encuentro Perfecto", "pdf"),
          lesson("ca8dc1b8-23d2-4bd1-a0e9-480eab497407", "anti-rechazo", "Protocolo Anti Rechazo", "pdf"),
        ],
      },
    ],
  },
];

export const allLatamLessons = latamProducts.flatMap((product) =>
  product.sections.flatMap((section) =>
    section.lessons.map((item) => ({ product, section, lesson: item })),
  ),
);

export const findProductBySlug = (slug: string | undefined) =>
  latamProducts.find((product) => product.slug === slug) || null;

export const countLessons = (product: LatamProduct) =>
  product.sections.reduce((total, section) => total + section.lessons.length, 0);

const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

/**
 * Fallback usado apenas quando VITE_SUPABASE_URL não está configurada
 * (dev local sem backend). Sem Supabase não há como saber o que cada
 * e-mail comprou de verdade, então os flags `unlocked` abaixo são fixos
 * pra todo mundo — isso é só uma prévia estática, não o fluxo real.
 */
export const toPurchaseFromCatalogProduct = (
  product: LatamProduct,
  completedLessonIds: Set<string>,
): Purchase => ({
  id: product.slug,
  product_settings_id: product.id,
  product_name: product.title,
  product_description: product.description,
  product_image_url: resolveProductImage(product.id, assetUrl(product.imageUrl)),
  access_url: `/miembros/producto/${product.slug}`,
  checkout_url: product.kind === "kit" ? "pending-latam-checkout" : "pending-latam",
  purchase_date: "2026-08-10T00:00:00.000Z",
  amount: null,
  purchased: product.unlocked,
  pdf_url: null,
  modules: product.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({
      id: lesson.id,
      module_name: lesson.title,
      pdf_url: null,
      has_pdf: lesson.type === "pdf",
      video_url: null,
      has_video: lesson.type === "video",
      audio_url: null,
      has_audio: lesson.type === "audio",
      is_published: true,
      media_status: "in_production",
      completed: completedLessonIds.has(lesson.id),
    })),
  ),
  sections: product.sections.map((section) => ({
    key: section.slug,
    number: section.number,
    title: section.title,
    subtitle: section.description,
    kind: (section.number === "01" ? "welcome" : "track") as SectionKind,
    status: "available",
    moduleIds: section.lessons.map((lesson) => lesson.id),
    image_url: resolveSectionImage(product.id, section.slug, null),
  })),
});
