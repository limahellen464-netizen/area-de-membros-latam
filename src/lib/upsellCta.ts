/**
 * upsellCta.ts — resolução da CTA de compra exibida pra leads não-compradores.
 *
 * Vem do `product_settings.upsell_cta_config` (jsonb) via members-api.
 * Quando null/parcial, aplica defaults sensíveis.
 *
 * PR ADMIN 6H.
 */

import type { ResolvedUpsellCta } from "@/components/premium/types";

// Defaults usados quando o admin não preencheu o campo. Texto curto e neutro
// que funciona pra qualquer produto + cor dourada (combina com o tema).
export const DEFAULT_UPSELL_CTA: ResolvedUpsellCta = {
  enabled: true,
  message: "Você ainda não tem este conteúdo.",
  buttonLabel: "Comprar agora",
  buttonColor: "#b8860b", // dourado escuro (combina com --accent do tema)
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Resolve a config crua do DB num shape pronto pra UI. Defensa em camadas
 * — qualquer campo inválido cai pro default.
 */
export function resolveUpsellCta(raw: unknown): ResolvedUpsellCta {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_UPSELL_CTA };
  }
  const obj = raw as Record<string, unknown>;
  const out: ResolvedUpsellCta = { ...DEFAULT_UPSELL_CTA };

  if (typeof obj.enabled === "boolean") {
    out.enabled = obj.enabled;
  }
  if (typeof obj.message === "string" && obj.message.trim().length > 0) {
    out.message = obj.message.trim();
  }
  if (typeof obj.button_label === "string" && obj.button_label.trim().length > 0) {
    out.buttonLabel = obj.button_label.trim();
  }
  if (typeof obj.button_color === "string" && HEX_RE.test(obj.button_color.trim())) {
    out.buttonColor = obj.button_color.trim().toLowerCase();
  }
  return out;
}

/**
 * Decide se o produto deve mostrar contraste alto (texto branco) ou
 * baixo (texto preto) baseado na luminância da cor de fundo.
 *
 * Algoritmo: luminância relativa simplificada (sem gamma correction
 * acurada — bom o suficiente pra CTA).
 */
export function pickContrastText(hexBg: string): string {
  const m = HEX_RE.exec(hexBg);
  if (!m) return "#ffffff";
  const hex = hexBg.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Luminância relativa (não-linear simplificada)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#ffffff";
}
