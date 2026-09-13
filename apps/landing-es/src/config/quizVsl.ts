import { MARKET } from "./market";

export type QuizVslResultId =
  | "emergencia"
  | "reconstrucao"
  | "reatracao"
  | "clareza";
export type QuizVslScore = "alto" | "medio" | "baixo";
export type QuizVslIntent = "qualified" | "low";
export type QuizVslQuestionLayout = "list" | "grid";

export type QuizVslAnswer = {
  id: string;
  label: string;
  emoji?: string;
  scores: Partial<Record<QuizVslResultId, number>>;
};

export type QuizVslQuestion = {
  id: string;
  title: string;
  helper?: string;
  image: string;
  imageAlt: string;
  phase: 1 | 2;
  layout?: QuizVslQuestionLayout;
  answers: QuizVslAnswer[];
};

export type QuizVslResult = {
  id: QuizVslResultId;
  title: string;
  label: string;
  score: QuizVslScore;
  intent: QuizVslIntent;
  headline: string;
  description: string;
  nextStep: string;
};

export type QuizVslAnswerMap = Record<string, string>;
export type QuizVslAgeBracket = "18_24" | "25_34" | "35_44" | "45_mais";

export const quizVslAgeBrackets: Array<{
  id: QuizVslAgeBracket;
  label: string;
}> = [
  { id: "18_24", label: "De 18 a 24 años" },
  { id: "25_34", label: "De 25 a 34 años" },
  { id: "35_44", label: "De 35 a 44 años" },
  { id: "45_mais", label: "45 años o más" },
];

export const QUIZ_VSL_PLAYER = {
  id: MARKET.vturb.playerId,
  scriptUrl: MARKET.vturb.scriptUrl,
  smartPlayerScriptUrl: MARKET.vturb.smartPlayerScriptUrl,
  cdnPreloadUrl: MARKET.vturb.preloadUrl,
  pitchSeconds: MARKET.vturb.pitchSeconds,
  dnsPrefetchHosts: [
    "https://cdn.converteai.net",
    "https://scripts.converteai.net",
    "https://images.converteai.net",
    "https://license.vturb.com",
  ],
} as const;

export const isQuizVslPlayerConfigured = Boolean(
  QUIZ_VSL_PLAYER.id &&
  QUIZ_VSL_PLAYER.scriptUrl &&
  QUIZ_VSL_PLAYER.pitchSeconds > 0,
);

export const quizVslFirstStageQuestions: QuizVslQuestion[] = [
  {
    id: "situacao_atual",
    image: "/images/quiz-vsl/questions/situacao-atual.jpg",
    imageAlt: "Hombre preocupado con su expareja distante al fondo",
    phase: 1,
    title: "¿Cuál es tu situación actual?",
    layout: "grid",
    answers: [
      {
        id: "ex_namorada",
        label: "Quiero recuperar a mi exnovia",
        emoji: "💔",
        scores: { reconstrucao: 2, reatracao: 1 },
      },
      {
        id: "ex_esposa",
        label: "Quiero recuperar a mi exesposa",
        emoji: "💍",
        scores: { reconstrucao: 2, emergencia: 1 },
      },
      {
        id: "esposa_distante",
        label: "Seguimos juntos, pero ella está distante",
        emoji: "🧊",
        scores: { reconstrucao: 3 },
      },
      {
        id: "relacao_indefinida",
        label: "Se alejó antes de que la relación se volviera seria",
        emoji: "↔️",
        scores: { reatracao: 2, clareza: 1 },
      },
    ],
  },
  {
    id: "motivo_ruptura",
    image: "/images/quiz-vsl/questions/motivo-ruptura.jpg",
    imageAlt: "Pareja emocionalmente distanciada después de una discusión",
    phase: 1,
    title: "¿Qué fue lo que más contribuyó al distanciamiento?",
    helper: "Elige la opción que más se parezca a tu caso.",
    layout: "grid",
    answers: [
      {
        id: "discussoes",
        label: "Discusiones y desgaste acumulado",
        emoji: "⚡",
        scores: { reconstrucao: 3, emergencia: 1 },
      },
      {
        id: "esfriamento",
        label: "La relación se fue enfriando poco a poco",
        emoji: "🥶",
        scores: { reatracao: 2, reconstrucao: 2 },
      },
      {
        id: "outra_pessoa",
        label: "Hay o podría haber otra persona",
        emoji: "💔",
        scores: { emergencia: 3, reconstrucao: 1 },
      },
      {
        id: "erro_meu",
        label: "Cometí errores y ella perdió la confianza",
        emoji: "⚠️",
        scores: { reconstrucao: 4 },
      },
    ],
  },
  {
    id: "tempo_afastamento",
    image: "/images/quiz-vsl/questions/tempo-afastamento.jpg",
    imageAlt: "Hombre mirando fotografías y pensando en el tiempo separados",
    phase: 1,
    title: "¿Cuánto tiempo ha pasado desde la ruptura o el distanciamiento?",
    answers: [
      {
        id: "menos_7_dias",
        label: "Menos de 7 días",
        emoji: "⏱️",
        scores: { emergencia: 4 },
      },
      {
        id: "uma_quatro_semanas",
        label: "Entre 1 y 4 semanas",
        emoji: "📆",
        scores: { emergencia: 3, reconstrucao: 1 },
      },
      {
        id: "um_tres_meses",
        label: "Entre 1 y 3 meses",
        emoji: "🗓️",
        scores: { reconstrucao: 3 },
      },
      {
        id: "mais_tres_meses",
        label: "Más de 3 meses",
        emoji: "⌛",
        scores: { reatracao: 2, clareza: 1 },
      },
    ],
  },
  {
    id: "contato_atual",
    image: "/images/quiz-vsl/questions/contato-atual.jpg",
    imageAlt: "Hombre esperando un mensaje en su teléfono por la noche",
    phase: 1,
    title: "¿Cómo es el contacto entre ustedes actualmente?",
    layout: "grid",
    answers: [
      {
        id: "bloqueado",
        label: "Me bloqueó o cortó el contacto",
        emoji: "🔒",
        scores: { emergencia: 4 },
      },
      {
        id: "sem_contato",
        label: "Ya no hablamos",
        emoji: "📵",
        scores: { emergencia: 2, reconstrucao: 2 },
      },
      {
        id: "contato_frio",
        label: "Hablamos a veces, pero de manera fría",
        emoji: "🧊",
        scores: { reconstrucao: 2, reatracao: 2 },
      },
      {
        id: "contato_frequente",
        label: "Todavía hablamos con frecuencia",
        emoji: "💬",
        scores: { reatracao: 4 },
      },
    ],
  },
  {
    id: "quem_terminou",
    image: "/images/quiz-vsl/questions/quem-terminou.jpg",
    imageAlt: "Pareja en silencio después de una conversación difícil",
    phase: 1,
    title: "¿Quién tomó la decisión de terminar o alejarse?",
    answers: [
      {
        id: "ela",
        label: "Ella tomó la decisión",
        emoji: "👩",
        scores: { emergencia: 2, reconstrucao: 2 },
      },
      {
        id: "eu",
        label: "Yo tomé la decisión y me arrepentí",
        emoji: "🙋‍♂️",
        scores: { reconstrucao: 3 },
      },
      {
        id: "ambos",
        label: "Fue una decisión de los dos",
        emoji: "🤝",
        scores: { reatracao: 2, clareza: 1 },
      },
    ],
  },
  {
    id: "principal_tentativa",
    image: "/images/quiz-vsl/questions/principal-tentativa.jpg",
    imageAlt: "Hombre frente al espejo pensando en lo que ha intentado",
    phase: 1,
    title: "¿Qué has hecho principalmente para intentar resolver la situación?",
    answers: [
      {
        id: "textao",
        label: "Envié mensajes largos intentando explicarlo todo",
        emoji: "📱",
        scores: { emergencia: 3, reconstrucao: 1 },
      },
      {
        id: "desculpas",
        label: "Pedí perdón varias veces",
        emoji: "🙏",
        scores: { emergencia: 2, reconstrucao: 2 },
      },
      {
        id: "implorei",
        label: "Le rogué, insistí o la perseguí",
        emoji: "😥",
        scores: { emergencia: 4 },
      },
      {
        id: "contato_zero",
        label: "Intenté el contacto cero sin saber qué hacer después",
        emoji: "🤐",
        scores: { reconstrucao: 3 },
      },
      {
        id: "nada",
        label: "Todavía no he hecho nada",
        emoji: "🧭",
        scores: { reatracao: 2, clareza: 1 },
      },
    ],
  },
];

export const quizVslSecondStageQuestions: QuizVslQuestion[] = [
  {
    id: "maior_dor",
    image: "/images/quiz-vsl/questions/maior-dor.jpg",
    imageAlt: "Hombre preocupado pensando en la separación",
    phase: 2,
    title: "¿Qué es lo que más te duele cuando piensas en esta situación?",
    answers: [
      {
        id: "ignorado",
        label: "Que me ignore como si nunca hubiera significado nada",
        emoji: "😢",
        scores: { emergencia: 3 },
      },
      {
        id: "outro_homem",
        label: "Imaginar que puede estar con otro hombre",
        emoji: "💔",
        scores: { emergencia: 4 },
      },
      {
        id: "nada_funciona",
        label: "Ya lo intenté todo y siento que nada funciona",
        emoji: "🌀",
        scores: { reconstrucao: 3 },
      },
      {
        id: "rejeicao",
        label: "Tengo miedo de actuar y perderla definitivamente",
        emoji: "😰",
        scores: { emergencia: 2, clareza: 1 },
      },
    ],
  },
  {
    id: "bloqueio_reconquista",
    image: "/images/quiz-vsl/questions/bloqueio-reconquista.jpg",
    imageAlt: "Hombre paralizado por las dudas antes de intentar recuperarla",
    phase: 2,
    title: "¿Por qué crees que todavía no has conseguido recuperarla?",
    answers: [
      {
        id: "comunicacao",
        label: "No sé qué decir ni cuándo hablar",
        emoji: "❌",
        scores: { reconstrucao: 3 },
      },
      {
        id: "imagem_negativa",
        label: "Todavía tiene una imagen negativa de mí",
        emoji: "🪞",
        scores: { reconstrucao: 4 },
      },
      {
        id: "terceiros",
        label: "Hay otras personas interfiriendo",
        emoji: "👥",
        scores: { emergencia: 3 },
      },
      {
        id: "nao_sei",
        label: "Realmente no sé el motivo",
        emoji: "🤷‍♂️",
        scores: { clareza: 4 },
      },
    ],
  },
  {
    id: "emocao_dominante",
    image: "/images/quiz-vsl/questions/emocao-dominante.jpg",
    imageAlt: "Hombre triste mirando una fotografía en el teléfono",
    phase: 2,
    title: "¿Cómo te sientes cuando piensas en el final de la relación?",
    layout: "grid",
    answers: [
      {
        id: "tristeza",
        label: "Tristeza profunda",
        emoji: "😔",
        scores: { emergencia: 2 },
      },
      {
        id: "ansiedade",
        label: "Ansiedad y urgencia",
        emoji: "😰",
        scores: { emergencia: 4 },
      },
      {
        id: "raiva",
        label: "Enojo o frustración",
        emoji: "😡",
        scores: { reconstrucao: 2, emergencia: 1 },
      },
      {
        id: "esperanca",
        label: "Todavía tengo esperanza",
        emoji: "✨",
        scores: { reatracao: 3 },
      },
    ],
  },
  {
    id: "ruminacao",
    image: "/images/quiz-vsl/questions/ruminacao.jpg",
    imageAlt: "Hombre revisando repetidamente su teléfono de madrugada",
    phase: 2,
    title:
      "¿Con qué frecuencia revives momentos de la relación o revisas sus redes sociales?",
    answers: [
      {
        id: "todo_dia",
        label: "Todos los días",
        emoji: "📲",
        scores: { emergencia: 4 },
      },
      {
        id: "algumas_vezes",
        label: "Algunas veces por semana",
        emoji: "🤔",
        scores: { emergencia: 2, reconstrucao: 1 },
      },
      {
        id: "raramente",
        label: "Rara vez",
        emoji: "🌙",
        scores: { reatracao: 2 },
      },
      {
        id: "nunca",
        label: "No hago eso",
        emoji: "✅",
        scores: { clareza: 1, reatracao: 1 },
      },
    ],
  },
  {
    id: "impacto_vida",
    image: "/images/quiz-vsl/questions/impacto-vida.jpg",
    imageAlt: "Hombre cansado en el trabajo por el impacto de la situación emocional",
    phase: 2,
    title: "¿Esta situación está afectando otras áreas de tu vida?",
    layout: "grid",
    answers: [
      {
        id: "emocional",
        label: "Mi salud emocional",
        emoji: "🧠",
        scores: { emergencia: 3 },
      },
      {
        id: "trabalho",
        label: "Mi trabajo y mi concentración",
        emoji: "💼",
        scores: { emergencia: 2 },
      },
      {
        id: "sono",
        label: "Mi sueño y mi rutina",
        emoji: "🌙",
        scores: { emergencia: 3 },
      },
      {
        id: "todas",
        label: "Todas las opciones anteriores",
        emoji: "⚠️",
        scores: { emergencia: 5 },
      },
    ],
  },
  {
    id: "resultado_desejado",
    image: "/images/quiz-vsl/questions/resultado-desejado.jpg",
    imageAlt: "Pareja volviendo a acercarse con cariño y conexión",
    phase: 2,
    title: "¿Qué resultado te gustaría conseguir ahora?",
    answers: [
      {
        id: "voltar",
        label: "Reconstruir la relación de forma definitiva",
        emoji: "❤️",
        scores: { reconstrucao: 2, reatracao: 2 },
      },
      {
        id: "conversa",
        label: "Lograr que vuelva a hablar conmigo",
        emoji: "💬",
        scores: { reconstrucao: 3 },
      },
      {
        id: "sentimento",
        label: "Lograr que vuelva a sentir algo por mí",
        emoji: "🔥",
        scores: { reatracao: 4 },
      },
      {
        id: "clareza",
        label: "Entender si todavía existe un camino",
        emoji: "🧭",
        scores: { clareza: 4 },
      },
    ],
  },
  {
    id: "seguir_metodo",
    image: "/images/quiz-vsl/questions/seguir-metodo.jpg",
    imageAlt: "Hombre organizando con disciplina un plan para recuperar la relación",
    phase: 2,
    title:
      "Si existiera un plan claro paso a paso, ¿podrías seguirlo sin actuar por impulso?",
    answers: [
      {
        id: "sim",
        label: "Sí. No quiero seguir cometiendo errores",
        emoji: "✅",
        scores: { reconstrucao: 2, reatracao: 2 },
      },
      {
        id: "ansiedade",
        label: "Sí, pero la ansiedad me hace actuar antes de tiempo",
        emoji: "😰",
        scores: { emergencia: 3, reconstrucao: 1 },
      },
      {
        id: "medo_errar",
        label: "Tengo miedo de hacer algo mal",
        emoji: "⚠️",
        scores: { emergencia: 2, reconstrucao: 1 },
      },
      {
        id: "solucao_rapida",
        label: "Solo quiero una solución rápida",
        emoji: "⚡",
        scores: { clareza: 4 },
      },
    ],
  },
];

export const quizVslQuestions = [
  ...quizVslFirstStageQuestions,
  ...quizVslSecondStageQuestions,
];

export const QUIZ_VSL_TOTAL_SCREENS = quizVslQuestions.length + 3;

export const quizVslResults: Record<QuizVslResultId, QuizVslResult> = {
  emergencia: {
    id: "emergencia",
    title: "Emergencia emocional",
    label: "Riesgo alto",
    score: "alto",
    intent: "qualified",
    headline: "Tu próximo paso debe ser más cuidadoso.",
    description:
      "Tus respuestas muestran que la ansiedad y la urgencia podrían estar llevándote a actuar antes de tiempo. Intentar solucionarlo todo de inmediato suele aumentar su resistencia.",
    nextStep:
      "El primer paso es interrumpir el patrón de necesidad y recuperar el control antes de volver a intentarlo.",
  },
  reconstrucao: {
    id: "reconstrucao",
    title: "Reconstrucción de tu imagen",
    label: "Riesgo medio",
    score: "medio",
    intent: "qualified",
    headline: "El problema principal está en la forma en que ella te percibe hoy.",
    description:
      "Puede seguir existiendo una conexión emocional, pero tu imagen debe reconstruirse antes de una conversación directa. El problema no es solo lo que dices, sino lo que comunica tu presencia.",
    nextStep:
      "El camino comienza por recuperar tu imagen y dejar de cometer los errores que alimentan la distancia.",
  },
  reatracao: {
    id: "reatracao",
    title: "Reatracción estratégica",
    label: "Potencial alto",
    score: "medio",
    intent: "qualified",
    headline:
      "Todavía existe una posibilidad, pero debes gestionarla correctamente.",
    description:
      "Tu caso muestra señales de contacto o de apertura emocional. El mayor riesgo ahora es hablar o actuar demasiado y convertir esa posibilidad en una nueva resistencia.",
    nextStep:
      "Necesitas aprender a gestionar el contacto con seguridad, despertar curiosidad y evitar cualquier actitud forzada.",
  },
  clareza: {
    id: "clareza",
    title: "Claridad inicial",
    label: "Primer paso",
    score: "baixo",
    intent: "low",
    headline:
      "Necesitas entender el problema antes de elegir una estrategia.",
    description:
      "Tus respuestas todavía no señalan un único bloqueo dominante. Los mensajes, el contacto cero y los intentos aislados no funcionan igual en todos los casos.",
    nextStep:
      "El video que aparece a continuación muestra cómo El Código de la Reconquista corrige los errores más comunes y organiza el camino para que puedas recuperar a tu ex.",
  },
};

const resultPriority: QuizVslResultId[] = [
  "emergencia",
  "reconstrucao",
  "reatracao",
  "clareza",
];

export const calculateQuizVslResult = (
  answers: QuizVslAnswerMap,
): QuizVslResult => {
  const totals: Record<QuizVslResultId, number> = {
    emergencia: 0,
    reconstrucao: 0,
    reatracao: 0,
    clareza: 0,
  };

  for (const question of quizVslQuestions) {
    const selectedAnswerId = answers[question.id];
    const selectedAnswer = question.answers.find(
      (answer) => answer.id === selectedAnswerId,
    );

    if (!selectedAnswer) continue;

    for (const [resultId, score] of Object.entries(selectedAnswer.scores)) {
      totals[resultId as QuizVslResultId] += score ?? 0;
    }
  }

  const bestResultId = resultPriority.reduce((best, current) => {
    return totals[current] > totals[best] ? current : best;
  }, "clareza" as QuizVslResultId);

  return quizVslResults[bestResultId];
};

export const getAgeBracket = (birthDate: string) => {
  const parsed = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "nao_informado";

  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDifference = today.getMonth() - parsed.getMonth();
  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < parsed.getDate())
  ) {
    age -= 1;
  }

  if (age < 18) return "menor_18";
  if (age <= 24) return "18_24";
  if (age <= 34) return "25_34";
  if (age <= 44) return "35_44";
  if (age <= 54) return "45_54";
  return "55_mais";
};
