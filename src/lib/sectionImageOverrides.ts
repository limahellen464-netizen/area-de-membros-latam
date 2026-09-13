import boasVindasImg from "@/assets/modules/boas-vindas.jpg";
import naoExagerarImg from "@/assets/modules/nao-exagerar.jpg";
import oxitocinaImg from "@/assets/modules/oxitocina.jpg";

const MAIN_PRODUCT_SETTINGS_ID = "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e";
const LATAM_MAIN_PRODUCT_SETTINGS_ID = "5b4f7475-d8cc-46d6-99d7-6a7a8c47b101";

const MAIN_SECTION_IMAGES: Record<string, string> = {
  "boas-vindas": boasVindasImg,
  "ocitocina-dopamina": oxitocinaImg,
  "fundamentos-15-dias": naoExagerarImg,
  bienvenida: boasVindasImg,
  "oxitocina-y-dopamina": oxitocinaImg,
  "fundamentos-de-la-reconexion": naoExagerarImg,
};

export function resolveSectionImage(
  productSettingsId: string | undefined | null,
  sectionKey: string,
  configuredImage: string | undefined | null,
): string | null {
  const image = configuredImage?.trim();
  if (image) return image;

  if (
    productSettingsId === MAIN_PRODUCT_SETTINGS_ID ||
    productSettingsId === LATAM_MAIN_PRODUCT_SETTINGS_ID
  ) {
    return MAIN_SECTION_IMAGES[sectionKey] || null;
  }
  return null;
}

export function resolveSectionTitle(
  productSettingsId: string | undefined | null,
  sectionKey: string,
  configuredTitle: string,
): string {
  if (
    productSettingsId === MAIN_PRODUCT_SETTINGS_ID &&
    sectionKey === "boas-vindas"
  ) {
    return "Boas vindas";
  }
  return configuredTitle;
}
