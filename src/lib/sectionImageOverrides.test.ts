import { describe, expect, it } from "vitest";
import {
  resolveSectionImage,
  resolveSectionTitle,
} from "./sectionImageOverrides";

const MAIN_PRODUCT_SETTINGS_ID = "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e";

describe("resolveSectionImage", () => {
  it.each([
    "boas-vindas",
    "ocitocina-dopamina",
    "fundamentos-15-dias",
  ])("provides the approved image for %s", (sectionKey) => {
    expect(
      resolveSectionImage(MAIN_PRODUCT_SETTINGS_ID, sectionKey, null),
    ).toBeTruthy();
  });

  it("keeps an image configured by the admin", () => {
    expect(
      resolveSectionImage(
        MAIN_PRODUCT_SETTINGS_ID,
        "boas-vindas",
        "https://example.com/admin-cover.jpg",
      ),
    ).toBe("https://example.com/admin-cover.jpg");
  });

  it("does not apply main-course images to another product", () => {
    expect(resolveSectionImage("another-product", "boas-vindas", null)).toBeNull();
  });

  it("removes the hyphen from the welcome section display title", () => {
    expect(
      resolveSectionTitle(
        MAIN_PRODUCT_SETTINGS_ID,
        "boas-vindas",
        "Boas-vindas",
      ),
    ).toBe("Boas vindas");
  });
});
