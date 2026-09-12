// =========================================================================
// members-api — Edge Function (Phase 2B)
// =========================================================================
// Substitui cakto-orders. Não consulta API externa (Cakto, Ticto). Lê
// somente do banco local (purchases, product_settings, product_modules,
// module_completions) e gera signed URLs para storage privado.
//
// Request shape (mesma de cakto-orders pra minimizar mudança no front):
//   { email, action?, cakto_product_id?, module_id? }
//
// Comportamento por action:
//   - undefined / "login":    autentica por email, retorna products + modules
//   - "complete_module":      marca módulo como concluído (upsert)
//   - "product_click" / "checkout_click" / "product_view": insere access_logs
//
// Os webhooks (Phase 4 — ticto-webhook) populam purchases com
// product_settings_id já resolvido, eliminando a necessidade de chamar
// API do gateway de pagamento.
// =========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hora — TTL curto pra prevenir compartilhamento eterno

const MAIN_PRODUCT_SETTINGS_ID = "5b4f7475-d8cc-46d6-99d7-6a7a8c47b101";
const MAIN_PRODUCT_NAME = "El Código de la Reconquista";
const JOGO_CIUME_PRODUCT_SETTINGS_ID = "ab9d9354-3230-4a5b-9794-4d5534556202";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

interface SettingRow {
  id: string;
  cakto_product_id: string;
  product_name: string;
  product_description: string | null;
  product_image_url: string | null;
  checkout_url: string | null;
  pdf_file_path: string | null;
  display_order: number;
  visible: boolean;
  rating: number | null;
  reviews_count: number | null;
  // PR ADMIN 6C
  product_kind: string | null;
  // PR ADMIN 6E
  consultoria_config: any | null;
  // PR ADMIN 6H
  upsell_cta_config: any | null;
}

interface ModuleRow {
  id: string;
  product_id: string;
  module_name: string;
  pdf_file_path: string | null;
  video_url: string | null;
  audio_file_path: string | null;
  is_published: boolean;
  display_order: number;
  section_id: string | null;
  section_order: number;
  // PR ADMIN 6E
  consultoria_config: any | null;
  // PR ADMIN 6I
  cover_image_url: string | null;
}

interface SectionRow {
  id: string;
  product_id: string;
  section_key: string;
  number: string;
  title: string;
  subtitle: string | null;
  kind: string;
  status: string;
  display_order: number;
  sequential: boolean;
  in_production_copy: string | null;
  // PR ADMIN 6B
  image_url: string | null;
  icon_key: string | null;
  accent_color: string | null;
  // PR ADMIN 6E
  consultoria_config: any | null;
}

interface MaterialRow {
  id: string;
  section_id: string | null;
  module_id: string | null;
  title: string;
  kind: string;
  file_path: string | null;
  external_url: string | null;
  display_order: number;
  state: string;
}

async function signFromBucket(
  supabase: any,
  bucket: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error(`signed URL error (${bucket}):`, error?.message || "no url");
    return null;
  }
  if (data.signedUrl.startsWith("http")) return data.signedUrl;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  return `${supabaseUrl}/storage/v1${data.signedUrl}`;
}

const signPdf = (supabase: any, path: string | null) =>
  signFromBucket(supabase, "product-pdfs", path);

const signAudio = (supabase: any, path: string | null) =>
  signFromBucket(supabase, "product-audios", path);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      email,
      action: logAction,
      cakto_product_id: logProductId,
      module_id,
      media_type,
    } = body;
    const rawMetadata = body?.metadata;
    const metadata =
      rawMetadata &&
      typeof rawMetadata === "object" &&
      !Array.isArray(rawMetadata) &&
      JSON.stringify(rawMetadata).length <= 2048
        ? rawMetadata
        : null;

    const supabase = getSupabaseAdmin();

    // --- Module completion ---
    if (logAction === "complete_module" && module_id && email) {
      const trimmedEmail = String(email).trim().toLowerCase();
      const { error } = await supabase.from("module_completions").upsert(
        { email: trimmedEmail, module_id },
        { onConflict: "email,module_id" }
      );
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      await supabase.from("access_logs").insert({
        email: trimmedEmail,
        action: "complete_module",
        cakto_product_id: logProductId || null,
        metadata,
      });
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Fresh signed media URL ---
    // Revalida a compra no momento em que o aluno abre o material. Isso evita
    // depender da URL gerada no login, que expira após uma hora.
    if (logAction === "get_module_media") {
      if (!email || typeof email !== "string" || !module_id) {
        return new Response(
          JSON.stringify({ error: "Email e módulo são obrigatórios." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (media_type !== "pdf" && media_type !== "audio") {
        return new Response(
          JSON.stringify({ error: "Tipo de mídia inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const trimmedEmail = email.trim().toLowerCase();
      const { data: module, error: moduleError } = await supabase
        .from("product_modules")
        .select("id, product_id, module_name, pdf_file_path, audio_file_path, is_published")
        .eq("id", module_id)
        .maybeSingle();

      if (moduleError || !module || module.is_published === false) {
        return new Response(
          JSON.stringify({ error: "Material não encontrado ou indisponível." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: product, error: productError } = await supabase
        .from("product_settings")
        .select("id, product_name")
        .eq("id", module.product_id)
        .maybeSingle();

      if (productError || !product) {
        return new Response(
          JSON.stringify({ error: "Produto não encontrado." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: purchases, error: purchasesError } = await supabase
        .from("purchases")
        .select("product_settings_id, product_name")
        .eq("buyer_email", trimmedEmail)
        .eq("status", "active");

      if (purchasesError) {
        return new Response(
          JSON.stringify({ error: "Não foi possível validar seu acesso." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const hasDirectAccess = (purchases || []).some(
        (purchase: any) =>
          purchase.product_settings_id === product.id ||
          purchase.product_name === product.product_name,
      );
      const hasMainProduct = (purchases || []).some(
        (purchase: any) =>
          purchase.product_settings_id === MAIN_PRODUCT_SETTINGS_ID ||
          purchase.product_name === MAIN_PRODUCT_NAME,
      );
      const hasBonusAccess =
        product.id === JOGO_CIUME_PRODUCT_SETTINGS_ID && hasMainProduct;

      if (!hasDirectAccess && !hasBonusAccess) {
        await supabase.from("access_logs").insert({
          email: trimmedEmail,
          action: `${media_type}_access_denied`,
          metadata: { moduleId: module.id, productSettingsId: product.id },
        });
        return new Response(
          JSON.stringify({ error: "Este material não está liberado para seu e-mail." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const filePath =
        media_type === "pdf" ? module.pdf_file_path : module.audio_file_path;
      if (!filePath) {
        return new Response(
          JSON.stringify({ error: "Arquivo ainda não disponível." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const url =
        media_type === "pdf"
          ? await signPdf(supabase, filePath)
          : await signAudio(supabase, filePath);

      if (!url) {
        await supabase.from("access_logs").insert({
          email: trimmedEmail,
          action: `${media_type}_sign_failed`,
          metadata: { moduleId: module.id, productSettingsId: product.id },
        });
        return new Response(
          JSON.stringify({ error: "Não foi possível abrir o arquivo agora. Tente novamente." }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      await supabase.from("access_logs").insert({
        email: trimmedEmail,
        action: `${media_type}_open`,
        metadata: {
          moduleId: module.id,
          moduleName: module.module_name,
          productSettingsId: product.id,
        },
      });

      return new Response(
        JSON.stringify({
          url,
          expires_in: SIGNED_URL_TTL_SECONDS,
          module_name: module.module_name,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Site settings (PR ADMIN 5) ---
    // Endpoint PÚBLICO (sem email obrigatório): retorna apenas keys com
    // prefix "site." de admin_settings. NUNCA expõe admin_password ou
    // outras keys sem prefix site. — service_role acessa a tabela inteira,
    // mas o filtro WHERE LIKE 'site.%' garante allowlist.
    if (logAction === "get_site_settings") {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("key, value")
        .like("key", "site.%");
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Defesa em profundidade: filtra novamente client-side caso .like
      // tenha sido contornado de alguma forma. Apenas keys site.* passam.
      const safe = (data || []).filter(
        (r: any) => typeof r.key === "string" && r.key.startsWith("site."),
      );
      const settings: Record<string, string> = {};
      for (const row of safe) settings[row.key] = String(row.value ?? "");
      return new Response(
        JSON.stringify({ settings }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Generic logging action ---
    if (logAction && logAction !== "login") {
      await supabase.from("access_logs").insert({
        email: email ? String(email).trim().toLowerCase() : "unknown",
        action: logAction,
        cakto_product_id: logProductId || null,
        metadata,
      });
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Login flow: validate email and return products ---
    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const trimmedEmail = email.trim().toLowerCase();

    // Best-effort login log; ignore failures (RLS permitted, but resilient)
    supabase.from("access_logs").insert({ email: trimmedEmail, action: "login" }).then(
      () => {},
      () => {}
    );

    // Fetch in parallel: settings, modules, completions, purchases, sections, materials
    const [
      settingsResult,
      modulesResult,
      completionsResult,
      purchasesResult,
      sectionsResult,
      materialsResult,
    ] = await Promise.all([
      supabase
        .from("product_settings")
        .select("*")
        .eq("visible", true)
        .order("display_order"),
      supabase
        .from("product_modules")
        .select("*")
        .order("display_order"),
      supabase
        .from("module_completions")
        .select("*")
        .eq("email", trimmedEmail),
      supabase
        .from("purchases")
        .select("buyer_email, product_settings_id, product_name, transaction_id, status, purchase_date, raw_payload")
        .eq("buyer_email", trimmedEmail)
        .eq("status", "active"),
      // PR ADMIN 3: sections + materials lidos do DB. Se vazio (tabelas
      // ainda não migradas ou produto não-seedado), front faz fallback ao
      // courseSections.ts config local.
      //
      // PR ADMIN 4: filtra archived=false pra esconder sections arquivadas
      // soft-delete via Admin UI sem perder dados.
      supabase
        .from("product_sections")
        .select("*")
        .eq("archived", false)
        .order("display_order"),
      supabase
        .from("lesson_materials")
        .select("*")
        .order("display_order"),
    ]);

    const settings: SettingRow[] = settingsResult.data || [];
    const allModules: ModuleRow[] = modulesResult.data || [];
    const completions = completionsResult.data || [];
    const purchases = purchasesResult.data || [];
    const allSections: SectionRow[] = sectionsResult.data || [];
    const allMaterials: MaterialRow[] = materialsResult.data || [];

    const completedModuleIds = new Set<string>(completions.map((c: any) => c.module_id));

    // Build modules-by-product map
    const modulesByProductId: Record<string, ModuleRow[]> = {};
    for (const m of allModules) {
      if (!modulesByProductId[m.product_id]) modulesByProductId[m.product_id] = [];
      modulesByProductId[m.product_id].push(m);
    }

    // Build sections-by-product + materials-by-section maps (PR ADMIN 3)
    const sectionsByProductId: Record<string, SectionRow[]> = {};
    for (const sec of allSections) {
      if (!sectionsByProductId[sec.product_id]) sectionsByProductId[sec.product_id] = [];
      sectionsByProductId[sec.product_id].push(sec);
    }
    const materialsBySectionId: Record<string, MaterialRow[]> = {};
    for (const mat of allMaterials) {
      if (!mat.section_id) continue;
      if (!materialsBySectionId[mat.section_id]) materialsBySectionId[mat.section_id] = [];
      materialsBySectionId[mat.section_id].push(mat);
    }

    // Build purchased-product map by product_settings_id (primary) AND product_name (fallback for legacy rows)
    const purchasedSettingsIds = new Set<string>();
    const purchaseBySettingsId = new Map<string, any>();
    const purchaseByName = new Map<string, any>();
    for (const p of purchases) {
      if (p.product_settings_id) {
        purchasedSettingsIds.add(p.product_settings_id);
        if (!purchaseBySettingsId.has(p.product_settings_id)) {
          purchaseBySettingsId.set(p.product_settings_id, p);
        }
      }
      if (p.product_name && !purchaseByName.has(p.product_name)) {
        purchaseByName.set(p.product_name, p);
      }
    }

    const mainPurchaseRow =
      purchaseBySettingsId.get(MAIN_PRODUCT_SETTINGS_ID) ||
      purchaseByName.get(MAIN_PRODUCT_NAME) ||
      null;
    const hasMainProduct =
      purchasedSettingsIds.has(MAIN_PRODUCT_SETTINGS_ID) ||
      purchaseByName.has(MAIN_PRODUCT_NAME);

    // Build response products
    const products: any[] = [];
    for (const s of settings) {
      const purchasedById = purchasedSettingsIds.has(s.id);
      const purchasedByName = !purchasedById && purchaseByName.has(s.product_name);
      const grantedAsCodeBonus =
        hasMainProduct &&
        s.id === JOGO_CIUME_PRODUCT_SETTINGS_ID &&
        !purchasedById &&
        !purchasedByName;
      const purchased = purchasedById || purchasedByName || grantedAsCodeBonus;
      const purchaseRow = purchasedById
        ? purchaseBySettingsId.get(s.id)
        : purchasedByName
          ? purchaseByName.get(s.product_name)
          : grantedAsCodeBonus
            ? mainPurchaseRow
            : null;

      const productModules = modulesByProductId[s.id] || [];

      // Build modules: signed URLs (PDF + audio) only for purchased (TTL 1h)
      const modules = await Promise.all(productModules.map(async (m) => ({
        id: m.id,
        module_name: m.module_name,
        pdf_url: purchased ? await signPdf(supabase, m.pdf_file_path) : null,
        has_pdf: !!m.pdf_file_path,
        video_url: m.video_url || null,
        has_video: !!m.video_url,
        audio_url: purchased ? await signAudio(supabase, m.audio_file_path) : null,
        has_audio: !!m.audio_file_path,
        is_published: m.is_published !== false, // default true se schema antigo
        // PR ADMIN 6I: capa custom por aula (null = front usa fallback)
        cover_image_url: m.cover_image_url || null,
        completed: completedModuleIds.has(m.id),
        // PR ADMIN 6E: consultoria_config — null = herda da section/produto/global
        consultoria_config: m.consultoria_config ?? null,
      })));

      // Legacy single PDF support (product_settings.pdf_file_path)
      const legacyPdfUrl = purchased ? await signPdf(supabase, s.pdf_file_path) : null;

      // PR ADMIN 3: build sections from DB (shape compatível com courseSections.ts).
      // placeholders[] sempre vazio aqui — DB ainda não tem schema pra placeholders;
      // front faz merge com config local pra preservar aulas "em produção".
      const productDBSections = sectionsByProductId[s.id] || [];
      const sections = productDBSections.length > 0
        ? productDBSections.map((sec) => {
            const sectionModules = productModules
              .filter((m) => m.section_id === sec.id)
              .sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0));
            const sectionMaterials = (materialsBySectionId[sec.id] || []).map((mat) => ({
              title: mat.title,
              kind: mat.kind,
              state: mat.state,
            }));
            return {
              key: sec.section_key,
              number: sec.number,
              title: sec.title,
              subtitle: sec.subtitle || "",
              kind: sec.kind,
              status: sec.status,
              moduleIds: sectionModules.map((m) => m.id),
              materials: sectionMaterials.length > 0 ? sectionMaterials : undefined,
              sequential: sec.sequential,
              in_production_copy: sec.in_production_copy || undefined,
              // PR ADMIN 6B: visuais editáveis (null se admin não preencheu)
              image_url: sec.image_url || null,
              icon_key: sec.icon_key || null,
              accent_color: sec.accent_color || null,
              // PR ADMIN 6E: consultoria_config — null = herda do produto/global
              consultoria_config: sec.consultoria_config ?? null,
            };
          })
        : undefined;

      products.push({
        id: s.cakto_product_id, // mantém shape antiga pra não quebrar o front
        product_settings_id: s.id,
        product_name: s.product_name,
        product_description: s.product_description || "",
        product_image_url: s.product_image_url || "",
        access_url: "", // Phase 2B: sem access_url externo (era da API Cakto); webhook futuro pode popular raw_payload
        checkout_url: s.checkout_url || "",
        purchase_date: purchaseRow?.purchase_date || null,
        amount: null, // sem dados de cobrança nesta fase
        // PR ADMIN 6A: rating/reviews_count — null = front usa fallback hardcoded
        rating: s.rating !== null && s.rating !== undefined ? Number(s.rating) : null,
        reviews_count: s.reviews_count !== null && s.reviews_count !== undefined ? Number(s.reviews_count) : null,
        // PR ADMIN 6C: product_kind — null = "não definido" (sem efeito visual no front atual)
        product_kind: s.product_kind || null,
        // PR ADMIN 6E: consultoria_config — null = herda do global
        consultoria_config: s.consultoria_config ?? null,
        // PR ADMIN 6H: upsell_cta_config — null = front usa defaults
        upsell_cta_config: s.upsell_cta_config ?? null,
        purchased,
        bonus_grant: grantedAsCodeBonus
          ? {
              source_product_settings_id: MAIN_PRODUCT_SETTINGS_ID,
              source_product_name: MAIN_PRODUCT_NAME,
            }
          : null,
        pdf_url: legacyPdfUrl,
        modules,
        sections, // undefined se DB não tem sections pro produto — front cai no config
      });
    }

    // Sort: purchased first, then catalog
    products.sort((a: any, b: any) => (a.purchased === b.purchased ? 0 : a.purchased ? -1 : 1));

    // Extract buyer_name from most recent active purchase's raw_payload.customer.name
    // (Ticto V2 webhook stores raw payload; first active purchase suffices since
    // it's the same buyer email across all purchases).
    let buyer_name: string | null = null;
    for (const p of purchases) {
      const candidate = p?.raw_payload?.customer?.name;
      if (typeof candidate === "string" && candidate.trim()) {
        buyer_name = candidate.trim();
        break;
      }
    }

    return new Response(
      JSON.stringify({
        products,
        purchasedCount: products.filter((p) => p.purchased).length,
        totalCount: products.length,
        buyer_name,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("members-api error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
