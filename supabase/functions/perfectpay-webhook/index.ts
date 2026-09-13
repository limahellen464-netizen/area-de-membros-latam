import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

/**
 * Perfect Pay postback/webhook receiver.
 *
 * Configure in Perfect Pay: Ferramentas > Postback - Webhook, one entry per
 * product (or "todos os eventos"), URL + token both shown in the admin
 * panel at /admin/configuracoes (admin_settings.perfectpay.webhook_token —
 * regenerate it from that screen if it ever leaks).
 *
 * Payload reference (help.perfectpay.com.br/article/597): the body carries
 * `token`, `code` (unique sale code), `sale_amount`, `sale_status_enum`,
 * a nested `product` object (`product.code` is the product's registration
 * code in Perfect Pay — this is the "código" used to match a
 * product_settings row via product_settings.gateway_product_id), and a
 * nested `customer` object (`email`, `full_name`).
 *
 * sale_status_enum: 0 none, 1 pending, 2 approved, 3 in_process,
 * 4 in_mediation, 5 rejected, 6 cancelled, 7 refunded, 8 authorized,
 * 9 charged_back, 10 completed, 11 checkout_error, 12 precheckout,
 * 13 expired, 16 in_review.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GRANT_ACCESS_STATUSES = new Set([2, 10]); // approved, completed
const REVOKE_ACCESS_STATUSES = new Set([5, 6, 7, 9]); // rejected, cancelled, refunded, charged_back

interface PerfectPayCustomer {
  email?: string;
  full_name?: string;
}

interface PerfectPayProduct {
  code?: string;
  name?: string;
}

interface PerfectPayPayload {
  token?: string;
  code?: string;
  sale_amount?: number;
  currency_enum?: string;
  sale_status_enum?: number;
  product?: PerfectPayProduct;
  customer?: PerfectPayCustomer;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase env" }, 500);

  const db = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: tokenSetting } = await db
    .from("admin_settings")
    .select("value")
    .eq("key", "perfectpay.webhook_token")
    .maybeSingle();
  const webhookToken = tokenSetting?.value as string | undefined;
  if (!webhookToken) return json({ error: "Webhook token not initialized (run migrations)" }, 500);

  const payload = (await req.json().catch(() => null)) as PerfectPayPayload | null;
  if (!payload) return json({ error: "Invalid JSON body" }, 400);

  if (payload.token !== webhookToken) {
    return json({ error: "Invalid token" }, 401);
  }

  const saleCode = String(payload.code || "");
  const statusEnum = Number(payload.sale_status_enum ?? -1);
  const productCode = String(payload.product?.code || "").trim();
  const email = String(payload.customer?.email || "").trim().toLowerCase();
  const buyerName = payload.customer?.full_name || null;

  if (!saleCode) return json({ error: "Missing sale code" }, 400);

  // Idempotency: one row per (sale code, status). Perfect Pay retries the
  // exact same event on timeouts; a genuine status change (e.g. approved
  // -> refunded) is a different event_id and is processed again.
  const eventId = `${saleCode}:${statusEnum}`;
  const { error: insertEventError } = await db.from("webhook_events").insert({
    provider: "perfectpay",
    event_id: eventId,
    event_type: String(statusEnum),
    payload,
  });
  if (insertEventError) {
    if (insertEventError.code === "23505") {
      // Duplicate delivery of the same status — already handled.
      return json({ ok: true, duplicate: true });
    }
    console.error("perfectpay-webhook: failed to log event", insertEventError);
    return json({ error: insertEventError.message }, 500);
  }

  if (!GRANT_ACCESS_STATUSES.has(statusEnum) && !REVOKE_ACCESS_STATUSES.has(statusEnum)) {
    // Informational status (pending, in review, checkout abandoned, ...):
    // logged above, no purchase change yet.
    return json({ ok: true, status: statusEnum });
  }

  if (!email || !productCode) {
    console.error("perfectpay-webhook: missing email or product code", { saleCode, email, productCode });
    return json({ ok: true, warning: "Missing email or product code" });
  }

  const { data: product, error: productError } = await db
    .from("product_settings")
    .select("id")
    .eq("gateway_product_id", productCode)
    .maybeSingle();
  if (productError) {
    console.error("perfectpay-webhook: product lookup failed", productError);
    return json({ error: productError.message }, 500);
  }
  if (!product) {
    console.error(`perfectpay-webhook: no product mapped to gateway_product_id="${productCode}"`);
    return json({ ok: true, warning: `Unmapped product code: ${productCode}` });
  }

  if (GRANT_ACCESS_STATUSES.has(statusEnum)) {
    const { error: upsertError } = await db.from("purchases").upsert(
      {
        email,
        buyer_name: buyerName,
        product_settings_id: product.id,
        gateway_purchase_id: saleCode,
        status: "active",
        amount: typeof payload.sale_amount === "number" ? payload.sale_amount / 100 : null,
        currency: payload.currency_enum || "USD",
        metadata: { source: "perfectpay", sale_status_enum: statusEnum },
      },
      { onConflict: "gateway_purchase_id" },
    );
    if (upsertError) {
      console.error("perfectpay-webhook: failed to upsert purchase", upsertError);
      return json({ error: upsertError.message }, 500);
    }
  } else {
    const { error: revokeError } = await db
      .from("purchases")
      .update({ status: "revoked" })
      .eq("gateway_purchase_id", saleCode);
    if (revokeError) {
      console.error("perfectpay-webhook: failed to revoke purchase", revokeError);
      return json({ error: revokeError.message }, 500);
    }
  }

  return json({ ok: true, status: statusEnum });
});
