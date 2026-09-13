/**
 * productOverrides.ts — fallback de copy de produto exibida no front.
 *
 * MUDANÇA PR ADMIN 6C-BUGFIX:
 * Antes esse arquivo TINHA PRIORIDADE sobre o DB — overrides hardcoded
 * sempre venciam. Isso causava o bug em que editar a descrição do produto
 * no admin "salvava" mas voltava ao texto antigo no reload (o front
 * sobrescrevia com o override deste arquivo).
 *
 * Agora a regra é inversa: o DB SEMPRE vence quando tem descrição
 * preenchida. O override só é usado como fallback de seed quando o
 * `product_settings.product_description` está vazio/null.
 *
 * Como funciona:
 * - DB tem texto → renderiza o texto do DB.
 * - DB vazio → renderiza override do arquivo (se existir pra esse UUID).
 * - DB vazio + sem override → string vazia.
 *
 * Quando o admin estiver feliz com as copies do DB, este arquivo pode
 * ser limpo. Não é prioridade — o impacto é zero porque o DB vence.
 */

export const PRODUCT_DESCRIPTION_OVERRIDES: Record<string, string> = {
  // O Jogo do Ciúme — order bump / conteúdo extra
  "747ac43f-f60b-4a00-94b9-b09394ac11ad":
    "Conteúdo complementar para entender como usar curiosidade, contraste emocional e tensão psicológica sem exagerar ou parecer carente.",

  // Modelos de Texto de Recuperação — order bump / conteúdo extra
  "71efc759-ab91-4100-b68d-90eb6af8d07f":
    "Estruturas de mensagens e modelos prontos para se comunicar com mais maturidade, clareza e controle emocional.",

  // Kit Reconquista — upsell / complemento do Código da Reconquista
  "66a4fa9e-bd66-467b-85b1-1de853ec4ae9":
    "Material complementar do Código da Reconquista com conteúdos extras para aprofundar o método e aplicar a estratégia com mais precisão.",

  // O Código da Reconquista — descrição já é boa no DB; sem override (cai pro fallback)
  // "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e": "...",
};

/**
 * Resolve a descrição a renderizar.
 *
 * Prioridade (PR ADMIN 6C-BUGFIX):
 *   1. DB (fallback param) — se não-vazio depois de trim, sempre vence.
 *   2. Override hardcoded — só se DB vazio.
 *   3. String vazia.
 */
export function resolveProductDescription(
  productSettingsId: string | undefined | null,
  fallback: string | undefined | null,
): string {
  const dbValue = (fallback || "").trim();
  if (dbValue.length > 0) {
    // DB tem texto — sempre vence. Admin pode editar e ver refletir.
    return dbValue;
  }
  // DB vazio → cai no override hardcoded (se existir pra esse produto)
  if (productSettingsId && PRODUCT_DESCRIPTION_OVERRIDES[productSettingsId]) {
    return PRODUCT_DESCRIPTION_OVERRIDES[productSettingsId]!;
  }
  return "";
}

/**
 * UUID do produto principal — útil pra destaques visuais (ex: variant "featured")
 * e pra renderizar o ConsultoriaCallout só no módulo 1 desse produto.
 */
export const MAIN_PRODUCT_SETTINGS_ID = "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e";
