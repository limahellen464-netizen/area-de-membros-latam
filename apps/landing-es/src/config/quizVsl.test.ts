import {
  calculateQuizVslResult,
  quizVslFirstStageQuestions,
  quizVslQuestions,
  quizVslResults,
  quizVslSecondStageQuestions,
} from "./quizVsl";

describe("quiz VSL em espanhol", () => {
  it("mantém as duas etapas e toda a copy visível em espanhol", () => {
    expect(quizVslFirstStageQuestions).toHaveLength(6);
    expect(quizVslSecondStageQuestions.length).toBeGreaterThan(0);
    expect(quizVslQuestions).toHaveLength(
      quizVslFirstStageQuestions.length + quizVslSecondStageQuestions.length,
    );
    expect(quizVslFirstStageQuestions[0].title).toBe("¿Cuál es tu situación actual?");
    expect(quizVslResults.emergencia.headline).toBe(
      "Tu próximo paso debe ser más cuidadoso.",
    );
    expect(Object.values(quizVslResults).map((result) => result.id)).toEqual([
      "emergencia",
      "reconstrucao",
      "reatracao",
      "clareza",
    ]);
    Object.values(quizVslResults).forEach((result) => {
      expect(result.title).not.toBe("");
      expect(result.description).not.toBe("");
      expect(result.nextStep).not.toBe("");
    });
  });

  it("preserva o cálculo personalizado do resultado", () => {
    const result = calculateQuizVslResult({
      situacao_atual: "ex_esposa",
      motivo_ruptura: "outra_pessoa",
      tempo_afastamento: "menos_7_dias",
      contato_atual: "bloqueado",
      quem_terminou: "ela",
      principal_tentativa: "implorei",
    });

    expect(result.id).toBe("emergencia");
    expect(result.intent).toBe("qualified");
  });
});
