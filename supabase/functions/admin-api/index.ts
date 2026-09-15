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
          product_modules: (product.product_modules || []).sort(
            (a: { module_order: number }, b: { module_order: number }) =>
              a.module_order - b.module_order,
          ),
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
            is_published: Boolean(body.is_published),
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
