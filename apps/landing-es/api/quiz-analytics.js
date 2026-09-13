const QUIZ_ANALYTICS_UPSTREAM =
  process.env.QUIZ_ANALYTICS_UPSTREAM_URL ||
  "https://inpybctjupsuwteqjafq.supabase.co/functions/v1/quiz-analytics";

const readRequestBody = async (req) => {
  if (Buffer.isBuffer(req.body)) {
    const rawBody = req.body.toString("utf8");
    return rawBody ? JSON.parse(rawBody) : {};
  }
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const isValidPayload = (body) =>
  body &&
  typeof body === "object" &&
  typeof body.event === "string" &&
  body.event.startsWith("Quiz") &&
  typeof body.session_id === "string" &&
  body.session_id.length > 0 &&
  body.session_id.length <= 160;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (process.env.ANALYTICS_ENABLED !== "true") {
    return res.status(202).json({ ok: false, skipped: true, reason: "analytics_disabled" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body;
  try {
    body = await readRequestBody(req);
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_json" });
  }

  if (!isValidPayload(body)) {
    return res.status(400).json({ ok: false, error: "invalid_payload" });
  }

  try {
    const response = await fetch(QUIZ_ANALYTICS_UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": req.headers["user-agent"] || "",
      },
      body: JSON.stringify(body),
    });
    const responseText = await response.text();

    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json; charset=utf-8",
    );
    return res.send(responseText);
  } catch {
    return res.status(502).json({ ok: false, error: "analytics_upstream_failed" });
  }
}
