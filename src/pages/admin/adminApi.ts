/**
 * Cliente da admin-api. Autenticação simples por senha compartilhada
 * (ADMIN_PASSWORD no Supabase) — enviada em cada request, validada
 * server-side.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function supabaseAuthHeaders(): Record<string, string> {
  if (!SUPABASE_PUBLISHABLE_KEY) return {};
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  };
}

export interface AdminModule {
  id: string;
  product_settings_id: string;
  section_id: string | null;
  slug: string;
  module_name: string;
  module_order: number;
  media_status: string;
  is_published: boolean;
  video_provider: "youtube" | "vturb";
  video_url: string | null;
  pdf_file_path: string | null;
  audio_file_path: string | null;
  cover_image_path: string | null;
  has_video: boolean;
  has_pdf: boolean;
  has_audio: boolean;
}

export interface AdminSection {
  id: string;
  product_settings_id: string;
  slug: string;
  title: string;
  description: string;
  section_number: string;
  image_path: string | null;
  status: string;
  display_order: number;
}

export type AdminProductKind = "main" | "bonus" | "audio" | "kit";

export interface AdminProduct {
  id: string;
  slug: string;
  product_name: string;
  product_description: string;
  product_image_path: string | null;
  product_image_url: string | null;
  product_kind: AdminProductKind | string;
  gateway_product_id: string;
  checkout_url: string | null;
  access_url: string | null;
  is_visible: boolean;
  display_order: number;
  product_sections: AdminSection[];
  product_modules: AdminModule[];
}

// =============================================================================
// Tipos usados por AdminDashboard.tsx / AdminQuizFunnel.tsx (analytics).
// Essas telas não fazem parte do escopo do admin-api reescrito (produtos,
// módulos, aulas, upload de mídia) e continuam sem backend correspondente —
// mantidas aqui só pra não quebrar a build dessas páginas legadas.
// =============================================================================

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
    answers: Array<{ answerId: string; label: string; sessions: number; share: number }>;
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
  daily: Array<{ date: string; sessions: number; checkoutClicks: number; purchases: number; revenue?: number }>;
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

export class AdminApiAuthError extends Error {
  constructor(message: string = "Senha incorreta") {
    super(message);
    this.name = "AdminApiAuthError";
  }
}

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

async function adminApiUpload<T = unknown>(formData: FormData): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-api`, {
    method: "POST",
    headers: { ...supabaseAuthHeaders() },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AdminApiAuthError(data?.error);
  if (!res.ok) throw new Error(data?.error || "Erro ao fazer upload");
  return data as T;
}

export async function adminUploadProductImage(params: {
  password: string;
  productId: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "product_image");
  formData.append("product_id", params.productId);
  formData.append("image", params.file);
  return adminApiUpload(formData);
}

export async function adminUploadSectionImage(params: {
  password: string;
  sectionId: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "section_image");
  formData.append("section_id", params.sectionId);
  formData.append("image", params.file);
  return adminApiUpload(formData);
}

export async function adminUploadModuleCoverImage(params: {
  password: string;
  moduleId: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "module_cover_image");
  formData.append("module_id", params.moduleId);
  formData.append("image", params.file);
  return adminApiUpload(formData);
}

export async function adminUploadModulePdf(params: {
  password: string;
  moduleId: string;
  file: File;
}): Promise<{ success: boolean; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "module_pdf");
  formData.append("module_id", params.moduleId);
  formData.append("file", params.file);
  return adminApiUpload(formData);
}

/**
 * Mantido por compatibilidade com AdminAppearance.tsx (tela de aparência do
 * site, fora do escopo do admin-api atual — a ação "hero_banner_image" não
 * está implementada no backend, então esta chamada retorna erro tratável).
 */
export async function adminUploadHeroBanner(params: {
  password: string;
  file: File;
}): Promise<{ success: boolean; image_url: string; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "hero_banner_image");
  formData.append("image", params.file);
  return adminApiUpload(formData);
}

export async function adminUploadModuleAudio(params: {
  password: string;
  moduleId: string;
  file: File;
}): Promise<{ success: boolean; file_path: string }> {
  const formData = new FormData();
  formData.append("password", params.password);
  formData.append("kind", "module_audio");
  formData.append("module_id", params.moduleId);
  formData.append("file", params.file);
  return adminApiUpload(formData);
}
