export type MarketConfig = {
  market: "es_global";
  locale: "es";
  brand: string;
  canonicalOrigin: string;
  trackingEnabled: boolean;
  analyticsEnabled: boolean;
  checkoutUrl: string;
  postPurchase: {
    membersAreaUrl: string;
    whatsapp: {
      contactName: string;
      phone: string;
    };
  };
  offer: {
    referencePrice: string;
    currentPrice: string;
    value: number;
    currency: "USD";
  };
  vturb: {
    playerId: string;
    scriptUrl: string;
    smartPlayerScriptUrl: string;
    preloadUrl: string;
    pitchSeconds: number;
  };
};

declare global {
  interface Window {
    __RECUPERA_ES_MARKET__?: MarketConfig;
  }
}

const config = window.__RECUPERA_ES_MARKET__;

if (!config) {
  throw new Error("No se pudo cargar la configuración del mercado español.");
}

export const MARKET = config;
