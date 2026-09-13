import { MARKET } from "@/config/market";

type TrackingPayloadValue = string | number | boolean | null | undefined;
export type TrackingPayload = Record<string, TrackingPayloadValue>;
type TrackEventOptions = {
  preferBeacon?: boolean;
};
type TrackStandardEventOptions = {
  sendToMeta?: boolean;
};

export type TrackingEventName =
  | "QuizView"
  | "QuizStart"
  | "QuizStepAnswer"
  | "QuizComplete"
  | "QuizResult"
  | "QualifiedLead"
  | "LowIntentLead"
  | "ClickToVSL"
  | "ViewVSL"
  | "QuizVslView"
  | "QuizVslStart"
  | "QuizVslQuestionView"
  | "QuizVslProfileStep"
  | "QuizVslProfileSubmitted"
  | "QuizVslEngagedView"
  | "QuizVsl25"
  | "QuizVsl50"
  | "QuizVsl75"
  | "QuizVslOfferReveal"
  | "QuizVslCheckoutClick"
  | "QuizVslPersonalizationStarted"
  | "QuizVslFirstAnalysis"
  | "QuizVslSecondStageStarted"
  | "QuizVslFinalAnalysis"
  | "QuizVslResultView"
  | "QuizVslDiagnosisBuilt"
  | "QuizVslContentUnlocked"
  | "QuizVslProductSectionView"
  | "QuizVslTestimonialsView"
  | "QuizVslFaqView"
  | "QuizVslOfferView"
  | "DecoySignal"
  | "DecoyQuizView"
  | "DecoyQuizComplete"
  | "DecoyPageView"
  | "DecoyGuideClick"
  | "DecoyGatewayDecision"
  | "whatsapp_access_page_view"
  | "whatsapp_access_click"
  | "member_area_redirect_after_whatsapp"
  | "member_area_direct_access_click";

type MetaEventType = "standard" | "custom";

const META_DISABLED_CUSTOM_EVENTS = new Set<TrackingEventName>([
  "QuizView",
  "QuizStart",
  "QuizStepAnswer",
  "QuizComplete",
  "QuizResult",
  "QualifiedLead",
  "LowIntentLead",
  "ClickToVSL",
  "whatsapp_access_click",
  "member_area_direct_access_click",
]);

const isMetaDisabledCustomEvent = (eventName: TrackingEventName) =>
  eventName.startsWith("QuizVsl") || META_DISABLED_CUSTOM_EVENTS.has(eventName);

const ATTRIBUTION_STORAGE_KEY = "recupera_es_attribution_params";
const QUIZ_FUNNEL_SESSION_KEY = "recupera_es_quiz_funnel_session_id";
const QUIZ_ANALYTICS_URL =
  import.meta.env.VITE_QUIZ_ANALYTICS_URL ||
  "/api/quiz-analytics";
const QUIZ_PARAM_KEYS = new Set([
  "quiz_result",
  "quiz_score",
  "quiz_intent",
  "preview_quiz_vsl",
  "preview_result",
]);

const isBrowser = () => typeof window !== "undefined";

const sanitizeParams = (params: TrackingPayload): Record<string, string> => {
  const clean: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!key || value === undefined || value === null || value === "") continue;
    clean[key] = String(value);
  }

  return clean;
};

export const readUrlParams = (search?: string): Record<string, string> => {
  if (!isBrowser() && search === undefined) return {};

  const rawSearch = search ?? window.location.search;
  const params = new URLSearchParams(rawSearch);
  const result: Record<string, string> = {};

  params.forEach((value, key) => {
    if (key && value !== "") {
      result[key] = value;
    }
  });

  return result;
};

export const getStoredAttribution = (): Record<string, string> => {
  if (!isBrowser()) return {};

  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return sanitizeParams(parsed as TrackingPayload);
  } catch {
    return {};
  }
};

export const persistAttributionFromUrl = (): Record<string, string> => {
  if (!isBrowser()) return {};

  const currentParams = readUrlParams();
  const storedParams = getStoredAttribution();
  const nextParams = sanitizeParams({ ...storedParams, ...currentParams });

  try {
    if (Object.keys(nextParams).length > 0) {
      window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(nextParams));
    }
  } catch {
    // sessionStorage can be blocked in some browser contexts.
  }

  return nextParams;
};

export const getCurrentAttribution = (): Record<string, string> => {
  return sanitizeParams({ ...getStoredAttribution(), ...readUrlParams() });
};

const removeQuizParams = (params: Record<string, string>): Record<string, string> => {
  const externalParams: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (!QUIZ_PARAM_KEYS.has(key)) {
      externalParams[key] = value;
    }
  }

  return externalParams;
};

export const buildUrlWithParams = (
  targetUrl: string,
  extraParams: TrackingPayload = {},
  options: { includeQuizParams?: boolean } = {}
): string => {
  const isRelativePath = targetUrl.startsWith("/") && !targetUrl.startsWith("//");
  const baseUrl = isBrowser() ? window.location.origin : MARKET.canonicalOrigin;

  try {
    const url = new URL(targetUrl, baseUrl);
    const isCurrentOrigin = isBrowser() && url.origin === window.location.origin;
    const shouldKeepQuizParams = options.includeQuizParams ?? (isRelativePath || isCurrentOrigin);
    const mergedParams = sanitizeParams({
      ...getStoredAttribution(),
      ...readUrlParams(),
      ...extraParams,
    });
    const paramsToApply = shouldKeepQuizParams ? mergedParams : removeQuizParams(mergedParams);

    for (const [key, value] of Object.entries(paramsToApply)) {
      url.searchParams.set(key, value);
    }

    if (isRelativePath) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    return targetUrl;
  }
};

const trackMeta = (
  _eventName: string,
  _payload: Record<string, string>,
  _eventType: MetaEventType
) => {
  // Direct Meta Pixel/CAPI dispatch is intentionally disabled.
  // Pixel events must be emitted only by the UTMify scripts loaded in the HTML.
};

const ATTRIBUTION_KEYS = new Set([
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
  "quiz_origin",
  "quiz_checkout_click_id",
]);

export const getQuizFunnelSessionId = () => {
  try {
    const stored = window.sessionStorage.getItem(QUIZ_FUNNEL_SESSION_KEY);
    if (stored) return stored;

    const sessionId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(QUIZ_FUNNEL_SESSION_KEY, sessionId);
    return sessionId;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const logQuizFunnelEvent = (
  eventName: string,
  payload: Record<string, string>,
  options: TrackEventOptions = {},
) => {
  if (!MARKET.analyticsEnabled) return;

  const isQuizVslEvent =
    eventName.startsWith("QuizVsl") ||
    (payload.funnel === "quiz_vsl" &&
      ["QuizView", "QuizStart", "QuizStepAnswer", "QuizComplete", "QuizResult", "QualifiedLead", "LowIntentLead"].includes(eventName));

  if (!isQuizVslEvent) return;

  const attribution: Record<string, string> = {};
  const metadata: Record<string, string> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (ATTRIBUTION_KEYS.has(key)) attribution[key] = value;
    else metadata[key] = value;
  }

  let referrerHost = "";
  try {
    referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
  } catch {
    referrerHost = "";
  }

  const body = JSON.stringify({
    event: eventName,
    session_id: getQuizFunnelSessionId(),
    path: window.location.pathname,
    referrer_host: referrerHost,
    attribution,
    metadata,
  });

  if (options.preferBeacon && navigator.sendBeacon) {
    try {
      const sent = navigator.sendBeacon(
        QUIZ_ANALYTICS_URL,
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    } catch {
      // Fall back to fetch keepalive below.
    }
  }

  void fetch(QUIZ_ANALYTICS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Funnel analytics must never interrupt the acquisition flow.
  });
};

export const trackEvent = (
  eventName: TrackingEventName,
  payload: TrackingPayload = {},
  options: TrackEventOptions = {},
) => {
  if (!isBrowser()) return;

  const safePayload = sanitizeParams({
    ...getCurrentAttribution(),
    market: MARKET.market,
    ...payload,
  });

  if (MARKET.trackingEnabled && !isMetaDisabledCustomEvent(eventName)) {
    trackMeta(eventName, safePayload, "custom");
  }

  logQuizFunnelEvent(eventName, safePayload, options);
};

export const trackStandardEvent = (
  eventName: string,
  payload: TrackingPayload = {},
  options: TrackStandardEventOptions = {},
) => {
  if (!isBrowser()) return;

  const safePayload = sanitizeParams({
    ...getCurrentAttribution(),
    market: MARKET.market,
    ...payload,
  });

  if (MARKET.trackingEnabled && options.sendToMeta !== false) {
    trackMeta(eventName, safePayload, "standard");
  }

  logQuizFunnelEvent(eventName, safePayload);
};
