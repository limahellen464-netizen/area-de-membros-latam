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

const PRODUCT_IMAGE_BUCKET = "latam-product-images";
const PDF_BUCKET = "latam-product-pdfs";
const AUDIO_BUCKET = "latam-product-audios";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

type StorageClient = ReturnType<typeof createClient>["storage"];

const publicUrl = (storage: StorageClient, path: string | null) =>
  path ? storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : null;

const signedUrl = async (storage: StorageClient, bucket: string, path: string | null) => {
  if (!path) return null;
  const { data } = await storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl || null;
};

interface ProductModuleRow {
  id: string;
  section_id: string | null;
  slug: string;
  module_name: string;
  module_order: number;
  media_status: string;
  is_published: boolean;
  video_provider: string;
  video_url: string | null;
  pdf_file_path: string | null;
  audio_file_path: string | null;
  cover_image_path: string | null;
  has_video: boolean;
  has_pdf: boolean;
  has_audio: boolean;
}

interface ProductSectionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  section_number: string;
  image_path: string | null;
  status: string;
  display_order: number;
}

interface ProductSettingsRow {
  id: string;
  slug: string;
  product_name: string;
  product_description: string;
  product_image_path: string | null;
  product_kind: string;
  gateway_product_id: string;
  checkout_url: string | null;
  access_url: string | null;
  is_visible: boolean;
  display_order: number;
  product_sections: ProductSectionRow[];
  product_modules: ProductModuleRow[];
}

async function resolveProduct(storage: StorageClient, product: ProductSettingsRow, purchased: boolean) {
  const modules = await Promise.all(
    (product.product_modules || [])
      .sort((a, b) => a.module_order - b.module_order)
      .map(async (module) => ({
        id: module.id,
        slug: module.slug,
        section_id: module.section_id,
        module_name: module.module_name,
        module_order: module.module_order,
        media_status: module.media_status,
        is_published: module.is_published,
        video_provider: module.video_provider,
        video_url: module.video_url,
        has_video: module.has_video,
        has_pdf: module.has_pdf,
        has_audio: module.has_audio,
        pdf_url: await signedUrl(storage, PDF_BUCKET, module.pdf_file_path),
        audio_url: await signedUrl(storage, AUDIO_BUCKET, module.audio_file_path),
        cover_image_url: publicUrl(storage, module.cover_image_path),
      })),
  );

  const sections = (product.product_sections || [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((section) => ({
      key: section.slug,
      number: section.section_number,
      title: section.title,
      subtitle: section.description,
      status: section.status,
      moduleIds: modules.filter((m) => m.section_id === section.id).map((m) => m.id),
      image_url: publicUrl(storage, section.image_path),
    }));

  return {
    id: product.id,
    slug: product.slug,
    product_settings_id: product.id,
    product_name: product.product_name,
    product_description: product.product_description,
    product_image_url: publicUrl(storage, product.product_image_path),
    product_kind: product.product_kind,
    checkout_url: product.checkout_url,
    access_url: product.access_url,
    purchased,
    modules,
    sections,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase env" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const payload = await req.json().catch(() => ({}));
  const email = String(payload.email || "").trim().toLowerCase();
  const action = String(payload.action || "login");
  if (!email) return json({ error: "Email is required" }, 400);

  await supabase.from("access_logs").insert({
    email,
    action,
    metadata: payload.metadata || {},
  });

  if (action === "complete_module") {
    const moduleId = String(payload.module_id || "");
    const { data: moduleRow } = await supabase
      .from("product_modules")
      .select("id, product_settings_id")
      .eq("id", moduleId)
      .maybeSingle();
    if (!moduleRow) return json({ error: "Lesson not found" }, 404);
    await supabase.from("module_completions").upsert({
      email,
      module_id: moduleRow.id,
      product_settings_id: moduleRow.product_settings_id,
      metadata: payload.metadata || {},
    });
    return json({ ok: true });
  }

  const { data: purchases, error: purchasesError } = await supabase
    .from("purchases")
    .select("product_settings_id, buyer_name, status")
    .eq("status", "active")
    .eq("email", email);
  if (purchasesError) return json({ error: purchasesError.message }, 500);

  const productIds = new Set((purchases || []).map((purchase) => purchase.product_settings_id));

  const { data: products, error: productsError } = await supabase
    .from("product_settings")
    .select("*, product_sections(*), product_modules(*)")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });
  if (productsError) return json({ error: productsError.message }, 500);

  const { data: completions } = await supabase
    .from("module_completions")
    .select("module_id")
    .eq("email", email);
  const completedModuleIds = new Set((completions || []).map((row) => row.module_id));

  const resolvedProducts = await Promise.all(
    (products || []).map(async (product) => {
      const resolved = await resolveProduct(supabase.storage, product as ProductSettingsRow, productIds.has(product.id));
      return {
        ...resolved,
        modules: resolved.modules.map((module) => ({
          ...module,
          completed: completedModuleIds.has(module.id),
        })),
      };
    }),
  );

  return json({
    buyer_name: purchases?.[0]?.buyer_name || null,
    purchasedCount: productIds.size,
    totalCount: resolvedProducts.length,
    products: resolvedProducts,
  });
});
