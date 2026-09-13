import { describe, expect, it } from "vitest";
import { findPurchasedProductForRoute, hasPurchasedAccess } from "./accessRecovery";
import type { Purchase } from "@/components/premium";

const basePurchase: Purchase = {
  id: "111462",
  product_settings_id: "settings-main",
  product_name: "O Código da Reconquista",
  product_description: "",
  product_image_url: "",
  access_url: "",
  checkout_url: "",
  purchase_date: null,
  amount: null,
  purchased: true,
  pdf_url: null,
  modules: [],
};

describe("accessRecovery", () => {
  it("rejects catalog-only responses without purchased products", () => {
    expect(
      hasPurchasedAccess([{ ...basePurchase, purchased: false }], 0),
    ).toBe(false);
  });

  it("accepts responses with at least one purchased product", () => {
    expect(hasPurchasedAccess([basePurchase], 1)).toBe(true);
  });

  it("recovers purchased products by gateway id or product settings id", () => {
    expect(findPurchasedProductForRoute([basePurchase], "111462")?.product_name).toBe(
      "O Código da Reconquista",
    );
    expect(findPurchasedProductForRoute([basePurchase], "settings-main")?.id).toBe(
      "111462",
    );
  });

  it("does not recover locked products", () => {
    expect(
      findPurchasedProductForRoute([{ ...basePurchase, purchased: false }], "111462"),
    ).toBeNull();
  });
});
