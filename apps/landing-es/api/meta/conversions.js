import crypto from "node:crypto";

const HASHED_USER_DATA_FIELDS = new Set([
  "em",
  "ph",
  "fn",
  "ln",
  "db",
  "ge",
  "ct",
  "st",
  "zp",
  "country",
  "external_id",
]);

const PLAIN_USER_DATA_FIELDS = new Set([
  "client_ip_address",
  "client_user_agent",
  "fbp",
  "fbc",
  "subscription_id",
  "fb_login_id",
  "lead_id",
  "anon_id",
]);

const ARRAY_USER_DATA_FIELDS = new Set(["em", "ph", "external_id"]);

const DEFAULT_GRAPH_API_VERSION = "v21.0";

const isSha256 = (value) => /^[a-f0-9]{64}$/i.test(String(value || ""));

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

const normalizeUserValue = (field, value) => {
  if (value === undefined || value === null) return "";
  if (isSha256(value)) return String(value).toLowerCase();

  switch (field) {
    case "em":
      return String(value).trim().toLowerCase();
    case "ph":
      return String(value).replace(/\D/g, "");
    case "db":
      return String(value).replace(/\D/g, "");
    case "zp":
      return String(value).trim().toLowerCase().replace(/\s+/g, "");
    case "external_id":
      return String(value).trim().toLowerCase();
    default:
      return normalizeText(value);
  }
};

const hashValue = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const normalizeAndHash = (field, value) => {
  const normalized = normalizeUserValue(field, value);
  if (!normalized) return "";
  if (isSha256(normalized)) return normalized.toLowerCase();
  return hashValue(normalized);
};

const toArray = (value) => (Array.isArray(value) ? value : [value]);

const cleanPlainValue = (value) => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeUserData = (rawUserData = {}, req) => {
  const userData = {};

  for (const [field, rawValue] of Object.entries(rawUserData)) {
    if (HASHED_USER_DATA_FIELDS.has(field)) {
      const values = toArray(rawValue)
        .map((value) => normalizeAndHash(field, value))
        .filter(Boolean);

      if (values.length === 0) continue;
      userData[field] = ARRAY_USER_DATA_FIELDS.has(field) ? values : values[0];
      continue;
    }

    if (PLAIN_USER_DATA_FIELDS.has(field)) {
      const value = cleanPlainValue(rawValue);
      if (value) userData[field] = value;
    }
  }

  const forwardedFor = cleanPlainValue(req.headers["x-forwarded-for"]);
  const realIp = cleanPlainValue(req.headers["x-real-ip"]);
  const userAgent = cleanPlainValue(req.headers["user-agent"]);
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : realIp;

  if (ip && !userData.client_ip_address) userData.client_ip_address = ip;
  if (userAgent && !userData.client_user_agent) userData.client_user_agent = userAgent;

  return userData;
};

const normalizeCustomData = (rawCustomData = {}) => {
  const customData = {};

  for (const [key, value] of Object.entries(rawCustomData)) {
    if (!key || value === undefined || value === null || value === "") continue;
    customData[key] = value;
  }

  return customData;
};

const readRequestBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const getPixelId = (body) =>
  cleanPlainValue(body.pixel_id) ||
  cleanPlainValue(process.env.META_PIXEL_ID);

const buildEventPayload = (body, req) => {
  const eventName = cleanPlainValue(body.event_name);
  const eventSourceUrl = cleanPlainValue(body.event_source_url);

  if (!eventName) throw new Error("event_name required");
  if (!eventSourceUrl) throw new Error("event_source_url required");

  return {
    event_name: eventName,
    event_time: Number(body.event_time) || Math.floor(Date.now() / 1000),
    event_id: cleanPlainValue(body.event_id) || undefined,
    action_source: cleanPlainValue(body.action_source) || "website",
    event_source_url: eventSourceUrl,
    user_data: normalizeUserData(body.user_data, req),
    custom_data: normalizeCustomData(body.custom_data),
  };
};

export default async function handler(req, res) {
  if (process.env.TRACKING_ENABLED !== "true") {
    return res.status(202).json({ ok: false, skipped: true, reason: "tracking_disabled" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body;
  let event;
  try {
    body = await readRequestBody(req);
    event = buildEventPayload(body, req);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message || "invalid_payload" });
  }

  const accessToken = cleanPlainValue(process.env.META_CONVERSIONS_API_ACCESS_TOKEN);
  if (!accessToken) {
    return res.status(202).json({
      ok: false,
      skipped: true,
      reason: "META_CONVERSIONS_API_ACCESS_TOKEN_missing",
    });
  }

  const pixelId = getPixelId(body);
  if (!pixelId) {
    return res.status(202).json({
      ok: false,
      skipped: true,
      reason: "META_PIXEL_ID_missing",
    });
  }

  const graphVersion = cleanPlainValue(process.env.META_GRAPH_API_VERSION) || DEFAULT_GRAPH_API_VERSION;
  const metaPayload = { data: [event] };
  const testEventCode = cleanPlainValue(process.env.META_TEST_EVENT_CODE);
  if (testEventCode) metaPayload.test_event_code = testEventCode;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaPayload),
      }
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: "meta_api_error",
        status: response.status,
        result,
      });
    }

    return res.status(200).json({ ok: true, result });
  } catch (error) {
    return res.status(502).json({ ok: false, error: "meta_request_failed" });
  }
}
