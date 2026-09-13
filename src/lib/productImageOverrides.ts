import dopaminaDesejoImg from "@/assets/modules/dopamina-desejo.jpg";
import equilibrioEmocionalImg from "@/assets/modules/equilibrio-emocional.jpg";
import quimicaDoAmorImg from "@/assets/modules/quimica-do-amor.jpg";

const PRODUCT_IMAGE_OVERRIDES: Record<string, string> = {
  "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e": quimicaDoAmorImg,
  "747ac43f-f60b-4a00-94b9-b09394ac11ad": dopaminaDesejoImg,
  "66a4fa9e-bd66-467b-85b1-1de853ec4ae9": equilibrioEmocionalImg,
  "4c32298c-b4fe-4922-9ee7-e2413898dea0": quimicaDoAmorImg,
  "5b4f7475-d8cc-46d6-99d7-6a7a8c47b101": quimicaDoAmorImg,
  "ab9d9354-3230-4a5b-9794-4d5534556202": dopaminaDesejoImg,
  "e52d528e-c521-461d-a5f8-2cc2cdd76303": quimicaDoAmorImg,
  "54e50bda-18db-4bdc-90ec-02ac84467404": equilibrioEmocionalImg,
};

export function resolveProductImage(
  productSettingsId: string | undefined | null,
  fallback: string | undefined | null,
): string {
  if (productSettingsId && PRODUCT_IMAGE_OVERRIDES[productSettingsId]) {
    return PRODUCT_IMAGE_OVERRIDES[productSettingsId];
  }
  return fallback || "";
}
