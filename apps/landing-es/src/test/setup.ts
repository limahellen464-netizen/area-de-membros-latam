import "@testing-library/jest-dom";

window.__RECUPERA_ES_MARKET__ = {
  market: "es_global",
  locale: "es",
  brand: "El Código de la Reconquista",
  canonicalOrigin: "https://recuperaatuexahora.com",
  trackingEnabled: false,
  analyticsEnabled: false,
  checkoutUrl: "https://checkout.example.test/internacional",
  postPurchase: {
    membersAreaUrl: "https://members.example.test",
    whatsapp: {
      contactName: "Enrico",
      phone: "555399564481",
    },
  },
  offer: {
    referencePrice: "US$ 497",
    currentPrice: "US$ 47,97",
    value: 47.97,
    currency: "USD",
  },
  vturb: {
    playerId: "vid-preview-es",
    scriptUrl: "https://scripts.example.test/player.js",
    smartPlayerScriptUrl: "https://scripts.example.test/smartplayer.js",
    preloadUrl: "https://cdn.example.test/main.m3u8",
    pitchSeconds: 645,
  },
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
