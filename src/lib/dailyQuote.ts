/**
 * Daily quote utility — 20 motivational quotes extraídas do bundle antigo
 * da área de membros (`https://cdrmembros.vercel.app`).
 *
 * Rotação determinística: usa dayOfYear (UTC) → mesma frase durante todo
 * o dia, muda à meia-noite. Não randomiza a cada reload.
 */

export const DAILY_QUOTES: ReadonlyArray<string> = [
  "O silêncio após o término fala mais alto que mil mensagens.",
  "Não implore por atenção. Deixe sua ausência fazer o trabalho.",
  "Reconquistar começa por reconquistar a si mesmo.",
  "Pare de stalkear. Cada olhada nas redes atrasa sua evolução.",
  "Ela precisa sentir saudade. Isso só acontece com distância.",
  "Desesperança atrai. Desespero repele. Escolha bem sua postura.",
  "Foque na sua evolução. A melhor vingança é se tornar irresistível.",
  "Não tente convencê-la com palavras. Mostre com atitudes.",
  "O contato zero não é castigo — é estratégia e autocuidado.",
  "Trabalhe no que te afastou dela. A mudança real reconquista.",
  "Controle a ansiedade. Cada mensagem desnecessária é um passo atrás.",
  "Ela vai testar seus limites. Mantenha a postura firme.",
  "Saudade se constrói na ausência, não na insistência.",
  "Cuide da sua aparência, da sua saúde e da sua rotina. Ela vai notar.",
  "Não aceite migalhas emocionais. Você merece reciprocidade.",
  "A reconquista é um processo. Respeite o tempo de cada fase.",
  "Mostre que você mudou, não diga que mudou.",
  "Não use ciúmes como arma. Use evolução como imã.",
  "Confiança é a qualidade mais atraente. Cultive-a todos os dias.",
  "Se ela voltar, que seja por admiração. Não por pena.",
] as const;

/**
 * Retorna a frase do dia (UTC). Determinístico — todos os usuários
 * acessando no mesmo dia veem a mesma frase. Roda dayOfYear % N.
 *
 * PR ADMIN 5: aceita lista custom (vinda de site.quotes_json) como
 * segundo argumento. Quando ausente, usa DAILY_QUOTES hardcoded.
 */
export function getQuoteOfTheDay(
  now: Date = new Date(),
  quotes: ReadonlyArray<string> = DAILY_QUOTES,
): string {
  const list = quotes.length > 0 ? quotes : DAILY_QUOTES;
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const diffMs = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const index = Math.abs(dayOfYear) % list.length;
  return list[index]!;
}
