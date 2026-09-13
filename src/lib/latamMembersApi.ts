import type { Purchase } from "@/components/premium/types";
import type { SectionKind, SectionStatus } from "@/config/courseSections";
import { resolveProductImage } from "./productImageOverrides";
import { resolveSectionImage } from "./sectionImageOverrides";
import { latamProducts, toPurchaseFromCatalogProduct } from "./latamCatalog";
import { hasHomologationAccess, readProgress } from "./latamAccess";

export interface LatamApiModule {
  id: string;
  section_id: string | null;
  module_name: string;
  module_order: number;
  media_status: string;
  is_published: boolean;
  video_provider: "youtube" | "vturb";
  video_url: string | null;
  has_video: boolean;
  has_pdf: boolean;
  has_audio: boolean;
  pdf_url: string | null;
  audio_url: string | null;
  cover_image_url: string | null;
  completed: boolean;
}

export interface LatamApiSection {
  key: string;
  number: string;
  title: string;
  subtitle: string;
  status: string;
  moduleIds: string[];
  image_url: string | null;
}

export interface LatamApiProduct {
  id: string;
  slug: string;
  product_settings_id: string;
  product_name: string;
  product_description: string;
  product_image_url: string | null;
  product_kind: string;
  checkout_url: string | null;
  access_url: string | null;
  purchased: boolean;
  modules: LatamApiModule[];
  sections: LatamApiSection[];
}

export type LatamAccessResponse = {
  buyer_name: string | null;
  purchasedCount: number;
  totalCount: number;
  products: LatamApiProduct[];
};

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const hasSupabaseMembersApi = () =>
  Boolean(SUPABASE_URL);

const callMembersApi = async (action: string, body: Record<string, unknown>) => {
  const authHeaders = SUPABASE_PUBLISHABLE_KEY
    ? {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      }
    : {};

  const response = await fetch(`${SUPABASE_URL}/functions/v1/members-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "No fue posible completar la solicitud.");
  }
  return payload;
};

export const verifyLatamMemberAccess = async (email: string): Promise<LatamAccessResponse> => {
  if (!SUPABASE_URL) {
    throw new Error("Supabase LATAM nao configurado para este ambiente.");
  }

  const payload = await callMembersApi("login", {
    email,
    metadata: { source: "members-es", market: "es_global" },
  });

  return {
    buyer_name: payload?.buyer_name || null,
    purchasedCount: Number(payload?.purchasedCount || 0),
    totalCount: Number(payload?.totalCount || 0),
    products: Array.isArray(payload?.products) ? payload.products : [],
  };
};

export const completeLatamModule = async (email: string, moduleId: string): Promise<void> => {
  if (!SUPABASE_URL) return;
  await callMembersApi("complete_module", { email, module_id: moduleId });
};

/** Converte um produto vindo do members-api pro shape `Purchase` usado pelos componentes premium. */
export const toPurchaseFromApiProduct = (product: LatamApiProduct): Purchase => ({
  id: product.slug,
  product_settings_id: product.product_settings_id,
  product_name: product.product_name,
  product_description: product.product_description,
  product_image_url: resolveProductImage(product.product_settings_id, product.product_image_url),
  access_url: product.access_url || `/miembros/producto/${product.slug}`,
  checkout_url: product.checkout_url || "pending-latam",
  purchase_date: null,
  amount: null,
  purchased: product.purchased,
  pdf_url: null,
  modules: product.modules.map((module) => ({
    id: module.id,
    module_name: module.module_name,
    pdf_url: module.pdf_url,
    has_pdf: module.has_pdf,
    video_url: module.video_url,
    has_video: module.has_video,
    video_provider: module.video_provider,
    audio_url: module.audio_url,
    has_audio: module.has_audio,
    is_published: module.is_published,
    media_status: module.media_status,
    completed: module.completed,
    cover_image_url: module.cover_image_url,
  })),
  sections: product.sections.map((section) => ({
    key: section.key,
    number: section.number,
    title: section.title,
    subtitle: section.subtitle,
    kind: (section.number === "01" ? "welcome" : "track") as SectionKind,
    status: section.status as SectionStatus,
    moduleIds: section.moduleIds,
    image_url: resolveSectionImage(product.product_settings_id, section.key, section.image_url),
  })),
});

/**
 * Ponto único de carregamento de produtos pro member area: usa o
 * members-api real quando Supabase está configurado, senão cai no
 * catálogo estático local (preview sem backend).
 */
export const loadLatamPurchases = async (
  email: string,
): Promise<{ buyerName: string | null; purchases: Purchase[] }> => {
  if (hasSupabaseMembersApi()) {
    const access = await verifyLatamMemberAccess(email);
    if (access.purchasedCount <= 0) {
      throw new Error("No encontramos una compra activa para este e-mail.");
    }
    return {
      buyerName: access.buyer_name,
      purchases: access.products.map(toPurchaseFromApiProduct),
    };
  }

  if (!hasHomologationAccess(email)) {
    throw new Error("Este preview solo está liberado para el e-mail de homologación.");
  }
  const completed = readProgress(email);
  return {
    buyerName: null,
    purchases: latamProducts.map((product) => toPurchaseFromCatalogProduct(product, completed)),
  };
};
