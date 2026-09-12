// =========================================================================
// admin-api — Edge Function (Phase 2B refactor)
// =========================================================================
// Painel admin pra gerenciar produtos, módulos, uploads de PDF e
// analytics. Não consulta API externa (Cakto removido na Phase 2B).
//
// Auth: senha plain comparada contra admin_settings.value
// (key='admin_password'). Senha NÃO é setada por migration. Para usar
// admin panel, é necessário INSERT manual via SQL Editor com bcrypt hash.
// Phase 2B mantém compatibilidade com a comparação plain antiga; Phase
// futura migra pra bcrypt verify quando senha for definida.
// =========================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BCRYPT_HASH_PREFIX_REGEX = /^\$2[abxy]\$/;

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

/**
 * Verifica senha admin contra hash bcrypt armazenado em admin_settings.
 *
 * Regras de segurança (Phase 2C):
 *  - Se admin_settings.value ausente ou vazio → deny-all (admin não configurado).
 *  - Se valor não começa com prefixo bcrypt válido ($2a$/$2b$/$2x$/$2y$) →
 *    deny-all (legado de admin123 ou string suspeita, não autenticar).
 *  - Caso contrário: compara senha em texto com hash via bcrypt.compareSync.
 *
 * Senha é apenas no request body; nunca logada. Hash é só lido, nunca exposto
 * em response.
 */
async function verifyAdmin(supabase: any, password: string): Promise<boolean> {
  if (!password || typeof password !== "string") return false;
  const { data, error } = await supabase
    .from("admin_settings")
    .select("value")
    .eq("key", "admin_password")
    .single();
  if (error || !data?.value) return false;
  const storedHash = String(data.value);
  if (!BCRYPT_HASH_PREFIX_REGEX.test(storedHash)) return false;
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch (_e) {
    return false;
  }
}

// =========================================================================
// PR ADMIN 6E — Validador comum de consultoria_config (jsonb)
// =========================================================================
//
// Aceita:
//   - undefined → não toca no campo (não inclui no UPDATE)
//   - null     → seta NULL (semântica "herda do nível superior")
//   - object   → valida shape e retorna sanitizado
//
// Retorna { ok: true, value } pra incluir no UPDATE, ou
// { ok: false, error } pra abortar com 400.
//
// Limite defensivo: 8KB no JSON stringificado.
const ALLOWED_MODE = ["inherit", "enabled", "disabled"] as const;

function validateConsultoriaConfig(
  raw: unknown,
):
  | { skip: true }
  | { skip: false; value: null }
  | { skip: false; value: Record<string, unknown> }
  | { error: string } {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { skip: false, value: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "consultoria_config deve ser objeto JSON ou null" };
  }
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  // mode
  if ("mode" in obj) {
    const m = obj.mode;
    if (typeof m !== "string" || !ALLOWED_MODE.includes(m as any)) {
      return { error: `consultoria_config.mode inválido. Aceitos: ${ALLOWED_MODE.join(", ")}.` };
    }
    out.mode = m;
  }
  // booleans
  for (const k of ["showBelow", "showSidebar", "useGlobalCopy"]) {
    if (k in obj) {
      if (typeof obj[k] !== "boolean") {
        return { error: `consultoria_config.${k} deve ser boolean.` };
      }
      out[k] = obj[k];
    }
  }
  // strings (copy override) — null OK pra "sem override"
  for (const k of ["title", "body", "cta", "helperText", "url"]) {
    if (k in obj) {
      const v = obj[k];
      if (v === null) {
        out[k] = null;
      } else if (typeof v === "string") {
        const trimmed = v;
        if (trimmed.length > 4096) {
          return { error: `consultoria_config.${k} acima de 4096 chars.` };
        }
        // Valida URL se for o campo url e não estiver vazio
        if (k === "url" && trimmed.trim()) {
          try {
            const u = new URL(trimmed.trim());
            if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
          } catch {
            return { error: "consultoria_config.url deve ser URL HTTP(S) válida." };
          }
        }
        out[k] = trimmed;
      } else {
        return { error: `consultoria_config.${k} deve ser string ou null.` };
      }
    }
  }

  // Limite defensivo no payload total
  if (JSON.stringify(out).length > 8 * 1024) {
    return { error: "consultoria_config acima de 8KB." };
  }
  return { skip: false, value: out };
}

// =========================================================================
// PR ADMIN 6H — Validador de upsell_cta_config (jsonb).
// Aceita { enabled, message, button_label, button_color }.
// undefined → skip (não modifica), null → reseta pra usar defaults do front,
// objeto → valida campo a campo.
// =========================================================================
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function validateUpsellCtaConfig(
  raw: unknown,
):
  | { skip: true }
  | { skip: false; value: null }
  | { skip: false; value: Record<string, unknown> }
  | { error: string } {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { skip: false, value: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "upsell_cta_config deve ser objeto JSON ou null" };
  }
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if ("enabled" in obj) {
    if (typeof obj.enabled !== "boolean") {
      return { error: "upsell_cta_config.enabled deve ser boolean." };
    }
    out.enabled = obj.enabled;
  }
  if ("message" in obj) {
    const v = obj.message;
    if (v === null) {
      out.message = null;
    } else if (typeof v === "string") {
      if (v.length > 200) {
        return { error: "upsell_cta_config.message acima de 200 chars." };
      }
      out.message = v;
    } else {
      return { error: "upsell_cta_config.message deve ser string ou null." };
    }
  }
  if ("button_label" in obj) {
    const v = obj.button_label;
    if (v === null) {
      out.button_label = null;
    } else if (typeof v === "string") {
      if (v.length > 40) {
        return { error: "upsell_cta_config.button_label acima de 40 chars." };
      }
      out.button_label = v;
    } else {
      return { error: "upsell_cta_config.button_label deve ser string ou null." };
    }
  }
  if ("button_color" in obj) {
    const v = obj.button_color;
    if (v === null) {
      out.button_color = null;
    } else if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed === "") {
        out.button_color = null;
      } else if (!HEX_COLOR_RE.test(trimmed)) {
        return { error: "upsell_cta_config.button_color deve ser hex no formato #RRGGBB." };
      } else {
        out.button_color = trimmed.toLowerCase();
      }
    } else {
      return { error: "upsell_cta_config.button_color deve ser string hex ou null." };
    }
  }

  if (JSON.stringify(out).length > 4 * 1024) {
    return { error: "upsell_cta_config acima de 4KB." };
  }
  return { skip: false, value: out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = getSupabaseAdmin();

  try {
    const contentType = req.headers.get("content-type") || "";

    // ---- multipart: file upload to module / material / product image / section image ----
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const password = formData.get("password") as string;
      const moduleId = formData.get("module_id") as string;
      const materialId = formData.get("material_id") as string | null;
      const productId = formData.get("product_id") as string | null;
      const sectionId = formData.get("section_id") as string | null;
      // kind: "pdf" (default, back-compat), "audio", "material_pdf", "product_image" (PR 6A),
      //       "section_image" (PR 6B), "hero_banner_image" (PR 6D)
      const kind = (formData.get("kind") as string | null) || "pdf";
      const file =
        kind === "audio"
          ? ((formData.get("audio") as File | null) ?? (formData.get("file") as File | null))
          : kind === "product_image" || kind === "section_image" || kind === "hero_banner_image" || kind === "module_cover_image"
            ? ((formData.get("image") as File | null) ?? (formData.get("file") as File | null))
            : (formData.get("pdf") as File | null) ?? (formData.get("file") as File | null);

      const isAdmin = await verifyAdmin(supabase, password);
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Senha incorreta" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // product_image path exige product_id (vai pra product_settings)
      if (kind === "product_image" && (!file || !productId)) {
        return new Response(
          JSON.stringify({ error: "Arquivo e product_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // section_image path exige section_id (vai pra product_sections)
      if (kind === "section_image" && (!file || !sectionId)) {
        return new Response(
          JSON.stringify({ error: "Arquivo e section_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // hero_banner_image só exige file (PR ADMIN 6D — global do site)
      if (kind === "hero_banner_image" && !file) {
        return new Response(
          JSON.stringify({ error: "Arquivo é obrigatório" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // module_cover_image: imagem de capa por aula (PR 6I). Vai pra product_modules.
      if (kind === "module_cover_image" && (!file || !moduleId)) {
        return new Response(
          JSON.stringify({ error: "Arquivo e module_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // material_pdf path NÃO exige module_id (vai pra lesson_materials)
      if (
        kind !== "material_pdf" &&
        kind !== "product_image" &&
        kind !== "section_image" &&
        kind !== "hero_banner_image" &&
        kind !== "module_cover_image" &&
        (!file || !moduleId)
      ) {
        return new Response(
          JSON.stringify({ error: "Arquivo e module_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (kind === "material_pdf" && (!file || !materialId)) {
        return new Response(
          JSON.stringify({ error: "Arquivo e material_id são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (kind === "audio") {
        // === Audio upload (bucket product-audios) ===
        const allowedAudioMime = [
          "audio/mpeg",
          "audio/mp3",
          "audio/mp4",
          "audio/x-m4a",
          "audio/aac",
          "audio/wav",
          "audio/ogg",
          "audio/webm",
        ];
        if (!allowedAudioMime.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: `Tipo de áudio não suportado: ${file.type}. Aceitos: MP3, M4A, AAC, WAV, OGG.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // 500MB cap (audiobooks longos em alta qualidade podem chegar a ~200MB).
        // Bucket também subido pra 500MB via migration. Edge function tem
        // default ~256MB-512MB de request body — pode estourar em conexões
        // lentas; se acontecer, otimizar com signed direct upload futuro.
        const MAX = 500 * 1024 * 1024;
        if (file.size > MAX) {
          return new Response(
            JSON.stringify({ error: "Arquivo de áudio acima de 500MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Preserve extension from filename for clarity
        const ext = (file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `audios/${moduleId}/${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-audios")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from("product_modules")
          .update({ audio_file_path: filePath, updated_at: new Date().toISOString() })
          .eq("id", moduleId);
        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, audio_file_path: filePath, kind: "audio" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Product image upload (bucket product-images, público) ===
      // PR ADMIN 6A: imagem do card do produto. Bucket público pra evitar
      // signed URLs com TTL curto (cards aparecem antes do login).
      if (kind === "product_image") {
        const allowedImageMime = ["image/jpeg", "image/png", "image/webp"];
        if (!file || !allowedImageMime.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: `Tipo de imagem inválido (${file?.type || "desconhecido"}). Aceitos: JPEG, PNG, WebP.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const MAX_IMG = 5 * 1024 * 1024;
        if (file.size > MAX_IMG) {
          return new Response(
            JSON.stringify({ error: "Imagem acima de 5MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `products/${productId}/${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        // Bucket é público — gera URL pública direta (sem signing)
        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        const publicUrl = pub?.publicUrl || "";

        const { error: updateError } = await supabase
          .from("product_settings")
          .update({ product_image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", productId);
        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            product_image_url: publicUrl,
            file_path: filePath,
            kind: "product_image",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Section image upload (bucket product-images, prefixo sections/) ===
      // PR ADMIN 6B: imagem do card de section/módulo. Mesmo bucket público
      // do PR 6A, prefixo separado pra organização.
      if (kind === "section_image") {
        const allowedImageMime = ["image/jpeg", "image/png", "image/webp"];
        if (!file || !allowedImageMime.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: `Tipo de imagem inválido (${file?.type || "desconhecido"}). Aceitos: JPEG, PNG, WebP.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const MAX_IMG = 5 * 1024 * 1024;
        if (file.size > MAX_IMG) {
          return new Response(
            JSON.stringify({ error: "Imagem acima de 5MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `sections/${sectionId}/${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        const publicUrl = pub?.publicUrl || "";

        const { error: updateError } = await supabase
          .from("product_sections")
          .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", sectionId);
        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            image_url: publicUrl,
            file_path: filePath,
            kind: "section_image",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Hero banner image upload (PR ADMIN 6D — site global, bucket product-images) ===
      if (kind === "hero_banner_image") {
        const allowedImageMime = ["image/jpeg", "image/png", "image/webp"];
        if (!file || !allowedImageMime.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: `Tipo de imagem inválido (${file?.type || "desconhecido"}). Aceitos: JPEG, PNG, WebP.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const MAX_IMG = 5 * 1024 * 1024;
        if (file.size > MAX_IMG) {
          return new Response(
            JSON.stringify({ error: "Imagem acima de 5MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        // Path único timestamped pra evitar cache da CDN ficar com versão antiga
        const filePath = `site/hero-banner/${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        const publicUrl = pub?.publicUrl || "";

        // Atualiza site.hero_banner_json mantendo outros campos existentes.
        // Lê current → merge image_url → upsert.
        const { data: currentRow } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "site.hero_banner_json")
          .single();
        let currentJson: any = {};
        if (currentRow?.value) {
          try { currentJson = JSON.parse(currentRow.value); } catch { currentJson = {}; }
        }
        if (!currentJson || typeof currentJson !== "object" || Array.isArray(currentJson)) {
          currentJson = {};
        }
        // Garante enabled=true ao subir imagem (UX: usuário esperaria isso)
        currentJson.image_url = publicUrl;
        if (typeof currentJson.enabled !== "boolean") currentJson.enabled = true;
        const newJson = JSON.stringify(currentJson);

        const { error: upsertError } = await supabase
          .from("admin_settings")
          .upsert({ key: "site.hero_banner_json", value: newJson }, { onConflict: "key" });
        if (upsertError) throw upsertError;

        return new Response(
          JSON.stringify({
            success: true,
            image_url: publicUrl,
            file_path: filePath,
            kind: "hero_banner_image",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Module cover image upload (bucket product-images, público) ===
      // PR ADMIN 6I: imagem de capa por aula. Bucket público pra evitar
      // signed URLs com TTL curto. Prefixo modules/{module_id}/cover-{ts}.{ext}.
      if (kind === "module_cover_image") {
        const allowedImageMime = ["image/jpeg", "image/png", "image/webp"];
        if (!file || !allowedImageMime.includes(file.type)) {
          return new Response(
            JSON.stringify({
              error: `Tipo de imagem inválido (${file?.type || "desconhecido"}). Aceitos: JPEG, PNG, WebP.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const MAX_IMG = 5 * 1024 * 1024;
        if (file.size > MAX_IMG) {
          return new Response(
            JSON.stringify({ error: "Imagem acima de 5MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const filePath = `modules/${moduleId}/cover-${Date.now()}.${ext}`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { data: pub } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);
        const publicUrl = pub?.publicUrl || "";

        const { error: updateError } = await supabase
          .from("product_modules")
          .update({ cover_image_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", moduleId);
        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            success: true,
            cover_image_url: publicUrl,
            file_path: filePath,
            kind: "module_cover_image",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === Material PDF upload (lesson_materials, bucket product-pdfs) ===
      if (kind === "material_pdf") {
        if (!file || file.type !== "application/pdf") {
          return new Response(
            JSON.stringify({ error: "Tipo de arquivo inválido. Esperado PDF." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const MAX_PDF = 20 * 1024 * 1024;
        if (file.size > MAX_PDF) {
          return new Response(
            JSON.stringify({ error: "PDF acima de 20MB." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const filePath = `materials/${materialId}/${Date.now()}.pdf`;
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
          .from("product-pdfs")
          .upload(filePath, arrayBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from("lesson_materials")
          .update({ file_path: filePath, kind: "pdf", state: "ready" })
          .eq("id", materialId);
        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true, file_path: filePath, kind: "material_pdf" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // === PDF upload (bucket product-pdfs) — back-compat path ===
      if (file.type !== "application/pdf") {
        return new Response(
          JSON.stringify({ error: "Tipo de arquivo inválido. Esperado PDF." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const MAX_PDF = 20 * 1024 * 1024;
      if (file.size > MAX_PDF) {
        return new Response(
          JSON.stringify({ error: "PDF acima de 20MB." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const filePath = `modules/${moduleId}/${Date.now()}.pdf`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("product-pdfs")
        .upload(filePath, arrayBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("product_modules")
        .update({ pdf_file_path: filePath, updated_at: new Date().toISOString() })
        .eq("id", moduleId);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true, pdf_file_path: filePath, kind: "pdf" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ---- JSON requests ----
    const body = await req.json();
    const { action, password } = body;

    const isAdmin = await verifyAdmin(supabase, password);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      // ---- Products CRUD ----
      case "create_product": {
        // PR ADMIN 6C — Criação manual de produto pelo admin. Validações:
        //  - product_name e cakto_product_id obrigatórios
        //  - cakto_product_id deve ser UNIQUE no DB (constraint do schema)
        //  - product_kind opcional, mas se vier deve estar na allowlist
        //  - rating 0-5 (se preenchido), reviews_count >= 0
        //  - checkout_url precisa ser URL válida se preenchida
        const {
          cakto_product_id,
          product_name,
          product_description,
          product_image_url,
          checkout_url,
          visible,
          display_order,
          rating,
          reviews_count,
          product_kind,
        } = body;
        if (!cakto_product_id || typeof cakto_product_id !== "string" || !cakto_product_id.trim()) {
          return new Response(
            JSON.stringify({ error: "ID do produto na Ticto/Gateway é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!product_name || typeof product_name !== "string" || !product_name.trim()) {
          return new Response(
            JSON.stringify({ error: "Nome do produto é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Validate checkout_url se preenchida
        if (checkout_url && typeof checkout_url === "string" && checkout_url.trim()) {
          try {
            const u = new URL(checkout_url.trim());
            if (u.protocol !== "https:" && u.protocol !== "http:") {
              throw new Error("protocol");
            }
          } catch {
            return new Response(
              JSON.stringify({ error: "checkout_url deve ser uma URL HTTP(S) válida" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        // Validate rating
        let ratingValue: number | null = null;
        if (rating !== undefined && rating !== null && rating !== "") {
          const n = Number(rating);
          if (Number.isNaN(n) || n < 0 || n > 5) {
            return new Response(
              JSON.stringify({ error: "rating deve estar entre 0 e 5" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          ratingValue = Math.round(n * 10) / 10;
        }
        // Validate reviews_count
        let reviewsValue: number | null = null;
        if (reviews_count !== undefined && reviews_count !== null && reviews_count !== "") {
          const n = Math.floor(Number(reviews_count));
          if (Number.isNaN(n) || n < 0) {
            return new Response(
              JSON.stringify({ error: "reviews_count deve ser inteiro >= 0" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          reviewsValue = n;
        }
        // Validate product_kind (allowlist)
        let kindValue: string | null = null;
        if (product_kind !== undefined && product_kind !== null && product_kind !== "") {
          const allowedKinds = ["main", "complementary", "order_bump", "upsell", "bonus"];
          const v = String(product_kind).trim().toLowerCase();
          if (!allowedKinds.includes(v)) {
            return new Response(
              JSON.stringify({
                error: `product_kind inválido. Aceitos: ${allowedKinds.join(", ")}.`,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          kindValue = v;
        }

        const { data, error } = await supabase
          .from("product_settings")
          .insert({
            cakto_product_id: String(cakto_product_id).trim(),
            product_name: String(product_name).trim(),
            product_description: product_description ? String(product_description) : "",
            product_image_url: product_image_url ? String(product_image_url) : "",
            checkout_url: checkout_url ? String(checkout_url).trim() : null,
            visible: visible !== false,
            display_order: typeof display_order === "number" ? display_order : 0,
            rating: ratingValue,
            reviews_count: reviewsValue,
            product_kind: kindValue,
          })
          .select()
          .single();
        if (error) {
          // Detecta violação de UNIQUE (cakto_product_id já em uso)
          const msg = error.message || "";
          if (msg.includes("duplicate") || msg.includes("unique")) {
            return new Response(
              JSON.stringify({
                error: `Já existe produto com ID Ticto/Gateway "${cakto_product_id}". Use outro ID.`,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw error;
        }
        return new Response(
          JSON.stringify({ success: true, product: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_product": {
        const { product_id } = body;
        if (!product_id) {
          return new Response(
            JSON.stringify({ error: "product_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase.from("product_settings").delete().eq("id", product_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_products": {
        const { data, error } = await supabase
          .from("product_settings")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) throw error;

        const { data: modules, error: modError } = await supabase
          .from("product_modules")
          .select("*")
          .order("display_order", { ascending: true });
        if (modError) throw modError;

        const modulesByProduct: Record<string, any[]> = {};
        for (const m of modules || []) {
          if (!modulesByProduct[m.product_id]) modulesByProduct[m.product_id] = [];
          modulesByProduct[m.product_id].push(m);
        }

        const productsWithModules = (data || []).map((p: any) => ({
          ...p,
          modules: modulesByProduct[p.id] || [],
        }));

        return new Response(
          JSON.stringify({ products: productsWithModules }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_product": {
        const { product_id, visible, checkout_url, display_order, product_name, product_description, product_image_url } = body;
        const updates: any = { updated_at: new Date().toISOString() };
        if (visible !== undefined) updates.visible = visible;
        if (checkout_url !== undefined) updates.checkout_url = checkout_url;
        if (display_order !== undefined) updates.display_order = display_order;
        if (product_name !== undefined) updates.product_name = product_name;
        if (product_description !== undefined) updates.product_description = product_description;
        if (product_image_url !== undefined) updates.product_image_url = product_image_url;

        const { error } = await supabase
          .from("product_settings")
          .update(updates)
          .eq("id", product_id);
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- Modules CRUD ----
      case "create_module": {
        const { product_id, module_name } = body;
        const { data: existing } = await supabase
          .from("product_modules")
          .select("display_order")
          .eq("product_id", product_id)
          .order("display_order", { ascending: false })
          .limit(1);
        const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

        const { data: newModule, error } = await supabase
          .from("product_modules")
          .insert({
            product_id,
            module_name: module_name || "Novo Módulo",
            display_order: nextOrder,
          })
          .select()
          .single();
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, module: newModule }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 6F — Criar aula dentro de section (completa, com order
      // + is_published + video_url opcional). Diferente de create_module
      // (legacy, usado por AdminProductDetail) que não conhece sections.
      // =================================================================

      case "create_product_module": {
        const {
          product_id,
          section_id,
          module_name,
          video_url,
          section_order,
          is_published,
        } = body;
        if (!product_id || typeof product_id !== "string") {
          return new Response(
            JSON.stringify({ error: "product_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!module_name || typeof module_name !== "string" || !module_name.trim()) {
          return new Response(
            JSON.stringify({ error: "module_name é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // section_id é opcional (aulas sem section ficam soltas — legacy
        // path), mas se vier, precisa ser uma string UUID válida.
        if (section_id !== undefined && section_id !== null && typeof section_id !== "string") {
          return new Response(
            JSON.stringify({ error: "section_id deve ser uuid string ou null" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Valida video_url se preenchido (HTTP/HTTPS)
        if (video_url && typeof video_url === "string" && video_url.trim()) {
          try {
            const u = new URL(video_url.trim());
            if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
          } catch {
            return new Response(
              JSON.stringify({ error: "video_url deve ser uma URL HTTP(S) válida" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        // Computa section_order automático se não vier
        let resolvedSectionOrder: number;
        if (typeof section_order === "number" && Number.isFinite(section_order)) {
          resolvedSectionOrder = Math.max(0, Math.floor(section_order));
        } else if (section_id) {
          const { data: maxRow } = await supabase
            .from("product_modules")
            .select("section_order")
            .eq("section_id", section_id)
            .order("section_order", { ascending: false })
            .limit(1);
          resolvedSectionOrder = ((maxRow?.[0]?.section_order ?? -1) + 1);
        } else {
          resolvedSectionOrder = 0;
        }

        // Computa display_order legacy (global) — usa max + 1 dentro do produto
        const { data: maxDisplayRow } = await supabase
          .from("product_modules")
          .select("display_order")
          .eq("product_id", product_id)
          .order("display_order", { ascending: false })
          .limit(1);
        const nextDisplayOrder = ((maxDisplayRow?.[0]?.display_order ?? -1) + 1);

        const { data: newModule, error } = await supabase
          .from("product_modules")
          .insert({
            product_id,
            section_id: section_id || null,
            module_name: module_name.trim(),
            video_url: (video_url && String(video_url).trim()) || null,
            section_order: resolvedSectionOrder,
            display_order: nextDisplayOrder,
            is_published: typeof is_published === "boolean" ? is_published : true,
          })
          .select()
          .single();
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, module: newModule }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "rename_module": {
        const { module_id, module_name } = body;
        if (!module_name || !module_name.trim()) {
          return new Response(
            JSON.stringify({ error: "Nome do módulo é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("product_modules")
          .update({ module_name: module_name.trim(), updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_module_video": {
        const { module_id, video_url } = body;
        const { error } = await supabase
          .from("product_modules")
          .update({ video_url: video_url || null, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder_modules": {
        const { modules: moduleOrders } = body;
        for (const m of moduleOrders || []) {
          await supabase
            .from("product_modules")
            .update({ display_order: m.display_order, updated_at: new Date().toISOString() })
            .eq("id", m.id);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_module": {
        const { module_id } = body;
        const { data: mod } = await supabase
          .from("product_modules")
          .select("pdf_file_path")
          .eq("id", module_id)
          .single();
        if (mod?.pdf_file_path) {
          await supabase.storage.from("product-pdfs").remove([mod.pdf_file_path]);
        }
        const { error } = await supabase.from("product_modules").delete().eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_module_pdf": {
        const { module_id } = body;
        const { data: mod } = await supabase
          .from("product_modules")
          .select("pdf_file_path")
          .eq("id", module_id)
          .single();
        if (mod?.pdf_file_path) {
          await supabase.storage.from("product-pdfs").remove([mod.pdf_file_path]);
        }
        const { error } = await supabase
          .from("product_modules")
          .update({ pdf_file_path: null, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_module_audio": {
        const { module_id } = body;
        const { data: mod } = await supabase
          .from("product_modules")
          .select("audio_file_path")
          .eq("id", module_id)
          .single();
        if (mod?.audio_file_path) {
          await supabase.storage.from("product-audios").remove([mod.audio_file_path]);
        }
        const { error } = await supabase
          .from("product_modules")
          .update({ audio_file_path: null, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // Audio direto pro Storage (arquivos grandes que estouram o limite
      // de ~6MB no body de edge function). Fluxo em 2 passos:
      //   1) Cliente chama create_signed_audio_upload_url → recebe URL
      //      assinada do bucket private (token interno do Storage).
      //   2) Cliente faz PUT no signed URL com o arquivo bruto (não passa
      //      pela edge function — vai direto pro Storage backend, sem
      //      cap de body).
      //   3) Cliente chama confirm_module_audio_upload com o file_path
      //      → admin-api faz UPDATE em product_modules.audio_file_path.
      // =================================================================
      case "create_signed_audio_upload_url": {
        const { module_id, file_name } = body;
        if (!module_id || typeof module_id !== "string") {
          return new Response(
            JSON.stringify({ error: "module_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!file_name || typeof file_name !== "string") {
          return new Response(
            JSON.stringify({ error: "file_name é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Sanitiza extensão: só letras/dígitos, lowercase, fallback "mp3"
        const ext = (file_name.split(".").pop() || "mp3")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 10) || "mp3";
        const filePath = `audios/${module_id}/${Date.now()}.${ext}`;
        const { data, error } = await supabase.storage
          .from("product-audios")
          .createSignedUploadUrl(filePath);
        if (error) throw error;
        // O SDK retorna `data.signedUrl` que pode ser tanto path absoluto
        // (https://...) quanto path relativo (/object/upload/...). Pra
        // garantir que o cliente faça PUT no endpoint correto, sempre
        // construímos a URL absoluta /storage/v1{path}.
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const absoluteSignedUrl = data.signedUrl.startsWith("http")
          ? data.signedUrl
          : `${supabaseUrl}/storage/v1${data.signedUrl}`;
        return new Response(
          JSON.stringify({
            success: true,
            file_path: filePath,
            signed_url: absoluteSignedUrl,
            token: data.token,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "confirm_module_audio_upload": {
        const { module_id, file_path } = body;
        if (!module_id || typeof module_id !== "string") {
          return new Response(
            JSON.stringify({ error: "module_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!file_path || typeof file_path !== "string" || !file_path.startsWith(`audios/${module_id}/`)) {
          return new Response(
            JSON.stringify({ error: "file_path inválido" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Best-effort: verifica que o arquivo realmente existe no Storage
        // (defesa contra cliente confirmar sem ter feito upload).
        const dirPath = file_path.substring(0, file_path.lastIndexOf("/"));
        const fileName = file_path.substring(file_path.lastIndexOf("/") + 1);
        const { data: files } = await supabase.storage
          .from("product-audios")
          .list(dirPath, { search: fileName });
        if (!files || !files.find((f: any) => f.name === fileName)) {
          return new Response(
            JSON.stringify({ error: "Arquivo não encontrado no bucket. Confirme se o upload completou." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Remove áudio anterior (se houver), pra não acumular lixo no bucket
        const { data: mod } = await supabase
          .from("product_modules")
          .select("audio_file_path")
          .eq("id", module_id)
          .single();
        if (mod?.audio_file_path && mod.audio_file_path !== file_path) {
          await supabase.storage
            .from("product-audios")
            .remove([mod.audio_file_path])
            .catch(() => { /* ignore */ });
        }
        const { error } = await supabase
          .from("product_modules")
          .update({ audio_file_path: file_path, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, audio_file_path: file_path }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set_module_published": {
        const { module_id, is_published } = body;
        if (typeof is_published !== "boolean") {
          return new Response(
            JSON.stringify({ error: "is_published deve ser boolean" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("product_modules")
          .update({ is_published, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, is_published }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_pdf": {
        const { product_id } = body;
        const { data: product } = await supabase
          .from("product_settings")
          .select("pdf_file_path")
          .eq("id", product_id)
          .single();
        if (product?.pdf_file_path) {
          await supabase.storage.from("product-pdfs").remove([product.pdf_file_path]);
        }
        const { error } = await supabase
          .from("product_settings")
          .update({ pdf_file_path: null, updated_at: new Date().toISOString() })
          .eq("id", product_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ---- Analytics ----
      case "get_module_completions": {
        const { data: completions, error: compError } = await supabase
          .from("module_completions")
          .select("email, module_id, completed_at");
        if (compError) throw compError;

        const { data: allModules, error: allModError } = await supabase
          .from("product_modules")
          .select("id, module_name, product_id, video_url");
        if (allModError) throw allModError;

        const { data: allProducts, error: allProdError } = await supabase
          .from("product_settings")
          .select("id, product_name");
        if (allProdError) throw allProdError;

        const productMap: Record<string, string> = {};
        for (const p of allProducts || []) productMap[p.id] = p.product_name;

        const moduleMap: Record<string, { name: string; product: string; productId: string; hasVideo: boolean }> = {};
        for (const m of allModules || []) {
          moduleMap[m.id] = {
            name: m.module_name,
            product: productMap[m.product_id] || "Desconhecido",
            productId: m.product_id,
            hasVideo: !!m.video_url,
          };
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const userCompletions: Record<string, { total: number; modules: { name: string; product: string; completed_at: string }[] }> = {};
        const dailyCompletions: Record<string, number> = {};
        const moduleCompletionCounts: Record<string, number> = {};
        let totalVideoCompletions = 0;
        let todayCompletions = 0;
        let todayVideoCompletions = 0;
        const videoCompletionUsers = new Set<string>();

        for (const c of completions || []) {
          if (!userCompletions[c.email]) userCompletions[c.email] = { total: 0, modules: [] };
          userCompletions[c.email].total++;
          const info = moduleMap[c.module_id];
          userCompletions[c.email].modules.push({
            name: info?.name || "Módulo removido",
            product: info?.product || "Produto removido",
            completed_at: c.completed_at,
          });

          const day = c.completed_at.split("T")[0];
          dailyCompletions[day] = (dailyCompletions[day] || 0) + 1;
          moduleCompletionCounts[c.module_id] = (moduleCompletionCounts[c.module_id] || 0) + 1;

          if (info?.hasVideo) {
            totalVideoCompletions++;
            videoCompletionUsers.add(c.email);
            if (day === todayStr) todayVideoCompletions++;
          }
          if (day === todayStr) todayCompletions++;
        }

        const moduleStats = (allModules || []).map((m: any) => ({
          id: m.id,
          name: m.module_name,
          product: productMap[m.product_id] || "Desconhecido",
          hasVideo: !!m.video_url,
          completions: moduleCompletionCounts[m.id] || 0,
        }));

        const productCompletionMap: Record<string, { name: string; totalModules: number; totalCompletions: number }> = {};
        for (const m of allModules || []) {
          const pName = productMap[m.product_id] || "Desconhecido";
          if (!productCompletionMap[m.product_id]) productCompletionMap[m.product_id] = { name: pName, totalModules: 0, totalCompletions: 0 };
          productCompletionMap[m.product_id].totalModules++;
          productCompletionMap[m.product_id].totalCompletions += moduleCompletionCounts[m.id] || 0;
        }
        const productStats = Object.values(productCompletionMap);

        const totalModulesAvailable = (allModules || []).length;
        const videoModulesCount = (allModules || []).filter((m: any) => !!m.video_url).length;

        return new Response(
          JSON.stringify({
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
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "diagnose_member_access": {
        const targetEmail = String(body.email || "").trim().toLowerCase();
        if (!targetEmail) {
          return new Response(
            JSON.stringify({ error: "E-mail é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const [
          purchasesResult,
          productsResult,
          accessLogsResult,
          completionsResult,
          modulesResult,
          sectionsResult,
        ] = await Promise.all([
          supabase
            .from("purchases")
            .select("buyer_email, product_name, product_settings_id, transaction_id, status, purchase_date, raw_payload")
            .eq("buyer_email", targetEmail)
            .order("purchase_date", { ascending: false }),
          supabase
            .from("product_settings")
            .select("id, cakto_product_id, product_name, visible, checkout_url")
            .order("display_order", { ascending: true }),
          supabase
            .from("access_logs")
            .select("action, cakto_product_id, metadata, created_at")
            .eq("email", targetEmail)
            .order("created_at", { ascending: false })
            .limit(250),
          supabase
            .from("module_completions")
            .select("module_id, completed_at")
            .eq("email", targetEmail),
          supabase
            .from("product_modules")
            .select("id, product_id, module_name, display_order, section_id, section_order, is_published, video_url, audio_file_path, pdf_file_path"),
          supabase
            .from("product_sections")
            .select("id, product_id, section_key, number, title, display_order, archived"),
        ]);
        if (purchasesResult.error) throw purchasesResult.error;
        if (productsResult.error) throw productsResult.error;
        if (accessLogsResult.error) throw accessLogsResult.error;
        if (completionsResult.error) throw completionsResult.error;
        if (modulesResult.error) throw modulesResult.error;
        if (sectionsResult.error) throw sectionsResult.error;

        const products = productsResult.data || [];
        const purchases = purchasesResult.data || [];
        const accessLogs = accessLogsResult.data || [];
        const completions = completionsResult.data || [];
        const modules = modulesResult.data || [];
        const sections = (sectionsResult.data || []).filter((section: any) => !section.archived);
        const activePurchases = purchases.filter((p: any) => p.status === "active");
        const productById = new Map(products.map((p: any) => [p.id, p]));
        const productByName = new Map(products.map((p: any) => [p.product_name, p]));
        const sectionById = new Map(sections.map((section: any) => [section.id, section]));

        const unlockedProductIds = new Set<string>();
        const normalizedPurchases = purchases.map((purchase: any) => {
          const mappedProduct =
            (purchase.product_settings_id && productById.get(purchase.product_settings_id)) ||
            productByName.get(purchase.product_name) ||
            null;
          if (purchase.status === "active" && mappedProduct?.id) {
            unlockedProductIds.add(mappedProduct.id);
          }
          return {
            buyer_email: purchase.buyer_email,
            product_name: purchase.product_name,
            product_settings_id: purchase.product_settings_id,
            mapped_product_name: mappedProduct?.product_name || null,
            mapped: !!mappedProduct,
            gateway_product_id: purchase.raw_payload?.item?.product_id ?? null,
            transaction_id: purchase.transaction_id,
            status: purchase.status,
            purchase_date: purchase.purchase_date,
          };
        });

        const unmappedActivePurchases = normalizedPurchases.filter(
          (purchase: any) => purchase.status === "active" && !purchase.mapped,
        );
        const issues: string[] = [];
        if (activePurchases.length === 0) {
          issues.push("Nenhuma compra ativa encontrada para este e-mail.");
        }
        if (unmappedActivePurchases.length > 0) {
          issues.push("Existe compra ativa sem produto configurado na área de membros.");
        }
        if (activePurchases.length > 0 && unlockedProductIds.size === 0) {
          issues.push("Há compra ativa, mas nenhum produto visível foi liberado.");
        }

        const completionByModuleId = new Map<string, string>();
        for (const completion of completions || []) {
          if (completion.module_id) {
            completionByModuleId.set(completion.module_id, completion.completed_at);
          }
        }

        const lessonActivityByModuleId = new Map<
          string,
          { firstViewedAt: string | null; lastViewedAt: string | null; views: number }
        >();
        for (const log of accessLogs || []) {
          if (log.action !== "lesson_view" && log.action !== "complete_module") continue;
          const metadata =
            log.metadata && typeof log.metadata === "object" ? (log.metadata as any) : {};
          const moduleId = typeof metadata.moduleId === "string" ? metadata.moduleId : null;
          if (!moduleId) continue;
          const previous =
            lessonActivityByModuleId.get(moduleId) ||
            { firstViewedAt: null, lastViewedAt: null, views: 0 };
          const createdAt = log.created_at;
          lessonActivityByModuleId.set(moduleId, {
            firstViewedAt:
              !previous.firstViewedAt ||
              new Date(createdAt).getTime() < new Date(previous.firstViewedAt).getTime()
                ? createdAt
                : previous.firstViewedAt,
            lastViewedAt:
              !previous.lastViewedAt ||
              new Date(createdAt).getTime() > new Date(previous.lastViewedAt).getTime()
                ? createdAt
                : previous.lastViewedAt,
            views: previous.views + (log.action === "lesson_view" ? 1 : 0),
          });
        }

        const lessonTimestamp = (lesson: any) => {
          const candidates = [lesson.last_viewed_at, lesson.completed_at].filter(Boolean);
          if (candidates.length === 0) return 0;
          return Math.max(...candidates.map((value: string) => new Date(value).getTime()));
        };

        const sortModules = (a: any, b: any) => {
          const aSection = a.section_id ? sectionById.get(a.section_id) : null;
          const bSection = b.section_id ? sectionById.get(b.section_id) : null;
          const aSectionOrder = aSection?.display_order ?? 9999;
          const bSectionOrder = bSection?.display_order ?? 9999;
          if (aSectionOrder !== bSectionOrder) return aSectionOrder - bSectionOrder;
          const aOrder = a.section_order ?? a.display_order ?? 0;
          const bOrder = b.section_order ?? b.display_order ?? 0;
          return aOrder - bOrder;
        };

        const progressProducts = products
          .filter((product: any) => unlockedProductIds.has(product.id))
          .map((product: any) => {
            const productModules = modules
              .filter((module: any) => module.product_id === product.id)
              .sort(sortModules);
            const publishedModules = productModules.filter(
              (module: any) => module.is_published !== false,
            );
            const lessons = publishedModules.map((module: any, index: number) => {
              const section = module.section_id ? sectionById.get(module.section_id) : null;
              const activity = lessonActivityByModuleId.get(module.id) || null;
              const completedAt = completionByModuleId.get(module.id) || null;
              const viewed = !!activity || !!completedAt;
              return {
                module_id: module.id,
                module_name: module.module_name,
                section_id: module.section_id,
                section_number: section?.number || null,
                section_title: section?.title || "Aulas",
                lesson_number: index + 1,
                has_video: !!module.video_url,
                has_audio: !!module.audio_file_path,
                has_pdf: !!module.pdf_file_path,
                viewed,
                view_count: activity?.views || 0,
                first_viewed_at: activity?.firstViewedAt || null,
                last_viewed_at: activity?.lastViewedAt || null,
                completed: !!completedAt,
                completed_at: completedAt,
              };
            });
            const viewedLessons = lessons.filter((lesson: any) => lesson.viewed).length;
            const completedLessons = lessons.filter((lesson: any) => lesson.completed).length;
            const lastLesson =
              lessons
                .filter((lesson: any) => lessonTimestamp(lesson) > 0)
                .sort((a: any, b: any) => lessonTimestamp(b) - lessonTimestamp(a))[0] || null;
            return {
              product_id: product.id,
              gateway_product_id: product.cakto_product_id,
              product_name: product.product_name,
              total_lessons: lessons.length,
              viewed_lessons: viewedLessons,
              completed_lessons: completedLessons,
              progress_percent:
                lessons.length > 0 ? Math.round((completedLessons / lessons.length) * 100) : 0,
              last_lesson: lastLesson,
              lessons,
            };
          });

        const allLessons = progressProducts.flatMap((product: any) =>
          product.lessons.map((lesson: any) => ({
            ...lesson,
            product_name: product.product_name,
          })),
        );
        const lastLesson =
          allLessons
            .filter((lesson: any) => lessonTimestamp(lesson) > 0)
            .sort((a: any, b: any) => lessonTimestamp(b) - lessonTimestamp(a))[0] || null;
        const totalLessons = progressProducts.reduce(
          (sum: number, product: any) => sum + product.total_lessons,
          0,
        );
        const completedLessons = progressProducts.reduce(
          (sum: number, product: any) => sum + product.completed_lessons,
          0,
        );
        const viewedLessons = progressProducts.reduce(
          (sum: number, product: any) => sum + product.viewed_lessons,
          0,
        );
        const consultoriaEvents = accessLogs.filter(
          (log: any) => log.action === "consultoria_form_click",
        );
        const lastLogin = accessLogs.find((log: any) => log.action === "login") || null;
        const studentProgress = {
          total_lessons: totalLessons,
          viewed_lessons: viewedLessons,
          completed_lessons: completedLessons,
          progress_percent:
            totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          last_access_at: accessLogs[0]?.created_at || null,
          last_login_at: lastLogin?.created_at || null,
          last_lesson: lastLesson,
          consultoria_clicks: consultoriaEvents.length,
          last_consultoria_click_at: consultoriaEvents[0]?.created_at || null,
          products: progressProducts,
        };

        return new Response(
          JSON.stringify({
            email: targetEmail,
            purchases: normalizedPurchases,
            activePurchases: activePurchases.length,
            unlockedProducts: products
              .filter((product: any) => unlockedProductIds.has(product.id))
              .map((product: any) => ({
                id: product.id,
                gateway_product_id: product.cakto_product_id,
                product_name: product.product_name,
                visible: product.visible,
              })),
            availableProducts: products.map((product: any) => ({
              id: product.id,
              gateway_product_id: product.cakto_product_id,
              product_name: product.product_name,
              visible: product.visible,
              alreadyUnlocked: unlockedProductIds.has(product.id),
            })),
            recentAccess: accessLogs.slice(0, 15),
            moduleCompletionsCount: completions.length,
            studentProgress,
            issues,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "grant_member_access": {
        const targetEmail = String(body.email || "").trim().toLowerCase();
        const productSettingsId = String(body.product_settings_id || "").trim();
        if (!targetEmail || !productSettingsId) {
          return new Response(
            JSON.stringify({ error: "E-mail e produto são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: product, error: productError } = await supabase
          .from("product_settings")
          .select("id, product_name")
          .eq("id", productSettingsId)
          .maybeSingle();
        if (productError) throw productError;
        if (!product) {
          return new Response(
            JSON.stringify({ error: "Produto não encontrado" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: existing, error: existingError } = await supabase
          .from("purchases")
          .select("id")
          .eq("buyer_email", targetEmail)
          .eq("product_settings_id", productSettingsId)
          .eq("status", "active")
          .limit(1);
        if (existingError) throw existingError;
        if (existing && existing.length > 0) {
          return new Response(
            JSON.stringify({ success: true, skipped: true, reason: "already_active" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const transactionId = `manual-admin-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const { error: insertError } = await supabase.from("purchases").insert({
          buyer_email: targetEmail,
          product_name: product.product_name,
          product_settings_id: product.id,
          transaction_id: transactionId,
          status: "active",
          raw_payload: {
            source: "admin_manual_grant",
            granted_at: new Date().toISOString(),
          },
          purchase_date: new Date().toISOString(),
        });
        if (insertError) throw insertError;

        return new Response(
          JSON.stringify({ success: true, transaction_id: transactionId }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_analytics": {
        const { period = "7d" } = body;
        const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();

        const { count: totalLogins } = await supabase
          .from("access_logs")
          .select("*", { count: "exact", head: true })
          .eq("action", "login")
          .gte("created_at", since);

        const { data: uniqueData } = await supabase
          .from("access_logs")
          .select("email")
          .eq("action", "login")
          .gte("created_at", since);
        const uniqueUsers = new Set((uniqueData || []).map((d: any) => d.email)).size;

        const { data: viewsData } = await supabase
          .from("access_logs")
          .select("cakto_product_id, metadata")
          .eq("action", "product_view")
          .gte("created_at", since);
        const { data: clicksData } = await supabase
          .from("access_logs")
          .select("cakto_product_id")
          .eq("action", "product_click")
          .gte("created_at", since);
        const { data: checkoutData } = await supabase
          .from("access_logs")
          .select("cakto_product_id")
          .eq("action", "checkout_click")
          .gte("created_at", since);

        const { data: dailyData } = await supabase
          .from("access_logs")
          .select("created_at")
          .eq("action", "login")
          .gte("created_at", since)
          .order("created_at", { ascending: true });

        const dailyLogins: Record<string, number> = {};
        for (const d of dailyData || []) {
          const day = d.created_at.split("T")[0];
          dailyLogins[day] = (dailyLogins[day] || 0) + 1;
        }

        const { data: recentAccess } = await supabase
          .from("access_logs")
          .select("*")
          .eq("action", "login")
          .order("created_at", { ascending: false })
          .limit(20);

        return new Response(
          JSON.stringify({
            totalLogins: totalLogins || 0,
            uniqueUsers,
            productViews: (viewsData || []).length,
            productClicks: (clicksData || []).length,
            checkoutClicks: (checkoutData || []).length,
            dailyLogins,
            recentAccess: recentAccess || [],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_quiz_funnel_analytics_v2": {
        const {
          period = "today",
          startDate,
          endDate,
        } = body;

        const QUIZ_TIMEZONE_OFFSET = "-03:00";
        const QUIZ_PLAYER_IDS = new Set([
          "6a361629c028de6a1e99cd2c",
          "6a2c4ab3c24e5836ece8b698",
          "6a0a7e7faf83766f2b480b33",
        ]);
        const ATTRIBUTION_KEYS = [
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_content",
          "utm_term",
          "fbclid",
          "gclid",
          "src",
          "sck",
          "xcod",
          "ad_id",
          "adset_id",
          "campaign_id",
          "ad_name",
          "adset_name",
          "campaign_name",
          "quiz_session_id",
          "qsid",
          "quiz_origin",
          "quiz_checkout_click_id",
        ];

        const cleanText = (value: unknown) => String(value ?? "").trim();
        const normalizeText = (value: unknown) =>
          cleanText(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "");
        const normalizeLoose = (value: unknown) =>
          cleanText(value)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "");

        const saoPauloDate = (date: Date) =>
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(date);

        const addDays = (dateString: string, amount: number) => {
          const base = new Date(`${dateString}T12:00:00${QUIZ_TIMEZONE_OFFSET}`);
          base.setUTCDate(base.getUTCDate() + amount);
          return saoPauloDate(base);
        };

        const startOfLocalDay = (dateString: string) =>
          new Date(`${dateString}T00:00:00${QUIZ_TIMEZONE_OFFSET}`);
        const endOfLocalDay = (dateString: string) =>
          new Date(`${addDays(dateString, 1)}T00:00:00${QUIZ_TIMEZONE_OFFSET}`);

        const resolveDateRange = () => {
          const today = saoPauloDate(new Date());
          if (period === "today") {
            return {
              label: "Hoje",
              since: startOfLocalDay(today),
              until: endOfLocalDay(today),
            };
          }
          if (period === "yesterday") {
            const yesterday = addDays(today, -1);
            return {
              label: "Ontem",
              since: startOfLocalDay(yesterday),
              until: endOfLocalDay(yesterday),
            };
          }
          if (period === "custom" && startDate && endDate) {
            const safeStart = cleanText(startDate).slice(0, 10);
            const safeEnd = cleanText(endDate).slice(0, 10);
            return {
              label: `${safeStart} a ${safeEnd}`,
              since: startOfLocalDay(safeStart),
              until: endOfLocalDay(safeEnd),
            };
          }
          const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
          return {
            label: `${days} dias`,
            since: new Date(Date.now() - days * 86400000),
            until: new Date(),
          };
        };

        const dateRange = resolveDateRange();
        const since = dateRange.since.toISOString();
        const until = dateRange.until.toISOString();

        const collectUrlParams = (
          target: Record<string, string>,
          value: unknown,
          depth = 0,
        ) => {
          if (!value || depth > 5) return;
          if (typeof value === "string") {
            const raw = value.trim();
            if (!raw) return;
            try {
              const params = raw.startsWith("http")
                ? new URL(raw).searchParams
                : new URLSearchParams(raw.replace(/^\?/, ""));
              params.forEach((paramValue, key) => {
                if (key && paramValue) target[key] = paramValue;
              });
            } catch {
              // Ignore malformed text.
            }
            return;
          }
          if (Array.isArray(value)) {
            for (const item of value) collectUrlParams(target, item, depth + 1);
            return;
          }
          if (typeof value === "object") {
            for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
              if (
                typeof rawValue === "string" ||
                typeof rawValue === "number" ||
                typeof rawValue === "boolean"
              ) {
                const text = cleanText(rawValue);
                if (text) target[key] = text.slice(0, 240);
              } else {
                collectUrlParams(target, rawValue, depth + 1);
              }
            }
          }
        };

        const getPurchaseAttribution = (purchase: any) => {
          const params: Record<string, string> = {};
          collectUrlParams(params, purchase.raw_payload);
          collectUrlParams(params, purchase.raw_payload?.tracking);
          collectUrlParams(params, purchase.raw_payload?.checkout_url);
          collectUrlParams(params, purchase.raw_payload?.checkout?.url);
          collectUrlParams(params, purchase.raw_payload?.order?.checkout_url);

          const attribution: Record<string, string> = {};
          for (const key of ATTRIBUTION_KEYS) {
            const value = cleanText(params[key]);
            if (value && normalizeText(value) !== "naoinformado") {
              attribution[key] = value.slice(0, 240);
            }
          }
          return attribution;
        };

        const parseMoney = (raw: unknown): number => {
          if (raw === null || raw === undefined) return 0;
          let normalized = String(raw).replace(/[^\d,.-]/g, "");
          if (!normalized) return 0;
          if (normalized.includes(",") && normalized.includes(".")) {
            normalized =
              normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
                ? normalized.replace(/\./g, "").replace(",", ".")
                : normalized.replace(/,/g, "");
          } else if (normalized.includes(",")) {
            normalized = normalized.replace(",", ".");
          }
          const value = Number(normalized);
          if (!Number.isFinite(value) || value <= 0) return 0;
          return value > 1000 ? Number((value / 100).toFixed(2)) : value;
        };

        const readPath = (target: any, path: Array<string | number>) =>
          path.reduce((current, key) => current?.[key as any], target);

        const findNestedMoney = (target: unknown, depth = 0): number => {
          if (!target || depth > 6) return 0;
          if (Array.isArray(target)) {
            for (const item of target) {
              const value = findNestedMoney(item, depth + 1);
              if (value > 0) return value;
            }
            return 0;
          }
          if (typeof target !== "object") return 0;

          const priorityKeys = [
            "amount",
            "total",
            "total_amount",
            "paid_amount",
            "total_paid",
            "charged_amount",
            "price",
            "value",
            "valor",
          ];
          const ignored = /(fee|tax|discount|refund|installment|parcel|commission|utm|document|phone|id)/i;

          for (const [key, rawValue] of Object.entries(target as Record<string, unknown>)) {
            const normalizedKey = key.toLowerCase();
            if (ignored.test(normalizedKey)) continue;
            if (priorityKeys.includes(normalizedKey)) {
              const value = parseMoney(rawValue);
              if (value > 0) return value;
            }
          }

          for (const [key, rawValue] of Object.entries(target as Record<string, unknown>)) {
            if (ignored.test(key)) continue;
            const value = findNestedMoney(rawValue, depth + 1);
            if (value > 0) return value;
          }

          return 0;
        };

        const fallbackPurchaseValue = (purchase: any): number => {
          const payload = purchase?.raw_payload || {};
          const productText = normalizeLoose(
            [
              purchase?.product_name,
              payload?.product_name,
              payload?.product?.name,
              payload?.item?.name,
              payload?.offer?.name,
              payload?.order?.product_name,
            ].join(" "),
          );

          if (productText.includes("codigodareconquista")) return 47.97;
          return 0;
        };

        const getPurchaseValue = (purchase: any): number => {
          const payload = purchase?.raw_payload || purchase || {};
          const directPaths: Array<Array<string | number>> = [
            ["order", "amount"],
            ["order", "total"],
            ["order", "total_amount"],
            ["order", "paid_amount"],
            ["order", "total_paid"],
            ["transaction", "amount"],
            ["transaction", "total"],
            ["transaction", "paid_amount"],
            ["transaction", "total_paid"],
            ["payment", "amount"],
            ["payment", "total"],
            ["payment", "value"],
            ["payment", "paid_amount"],
            ["payment", "total_paid"],
            ["payment", "pix", "amount"],
            ["payment", "pix", "value"],
            ["sale", "amount"],
            ["sale", "total"],
            ["checkout", "amount"],
            ["checkout", "total"],
            ["offer", "price"],
            ["product", "price"],
            ["product", "amount"],
            ["product", "value"],
            ["item", "amount"],
            ["item", "price"],
            ["items", 0, "amount"],
            ["items", 0, "price"],
            ["items", 0, "total"],
            ["products", 0, "amount"],
            ["products", 0, "price"],
            ["products", 0, "value"],
            ["amount"],
            ["value"],
            ["total"],
            ["valor"],
          ];

          for (const path of directPaths) {
            const value = parseMoney(readPath(payload, path));
            if (value > 0) return value;
          }

          const nestedValue = findNestedMoney(payload);
          if (nestedValue > 0) return nestedValue;

          return fallbackPurchaseValue(purchase);
        };

        const getGateway = (purchase: any) => {
          const payloadText = JSON.stringify(purchase.raw_payload || {}).toLowerCase();
          if (payloadText.includes("payt")) return "Payt";
          if (payloadText.includes("cakto")) return "Cakto";
          if (payloadText.includes("ticto")) return "Ticto";
          return "Gateway";
        };

        const isQuizPurchase = (purchase: any, attribution: Record<string, string>) => {
          const rawText = JSON.stringify(purchase.raw_payload || {}).toLowerCase();
          const joined = [
            purchase.product_name,
            attribution.utm_campaign,
            attribution.utm_content,
            attribution.campaign_name,
            attribution.ad_name,
            attribution.src,
            attribution.sck,
            attribution.xcod,
            rawText,
          ]
            .map((value) => cleanText(value).toLowerCase())
            .join(" ");
          if (joined.includes("quizvsl") || joined.includes("quiz_vsl")) return true;
          if (normalizeLoose(joined).includes("quiz")) return true;
          return [...QUIZ_PLAYER_IDS].some((playerId) => joined.includes(playerId));
        };

        const valuesMatch = (a: unknown, b: unknown, loose = false) => {
          const left = loose ? normalizeLoose(a) : normalizeText(a);
          const right = loose ? normalizeLoose(b) : normalizeText(b);
          return Boolean(left && right && left === right);
        };

        const { data: rows, error } = await supabase
          .from("quiz_funnel_events")
          .select("event_name, session_id, created_at, path, device_type, attribution, metadata")
          .gte("created_at", since)
          .lt("created_at", until)
          .order("created_at", { ascending: true })
          .limit(50000);
        if (error) throw error;

        const { data: purchaseRows, error: purchaseError } = await supabase
          .from("purchases")
          .select("buyer_email, product_name, transaction_id, status, purchase_date, raw_payload")
          .in("status", ["active", "approved", "paid", "authorized"])
          .gte("purchase_date", since)
          .lt("purchase_date", until)
          .order("purchase_date", { ascending: true })
          .limit(20000);
        if (purchaseError) throw purchaseError;

        const events = rows || [];
        const CHECKOUT_INFERRED_EVENT = "QuizVslCheckoutInferred";
        const stageDefinitions = [
          { key: "views", label: "Visitou o quiz", events: ["QuizView", "QuizVslView"] },
          { key: "starts", label: "Iniciou o quiz", events: ["QuizStart"] },
          { key: "firstAnalysis", label: "Chegou ao 1º diagnóstico", events: ["QuizVslFirstAnalysis"] },
          { key: "completes", label: "Concluiu as perguntas", events: ["QuizComplete"] },
          { key: "results", label: "Viu o diagnóstico final", events: ["QuizVslResultView", "QuizResult"] },
          { key: "videoStarts", label: "Iniciou a mini VSL", events: ["QuizVslStart"] },
          { key: "video25", label: "Assistiu 25% da VSL", events: ["QuizVsl25"] },
          { key: "video50", label: "Assistiu 50% da VSL", events: ["QuizVsl50"] },
          { key: "video75", label: "Assistiu 75% da VSL", events: ["QuizVsl75"] },
          { key: "offerReveals", label: "Liberou a oferta", events: ["QuizVslOfferReveal"] },
          { key: "checkoutClicks", label: "Checkout iniciado", events: ["QuizVslCheckoutClick", CHECKOUT_INFERRED_EVENT] },
          { key: "purchases", label: "Compra aprovada", events: ["QuizVslPurchase"] },
        ];

        const sessionMap = new Map<string, any>();
        const stageSets = new Map(stageDefinitions.map((stage) => [stage.key, new Set<string>()]));
        const questionMap = new Map<string, any>();
        const profileStepMap = new Map<string, Set<string>>();
        const profileSubmittedMap = new Map<string, Set<string>>();

        for (const event of events as any[]) {
          const sessionId = event.session_id;
          if (!sessionId) continue;

          for (const stage of stageDefinitions) {
            if (stage.events.includes(event.event_name)) {
              stageSets.get(stage.key)?.add(sessionId);
            }
          }

          const attribution = event.attribution || {};
          const metadata = event.metadata || {};
          const questionId = String(metadata.question_id || "");
          const isQuestionView = event.event_name === "QuizVslQuestionView";
          const isQuestionAnswer = event.event_name === "QuizStepAnswer";

          if (questionId && (isQuestionView || isQuestionAnswer)) {
            const question = questionMap.get(questionId) || {
              questionId,
              title: metadata.question_title || questionId,
              order: Number(metadata.question_order || metadata.step || 999),
              phase: Number(metadata.phase || 0),
              reachedSessions: new Set<string>(),
              answeredSessions: new Set<string>(),
              answers: new Map<string, any>(),
            };
            question.title = metadata.question_title || question.title;
            question.order = Math.min(question.order, Number(metadata.question_order || metadata.step || question.order));
            question.phase = Number(metadata.phase || question.phase || 0);
            question.reachedSessions.add(sessionId);
            if (isQuestionAnswer) {
              question.answeredSessions.add(sessionId);
              const answerId = String(metadata.answer_id || "sem_resposta");
              const answer = question.answers.get(answerId) || {
                answerId,
                label: metadata.answer_label || answerId,
                sessions: new Set<string>(),
              };
              answer.label = metadata.answer_label || answer.label;
              answer.sessions.add(sessionId);
              question.answers.set(answerId, answer);
            }
            questionMap.set(questionId, question);
          }

          if (["QuizVslProfileStep", "QuizVslProfileSubmitted"].includes(event.event_name) && metadata.profile_step) {
            const rawProfileStep = String(metadata.profile_step);
            const profileStep = rawProfileStep === "profile_birth" ? "profile_age" : rawProfileStep;
            const targetMap = event.event_name === "QuizVslProfileSubmitted" ? profileSubmittedMap : profileStepMap;
            if (!targetMap.has(profileStep)) targetMap.set(profileStep, new Set<string>());
            targetMap.get(profileStep)?.add(sessionId);
          }

          const existing = sessionMap.get(sessionId) || {
            sessionId,
            firstSeenAt: event.created_at,
            lastSeenAt: event.created_at,
            source: attribution.utm_source || "direto",
            medium: attribution.utm_medium || "",
            campaign: attribution.utm_campaign || attribution.campaign_name || "sem campanha",
            content: attribution.utm_content || attribution.ad_name || "",
            term: attribution.utm_term || "",
            fbclid: attribution.fbclid || "",
            device: event.device_type || "desconhecido",
            result: "",
            deepestStage: "",
            lastQuestionId: "",
            lastQuestionTitle: "",
            purchaseValue: 0,
            purchaseAttributionMethod: "",
            purchaseOrders: [],
            events: new Set<string>(),
            attribution,
          };
          existing.lastSeenAt = event.created_at;
          existing.source = attribution.utm_source || existing.source;
          existing.medium = attribution.utm_medium || existing.medium;
          existing.campaign = attribution.utm_campaign || attribution.campaign_name || existing.campaign;
          existing.content = attribution.utm_content || attribution.ad_name || existing.content;
          existing.term = attribution.utm_term || existing.term;
          existing.fbclid = attribution.fbclid || existing.fbclid;
          existing.device = event.device_type || existing.device;
          existing.result = metadata.quiz_result || existing.result;
          existing.attribution = { ...existing.attribution, ...attribution };
          if (event.event_name === "QuizVslPurchase") {
            existing.purchaseValue += Number(metadata.purchase_value || 0);
            existing.purchaseAttributionMethod = metadata.attribution_method || existing.purchaseAttributionMethod;
          }
          if (questionId) {
            existing.lastQuestionId = questionId;
            existing.lastQuestionTitle = metadata.question_title || questionId;
          }
          existing.events.add(event.event_name);
          sessionMap.set(sessionId, existing);
        }

        const findMatchingSession = (purchase: any, attribution: Record<string, string>) => {
          const exactSession = cleanText((purchase.raw_payload || {})?.quiz_session_id || attribution.quiz_session_id || attribution.qsid);
          if (exactSession && sessionMap.has(exactSession)) {
            return { sessionId: exactSession, method: "sessão exata" };
          }

          const paidAt = new Date(purchase.purchase_date || new Date().toISOString()).getTime();
          const candidates: Array<{ sessionId: string; score: number; lastSeenAt: number }> = [];
          for (const session of sessionMap.values()) {
            const sessionLastSeen = new Date(session.lastSeenAt).getTime();
            const hoursDistance = Math.abs(paidAt - sessionLastSeen) / 3600000;
            if (hoursDistance > 72) continue;

            let score = 0;
            if (valuesMatch(session.fbclid, attribution.fbclid)) score += 10;
            if (valuesMatch(session.campaign, attribution.utm_campaign || attribution.campaign_name)) score += 6;
            if (valuesMatch(session.content, attribution.utm_content || attribution.ad_name, true)) score += 5;
            if (valuesMatch(session.medium, attribution.utm_medium)) score += 2;
            if (valuesMatch(session.term, attribution.utm_term)) score += 2;
            if (score >= 6) candidates.push({ sessionId: session.sessionId, score, lastSeenAt: sessionLastSeen });
          }

          candidates.sort((a, b) => b.score - a.score || b.lastSeenAt - a.lastSeenAt);
          if (!candidates.length) return { sessionId: "", method: "compra quiz sem sessão" };
          return { sessionId: candidates[0].sessionId, method: candidates[0].score >= 10 ? "fbclid/utm" : "utm" };
        };

        const trackedCheckoutClicks = stageSets.get("checkoutClicks")?.size || 0;
        const purchaseOrders: any[] = [];
        for (const purchase of purchaseRows || []) {
          const attribution = getPurchaseAttribution(purchase);
          if (!isQuizPurchase(purchase, attribution)) continue;

          const transactionId = cleanText(purchase.transaction_id) || `sem_id_${purchaseOrders.length + 1}`;
          const value = getPurchaseValue(purchase);
          const matched = findMatchingSession(purchase, attribution);
          const sessionId = matched.sessionId || `purchase_${transactionId}`;
          const order = {
            transactionId,
            buyerEmail: cleanText(purchase.buyer_email).toLowerCase(),
            productName: cleanText(purchase.product_name) || "Produto",
            gateway: getGateway(purchase),
            purchaseDate: purchase.purchase_date,
            value,
            source: attribution.utm_source || "desconhecido",
            medium: attribution.utm_medium || "",
            campaign: attribution.utm_campaign || attribution.campaign_name || "sem campanha",
            content: attribution.utm_content || attribution.ad_name || "",
            attributionMethod: matched.method,
            sessionId: String(sessionId).slice(0, 12),
          };
          purchaseOrders.push(order);

          const existing = sessionMap.get(sessionId) || {
            sessionId,
            firstSeenAt: purchase.purchase_date,
            lastSeenAt: purchase.purchase_date,
            source: order.source,
            medium: order.medium,
            campaign: order.campaign,
            content: order.content,
            term: attribution.utm_term || "",
            fbclid: attribution.fbclid || "",
            device: "desconhecido",
            result: "",
            deepestStage: "",
            lastQuestionId: "",
            lastQuestionTitle: "",
            purchaseValue: 0,
            purchaseAttributionMethod: "",
            purchaseOrders: [],
            events: new Set<string>(),
            attribution,
          };
          existing.lastSeenAt = purchase.purchase_date || existing.lastSeenAt;
          existing.purchaseValue += value;
          existing.purchaseAttributionMethod = matched.method;
          existing.purchaseOrders.push(order);
          if (!existing.events.has("QuizVslCheckoutClick")) {
            existing.events.add(CHECKOUT_INFERRED_EVENT);
            stageSets.get("checkoutClicks")?.add(sessionId);
          }
          existing.events.add("QuizVslPurchase");
          sessionMap.set(sessionId, existing);
          stageSets.get("purchases")?.add(sessionId);
        }

        const checkoutClicksWithRecovery = stageSets.get("checkoutClicks")?.size || 0;
        const recoveredCheckoutClicks = Math.max(0, checkoutClicksWithRecovery - trackedCheckoutClicks);

        const stages = stageDefinitions.map((stage, index) => {
          const sessions =
            stage.key === "purchases" ? purchaseOrders.length : stageSets.get(stage.key)?.size || 0;
          const previousStage = stageDefinitions[index - 1];
          const previousSessions =
            index === 0
              ? sessions
              : previousStage?.key === "purchases"
                ? purchaseOrders.length
                : stageSets.get(previousStage.key)?.size || 0;
          return {
            key: stage.key,
            label: stage.label,
            sessions,
            stepRate: previousSessions > 0 ? Math.round((sessions / previousSessions) * 1000) / 10 : 0,
            overallRate: sessionMap.size > 0 ? Math.round((sessions / sessionMap.size) * 1000) / 10 : 0,
          };
        });

        const hasStage = (session: any, stageKey: string) => {
          const definition = stageDefinitions.find((stage) => stage.key === stageKey);
          return definition?.events.some((eventName) => session.events.has(eventName)) || false;
        };

        const campaignMap = new Map<string, any>();
        const dailyMap = new Map<string, Set<string>>();
        const dailyPurchaseMap = new Map<string, number>();
        const dailyRevenueMap = new Map<string, number>();
        const deviceMap = new Map<string, Set<string>>();
        const resultMap = new Map<string, Set<string>>();

        for (const session of sessionMap.values()) {
          const campaignKey = [session.source, session.medium, session.campaign, session.content].join("|||");
          const campaign = campaignMap.get(campaignKey) || {
            source: session.source,
            medium: session.medium,
            campaign: session.campaign,
            content: session.content,
            sessions: 0,
            starts: 0,
            completes: 0,
            videoStarts: 0,
            offerReveals: 0,
            checkoutClicks: 0,
            purchases: 0,
            revenue: 0,
          };
          campaign.sessions += 1;
          if (hasStage(session, "starts")) campaign.starts += 1;
          if (hasStage(session, "completes")) campaign.completes += 1;
          if (hasStage(session, "videoStarts")) campaign.videoStarts += 1;
          if (hasStage(session, "offerReveals")) campaign.offerReveals += 1;
          if (hasStage(session, "checkoutClicks")) campaign.checkoutClicks += 1;
          campaign.purchases += session.purchaseOrders?.length || 0;
          campaign.revenue += Number(session.purchaseValue || 0);
          campaignMap.set(campaignKey, campaign);

          const day = String(session.firstSeenAt).split("T")[0];
          if (!dailyMap.has(day)) dailyMap.set(day, new Set());
          dailyMap.get(day)?.add(session.sessionId);
          if (session.purchaseOrders?.length) {
            const purchaseDay = String(session.lastSeenAt).split("T")[0];
            dailyPurchaseMap.set(purchaseDay, (dailyPurchaseMap.get(purchaseDay) || 0) + session.purchaseOrders.length);
            dailyRevenueMap.set(purchaseDay, (dailyRevenueMap.get(purchaseDay) || 0) + Number(session.purchaseValue || 0));
          }
          if (!deviceMap.has(session.device)) deviceMap.set(session.device, new Set());
          deviceMap.get(session.device)?.add(session.sessionId);
          if (session.result) {
            if (!resultMap.has(session.result)) resultMap.set(session.result, new Set());
            resultMap.get(session.result)?.add(session.sessionId);
          }
          const deepest = [...stageDefinitions].reverse().find((stage) => hasStage(session, stage.key));
          session.deepestStage = deepest?.label || "Visitou o quiz";
        }

        const campaigns = Array.from(campaignMap.values())
          .map((campaign) => ({
            ...campaign,
            checkoutRate: campaign.sessions > 0 ? Math.round((campaign.checkoutClicks / campaign.sessions) * 1000) / 10 : 0,
            purchaseRate: campaign.checkoutClicks > 0 ? Math.round((campaign.purchases / campaign.checkoutClicks) * 1000) / 10 : 0,
            revenue: Math.round(campaign.revenue * 100) / 100,
          }))
          .sort((a, b) => b.sessions - a.sessions)
          .slice(0, 100);

        const sortedQuestions = Array.from(questionMap.values()).sort((a, b) => a.order - b.order);
        const questions = sortedQuestions.map((question, index) => {
          const reached = question.reachedSessions.size;
          const answered = question.answeredSessions.size;
          const previousReached = index === 0 ? sessionMap.size : sortedQuestions[index - 1].reachedSessions.size;
          return {
            questionId: question.questionId,
            title: question.title,
            order: question.order,
            phase: question.phase,
            reached,
            answered,
            abandoned: Math.max(0, reached - answered),
            answerRate: reached > 0 ? Math.round((answered / reached) * 1000) / 10 : 0,
            arrivalRate: sessionMap.size > 0 ? Math.round((reached / sessionMap.size) * 1000) / 10 : 0,
            stepRetention: previousReached > 0 ? Math.round((reached / previousReached) * 1000) / 10 : 0,
            answers: Array.from(question.answers.values())
              .map((answer: any) => ({
                answerId: answer.answerId,
                label: answer.label,
                sessions: answer.sessions.size,
                share: answered > 0 ? Math.round((answer.sessions.size / answered) * 1000) / 10 : 0,
              }))
              .sort((a: any, b: any) => b.sessions - a.sessions),
          };
        });

        const profileStepDefinitions = [
          { key: "profile_name", label: "Chegou ao campo de primeiro nome", order: 7 },
          { key: "profile_partner", label: "Chegou ao campo do nome dela", order: 8 },
          { key: "profile_age", label: "Chegou ao campo de faixa etária", order: 9 },
        ];
        const profileSteps = profileStepDefinitions.map((step, index) => {
          const sessions = profileStepMap.get(step.key)?.size || 0;
          const submitted = profileSubmittedMap.get(step.key)?.size || 0;
          const previousSessions =
            index === 0
              ? questions.filter((question) => question.phase === 1).at(-1)?.answered || 0
              : profileStepMap.get(profileStepDefinitions[index - 1].key)?.size || 0;
          return {
            ...step,
            sessions,
            submitted,
            completionRate: sessions > 0 ? Math.round((submitted / sessions) * 1000) / 10 : 0,
            stepRate: previousSessions > 0 ? Math.round((sessions / previousSessions) * 1000) / 10 : 0,
            overallRate: sessionMap.size > 0 ? Math.round((sessions / sessionMap.size) * 1000) / 10 : 0,
          };
        });

        const daily = Array.from(dailyMap.entries()).map(([date, sessions]) => ({
          date,
          sessions: sessions.size,
          checkoutClicks: Array.from(sessions).filter((id) => stageSets.get("checkoutClicks")?.has(id)).length,
          purchases: dailyPurchaseMap.get(date) || 0,
          revenue: Math.round((dailyRevenueMap.get(date) || 0) * 100) / 100,
        }));

        const recentSessions = Array.from(sessionMap.values())
          .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime())
          .slice(0, 50)
          .map((session) => ({
            sessionId: String(session.sessionId).slice(0, 12),
            firstSeenAt: session.firstSeenAt,
            lastSeenAt: session.lastSeenAt,
            source: session.source,
            campaign: session.campaign,
            content: session.content,
            device: session.device,
            result: session.result,
            deepestStage: session.deepestStage,
            lastQuestionId: session.lastQuestionId,
            lastQuestionTitle: session.lastQuestionTitle,
            purchaseValue: Number(session.purchaseValue || 0),
            purchaseAttributionMethod: session.purchaseAttributionMethod,
            purchaseOrders: session.purchaseOrders || [],
            durationSeconds: Math.max(0, Math.round((new Date(session.lastSeenAt).getTime() - new Date(session.firstSeenAt).getTime()) / 1000)),
          }));

        const totalPurchases = purchaseOrders.length;
        const totalRevenue = Math.round(purchaseOrders.reduce((total, order) => total + Number(order.value || 0), 0) * 100) / 100;

        return new Response(
          JSON.stringify({
            period,
            periodLabel: dateRange.label,
            startDate: since,
            endDate: until,
            totalEvents: events.length,
            uniqueSessions: sessionMap.size,
            totalPurchases,
            totalRevenue,
            trackedCheckoutClicks,
            recoveredCheckoutClicks,
            checkoutClicksWithRecovery,
            stages,
            questions,
            profileSteps,
            campaigns,
            daily,
            devices: Array.from(deviceMap.entries()).map(([name, sessions]) => ({ name, sessions: sessions.size })),
            results: Array.from(resultMap.entries()).map(([name, sessions]) => ({ name, sessions: sessions.size })),
            recentSessions,
            purchases: purchaseOrders
              .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
              .slice(0, 200),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "get_quiz_funnel_analytics": {
        const { period = "7d" } = body;
        const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
        const since = new Date(Date.now() - days * 86400000).toISOString();

        const { data: rows, error } = await supabase
          .from("quiz_funnel_events")
          .select("event_name, session_id, created_at, path, device_type, attribution, metadata")
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(20000);
        if (error) throw error;

        const events = rows || [];
        const stageDefinitions = [
          { key: "views", label: "Visitou o quiz", events: ["QuizView", "QuizVslView"] },
          { key: "starts", label: "Iniciou o quiz", events: ["QuizStart"] },
          { key: "firstAnalysis", label: "Chegou ao 1º diagnóstico", events: ["QuizVslFirstAnalysis"] },
          { key: "completes", label: "Concluiu as perguntas", events: ["QuizComplete"] },
          { key: "results", label: "Viu o diagnóstico final", events: ["QuizVslResultView", "QuizResult"] },
          { key: "videoStarts", label: "Iniciou a mini VSL", events: ["QuizVslStart"] },
          { key: "video25", label: "Assistiu 25% da VSL", events: ["QuizVsl25"] },
          { key: "video50", label: "Assistiu 50% da VSL", events: ["QuizVsl50"] },
          { key: "video75", label: "Assistiu 75% da VSL", events: ["QuizVsl75"] },
          { key: "offerReveals", label: "Liberou a oferta", events: ["QuizVslOfferReveal"] },
          { key: "checkoutClicks", label: "Clicou no checkout", events: ["QuizVslCheckoutClick"] },
          { key: "purchases", label: "Compra aprovada", events: ["QuizVslPurchase"] },
        ];

        const sessionMap = new Map<string, any>();
        const stageSets = new Map(
          stageDefinitions.map((stage) => [stage.key, new Set<string>()]),
        );
        const questionMap = new Map<string, any>();
        const profileStepMap = new Map<string, Set<string>>();
        const profileSubmittedMap = new Map<string, Set<string>>();

        for (const event of events as any[]) {
          const sessionId = event.session_id;
          if (!sessionId) continue;

          for (const stage of stageDefinitions) {
            if (stage.events.includes(event.event_name)) {
              stageSets.get(stage.key)?.add(sessionId);
            }
          }

          const attribution = event.attribution || {};
          const metadata = event.metadata || {};
          const questionId = String(metadata.question_id || "");
          const isQuestionView = event.event_name === "QuizVslQuestionView";
          const isQuestionAnswer = event.event_name === "QuizStepAnswer";

          if (questionId && (isQuestionView || isQuestionAnswer)) {
            const question = questionMap.get(questionId) || {
              questionId,
              title: metadata.question_title || questionId,
              order: Number(metadata.question_order || metadata.step || 999),
              phase: Number(metadata.phase || 0),
              reachedSessions: new Set<string>(),
              answeredSessions: new Set<string>(),
              answers: new Map<string, any>(),
            };

            question.title = metadata.question_title || question.title;
            question.order = Math.min(
              question.order,
              Number(metadata.question_order || metadata.step || question.order),
            );
            question.phase = Number(metadata.phase || question.phase || 0);
            question.reachedSessions.add(sessionId);

            if (isQuestionAnswer) {
              question.answeredSessions.add(sessionId);
              const answerId = String(metadata.answer_id || "sem_resposta");
              const answer = question.answers.get(answerId) || {
                answerId,
                label: metadata.answer_label || answerId,
                sessions: new Set<string>(),
              };
              answer.label = metadata.answer_label || answer.label;
              answer.sessions.add(sessionId);
              question.answers.set(answerId, answer);
            }

            questionMap.set(questionId, question);
          }

          if (
            ["QuizVslProfileStep", "QuizVslProfileSubmitted"].includes(
              event.event_name,
            ) &&
            metadata.profile_step
          ) {
            const rawProfileStep = String(metadata.profile_step);
            const profileStep =
              rawProfileStep === "profile_birth" ? "profile_age" : rawProfileStep;
            const targetMap =
              event.event_name === "QuizVslProfileSubmitted"
                ? profileSubmittedMap
                : profileStepMap;
            if (!targetMap.has(profileStep)) {
              targetMap.set(profileStep, new Set<string>());
            }
            targetMap.get(profileStep)?.add(sessionId);
          }

          const existing = sessionMap.get(sessionId) || {
            sessionId,
            firstSeenAt: event.created_at,
            lastSeenAt: event.created_at,
            source: attribution.utm_source || "direto",
            medium: attribution.utm_medium || "",
            campaign: attribution.utm_campaign || "sem campanha",
            content: attribution.utm_content || "",
            device: event.device_type || "desconhecido",
            result: "",
            deepestStage: "",
            lastQuestionId: "",
            lastQuestionTitle: "",
            purchaseValue: 0,
            purchaseAttributionMethod: "",
            events: new Set<string>(),
          };
          existing.lastSeenAt = event.created_at;
          existing.source = attribution.utm_source || existing.source;
          existing.medium = attribution.utm_medium || existing.medium;
          existing.campaign = attribution.utm_campaign || existing.campaign;
          existing.content = attribution.utm_content || existing.content;
          existing.device = event.device_type || existing.device;
          existing.result = metadata.quiz_result || existing.result;
          if (event.event_name === "QuizVslPurchase") {
            existing.purchaseValue = Number(metadata.purchase_value || 0);
            existing.purchaseAttributionMethod =
              metadata.attribution_method || existing.purchaseAttributionMethod;
          }
          if (questionId) {
            existing.lastQuestionId = questionId;
            existing.lastQuestionTitle = metadata.question_title || questionId;
          }
          existing.events.add(event.event_name);
          sessionMap.set(sessionId, existing);
        }

        const stages = stageDefinitions.map((stage, index) => {
          const sessions = stageSets.get(stage.key)?.size || 0;
          const previousSessions =
            index === 0 ? sessions : stageSets.get(stageDefinitions[index - 1].key)?.size || 0;
          return {
            key: stage.key,
            label: stage.label,
            sessions,
            stepRate:
              previousSessions > 0 ? Math.round((sessions / previousSessions) * 1000) / 10 : 0,
            overallRate:
              sessionMap.size > 0 ? Math.round((sessions / sessionMap.size) * 1000) / 10 : 0,
          };
        });

        const campaignMap = new Map<string, any>();
        const dailyMap = new Map<string, Set<string>>();
        const deviceMap = new Map<string, Set<string>>();
        const resultMap = new Map<string, Set<string>>();

        const hasStage = (session: any, stageKey: string) => {
          const definition = stageDefinitions.find((stage) => stage.key === stageKey);
          return definition?.events.some((eventName) => session.events.has(eventName)) || false;
        };

        for (const session of sessionMap.values()) {
          const campaignKey = [session.source, session.medium, session.campaign, session.content].join("|||");
          const campaign = campaignMap.get(campaignKey) || {
            source: session.source,
            medium: session.medium,
            campaign: session.campaign,
            content: session.content,
            sessions: 0,
            starts: 0,
            completes: 0,
            videoStarts: 0,
            offerReveals: 0,
            checkoutClicks: 0,
            purchases: 0,
            revenue: 0,
          };
          campaign.sessions += 1;
          if (hasStage(session, "starts")) campaign.starts += 1;
          if (hasStage(session, "completes")) campaign.completes += 1;
          if (hasStage(session, "videoStarts")) campaign.videoStarts += 1;
          if (hasStage(session, "offerReveals")) campaign.offerReveals += 1;
          if (hasStage(session, "checkoutClicks")) campaign.checkoutClicks += 1;
          if (hasStage(session, "purchases")) {
            campaign.purchases += 1;
            campaign.revenue += Number(session.purchaseValue || 0);
          }
          campaignMap.set(campaignKey, campaign);

          const day = String(session.firstSeenAt).split("T")[0];
          if (!dailyMap.has(day)) dailyMap.set(day, new Set());
          dailyMap.get(day)?.add(session.sessionId);

          if (!deviceMap.has(session.device)) deviceMap.set(session.device, new Set());
          deviceMap.get(session.device)?.add(session.sessionId);

          if (session.result) {
            if (!resultMap.has(session.result)) resultMap.set(session.result, new Set());
            resultMap.get(session.result)?.add(session.sessionId);
          }

          const deepest = [...stageDefinitions]
            .reverse()
            .find((stage) => hasStage(session, stage.key));
          session.deepestStage = deepest?.label || "Visitou o quiz";
        }

        const campaigns = Array.from(campaignMap.values())
          .map((campaign) => ({
            ...campaign,
            checkoutRate:
              campaign.sessions > 0
                ? Math.round((campaign.checkoutClicks / campaign.sessions) * 1000) / 10
                : 0,
            purchaseRate:
              campaign.checkoutClicks > 0
                ? Math.round((campaign.purchases / campaign.checkoutClicks) * 1000) / 10
                : 0,
            revenue: Math.round(campaign.revenue * 100) / 100,
          }))
          .sort((a, b) => b.sessions - a.sessions)
          .slice(0, 100);

        const sortedQuestions = Array.from(questionMap.values()).sort(
          (a, b) => a.order - b.order,
        );
        const questions = sortedQuestions.map((question, index) => {
          const reached = question.reachedSessions.size;
          const answered = question.answeredSessions.size;
          const previousReached =
            index === 0 ? sessionMap.size : sortedQuestions[index - 1].reachedSessions.size;

          return {
            questionId: question.questionId,
            title: question.title,
            order: question.order,
            phase: question.phase,
            reached,
            answered,
            abandoned: Math.max(0, reached - answered),
            answerRate:
              reached > 0 ? Math.round((answered / reached) * 1000) / 10 : 0,
            arrivalRate:
              sessionMap.size > 0
                ? Math.round((reached / sessionMap.size) * 1000) / 10
                : 0,
            stepRetention:
              previousReached > 0
                ? Math.round((reached / previousReached) * 1000) / 10
                : 0,
            answers: Array.from(question.answers.values())
              .map((answer: any) => ({
                answerId: answer.answerId,
                label: answer.label,
                sessions: answer.sessions.size,
                share:
                  answered > 0
                    ? Math.round((answer.sessions.size / answered) * 1000) / 10
                    : 0,
              }))
              .sort((a: any, b: any) => b.sessions - a.sessions),
          };
        });

        const profileStepDefinitions = [
          { key: "profile_name", label: "Chegou ao campo de primeiro nome", order: 7 },
          { key: "profile_partner", label: "Chegou ao campo do nome dela", order: 8 },
          { key: "profile_age", label: "Chegou ao campo de faixa etária", order: 9 },
        ];
        const profileSteps = profileStepDefinitions.map((step, index) => {
          const sessions = profileStepMap.get(step.key)?.size || 0;
          const submitted = profileSubmittedMap.get(step.key)?.size || 0;
          const previousSessions =
            index === 0
              ? questions.filter((question) => question.phase === 1).at(-1)?.answered || 0
              : profileStepMap.get(profileStepDefinitions[index - 1].key)?.size || 0;
          return {
            ...step,
            sessions,
            submitted,
            completionRate:
              sessions > 0
                ? Math.round((submitted / sessions) * 1000) / 10
                : 0,
            stepRate:
              previousSessions > 0
                ? Math.round((sessions / previousSessions) * 1000) / 10
                : 0,
            overallRate:
              sessionMap.size > 0
                ? Math.round((sessions / sessionMap.size) * 1000) / 10
                : 0,
          };
        });

        const daily = Array.from(dailyMap.entries()).map(([date, sessions]) => ({
          date,
          sessions: sessions.size,
          checkoutClicks: Array.from(sessions).filter((id) =>
            stageSets.get("checkoutClicks")?.has(id),
          ).length,
          purchases: Array.from(sessions).filter((id) =>
            stageSets.get("purchases")?.has(id),
          ).length,
        }));

        const recentSessions = Array.from(sessionMap.values())
          .sort(
            (a, b) =>
              new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
          )
          .slice(0, 50)
          .map((session) => ({
            sessionId: String(session.sessionId).slice(0, 8),
            firstSeenAt: session.firstSeenAt,
            lastSeenAt: session.lastSeenAt,
            source: session.source,
            campaign: session.campaign,
            content: session.content,
            device: session.device,
            result: session.result,
            deepestStage: session.deepestStage,
            lastQuestionId: session.lastQuestionId,
            lastQuestionTitle: session.lastQuestionTitle,
            purchaseValue: Number(session.purchaseValue || 0),
            purchaseAttributionMethod: session.purchaseAttributionMethod,
            durationSeconds: Math.max(
              0,
              Math.round(
                (new Date(session.lastSeenAt).getTime() -
                  new Date(session.firstSeenAt).getTime()) /
                  1000,
              ),
            ),
          }));

        return new Response(
          JSON.stringify({
            period,
            totalEvents: events.length,
            uniqueSessions: sessionMap.size,
            stages,
            questions,
            profileSteps,
            campaigns,
            daily,
            devices: Array.from(deviceMap.entries()).map(([name, sessions]) => ({
              name,
              sessions: sessions.size,
            })),
            results: Array.from(resultMap.entries()).map(([name, sessions]) => ({
              name,
              sessions: sessions.size,
            })),
            recentSessions,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "change_password": {
        const { new_password } = body;
        if (!new_password || typeof new_password !== "string" || new_password.length < 8) {
          return new Response(
            JSON.stringify({ error: "Senha deve ter pelo menos 8 caracteres" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Hash com bcrypt (cost factor 10 = padrão equilibrado de segurança/perf)
        const newHash = bcrypt.hashSync(new_password, 10);
        // Upsert (caso ainda não exista — Phase 2A deixou admin_settings vazio)
        const { error } = await supabase
          .from("admin_settings")
          .upsert({ key: "admin_password", value: newHash }, { onConflict: "key" });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 5 — Configurações globais via admin_settings
      // =================================================================
      //
      // Tabela admin_settings (key text UNIQUE, value text) já existe.
      // Por segurança, só lidamos com keys com prefix "site." aqui — admin_password
      // (que vive na mesma tabela) é gerenciada exclusivamente via change_password
      // com hash bcrypt e nunca é exposta.

      case "list_site_settings": {
        const { data, error } = await supabase
          .from("admin_settings")
          .select("key, value")
          .like("key", "site.%")
          .order("key", { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ settings: data || [] }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_site_setting": {
        const { key, value } = body;
        if (typeof key !== "string" || !key.startsWith("site.")) {
          return new Response(
            JSON.stringify({ error: "Key inválida — deve começar com 'site.'" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (value === undefined || value === null) {
          return new Response(
            JSON.stringify({ error: "value é obrigatório (string)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const v = String(value);
        // Limite defensivo: 64KB por valor (cabe quotes_json com folga)
        if (v.length > 64 * 1024) {
          return new Response(
            JSON.stringify({ error: "value acima de 64KB" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("admin_settings")
          .upsert({ key, value: v }, { onConflict: "key" });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, key }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "bulk_update_site_settings": {
        const { settings } = body;
        if (!Array.isArray(settings)) {
          return new Response(
            JSON.stringify({ error: "settings deve ser array de {key, value}" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const rows: { key: string; value: string }[] = [];
        for (const item of settings) {
          if (
            !item ||
            typeof item.key !== "string" ||
            !item.key.startsWith("site.") ||
            item.value === undefined ||
            item.value === null
          ) {
            return new Response(
              JSON.stringify({
                error:
                  "Cada item deve ter key (string começando com 'site.') e value (string)",
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const v = String(item.value);
          if (v.length > 64 * 1024) {
            return new Response(
              JSON.stringify({ error: `value de "${item.key}" acima de 64KB` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          rows.push({ key: item.key, value: v });
        }
        if (rows.length === 0) {
          return new Response(
            JSON.stringify({ success: true, count: 0 }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("admin_settings")
          .upsert(rows, { onConflict: "key" });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, count: rows.length }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 4.1 — Update consolidado de product_module
      // =================================================================

      case "update_product_module": {
        const { module_id, module_name, video_url, section_id, section_order, is_published, consultoria_config } = body;
        if (!module_id) {
          return new Response(
            JSON.stringify({ error: "module_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updates: any = { updated_at: new Date().toISOString() };
        if (typeof module_name === "string") {
          const trimmed = module_name.trim();
          if (!trimmed) {
            return new Response(
              JSON.stringify({ error: "module_name não pode ser vazio" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updates.module_name = trimmed;
        }
        if (video_url !== undefined) {
          updates.video_url = video_url || null;
        }
        if (section_id === null || typeof section_id === "string") {
          updates.section_id = section_id;
        }
        if (typeof section_order === "number") {
          updates.section_order = section_order;
        }
        if (typeof is_published === "boolean") {
          updates.is_published = is_published;
        }
        // PR ADMIN 6E — consultoria_config (jsonb)
        const consultRes = validateConsultoriaConfig(consultoria_config);
        if ("error" in consultRes) {
          return new Response(
            JSON.stringify({ error: consultRes.error }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (!consultRes.skip) {
          updates.consultoria_config = consultRes.value;
        }
        const { error } = await supabase
          .from("product_modules")
          .update(updates)
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 4 — product_sections + lesson_materials + module assign
      // =================================================================

      case "list_product_sections": {
        const { product_id, include_archived } = body;
        if (!product_id) {
          return new Response(
            JSON.stringify({ error: "product_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        let q = supabase
          .from("product_sections")
          .select("*")
          .eq("product_id", product_id)
          .order("display_order", { ascending: true });
        if (!include_archived) q = q.eq("archived", false);
        const { data: sections, error: sErr } = await q;
        if (sErr) throw sErr;

        const { data: modules, error: mErr } = await supabase
          .from("product_modules")
          .select("id, module_name, section_id, section_order, display_order, is_published, pdf_file_path, video_url, audio_file_path, consultoria_config, cover_image_url")
          .eq("product_id", product_id)
          .order("section_order", { ascending: true });
        if (mErr) throw mErr;

        const sectionIds = (sections || []).map((s: any) => s.id);
        const { data: materials, error: matErr } = sectionIds.length > 0
          ? await supabase
              .from("lesson_materials")
              .select("*")
              .in("section_id", sectionIds)
              .order("display_order", { ascending: true })
          : { data: [], error: null as any };
        if (matErr) throw matErr;

        return new Response(
          JSON.stringify({
            sections: sections || [],
            modules: modules || [],
            materials: materials || [],
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_product_section": {
        const { product_id, section_key, number, title, subtitle, kind: sKind, status: sStatus, sequential, in_production_copy, display_order } = body;
        if (!product_id || !section_key || !number || !title) {
          return new Response(
            JSON.stringify({ error: "product_id, section_key, number e title são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // section_key: lowercase/alfanum/dash (URL-safe)
        const cleanKey = String(section_key).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
        if (!cleanKey) {
          return new Response(
            JSON.stringify({ error: "section_key inválido após normalização" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Next display_order se não fornecido
        let nextOrder = display_order;
        if (typeof nextOrder !== "number") {
          const { data: maxRow } = await supabase
            .from("product_sections")
            .select("display_order")
            .eq("product_id", product_id)
            .order("display_order", { ascending: false })
            .limit(1);
          nextOrder = ((maxRow?.[0]?.display_order ?? -1) + 1);
        }
        const { data, error } = await supabase
          .from("product_sections")
          .insert({
            product_id,
            section_key: cleanKey,
            number: String(number),
            title: String(title),
            subtitle: subtitle || null,
            kind: sKind || "track",
            status: sStatus || "available",
            sequential: !!sequential,
            in_production_copy: in_production_copy || null,
            display_order: nextOrder,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, section: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_product_section": {
        const { section_id, ...rest } = body;
        if (!section_id) {
          return new Response(
            JSON.stringify({ error: "section_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updates: any = { updated_at: new Date().toISOString() };
        // PR ADMIN 6B: image_url + icon_key + accent_color adicionados aqui
        const allowed = [
          "section_key", "number", "title", "subtitle", "kind", "status",
          "sequential", "in_production_copy", "display_order",
          "image_url", "icon_key", "accent_color",
        ];
        for (const k of allowed) {
          if (rest[k] !== undefined) updates[k] = rest[k];
        }
        // Normaliza section_key se vier
        if (typeof updates.section_key === "string") {
          updates.section_key = updates.section_key.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
          if (!updates.section_key) {
            return new Response(
              JSON.stringify({ error: "section_key inválido após normalização" }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        // Valida icon_key (allowlist)
        if (updates.icon_key !== undefined && updates.icon_key !== null) {
          const allowedIcons = ["brain", "heart", "lock", "book", "clock", "target", "file", "play"];
          const v = String(updates.icon_key).trim().toLowerCase();
          if (v && !allowedIcons.includes(v)) {
            return new Response(
              JSON.stringify({
                error: `icon_key inválido: ${v}. Aceitos: ${allowedIcons.join(", ")}.`,
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updates.icon_key = v || null;
        }
        // Valida accent_color (hex #RRGGBB ou string vazia → null)
        if (updates.accent_color !== undefined && updates.accent_color !== null) {
          const v = String(updates.accent_color).trim();
          if (v && !/^#[0-9a-fA-F]{6}$/.test(v)) {
            return new Response(
              JSON.stringify({
                error: "accent_color deve estar no formato #RRGGBB (ex: #C99A3A).",
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updates.accent_color = v || null;
        }
        // PR ADMIN 6E — consultoria_config (jsonb)
        {
          const consultRes = validateConsultoriaConfig(rest.consultoria_config);
          if ("error" in consultRes) {
            return new Response(
              JSON.stringify({ error: consultRes.error }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (!consultRes.skip) {
            updates.consultoria_config = consultRes.value;
          }
        }
        const { error } = await supabase
          .from("product_sections")
          .update(updates)
          .eq("id", section_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_section_image": {
        // PR ADMIN 6B: limpa image_url da section + best-effort cleanup do bucket
        const { section_id } = body;
        if (!section_id) {
          return new Response(
            JSON.stringify({ error: "section_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        try {
          const { data: files } = await supabase.storage
            .from("product-images")
            .list(`sections/${section_id}`);
          if (files && files.length > 0) {
            const paths = files.map((f: any) => `sections/${section_id}/${f.name}`);
            await supabase.storage.from("product-images").remove(paths);
          }
        } catch (_e) {
          // ignora — pode ser URL externa ou bucket sem arquivos
        }
        const { error } = await supabase
          .from("product_sections")
          .update({ image_url: null, updated_at: new Date().toISOString() })
          .eq("id", section_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_hero_banner_image": {
        // PR ADMIN 6D: best-effort cleanup do bucket + update site.hero_banner_json
        // setando image_url="". Mantém outros campos (enabled, position, etc).
        try {
          const { data: files } = await supabase.storage
            .from("product-images")
            .list("site/hero-banner");
          if (files && files.length > 0) {
            const paths = files.map((f: any) => `site/hero-banner/${f.name}`);
            await supabase.storage.from("product-images").remove(paths);
          }
        } catch (_e) {
          // ignora
        }
        const { data: currentRow } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "site.hero_banner_json")
          .single();
        let currentJson: any = {};
        if (currentRow?.value) {
          try { currentJson = JSON.parse(currentRow.value); } catch { currentJson = {}; }
        }
        if (!currentJson || typeof currentJson !== "object" || Array.isArray(currentJson)) {
          currentJson = {};
        }
        currentJson.image_url = "";
        // Não desativa automaticamente — admin pode querer manter enabled e
        // subir outra imagem em seguida.
        const newJson = JSON.stringify(currentJson);
        const { error } = await supabase
          .from("admin_settings")
          .upsert({ key: "site.hero_banner_json", value: newJson }, { onConflict: "key" });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "archive_product_section": {
        const { section_id, archived } = body;
        if (!section_id || typeof archived !== "boolean") {
          return new Response(
            JSON.stringify({ error: "section_id e archived (boolean) são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("product_sections")
          .update({ archived, updated_at: new Date().toISOString() })
          .eq("id", section_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, archived }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_product_section": {
        const { section_id } = body;
        if (!section_id) {
          return new Response(
            JSON.stringify({ error: "section_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Segurança: bloquear delete se houver modules vinculados (manter integridade)
        const { count: modCount } = await supabase
          .from("product_modules")
          .select("id", { count: "exact", head: true })
          .eq("section_id", section_id);
        if ((modCount ?? 0) > 0) {
          return new Response(
            JSON.stringify({
              error: `Section tem ${modCount} módulo(s) vinculado(s). Reatribua antes de excluir, ou use arquivar.`,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Materials são removidos via CASCADE; mas deletamos manualmente pra evitar surpresa
        await supabase.from("lesson_materials").delete().eq("section_id", section_id);
        const { error } = await supabase
          .from("product_sections")
          .delete()
          .eq("id", section_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder_product_sections": {
        const { ordered_ids } = body;
        if (!Array.isArray(ordered_ids)) {
          return new Response(
            JSON.stringify({ error: "ordered_ids deve ser array" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        for (let i = 0; i < ordered_ids.length; i++) {
          await supabase
            .from("product_sections")
            .update({ display_order: i, updated_at: new Date().toISOString() })
            .eq("id", ordered_ids[i]);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "assign_module_to_section": {
        const { module_id, section_id, section_order } = body;
        if (!module_id) {
          return new Response(
            JSON.stringify({ error: "module_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updates: any = { updated_at: new Date().toISOString() };
        // section_id pode vir null pra desassociar
        if (section_id === null || typeof section_id === "string") {
          updates.section_id = section_id;
        }
        if (typeof section_order === "number") {
          updates.section_order = section_order;
        }
        const { error } = await supabase
          .from("product_modules")
          .update(updates)
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder_modules_in_section": {
        const { section_id, ordered_module_ids } = body;
        if (!section_id || !Array.isArray(ordered_module_ids)) {
          return new Response(
            JSON.stringify({ error: "section_id e ordered_module_ids são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        for (let i = 0; i < ordered_module_ids.length; i++) {
          await supabase
            .from("product_modules")
            .update({
              section_id,
              section_order: i,
              updated_at: new Date().toISOString(),
            })
            .eq("id", ordered_module_ids[i]);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create_section_material": {
        const { section_id, title, kind: matKind, state, external_url, display_order } = body;
        if (!section_id || !title) {
          return new Response(
            JSON.stringify({ error: "section_id e title são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Validar kind permitido
        const allowedKinds = ["pdf", "audio", "video", "link"];
        const k = matKind && allowedKinds.includes(matKind) ? matKind : "pdf";
        const s = state === "ready" || state === "coming-soon" ? state : "coming-soon";
        let nextOrder = display_order;
        if (typeof nextOrder !== "number") {
          const { data: maxRow } = await supabase
            .from("lesson_materials")
            .select("display_order")
            .eq("section_id", section_id)
            .order("display_order", { ascending: false })
            .limit(1);
          nextOrder = ((maxRow?.[0]?.display_order ?? -1) + 1);
        }
        const { data, error } = await supabase
          .from("lesson_materials")
          .insert({
            section_id,
            title: String(title),
            kind: k,
            state: s,
            external_url: external_url || null,
            display_order: nextOrder,
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, material: data }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update_section_material": {
        const { material_id, ...rest } = body;
        if (!material_id) {
          return new Response(
            JSON.stringify({ error: "material_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updates: any = {};
        const allowed = ["title", "kind", "state", "external_url", "display_order"];
        for (const k of allowed) {
          if (rest[k] !== undefined) updates[k] = rest[k];
        }
        if (updates.kind && !["pdf", "audio", "video", "link"].includes(updates.kind)) {
          return new Response(
            JSON.stringify({ error: "kind inválido (pdf/audio/video/link)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (updates.state && !["ready", "coming-soon"].includes(updates.state)) {
          return new Response(
            JSON.stringify({ error: "state inválido (ready/coming-soon)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabase
          .from("lesson_materials")
          .update(updates)
          .eq("id", material_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete_section_material": {
        const { material_id } = body;
        if (!material_id) {
          return new Response(
            JSON.stringify({ error: "material_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Se tem file_path, remover do bucket
        const { data: mat } = await supabase
          .from("lesson_materials")
          .select("file_path")
          .eq("id", material_id)
          .single();
        if (mat?.file_path) {
          await supabase.storage.from("product-pdfs").remove([mat.file_path]);
        }
        const { error } = await supabase
          .from("lesson_materials")
          .delete()
          .eq("id", material_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder_section_materials": {
        const { section_id, ordered_material_ids } = body;
        if (!section_id || !Array.isArray(ordered_material_ids)) {
          return new Response(
            JSON.stringify({ error: "section_id e ordered_material_ids são obrigatórios" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        for (let i = 0; i < ordered_material_ids.length; i++) {
          await supabase
            .from("lesson_materials")
            .update({ display_order: i })
            .eq("id", ordered_material_ids[i])
            .eq("section_id", section_id);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 6A — comercial: rating, reviews_count, checkout, visible
      // =================================================================

      case "update_product_commercial": {
        const { product_id, rating, reviews_count, checkout_url, visible, product_name, product_description, product_kind, consultoria_config, upsell_cta_config } = body;
        if (!product_id) {
          return new Response(
            JSON.stringify({ error: "product_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updates: any = { updated_at: new Date().toISOString() };
        if (rating !== undefined) {
          if (rating === null || rating === "") {
            updates.rating = null;
          } else {
            const n = Number(rating);
            if (Number.isNaN(n) || n < 0 || n > 5) {
              return new Response(
                JSON.stringify({ error: "rating deve estar entre 0 e 5 (ou null)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            // Arredonda pra 1 casa decimal (constraint do schema é numeric(2,1))
            updates.rating = Math.round(n * 10) / 10;
          }
        }
        if (reviews_count !== undefined) {
          if (reviews_count === null || reviews_count === "") {
            updates.reviews_count = null;
          } else {
            const n = Math.floor(Number(reviews_count));
            if (Number.isNaN(n) || n < 0) {
              return new Response(
                JSON.stringify({ error: "reviews_count deve ser inteiro >= 0 (ou null)" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            updates.reviews_count = n;
          }
        }
        if (checkout_url !== undefined) {
          // Valida URL se preenchida
          if (checkout_url && typeof checkout_url === "string" && checkout_url.trim()) {
            try {
              const u = new URL(checkout_url.trim());
              if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
            } catch {
              return new Response(
                JSON.stringify({ error: "checkout_url deve ser uma URL HTTP(S) válida" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            updates.checkout_url = checkout_url.trim();
          } else {
            updates.checkout_url = null;
          }
        }
        if (typeof visible === "boolean") {
          updates.visible = visible;
        }
        if (typeof product_name === "string" && product_name.trim()) {
          updates.product_name = product_name.trim();
        }
        if (product_description !== undefined) {
          updates.product_description = product_description || "";
        }
        // PR ADMIN 6C — product_kind (allowlist)
        if (product_kind !== undefined) {
          if (product_kind === null || product_kind === "") {
            updates.product_kind = null;
          } else {
            const allowedKinds = ["main", "complementary", "order_bump", "upsell", "bonus"];
            const v = String(product_kind).trim().toLowerCase();
            if (!allowedKinds.includes(v)) {
              return new Response(
                JSON.stringify({
                  error: `product_kind inválido. Aceitos: ${allowedKinds.join(", ")} ou null.`,
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
            updates.product_kind = v;
          }
        }
        // PR ADMIN 6E — consultoria_config (jsonb)
        {
          const consultRes = validateConsultoriaConfig(consultoria_config);
          if ("error" in consultRes) {
            return new Response(
              JSON.stringify({ error: consultRes.error }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (!consultRes.skip) {
            updates.consultoria_config = consultRes.value;
          }
        }
        // PR ADMIN 6H — upsell_cta_config (jsonb)
        {
          const upsellRes = validateUpsellCtaConfig(upsell_cta_config);
          if ("error" in upsellRes) {
            return new Response(
              JSON.stringify({ error: upsellRes.error }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (!upsellRes.skip) {
            updates.upsell_cta_config = upsellRes.value;
          }
        }

        const { error } = await supabase
          .from("product_settings")
          .update(updates)
          .eq("id", product_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "remove_product_image": {
        const { product_id } = body;
        if (!product_id) {
          return new Response(
            JSON.stringify({ error: "product_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Best-effort: tenta deletar todos os arquivos do prefixo products/{id}/.
        // Falha silenciosa porque pode ser URL externa (não nosso bucket).
        try {
          const { data: files } = await supabase.storage
            .from("product-images")
            .list(`products/${product_id}`);
          if (files && files.length > 0) {
            const paths = files.map((f: any) => `products/${product_id}/${f.name}`);
            await supabase.storage.from("product-images").remove(paths);
          }
        } catch (_e) {
          // ignora — pode ser URL externa ou bucket sem arquivos
        }

        const { error } = await supabase
          .from("product_settings")
          .update({ product_image_url: null, updated_at: new Date().toISOString() })
          .eq("id", product_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // =================================================================
      // PR ADMIN 6I — remove cover image de aula
      // =================================================================
      case "remove_module_cover_image": {
        const { module_id } = body;
        if (!module_id) {
          return new Response(
            JSON.stringify({ error: "module_id é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Best-effort cleanup do prefixo modules/{module_id}/. Falha silenciosa.
        try {
          const { data: files } = await supabase.storage
            .from("product-images")
            .list(`modules/${module_id}`);
          if (files && files.length > 0) {
            const paths = files
              .filter((f: any) => f.name.startsWith("cover-"))
              .map((f: any) => `modules/${module_id}/${f.name}`);
            if (paths.length > 0) {
              await supabase.storage.from("product-images").remove(paths);
            }
          }
        } catch (_e) {
          // ignora — pode ser URL externa ou bucket sem arquivos
        }

        const { error } = await supabase
          .from("product_modules")
          .update({ cover_image_url: null, updated_at: new Date().toISOString() })
          .eq("id", module_id);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("Admin API error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
