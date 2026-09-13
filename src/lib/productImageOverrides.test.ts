import { describe, expect, it } from "vitest";
import { resolveProductImage } from "./productImageOverrides";

describe("resolveProductImage", () => {
  it.each([
    "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e",
    "747ac43f-f60b-4a00-94b9-b09394ac11ad",
    "66a4fa9e-bd66-467b-85b1-1de853ec4ae9",
    "4c32298c-b4fe-4922-9ee7-e2413898dea0",
  ])("uses the approved cover for %s", (productSettingsId) => {
    expect(resolveProductImage(productSettingsId, "old-cover.png")).not.toBe(
      "old-cover.png",
    );
  });

  it("preserves the API image for products without an override", () => {
    expect(resolveProductImage("another-product", "api-cover.png")).toBe(
      "api-cover.png",
    );
  });
});
