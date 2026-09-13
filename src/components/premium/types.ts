import type { ApiCourseSection } from "@/config/courseSections";

export interface PurchaseModule {
  id: string;
  module_name: string;
  pdf_url: string | null;
  has_pdf: boolean;
  video_url: string | null;
  has_video: boolean;
  video_provider?: "youtube" | "vturb";
  audio_url?: string | null;
  has_audio?: boolean;
  is_published?: boolean;
  media_status?: "ready" | "in_production" | "production" | string | null;
  completed: boolean;
  /** PR ADMIN 6E: jsonb cru do DB; passar pro resolveConsultoriaConfig. */
  consultoria_config?: unknown;
  /** PR ADMIN 6I: URL pública da imagem de capa custom; null = front usa fallback. */
  cover_image_url?: string | null;
}

export interface Purchase {
  id: string;
  product_settings_id?: string;
  product_name: string;
  product_description: string;
  product_image_url: string;
  access_url: string;
  checkout_url: string;
  purchase_date: string | null;
  amount: string | null;
  purchased: boolean;
  bonus_grant?: {
    source_product_settings_id: string;
    source_product_name: string;
  } | null;
  pdf_url: string | null;
  modules: PurchaseModule[];
  /**
   * Sections vindas do members-api (DB-driven, PR ADMIN 3). Quando
   * presente, front prioriza esse shape e faz merge com config local
   * pra grafar placeholders. Quando undefined, fallback total ao
   * courseSections.ts.
   */
  sections?: ApiCourseSection[];
  /**
   * PR ADMIN 6A: rating (0.0-5.0) e número de avaliações editáveis no admin.
   * Null = card usa fallback hardcoded (4.9 / 11939).
   */
  rating?: number | null;
  reviews_count?: number | null;
  /** PR ADMIN 6E: jsonb cru do DB; passa pro resolver. */
  consultoria_config?: unknown;
  /** PR ADMIN 6H: jsonb cru do DB; passa pro resolveUpsellCta. */
  upsell_cta_config?: unknown;
}

/**
 * PR ADMIN 6H: forma resolvida da CTA de compra exibida pra leads
 * não-compradores no card do produto. Vem do `product_settings.upsell_cta_config`
 * com defaults aplicados pelo helper `resolveUpsellCta`.
 */
export interface ResolvedUpsellCta {
  enabled: boolean;
  message: string;
  buttonLabel: string;
  buttonColor: string;
}

export type ModuleState = "completed" | "current" | "next" | "locked" | "soon";

export type PremiumCardVariant = "owned" | "locked" | "soon" | "upsell";
