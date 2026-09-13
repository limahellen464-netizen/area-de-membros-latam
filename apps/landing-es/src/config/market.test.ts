import { MARKET } from "./market";
import { QUIZ_VSL_PLAYER } from "./quizVsl";

describe("configuración del mercado español", () => {
  it("mantiene una sola oferta y un solo reproductor para las rutas", () => {
    expect(MARKET.market).toBe("es_global");
    expect(MARKET.locale).toBe("es");
    expect(MARKET.offer).toMatchObject({
      referencePrice: "US$ 497",
      currentPrice: "US$ 47,97",
      value: 47.97,
      currency: "USD",
    });
    expect(QUIZ_VSL_PLAYER.id).toBe(MARKET.vturb.playerId);
    expect(QUIZ_VSL_PLAYER.pitchSeconds).toBe(MARKET.vturb.pitchSeconds);
  });

  it("mantiene todo el tracking desactivado durante la homologación", () => {
    expect(MARKET.trackingEnabled).toBe(false);
    expect(MARKET.analyticsEnabled).toBe(false);
  });
});
