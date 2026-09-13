/**
 * Shared API helper + types pra todas as rotas do admin.
 * Centraliza a chamada da admin-api edge function.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function supabaseAuthHeaders(): Record<string, string> {
  if (!SUPABASE_ANON_KEY) return {};
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export interface AdminModule {
  id: string;
  product_id: string;
  module_name: string;
  pdf_file_path: string | null;
  video_url: string | null;
  audio_file_path: string | null;
  is_published: boolean;
  display_order: number;
  /** PR ADMIN 6I: URL pÃºblica da capa custom; null = front usa fallback. */
  cover_image_url?: string | null;
}

export type AdminProductKind =
  | "main"
  | "complementary"
  | "order_bump"
  | "upsell"
  | "bonus";

/**
 * PR ADMIN 6C â€” opÃ§Ãµes de tipo do produto pra UI. Sincronizado com a
 * allowlist no admin-api.
 */
export const PRODUCT_KIND_OPTIONS: { value: AdminProductKind; label: string }[] = [
  { value: "main", label: "Principal" },
  { value: "complementary", label: "Complementar" },
  { value: "order_bump", label: "Order bump" },
  { value: "upsell", label: "Upsell" },
  { value: "bonus", label: "BÃ´nus" },
];

export const PRODUCT_KIND_LABEL: Record<string, string> = {
  main: "Principal",
  complementary: "Complementar",
  order_bump: "Order bump",
  upsell: "Upsell",
  bonus: "BÃ´nus",
};

export interface AdminProduct {
  id: string;
  cakto_product_id: string;
  product_name: string;
  product_description: string;
  product_image_url: string;
  visible: boolean;
  checkout_url: string | null;
  display_order: number;
  pdf_file_path: string | null;
  /** PR ADMIN 6A: rating 0-5 (1 casa decimal). null = fallback hardcoded no front. */
  rating: number | null;
  /** PR ADMIN 6A: nÃºmero de avaliaÃ§Ãµes. null = fallback hardcoded no front. */
  reviews_count: number | null;
  /** PR ADMIN 6C: tipo do produto (allowlist). null = nÃ£o definido. */
  product_kind: AdminProductKind | string | null;
  /** PR ADMIN 6E: consultoria config jsonb; null = herda do global. */
  consultoria_config?: unknown;
  /** PR ADMIN 6H: upsell CTA config jsonb; null = front usa defaults. */
  upsell_cta_config?: unknown;
  modules: AdminModule[];
}

export interface AdminAnalytics {
  totalLogins: number;
  uniqueUsers: number;
  productViews: number;
  productClicks: number;
  checkoutClicks: number;
  dailyLogins: Record<string, number>;
  recentAccess: { email: string; created_at: string; metadata: unknown }[];
}

export interface AdminCompletionStats {
  dailyCompletions: Record<string, number>;
  moduleStats: Array<{
    id: string;
    name: string;
    product: string;
    hasVideo: boolean;
    completions: number;
  }>;
  productStats: Array<{ name: string; totalCompletions: number }>;
  todayCompletions: number;
  todayVideoCompletions: number;
  totalVideoCompletions: number;
  videoCompletionUsers: number;
  videoModulesCount: number;
}

export interface AdminQuizFunnelAnalytics {
  period: "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  totalEvents: number;
  uniqueSessions: number;
  totalPurchases?: number;
  totalRevenue?: number;
  trackedCheckoutClicks?: number;
  recoveredCheckoutClicks?: number;
  checkoutClicksWithRecovery?: number;
  stages: Array<{
    key: string;
    label: string;
    sessions: number;
    stepRate: number;
    overallRate: number;
  }>;
  questions: Array<{
    questionId: string;
    title: string;
    order: number;
    phase: number;
    reached: number;
    answered: number;
    abandoned: number;
    answerRate: number;
    arrivalRate: number;
    stepRetention: number;
    answers: Array<{
      answerId: string;
      label: string;
      sessions: number;
      share: number;
    }>;
  }>;
  profileSteps: Array<{
    key: string;
    label: string;
    order: number;
    sessions: number;
    submitted?: number;
    completionRate?: number;
    stepRate: number;
    overallRate: number;
  }>;
  campaigns: Array<{
    source: string;
    medium: string;
    campaign: string;
    content: string;
    sessions: number;
    starts: number;
    completes: number;
    videoStarts: number;
    offerReveals: number;
    checkoutClicks: number;
    purchases: number;
    checkoutRate: number;
    purchaseRate: number;
    revenue: number;
  }>;
  daily: Array<{
    date: string;
    sessions: number;
    checkoutClicks: number;
    purchases: number;
    revenue?: number;
  }>;
  devices: Array<{ name: string; sessions: number }>;
  results: Array<{ name: string; sessions: number }>;
  recentSessions: Array<{
    sessionId: string;
    firstSeenAt: string;
    lastSeenAt: string;
    source: string;
    campaign: string;
    content: string;
    device: string;
    result: string;
    deepestStage: string;
    lastQuestionId: string;
    lastQuestionTitle: string;
    purchaseValue: number;
    purchaseAttributionMethod: string;
    purchaseOrders?: Array<{
      transactionId: string;
      buyerEmail: string;
      productName: string;
      gateway: string;
      purchaseDate: string;
      value: number;
      source: string;
      medium: string;
      campaign: string;
      content: string;
      attributionMethod: string;
      sessionId: string;
    }>;
    durationSeconds: number;
  }>;
  purchases?: Array<{
    transactionId: string;
    buyerEmail: string;
    productName: string;
    gateway: string;
    purchaseDate: string;
    value: number;
    source: string;
    medium: string;
    campaign: string;
    content: string;
    attributionMethod: string;
    sessionId: string;
  }>;
}

export interface AdminAccessDiagnostic {
  email: string;
  activePurchases: number;
  moduleCompletionsCount: number;
  issues: string[];
  purchases: Array<{
    buyer_email: string;
    product_name: string;
    product_settings_id: string | null;
    mapped_product_name: string | null;
    mapped: boolean;
    gateway_product_id: string | number | null;
    transaction_id: string;
    status: string;
    purchase_date: string | null;
  }>;
  unlockedProducts: Array<{
    id: string;
    gateway_product_id: string | null;
    product_name: string;
    visible: boolean;
  }>;
  availableProducts: Array<{
    id: string;
    gateway_product_id: string | null;
    product_name: string;
    visible: boolean;
    alreadyUnlocked: boolean;
  }>;
  recentAccess: Array<{
    action: string;
    cakto_product_id: string | null;
    metadata: unknown;
    created_at: string;
  }>;
  studentProgress: AdminStudentProgress;
}

export interface AdminStudentLessonProgress {
  module_id: string;
  module_name: string;
  section_id: string | null;
  section_number: string | null;
  section_title: string | null;
  lesson_number: number;
  has_video: boolean;
  has_audio: boolean;
  has_pdf: boolean;
  viewed: boolean;
  view_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  completed: boolean;
  completed_at: string | null;
}

export interface AdminStudentProductProgress {
  product_id: string;
  gateway_product_id: string | null;
  product_name: string;
  total_lessons: number;
  viewed_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  last_lesson: (AdminStudentLessonProgress & { product_name?: string }) | null;
  lessons: AdminStudentLessonProgress[];
}

export interface AdminStudentProgress {
  total_lessons: number;
  viewed_lessons: number;
  completed_lessons: number;
  progress_percent: number;
  last_access_at: string | null;
  last_login_at: string | null;
  last_lesson: (AdminStudentLessonProgress & { product_name?: string }) | null;
  consultoria_clicks: number;
  last_consultoria_click_at: string | null;
  products: AdminStudentProductProgress[];
}

// =========================================================================
// PR ADMIN 4 â€” product_sections + lesson_materials types
// =========================================================================

export type AdminSectionKind = "welcome" | "track" | "journey" | "coming-soon";
export type AdminSectionStatus = "available" | "partial" | "in_production";
export type AdminMaterialKind = "pdf" | "audio" | "video" | "link";
export type AdminMaterialState = "ready" | "coming-soon";

export interface AdminProductSection {
  id: string;
  product_id: string;
  section_key: string;
  number: string;
  title: string;
  subtitle: string | null;
  kind: AdminSectionKind | string;
  status: AdminSectionStatus | string;
  display_order: number;
  sequential: boolean;
  in_production_copy: string | null;
  archived: boolean;
  /** PR ADMIN 6B: visual customizations (NULL = fallback no front). */
  image_url: string | null;
  icon_key: string | null;
  accent_color: string | null;
  /** PR ADMIN 6E: consultoria config jsonb por section; null = herda do produto. */
  consultoria_config?: unknown;
  created_at: string;
  updated_at: string;
}

export interface AdminSectionModule {
  id: string;
  module_name: string;
  section_id: string | null;
  section_order: number;
  display_order: number;
  is_published: boolean;
  pdf_file_path: string | null;
  video_url: string | null;
  audio_file_path: string | null;
  /** PR ADMIN 6E: consultoria config jsonb por aula; null = herda da section. */
  consultoria_config?: unknown;
  /** PR ADMIN 6I: URL pÃºblica da capa custom; null = front usa fallback. */
  cover_image_url?: string | null;
}

export interface AdminSectionMaterial {
  id: string;
  section_id: string | null;
  module_id: string | null;
  title: string;
  kind: AdminMaterialKind | string;
  file_path: string | null;
  external_url: string | null;
  display_order: number;
  state: AdminMaterialState | string;
  created_at: string;
}

export interface AdminSectionsResponse {
  sections: AdminProductSection[];
  modules: AdminSectionModule[];
  materials: AdminSectionMaterial[];
}

export interface AdminApiError extends Error {
  status?: number;
}

export class AdminApiAuthError extends Error {
  constructor(message: string = "Senha incorreta") {
    super(message);
    this.name = "AdminApiAuthError";
  }
}

/**
 * Chama a admin-api edge function. Joga AdminApiAuthError quando 401 â€” caller
 * pode usar pra limpar sessÃ£o automaticamente.
 */
export async function adminApi<T = unknown>(body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...supabaseAuthHeaders(),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new AdminApiAuthError(data?.error || "Senha incorreta");
  }
  if (!res.ok) {
    throw new Error(data?.error || `Erro ${res.status}`);
  }
  return data as T;
}

/**
 * Upload de PDF via multipart/form-data. Usado pra modules e products.
 * Retorna { success: true, pdf_file_path } ou throw.
 */
export async function adminUploadPdf(params: {
  password: string;
  moduleId?: string;
  productId?: string;
  file: File;
}): Promise<{ success: boolean; pdf_file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  if (params.moduleId) formData.append("module_id", params.moduleId);
  if (params.productId) formData.append("product_id", params.productId);
  formData.append("kind", "pdf");
  formData.append("pdf", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload");
  return data;
}

/**
 * Upload de Ã¡udio (MP3/M4A/etc) pra um mÃ³dulo. Vai para bucket
 * product-audios (privado), signed URL gerada pela members-api com TTL 1h.
 * Limites: 80MB, MIME audio/*.
 */
/**
 * Upload de Ã¡udio em 3 etapas (suporta arquivos grandes que estouram o
 * limite de ~6MB do body de Edge Function):
 *   1) admin-api gera URL assinada do Storage (bucket product-audios)
 *   2) cliente faz PUT direto pro Storage (nÃ£o passa por edge function)
 *   3) admin-api confirma + UPDATE em product_modules.audio_file_path
 *
 * Aceita callback opcional onProgress pra UI mostrar progresso.
 */
export async function adminUploadAudio(params: {
  password: string;
  moduleId: string;
  file: File;
  onProgress?: (pct: number) => void;
}): Promise<{ success: boolean; audio_file_path: string }> {
  // === 1. Pede signed upload URL ===
  const signed = await adminApi<{
    success: boolean;
    file_path: string;
    signed_url: string;
    token: string;
  }>({
    action: "create_signed_audio_upload_url",
    password: params.password,
    module_id: params.moduleId,
    file_name: params.file.name,
  });

  // === 2. PUT direto pro Storage com a URL assinada ===
  // Usa XHR pra ter progress events; fetch ainda nÃ£o tem ReadableStream
  // de upload bem suportado em todos navegadores.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.signed_url, true);
    xhr.setRequestHeader("Content-Type", params.file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && params.onProgress) {
        params.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(
          new Error(
            `Upload pro Storage falhou (${xhr.status}). ${xhr.responseText || ""}`,
          ),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Erro de rede no upload."));
    xhr.send(params.file);
  });

  // === 3. Confirma â€” admin-api faz UPDATE em product_modules ===
  const confirmed = await adminApi<{
    success: boolean;
    audio_file_path: string;
  }>({
    action: "confirm_module_audio_upload",
    password: params.password,
    module_id: params.moduleId,
    file_path: signed.file_path,
  });

  return confirmed;
}

/**
 * Upload de imagem do produto (PR ADMIN 6A). Vai pro bucket pÃºblico
 * product-images sob prefixo products/{product_id}/. ApÃ³s upload, atualiza
 * product_settings.product_image_url com a URL pÃºblica.
 *
 * Limites: 5MB, MIME image/jpeg|image/png|image/webp.
 */
export async function adminUploadProductImage(params: {
  password: string;
  productId: string;
  file: File;
}): Promise<{ success: boolean; product_image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("product_id", params.productId);
  formData.append("kind", "product_image");
  formData.append("image", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload da imagem");
  return data;
}

/**
 * Upload do hero banner da home (PR ADMIN 6D). Vai pro bucket pÃºblico
 * product-images sob prefixo site/hero-banner/. ApÃ³s upload, admin-api
 * atualiza site.hero_banner_json.image_url automaticamente.
 *
 * Limites: 5MB, MIME image/jpeg|png|webp.
 */
export async function adminUploadHeroBanner(params: {
  password: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "hero_banner_image");
  formData.append("image", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload do banner");
  return data;
}

/**
 * Upload de imagem da section (PR ADMIN 6B). Vai pro bucket pÃºblico
 * product-images sob prefixo sections/{section_id}/. ApÃ³s upload,
 * atualiza product_sections.image_url com a URL pÃºblica.
 *
 * Limites: 5MB, MIME image/jpeg|png|webp.
 */
export async function adminUploadSectionImage(params: {
  password: string;
  sectionId: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("section_id", params.sectionId);
  formData.append("kind", "section_image");
  formData.append("image", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload da imagem da section");
  return data;
}

/**
 * PR ADMIN 6I: upload da imagem de capa de uma aula. Bucket pÃºblico
 * product-images, prefixo modules/{module_id}/cover-{ts}.{ext}. Limite
 * 5MB, MIME image/jpeg|png|webp. ApÃ³s upload, retorna a URL pÃºblica
 * que vai pra product_modules.cover_image_url.
 */
export async function adminUploadModuleCoverImage(params: {
  password: string;
  moduleId: string;
  file: File;
}): Promise<{ success: boolean; cover_image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("module_id", params.moduleId);
  formData.append("kind", "module_cover_image");
  formData.append("image", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload da imagem da aula");
  return data;
}

/**
 * Upload de PDF pra um lesson_material. Vai para o mesmo bucket product-pdfs
 * sob prefixo materials/{material_id}/. ApÃ³s upload, atualiza file_path +
 * kind='pdf' + state='ready' no material. PDF max 20MB.
 */
export async function adminUploadMaterialPdf(params: {
  password: string;
  materialId: string;
  file: File;
}): Promise<{ success: boolean; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("material_id", params.materialId);
  formData.append("kind", "material_pdf");
  formData.append("file", params.file);

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: {
      ...supabaseAuthHeaders(),
    },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload do material");
  return data;
}

