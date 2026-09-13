import {
  quizVslQuestions,
  type QuizVslAnswerMap,
  type QuizVslResult,
} from "@/config/quizVsl";

export type QuizVslDiagnosisDimensionId =
  | "abertura"
  | "percepcao"
  | "urgencia"
  | "complexidade";

export type QuizVslDiagnosisEvidence = {
  id: string;
  label: string;
  value: string;
};

export type QuizVslDiagnosisDimension = {
  id: QuizVslDiagnosisDimensionId;
  label: string;
  level: string;
  score: number;
  description: string;
};

export type QuizVslDetailedDiagnosis = {
  evidences: QuizVslDiagnosisEvidence[];
  dimensions: QuizVslDiagnosisDimension[];
  bridgeTitle: string;
  bridgeDescription: string;
  highTicketReadinessScore: number;
};

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

const scoreFrom = (
  answers: QuizVslAnswerMap,
  questionId: string,
  scores: Record<string, number>,
  fallback: number,
) => scores[answers[questionId]] ?? fallback;

const selectedAnswerLabel = (
  answers: QuizVslAnswerMap,
  questionId: string,
) => {
  const question = quizVslQuestions.find((item) => item.id === questionId);
  const answer = question?.answers.find(
    (item) => item.id === answers[questionId],
  );
  return answer?.label;
};

const evidenceValueByAnswer: Record<string, Record<string, string>> = {
  contato_atual: {
    bloqueado: "Ella te bloqueó o cortó el contacto",
    sem_contato: "Ya no están hablando",
    contato_frio: "Hay contacto, pero es frío",
    contato_frequente: "Todavía mantienen un contacto frecuente",
  },
  tempo_afastamento: {
    menos_7_dias: "El distanciamiento ocurrió hace menos de 7 días",
    uma_quatro_semanas: "El distanciamiento ocurrió hace entre 1 y 4 semanas",
    um_tres_meses: "El distanciamiento ocurrió hace entre 1 y 3 meses",
    mais_tres_meses: "El distanciamiento dura desde hace más de 3 meses",
  },
  principal_tentativa: {
    textao: "Intentaste explicarlo todo con mensajes largos",
    desculpas: "Pediste perdón repetidamente",
    implorei: "Insististe o la perseguiste",
    contato_zero: "Intentaste el contacto cero sin saber cuál era el siguiente paso",
    nada: "Todavía no has hecho un intento directo",
  },
  emocao_dominante: {
    tristeza: "La tristeza todavía domina tus decisiones",
    ansiedade: "La ansiedad genera urgencia por actuar",
    raiva: "La frustración puede interferir en tus decisiones",
    esperanca: "Todavía percibes señales de esperanza",
  },
  bloqueio_reconquista: {
    comunicacao: "No sabes qué decir ni cuándo hablar",
    imagem_negativa: "La imagen que ella conserva de ti está deteriorada",
    terceiros: "Otras personas están interfiriendo en la situación",
    nao_sei: "El principal bloqueo todavía no está claro para ti",
  },
};

const buildEvidence = (
  answers: QuizVslAnswerMap,
  questionId: string,
  label: string,
): QuizVslDiagnosisEvidence | null => {
  const answerId = answers[questionId];
  if (!answerId) return null;

  const value =
    evidenceValueByAnswer[questionId]?.[answerId] ??
    selectedAnswerLabel(answers, questionId);
  if (!value) return null;

  return { id: questionId, label, value };
};

const opennessLevel = (score: number) => {
  if (score >= 70) return "Presente";
  if (score >= 45) return "Moderada";
  if (score >= 25) return "Baja";
  return "Muy baja";
};

const riskLevel = (score: number) => {
  if (score >= 80) return "Crítico";
  if (score >= 60) return "Alto";
  if (score >= 35) return "Moderado";
  return "Bajo";
};

const complexityLevel = (score: number) => {
  if (score >= 75) return "Muy alta";
  if (score >= 55) return "Alta";
  if (score >= 35) return "Moderada";
  return "Baja";
};

const buildBridge = (
  result: QuizVslResult,
  urgencyScore: number,
  perceptionScore: number,
) => {
  const intensity =
    urgencyScore >= 60
      ? "La urgencia emocional es elevada"
      : "Existe margen para actuar con más control";
  const perception =
    perceptionScore >= 60
      ? "la percepción que ella tiene de ti debe reconstruirse antes de un nuevo intento"
      : "el próximo contacto debe gestionarse sin repetir los patrones anteriores";

  const titles: Record<QuizVslResult["id"], string> = {
    emergencia:
      "Antes de volver a buscarla, debes interrumpir el patrón que está aumentando su resistencia.",
    reconstrucao:
      "Tu próximo paso no es convencerla, sino cambiar la forma en que percibe tu presencia.",
    reatracao:
      "La posibilidad que todavía existe debe gestionarse sin presión ni exceso de contacto.",
    clareza:
      "Antes de elegir un mensaje o una estrategia, debes entender el bloqueo central de tu caso.",
  };

  return {
    title: titles[result.id],
    description: `${intensity} y ${perception}. En la presentación que aparece a continuación, Enrico Ferraz explica cómo El Código de la Reconquista organiza este proceso y cuál debe ser la lógica de tu próximo paso.`,
  };
};

export const buildQuizVslDetailedDiagnosis = (
  answers: QuizVslAnswerMap,
  result: QuizVslResult,
): QuizVslDetailedDiagnosis => {
  const contactScore = scoreFrom(
    answers,
    "contato_atual",
    {
      bloqueado: 8,
      sem_contato: 20,
      contato_frio: 52,
      contato_frequente: 82,
    },
    35,
  );
  const situationOpenness = scoreFrom(
    answers,
    "situacao_atual",
    {
      ex_namorada: 42,
      ex_esposa: 38,
      esposa_distante: 68,
      relacao_indefinida: 55,
    },
    45,
  );
  const opennessScore = clamp(contactScore * 0.8 + situationOpenness * 0.2);

  const ruptureDamage = scoreFrom(
    answers,
    "motivo_ruptura",
    {
      discussoes: 68,
      esfriamento: 48,
      outra_pessoa: 58,
      erro_meu: 82,
    },
    50,
  );
  const attemptDamage = scoreFrom(
    answers,
    "principal_tentativa",
    {
      textao: 72,
      desculpas: 62,
      implorei: 92,
      contato_zero: 42,
      nada: 20,
    },
    45,
  );
  const contactDamage = scoreFrom(
    answers,
    "contato_atual",
    {
      bloqueado: 88,
      sem_contato: 70,
      contato_frio: 55,
      contato_frequente: 28,
    },
    50,
  );
  const perceptionScore = clamp(
    ruptureDamage * 0.4 + attemptDamage * 0.4 + contactDamage * 0.2,
  );

  const timeUrgency = scoreFrom(
    answers,
    "tempo_afastamento",
    {
      menos_7_dias: 90,
      uma_quatro_semanas: 75,
      um_tres_meses: 48,
      mais_tres_meses: 30,
    },
    50,
  );
  const emotionUrgency = scoreFrom(
    answers,
    "emocao_dominante",
    {
      tristeza: 58,
      ansiedade: 94,
      raiva: 72,
      esperanca: 30,
    },
    50,
  );
  const ruminationUrgency = scoreFrom(
    answers,
    "ruminacao",
    {
      todo_dia: 92,
      algumas_vezes: 65,
      raramente: 28,
      nunca: 12,
    },
    45,
  );
  const lifeImpactUrgency = scoreFrom(
    answers,
    "impacto_vida",
    {
      emocional: 68,
      trabalho: 58,
      sono: 72,
      todas: 96,
    },
    50,
  );
  const urgencyScore = clamp(
    timeUrgency * 0.2 +
      emotionUrgency * 0.35 +
      ruminationUrgency * 0.25 +
      lifeImpactUrgency * 0.2,
  );

  const situationComplexity = scoreFrom(
    answers,
    "situacao_atual",
    {
      ex_namorada: 45,
      ex_esposa: 68,
      esposa_distante: 62,
      relacao_indefinida: 38,
    },
    48,
  );
  const ruptureComplexity = scoreFrom(
    answers,
    "motivo_ruptura",
    {
      discussoes: 55,
      esfriamento: 45,
      outra_pessoa: 88,
      erro_meu: 65,
    },
    50,
  );
  const timeComplexity = scoreFrom(
    answers,
    "tempo_afastamento",
    {
      menos_7_dias: 28,
      uma_quatro_semanas: 38,
      um_tres_meses: 55,
      mais_tres_meses: 75,
    },
    50,
  );
  const contactComplexity = scoreFrom(
    answers,
    "contato_atual",
    {
      bloqueado: 82,
      sem_contato: 68,
      contato_frio: 50,
      contato_frequente: 32,
    },
    50,
  );
  const complexityScore = clamp(
    situationComplexity * 0.2 +
      ruptureComplexity * 0.35 +
      timeComplexity * 0.2 +
      contactComplexity * 0.25,
  );

  const methodReadiness = scoreFrom(
    answers,
    "seguir_metodo",
    {
      sim: 92,
      ansiedade: 72,
      medo_errar: 64,
      solucao_rapida: 22,
    },
    50,
  );
  const highTicketReadinessScore = clamp(
    methodReadiness * 0.65 + urgencyScore * 0.2 + complexityScore * 0.15,
  );

  const evidences = [
    buildEvidence(answers, "contato_atual", "Contacto actual"),
    buildEvidence(answers, "tempo_afastamento", "Momento del distanciamiento"),
    buildEvidence(answers, "principal_tentativa", "Patrón que ya intentaste"),
    buildEvidence(answers, "emocao_dominante", "Estado emocional"),
    buildEvidence(answers, "bloqueio_reconquista", "Bloqueo percibido"),
  ].filter((item): item is QuizVslDiagnosisEvidence => Boolean(item));

  if (evidences.length === 0) {
    evidences.push({
      id: "resultado",
      label: "Análisis principal",
      value: result.headline,
    });
  }

  const dimensions: QuizVslDiagnosisDimension[] = [
    {
      id: "abertura",
      label: "Posibilidad actual",
      level: opennessLevel(opennessScore),
      score: opennessScore,
      description:
        opennessScore >= 45
          ? "Todavía hay señales de contacto o de apertura emocional."
          : "El contacto es limitado y exige más cuidado.",
    },
    {
      id: "percepcao",
      label: "Riesgo de reforzar el rechazo",
      level: riskLevel(perceptionScore),
      score: perceptionScore,
      description:
        perceptionScore >= 60
          ? "Repetir los intentos anteriores puede aumentar su resistencia."
          : "Hay margen para corregir el enfoque antes del próximo contacto.",
    },
    {
      id: "urgencia",
      label: "Urgencia emocional",
      level: riskLevel(urgencyScore),
      score: urgencyScore,
      description:
        urgencyScore >= 60
          ? "La ansiedad puede estar acelerando decisiones importantes."
          : "Demuestras una mayor capacidad para actuar con control.",
    },
    {
      id: "complexidade",
      label: "Complejidad del caso",
      level: complexityLevel(complexityScore),
      score: complexityScore,
      description:
        complexityScore >= 55
          ? "Tu situación combina factores que exigen una secuencia clara."
          : "El caso presenta menos obstáculos simultáneos.",
    },
  ];

  const bridge = buildBridge(result, urgencyScore, perceptionScore);

  return {
    evidences: evidences.slice(0, 4),
    dimensions,
    bridgeTitle: bridge.title,
    bridgeDescription: bridge.description,
    highTicketReadinessScore,
  };
};
