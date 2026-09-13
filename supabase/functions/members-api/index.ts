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

  const { data: purchases, error } = await supabase
    .from("purchases")
    .select("product_settings_id, buyer_name, status")
    .eq("status", "active")
    .eq("email", email);
  if (error) return json({ error: error.message }, 500);

  const productIds = (purchases || []).map((purchase) => purchase.product_settings_id);
  const { data: products } = await supabase
    .from("product_settings")
    .select("*, product_sections(*), product_modules(*)")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  return json({
    buyer_name: purchases?.[0]?.buyer_name || null,
    purchasedCount: productIds.length,
    totalCount: products?.length || 0,
    products: (products || []).map((product) => ({
      ...product,
      purchased: productIds.includes(product.id),
    })),
  });
});
