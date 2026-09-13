import { MARKET } from "@/config/market";
import { buildUrlWithParams, trackEvent, trackStandardEvent } from "./tracking";

describe("tracking del mercado español", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState(
      {},
      "",
      "/quizvsl?utm_source=meta&utm_campaign=global&quiz_result=emergencia&preview_result=1",
    );
    vi.stubGlobal("fbq", vi.fn());
    MARKET.trackingEnabled = false;
    MARKET.analyticsEnabled = false;
    vi.restoreAllMocks();
  });

  it("propaga UTMs al checkout sem parâmetros internos do quiz", () => {
    const checkoutUrl = buildUrlWithParams("https://checkout.example.test/pay");
    const parsed = new URL(checkoutUrl);

    expect(parsed.searchParams.get("utm_source")).toBe("meta");
    expect(parsed.searchParams.get("utm_campaign")).toBe("global");
    expect(parsed.searchParams.has("quiz_result")).toBe(false);
    expect(parsed.searchParams.has("preview_result")).toBe(false);
  });

  it("não chama Meta, dataLayer ou analytics quando o preview está desativado", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    trackEvent("QuizVslView", { funnel: "quiz_vsl" });
    trackStandardEvent("InitiateCheckout", { value: 47.97, currency: "USD" });

    expect(globalThis.fbq).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("inclui market=es_global no payload futuro de analytics", () => {
    MARKET.analyticsEnabled = true;
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());

    trackEvent("QuizVslView", { funnel: "quiz_vsl" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const request = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.metadata.market).toBe("es_global");
  });
});
