import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || crypto.randomUUID().slice(0, 8);

const PRODUCT_IMAGE_BUCKET = "latam-product-images";
const PDF_BUCKET = "latam-product-pdfs";
const AUDIO_BUCKET = "latam-product-audios";

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 20 * 1024 * 1024;
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

const sha256Hex = async (text: string): Promise<string> => {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const randomToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase env" }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const contentType = req.headers.get("content-type") || "";
  let action: string;
  let password: string;
  let body: Record<string, unknown> = {};
  let formData: FormData | null = null;

  if (contentType.includes("multipart/form-data")) {
    formData = await req.formData();
    password = String(formData.get("password") || "");
    action = String(formData.get("kind") || "");
  } else {
    body = await req.json().catch(() => ({}));
    password = String(body.password || "");
    action = String(body.action || "");
  }

  const { data: passwordSetting } = await db
    .from("admin_settings")
    .select("value")
    .eq("key", "admin.password_hash")
    .maybeSingle();
  const storedHash = passwordSetting?.value as string | undefined;
  if (!storedHash) return json({ error: "Admin password not initialized (run migrations)" }, 500);
  if ((await sha256Hex(password)) !== storedHash) return json({ error: "Senha incorreta" }, 401);

  try {
    switch (action) {
      case "change_password": {
        const newPassword = String(body.new_password || "");
        if (newPassword.length < 8) {
          return json({ error: "A nova senha precisa ter no mínimo 8 caracteres" }, 400);
        }
        const newHash = await sha256Hex(newPassword);
        const { error } = await db
          .from("admin_settings")
          .update({ value: newHash, updated_at: new Date().toISOString() })
          .eq("key", "admin.password_hash");
        if (error) throw error;
        return json({ success: true });
      }

      case "get_settings": {
        const { data: tokenSetting } = await db
          .from("admin_settings")
          .select("value")
          .eq("key", "perfectpay.webhook_token")
          .maybeSingle();
        return json({
          perfectpay_webhook_url: `${supabaseUrl}/functions/v1/perfectpay-webhook`,
          perfectpay_webhook_token: tokenSetting?.value || null,
        });
      }

      case "regenerate_perfectpay_token": {
        const newToken = randomToken();
        const { error } = await db
          .from("admin_settings")
          .update({ value: newToken, updated_at: new Date().toISOString() })
          .eq("key", "perfectpay.webhook_token");
        if (error) throw error;
        return json({ success: true, perfectpay_webhook_token: newToken });
      }

      case "list_site_settings": {
        const { data, error } = await db
          .from("admin_settings")
          .select("key, value")
          .like("key", "site.%");
        if (error) throw error;
        return json({ settings: data || [] });
      }

      case "bulk_update_site_settings": {
        const settings = Array.isArray(body.settings) ? body.settings : [];
        for (const row of settings) {
          const key = String((row as { key?: unknown })?.key || "");
          const value = String((row as { value?: unknown })?.value ?? "");
          if (!key.startsWith("site.")) continue;
          const { error } = await db
            .from("admin_settings")
            .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
          if (error) throw error;
        }
        return json({ success: true });
      }

      case "update_site_setting": {
        const key = String(body.key || "");
        const value = String(body.value ?? "");
        if (!key.startsWith("site.")) return json({ error: "key inválida" }, 400);
        const { error } = await db
          .from("admin_settings")
          .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
        if (error) throw error;
        return json({ success: true });
      }

      case "remove_hero_banner_image": {
        const { data: existing } = await db
          .from("admin_settings")
          .select("value")
          .eq("key", "site.hero_banner_json")
          .maybeSingle();
        let config: Record<string, unknown> = {};
        try {
          config = existing?.value ? JSON.parse(existing.value as string) : {};
        } catch {
          config = {};
        }
        config.image_url = "";
        const { error } = await db
          .from("admin_settings")
          .upsert(
            { key: "site.hero_banner_json", value: JSON.stringify(config), updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
        if (error) throw error;
        return json({ success: true });
      }

      // ===================================================================
      // Analytics / diagnostics
      // ===================================================================
      case "get_analytics": {
        const period = String(body.period || "7d");
        const days = period === "90d" ? 90 : period === "30d" ? 30 : 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs, error } = await db
          .from("access_logs")
          .select("email, action, created_at, metadata")
          .gte("created_at", since)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const loginLogs = (logs || []).filter((l) => l.action === "login");
        const dailyLogins: Record<string, number> = {};
        for (const l of loginLogs) {
          const day = String(l.created_at).slice(0, 10);
          dailyLogins[day] = (dailyLogins[day] || 0) + 1;
        }

        return json({
          totalLogins: loginLogs.length,
          uniqueUsers: new Set(loginLogs.map((l) => l.email)).size,
          // Not tracked anywhere in the current frontend (no view/click
          // instrumentation on product cards or checkout links) — honest
          // zero rather than a fabricated number.
          productViews: 0,
          productClicks: 0,
          checkoutClicks: 0,
          dailyLogins,
          recentAccess: (logs || [])
            .slice(0, 20)
            .map((l) => ({ email: l.email, created_at: l.created_at, metadata: l.metadata })),
        });
      }

      case "get_module_completions": {
        const { data: completions, error } = await db
          .from("module_completions")
          .select("email, module_id, completed_at, product_settings_id")
          .order("completed_at", { ascending: false });
        if (error) throw error;

        const { data: modules } = await db
          .from("product_modules")
          .select("id, module_name, product_settings_id, has_video, is_published");
        const { data: products } = await db.from("product_settings").select("id, product_name");

        const moduleById = new Map((modules || []).map((m) => [m.id, m]));
        const productById = new Map((products || []).map((p) => [p.id, p]));

        const totalModulesAvailable = (modules || []).filter((m) => m.is_published).length;
        const videoModulesCount = (modules || []).filter((m) => m.has_video).length;

        const userCompletions: Record<
          string,
          { total: number; modules: { name: string; product: string; completed_at: string }[] }
        > = {};
        const dailyCompletions: Record<string, number> = {};
        const moduleCompletionCounts = new Map<string, number>();
        const productCompletionCounts = new Map<string, number>();
        let todayCompletions = 0;
        let todayVideoCompletions = 0;
        let totalVideoCompletions = 0;
        const videoCompletionUsers = new Set<string>();
        const todayStr = new Date().toISOString().slice(0, 10);

        for (const c of completions || []) {
          const mod = moduleById.get(c.module_id);
          const prodName = productById.get(c.product_settings_id)?.product_name || "Produto removido";
          const modName = mod?.module_name || "Aula removida";

          if (!userCompletions[c.email]) userCompletions[c.email] = { total: 0, modules: [] };
          userCompletions[c.email].total += 1;
          userCompletions[c.email].modules.push({ name: modName, product: prodName, completed_at: c.completed_at });

          const day = String(c.completed_at).slice(0, 10);
          dailyCompletions[day] = (dailyCompletions[day] || 0) + 1;
          if (day === todayStr) todayCompletions += 1;

          moduleCompletionCounts.set(c.module_id, (moduleCompletionCounts.get(c.module_id) || 0) + 1);
          if (c.product_settings_id) {
            productCompletionCounts.set(
              c.product_settings_id,
              (productCompletionCounts.get(c.product_settings_id) || 0) + 1,
            );
          }

          if (mod?.has_video) {
            totalVideoCompletions += 1;
            videoCompletionUsers.add(c.email);
            if (day === todayStr) todayVideoCompletions += 1;
          }
        }

        const moduleStats = Array.from(moduleCompletionCounts.entries()).map(([id, completions]) => {
          const mod = moduleById.get(id);
          return {
            id,
            name: mod?.module_name || "Aula removida",
            product: productById.get(mod?.product_settings_id || "")?.product_name || "",
            hasVideo: !!mod?.has_video,
            completions,
          };
        });

        const productStats = Array.from(productCompletionCounts.entries()).map(([id, totalCompletions]) => ({
          name: productById.get(id)?.product_name || "Produto removido",
          totalCompletions,
        }));

        return json({
          userCompletions,
          totalModulesAvailable,
          dailyCompletions,
          moduleStats,
          productStats,
          todayCompletions,
          todayVideoCompletions,
          totalVideoCompletions,
          videoCompletionUsers: videoCompletionUsers.size,
          videoModulesCount,
        });
      }

      case "diagnose_member_access": {
        const email = String(body.email || "").trim().toLowerCase();
        if (!email) return json({ error: "email é obrigatório" }, 400);

        const { data: purchases } = await db
          .from("purchases")
          .select("*, product_settings(product_name)")
          .eq("email", email);

        const { data: allProducts } = await db
          .from("product_settings")
          .select("id, product_name, gateway_product_id, is_visible")
          .order("display_order", { ascending: true });

        const activePurchaseProductIds = new Set(
          (purchases || []).filter((p) => p.status === "active").map((p) => p.product_settings_id),
        );

        const unlockedProducts = (allProducts || [])
          .filter((p) => activePurchaseProductIds.has(p.id))
          .map((p) => ({
            id: p.id,
            gateway_product_id: p.gateway_product_id,
            product_name: p.product_name,
            visible: p.is_visible,
          }));

        const availableProducts = (allProducts || []).map((p) => ({
          id: p.id,
          gateway_product_id: p.gateway_product_id,
          product_name: p.product_name,
          visible: p.is_visible,
          alreadyUnlocked: activePurchaseProductIds.has(p.id),
        }));

        const { data: completions } = await db
          .from("module_completions")
          .select("module_id, completed_at, product_settings_id")
          .eq("email", email);

        const { data: recentAccess } = await db
          .from("access_logs")
          .select("action, metadata, created_at")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(20);

        const issues: string[] = [];
        if ((purchases || []).length === 0) issues.push("Nenhuma compra encontrada para este e-mail.");
        const unmapped = (purchases || []).filter((p) => !p.product_settings_id);
        if (unmapped.length > 0) issues.push(`${unmapped.length} compra(s) sem produto mapeado.`);

        const { data: modules } = await db
          .from("product_modules")
          .select(
            "id, module_name, module_order, section_id, product_settings_id, has_video, has_pdf, has_audio, is_published",
          );
        const { data: sections } = await db.from("product_sections").select("id, title, section_number");
        const sectionById = new Map((sections || []).map((s) => [s.id, s]));
        const completionByModule = new Map((completions || []).map((c) => [c.module_id, c.completed_at]));

        const productsProgress = (allProducts || [])
          .filter((p) => activePurchaseProductIds.has(p.id))
          .map((p) => {
            const productModules = (modules || []).filter(
              (m) => m.product_settings_id === p.id && m.is_published,
            );
            const lessons = productModules
              .sort((a, b) => a.module_order - b.module_order)
              .map((m, idx) => {
                const completedAt = (completionByModule.get(m.id) as string | undefined) || null;
                const section = m.section_id ? sectionById.get(m.section_id) : null;
                return {
                  module_id: m.id,
                  module_name: m.module_name,
                  section_id: m.section_id,
                  section_number: section?.section_number || null,
                  section_title: section?.title || null,
                  lesson_number: idx + 1,
                  has_video: m.has_video,
                  has_audio: m.has_audio,
                  has_pdf: m.has_pdf,
                  viewed: !!completedAt,
                  view_count: completedAt ? 1 : 0,
                  first_viewed_at: completedAt,
                  last_viewed_at: completedAt,
                  completed: !!completedAt,
                  completed_at: completedAt,
                };
              });
            const completedLessons = lessons.filter((l) => l.completed).length;
            const lastLesson =
              lessons
                .filter((l) => l.completed_at)
                .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1))[0] || null;
            return {
              product_id: p.id,
              gateway_product_id: p.gateway_product_id,
              product_name: p.product_name,
              total_lessons: lessons.length,
              viewed_lessons: completedLessons,
              completed_lessons: completedLessons,
              progress_percent: lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0,
              last_lesson: lastLesson ? { ...lastLesson, product_name: p.product_name } : null,
              lessons,
            };
          });

        const totalLessons = productsProgress.reduce((sum, p) => sum + p.total_lessons, 0);
        const viewedLessons = productsProgress.reduce((sum, p) => sum + p.viewed_lessons, 0);
        const completedLessonsTotal = productsProgress.reduce((sum, p) => sum + p.completed_lessons, 0);
        const allLastLessons = productsProgress.map((p) => p.last_lesson).filter(Boolean) as Array<{
          completed_at: string | null;
        }>;
        allLastLessons.sort((a, b) => (String(b.completed_at) > String(a.completed_at) ? 1 : -1));

        const lastLoginLog = (recentAccess || []).find((l) => l.action === "login");

        const studentProgress = {
          total_lessons: totalLessons,
          viewed_lessons: viewedLessons,
          completed_lessons: completedLessonsTotal,
          progress_percent: totalLessons > 0 ? Math.round((completedLessonsTotal / totalLessons) * 100) : 0,
          last_access_at: recentAccess?.[0]?.created_at || null,
          last_login_at: lastLoginLog?.created_at || null,
          last_lesson: allLastLessons[0] || null,
          consultoria_clicks: 0,
          last_consultoria_click_at: null,
          products: productsProgress,
        };

        return json({
          email,
          activePurchases: activePurchaseProductIds.size,
          moduleCompletionsCount: (completions || []).length,
          issues,
          purchases: (purchases || []).map((p) => ({
            buyer_email: p.email,
            product_name:
              (p as { product_settings?: { product_name?: string } }).product_settings?.product_name ||
              "Desconhecido",
            product_settings_id: p.product_settings_id,
            mapped_product_name:
              (p as { product_settings?: { product_name?: string } }).product_settings?.product_name || null,
            mapped: !!p.product_settings_id,
            gateway_product_id: null,
            transaction_id: p.gateway_purchase_id || p.id,
            status: p.status,
            purchase_date: p.created_at,
          })),
          unlockedProducts,
          availableProducts,
          recentAccess: (recentAccess || []).map((l) => ({
            action: l.action,
            cakto_product_id: null,
            metadata: l.metadata,
            created_at: l.created_at,
          })),
          studentProgress,
        });
      }

      case "grant_member_access": {
        const email = String(body.email || "").trim().toLowerCase();
        const productId = String(body.product_settings_id || "");
        if (!email || !productId) return json({ error: "email e product_settings_id são obrigatórios" }, 400);
        const { error } = await db.from("purchases").insert({
          email,
          product_settings_id: productId,
          gateway_purchase_id: `manual-${productId}-${Date.now()}`,
          status: "active",
          metadata: { source: "admin_manual_grant" },
        });
        if (error) throw error;
        return json({ success: true });
      }

      case "get_quiz_funnel_analytics": {
        // quiz_funnel_events belongs to the old landing/VSL funnel app, not
        // this members-area repo — nothing here writes to it, so this is
        // an honest empty state rather than fabricated numbers.
        const { count } = await db.from("quiz_funnel_events").select("id", { count: "exact", head: true });
        return json({
          period: String(body.period || "7d"),
          totalEvents: count || 0,
          uniqueSessions: 0,
          stages: [],
          questions: [],
          profileSteps: [],
          campaigns: [],
          daily: [],
          devices: [],
          results: [],
          recentSessions: [],
        });
      }

      // ===================================================================
      // Products
      // ===================================================================
      case "get_products": {
        const { data, error } = await db
          .from("product_settings")
          .select("*, product_sections(*), product_modules(*)")
          .order("display_order", { ascending: true });
        if (error) throw error;
        const products = (data || []).map((product) => ({
          ...product,
          product_image_url: product.product_image_path
            ? db.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(product.product_image_path).data.publicUrl
            : null,
          product_sections: (product.product_sections || []).sort(
            (a: { display_order: number }, b: { display_order: number }) =>
              a.display_order - b.display_order,
          ),
          product_modules: (product.product_modules || [])
            .sort(
              (a: { module_order: number }, b: { module_order: number }) =>
                a.module_order - b.module_order,
            )
            .map((module: { cover_image_path: string | null }) => ({
              ...module,
              cover_image_url: module.cover_image_path
                ? db.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(module.cover_image_path).data.publicUrl
                : null,
            })),
        }));
        return json({ products });
      }

      case "create_product": {
        const productName = String(body.product_name || "").trim();
        const gatewayProductId = String(body.gateway_product_id || "").trim();
        if (!productName) return json({ error: "product_name é obrigatório" }, 400);
        if (!gatewayProductId) return json({ error: "gateway_product_id é obrigatório" }, 400);

        const { count } = await db
          .from("product_settings")
          .select("id", { count: "exact", head: true });

        const { data, error } = await db
          .from("product_settings")
          .insert({
            slug: String(body.slug || slugify(productName)),
            product_name: productName,
            product_description: String(body.product_description || ""),
            product_kind: body.product_kind ? String(body.product_kind) : "main",
            gateway_product_id: gatewayProductId,
            checkout_url: body.checkout_url ? String(body.checkout_url) : null,
            is_visible: body.is_visible !== false,
            display_order: count ?? 0,
          })
          .select()
          .single();
        if (error) throw error;
        return json({ product: data });
      }

      case "update_product": {
        const productId = String(body.product_id || "");
        if (!productId) return json({ error: "product_id é obrigatório" }, 400);
        const patch: Record<string, unknown> = {};
        for (const field of [
          "product_name",
          "product_description",
          "slug",
          "gateway_product_id",
          "checkout_url",
          "access_url",
          "product_kind",
          "is_visible",
          "display_order",
        ]) {
          if (field in body) patch[field] = body[field];
        }
        const { data, error } = await db
          .from("product_settings")
          .update(patch)
          .eq("id", productId)
          .select()
          .single();
        if (error) throw error;
        return json({ product: data });
      }

      case "delete_product": {
        const productId = String(body.product_id || "");
        if (!productId) return json({ error: "product_id é obrigatório" }, 400);
        const { error } = await db.from("product_settings").delete().eq("id", productId);
        if (error) throw error;
        return json({ success: true });
      }

      // ===================================================================
      // Sections
      // ===================================================================
      case "create_section": {
        const productId = String(body.product_id || "");
        const title = String(body.title || "").trim();
        if (!productId || !title) return json({ error: "product_id e title são obrigatórios" }, 400);

        const { count } = await db
          .from("product_sections")
          .select("id", { count: "exact", head: true })
          .eq("product_settings_id", productId);
        const order = count ?? 0;

        const { data, error } = await db
          .from("product_sections")
          .insert({
            product_settings_id: productId,
            slug: String(body.slug || slugify(title)),
            title,
            description: String(body.description || ""),
            section_number: String(body.section_number || String(order + 1).padStart(2, "0")),
            display_order: order,
            status: "available",
          })
          .select()
          .single();
        if (error) throw error;
        return json({ section: data });
      }

      case "update_section": {
        const sectionId = String(body.section_id || "");
        if (!sectionId) return json({ error: "section_id é obrigatório" }, 400);
        const patch: Record<string, unknown> = {};
        for (const field of [
          "title",
          "description",
          "slug",
          "section_number",
          "status",
          "display_order",
        ]) {
          if (field in body) patch[field] = body[field];
        }
        const { data, error } = await db
          .from("product_sections")
          .update(patch)
          .eq("id", sectionId)
          .select()
          .single();
        if (error) throw error;
        return json({ section: data });
      }

      case "delete_section": {
        const sectionId = String(body.section_id || "");
        if (!sectionId) return json({ error: "section_id é obrigatório" }, 400);
        const { error } = await db.from("product_sections").delete().eq("id", sectionId);
        if (error) throw error;
        return json({ success: true });
      }

      // ===================================================================
      // Modules (lessons)
      // ===================================================================
      case "create_module": {
        const productId = String(body.product_id || "");
        const moduleName = String(body.module_name || "").trim();
        if (!productId || !moduleName)
          return json({ error: "product_id e module_name são obrigatórios" }, 400);

        const videoProvider = body.video_provider === "vturb" ? "vturb" : "youtube";
        const videoUrl = body.video_url ? String(body.video_url).trim() : null;

        const { count } = await db
          .from("product_modules")
          .select("id", { count: "exact", head: true })
          .eq("product_settings_id", productId);
        const order = count ?? 0;

        const { data, error } = await db
          .from("product_modules")
          .insert({
            product_settings_id: productId,
            section_id: body.section_id ? String(body.section_id) : null,
            slug: String(body.slug || slugify(moduleName)),
            module_name: moduleName,
            module_order: typeof body.module_order === "number" ? body.module_order : order,
            video_provider: videoProvider,
            video_url: videoUrl,
            has_video: Boolean(videoUrl),
            is_published: body.is_published !== false,
          })
          .select()
          .single();
        if (error) throw error;
        return json({ module: data });
      }

      case "update_module": {
        const moduleId = String(body.module_id || "");
        if (!moduleId) return json({ error: "module_id é obrigatório" }, 400);
        const patch: Record<string, unknown> = {};
        for (const field of [
          "module_name",
          "slug",
          "section_id",
          "module_order",
          "is_published",
          "media_status",
        ]) {
          if (field in body) patch[field] = body[field];
        }
        if ("video_provider" in body) {
          patch.video_provider = body.video_provider === "vturb" ? "vturb" : "youtube";
        }
        if ("video_url" in body) {
          const videoUrl = body.video_url ? String(body.video_url).trim() : null;
          patch.video_url = videoUrl;
          patch.has_video = Boolean(videoUrl);
        }
        const { data, error } = await db
          .from("product_modules")
          .update(patch)
          .eq("id", moduleId)
          .select()
          .single();
        if (error) throw error;
        return json({ module: data });
      }

      case "delete_module": {
        const moduleId = String(body.module_id || "");
        if (!moduleId) return json({ error: "module_id é obrigatório" }, 400);
        const { error } = await db.from("product_modules").delete().eq("id", moduleId);
        if (error) throw error;
        return json({ success: true });
      }

      // ===================================================================
      // File uploads (multipart/form-data)
      // ===================================================================
      case "product_image":
      case "section_image":
      case "module_cover_image": {
        if (!formData) return json({ error: "Upload requer multipart/form-data" }, 400);
        const file = formData.get("image");
        if (!(file instanceof File)) return json({ error: "Arquivo 'image' é obrigatório" }, 400);
        if (file.size > IMAGE_MAX_BYTES) return json({ error: "Imagem excede 5MB" }, 400);
        if (!file.type.startsWith("image/")) return json({ error: "Arquivo precisa ser uma imagem" }, 400);

        const targetId =
          action === "product_image"
            ? String(formData.get("product_id") || "")
            : action === "section_image"
              ? String(formData.get("section_id") || "")
              : String(formData.get("module_id") || "");
        if (!targetId) return json({ error: "ID do alvo é obrigatório" }, 400);

        const prefix =
          action === "product_image" ? "products" : action === "section_image" ? "sections" : "modules";
        const filePath = `${prefix}/${targetId}/${Date.now()}-${slugify(file.name)}`;

        const { error: uploadError } = await db.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = db.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);
        const imageUrl = publicUrlData.publicUrl;

        const table =
          action === "product_image" ? "product_settings" : action === "section_image" ? "product_sections" : "product_modules";
        const column =
          action === "product_image" ? "product_image_path" : action === "section_image" ? "image_path" : "cover_image_path";
        const { error: updateError } = await db.from(table).update({ [column]: filePath }).eq("id", targetId);
        if (updateError) throw updateError;

        return json({ success: true, image_url: imageUrl, file_path: filePath });
      }

      case "hero_banner_image": {
        if (!formData) return json({ error: "Upload requer multipart/form-data" }, 400);
        const file = formData.get("image");
        if (!(file instanceof File)) return json({ error: "Arquivo 'image' é obrigatório" }, 400);
        if (file.size > IMAGE_MAX_BYTES) return json({ error: "Imagem excede 5MB" }, 400);
        if (!file.type.startsWith("image/")) return json({ error: "Arquivo precisa ser uma imagem" }, 400);

        const filePath = `site/hero-banner/${Date.now()}-${slugify(file.name)}`;
        const { error: uploadError } = await db.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = db.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filePath);
        const imageUrl = publicUrlData.publicUrl;

        const { data: existing } = await db
          .from("admin_settings")
          .select("value")
          .eq("key", "site.hero_banner_json")
          .maybeSingle();
        let config: Record<string, unknown> = {};
        try {
          config = existing?.value ? JSON.parse(existing.value as string) : {};
        } catch {
          config = {};
        }
        config.image_url = imageUrl;
        config.enabled = true;

        const { error: upsertError } = await db
          .from("admin_settings")
          .upsert(
            { key: "site.hero_banner_json", value: JSON.stringify(config), updated_at: new Date().toISOString() },
            { onConflict: "key" },
          );
        if (upsertError) throw upsertError;

        return json({ success: true, image_url: imageUrl, file_path: filePath });
      }

      case "module_pdf":
      case "module_audio": {
        if (!formData) return json({ error: "Upload requer multipart/form-data" }, 400);
        const moduleId = String(formData.get("module_id") || "");
        if (!moduleId) return json({ error: "module_id é obrigatório" }, 400);
        const file = formData.get("file");
        if (!(file instanceof File)) return json({ error: "Arquivo 'file' é obrigatório" }, 400);

        const isPdf = action === "module_pdf";
        const maxBytes = isPdf ? PDF_MAX_BYTES : AUDIO_MAX_BYTES;
        if (file.size > maxBytes) {
          return json({ error: `Arquivo excede ${Math.round(maxBytes / 1024 / 1024)}MB` }, 400);
        }

        const bucket = isPdf ? PDF_BUCKET : AUDIO_BUCKET;
        const filePath = `modules/${moduleId}/${Date.now()}-${slugify(file.name)}`;
        const { error: uploadError } = await db.storage
          .from(bucket)
          .upload(filePath, await file.arrayBuffer(), { contentType: file.type, upsert: true });
        if (uploadError) throw uploadError;

        const column = isPdf ? "pdf_file_path" : "audio_file_path";
        const flagColumn = isPdf ? "has_pdf" : "has_audio";
        const { error: updateError } = await db
          .from("product_modules")
          .update({ [column]: filePath, [flagColumn]: true })
          .eq("id", moduleId);
        if (updateError) throw updateError;

        return json({ success: true, file_path: filePath });
      }

      default:
        return json({ error: `Ação desconhecida: ${action}` }, 400);
    }
  } catch (error) {
    console.error("admin-api error", error);
    const message =
      (error as { message?: string } | null)?.message || String(error) || "Erro interno";
    return json({ error: message }, 500);
  }
});
