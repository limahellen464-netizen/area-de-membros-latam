import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Volume2,
  VolumeX,
} from "lucide-react";
import QuizVslPlayer from "@/components/QuizVslPlayer";
import { MARKET } from "@/config/market";
import {
  calculateQuizVslResult,
  QUIZ_VSL_TOTAL_SCREENS,
  quizVslAgeBrackets,
  quizVslFirstStageQuestions,
  quizVslResults,
  quizVslSecondStageQuestions,
  type QuizVslAgeBracket,
  type QuizVslAnswerMap,
  type QuizVslQuestion,
  type QuizVslResult,
  type QuizVslResultId,
} from "@/config/quizVsl";
import {
  getCurrentAttribution,
  persistAttributionFromUrl,
  trackEvent,
  trackStandardEvent,
} from "@/lib/tracking";
import {
  isQuizSoundEnabled,
  playQuizSound,
  setQuizSoundEnabled,
} from "@/lib/quizSound";
import { buildQuizVslDetailedDiagnosis } from "@/lib/quizVslDiagnosis";

const FIRST_ANALYSIS_DURATION_MS = 4500;
const FINAL_ANALYSIS_DURATION_MS = 7000;

type FlowState =
  | "stage1"
  | "profile_name"
  | "profile_partner"
  | "profile_age"
  | "first_analysis"
  | "stage2"
  | "final_analysis"
  | "result";

type ProfileState = {
  firstName: string;
  partnerName: string;
  ageBracket: QuizVslAgeBracket | "";
};

const firstAnalysisMessages = [
  "Organizando la historia de la relación...",
  "Identificando las principales señales emocionales...",
  "Preparando la segunda parte del diagnóstico...",
];

const finalAnalysisMessages = [
  "Comparando tu nivel de urgencia con el contacto actual...",
  "Identificando el patrón que más bloquea tu reconquista...",
  "Definiendo la etapa de la reconquista en la que te encuentras...",
];

const getLocalPreviewResult = (): QuizVslResult | null => {
  if (typeof window === "undefined") return null;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const params = new URLSearchParams(window.location.search);
  if (!isLocalhost || params.get("preview_quiz_vsl") !== "1") return null;

  const requestedResult = params.get(
    "preview_result",
  ) as QuizVslResultId | null;
  return requestedResult && quizVslResults[requestedResult]
    ? quizVslResults[requestedResult]
    : quizVslResults.reconstrucao;
};

const getLocalPreviewAnswers = (
  resultId: QuizVslResultId,
): QuizVslAnswerMap => {
  const commonAnswers: QuizVslAnswerMap = {
    situacao_atual: "ex_namorada",
    motivo_ruptura: "erro_meu",
    tempo_afastamento: "uma_quatro_semanas",
    contato_atual: "contato_frio",
    quem_terminou: "ela",
    principal_tentativa: "textao",
    maior_dor: "nada_funciona",
    bloqueio_reconquista: "imagem_negativa",
    emocao_dominante: "ansiedade",
    ruminacao: "algumas_vezes",
    impacto_vida: "emocional",
    resultado_desejado: "voltar",
    seguir_metodo: "sim",
  };

  if (resultId === "emergencia") {
    return {
      ...commonAnswers,
      motivo_ruptura: "outra_pessoa",
      tempo_afastamento: "menos_7_dias",
      contato_atual: "bloqueado",
      principal_tentativa: "implorei",
      maior_dor: "outro_homem",
      ruminacao: "todo_dia",
      impacto_vida: "todas",
      seguir_metodo: "ansiedade",
    };
  }

  if (resultId === "reatracao") {
    return {
      ...commonAnswers,
      motivo_ruptura: "esfriamento",
      tempo_afastamento: "mais_tres_meses",
      contato_atual: "contato_frequente",
      quem_terminou: "ambos",
      principal_tentativa: "nada",
      maior_dor: "rejeicao",
      emocao_dominante: "esperanca",
      ruminacao: "raramente",
      impacto_vida: "trabalho",
      resultado_desejado: "sentimento",
    };
  }

  if (resultId === "clareza") {
    return {
      ...commonAnswers,
      situacao_atual: "relacao_indefinida",
      motivo_ruptura: "esfriamento",
      tempo_afastamento: "mais_tres_meses",
      contato_atual: "sem_contato",
      quem_terminou: "ambos",
      principal_tentativa: "contato_zero",
      maior_dor: "rejeicao",
      bloqueio_reconquista: "nao_sei",
      emocao_dominante: "esperanca",
      ruminacao: "nunca",
      impacto_vida: "trabalho",
      resultado_desejado: "clareza",
      seguir_metodo: "solucao_rapida",
    };
  }

  return commonAnswers;
};

const PageShell = ({ children }: { children: ReactNode }) => (
  <main className="min-h-[100dvh] bg-[#080809] px-0 py-0 text-white sm:px-4 sm:py-6">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(185,28,28,0.18),transparent_34%),linear-gradient(180deg,#090909_0%,#050505_100%)]" />
    <div className="relative mx-auto min-h-[100dvh] w-full max-w-[560px] overflow-hidden border-white/10 bg-[#0b0b0c] shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:min-h-[calc(100dvh-3rem)] sm:rounded-[26px] sm:border">
      {children}
    </div>
  </main>
);

const BrandFooter = () => (
  <footer className="mt-auto border-t border-white/10 px-5 py-5 text-center">
    <img
      src="/images/logo-quiz.webp"
      alt="El Código de la Reconquista"
      width={512}
      height={354}
      loading="lazy"
      decoding="async"
      className="mx-auto h-auto w-32 brightness-0 invert"
    />
    <p className="mt-2 text-[11px] font-semibold text-neutral-500">
      Diagnóstico confidencial adaptado a tu situación.
    </p>
  </footer>
);

const FlowHeader = ({
  progress,
  onBack,
  soundEnabled,
  onToggleSound,
  hideBack = false,
}: {
  progress: number;
  onBack: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hideBack?: boolean;
}) => (
  <header className="sticky top-0 z-20 bg-[#0b0b0c]/95 backdrop-blur">
    <div className="h-1.5 bg-neutral-800">
      <div
        className="h-full bg-red-500 transition-[width] duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    <div className="flex items-center justify-between px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white transition hover:bg-white/10 ${
          hideBack ? "invisible" : ""
        }`}
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-red-400">
        Diagnóstico estratégico
      </span>
      <button
        type="button"
        onClick={onToggleSound}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white transition hover:bg-white/10"
        aria-label={soundEnabled ? "Desactivar sonido" : "Activar sonido"}
      >
        {soundEnabled ? (
          <Volume2 className="h-5 w-5" />
        ) : (
          <VolumeX className="h-5 w-5" />
        )}
      </button>
    </div>
  </header>
);

const QuestionScreen = ({
  question,
  step,
  onAnswer,
}: {
  question: QuizVslQuestion;
  step: number;
  onAnswer: (answerId: string) => void;
}) => (
  <div className="flex min-h-[calc(100dvh-72px)] flex-col">
    <section className="flex flex-1 flex-col px-5 py-5 sm:px-7 sm:py-7">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
        Paso {step} de {QUIZ_VSL_TOTAL_SCREENS}
      </p>

      <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#101012] shadow-[0_16px_38px_rgba(0,0,0,0.28)]">
        <img
          key={question.image}
          src={question.image}
          alt={question.imageAlt}
          width={1200}
          height={675}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          className="h-[142px] w-full object-cover sm:h-[190px]"
        />
      </div>

      <h1 className="mt-5 font-serif text-[25px] font-black leading-[1.1] text-white sm:text-[34px]">
        {question.title}
      </h1>
      {question.helper && (
        <p className="mt-2 text-sm font-medium leading-relaxed text-neutral-400">
          {question.helper}
        </p>
      )}

      <div
        className={`mt-5 grid gap-3 ${
          question.layout === "grid" ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        {question.answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            onClick={() => onAnswer(answer.id)}
            className={`group flex min-h-[64px] items-center gap-3 rounded-xl border border-red-500/70 bg-[#151517] px-4 py-3 text-left font-bold leading-snug text-white shadow-[0_10px_28px_rgba(185,28,28,0.08)] transition hover:border-red-400 hover:bg-red-950/30 focus:outline-none focus:ring-2 focus:ring-red-500 ${
              question.layout === "grid"
                ? "flex-col justify-center text-center text-[12px] sm:min-h-[112px] sm:text-[15px]"
                : "text-[15px] sm:text-[16px]"
            }`}
          >
            {answer.emoji && (
              <span
                className={`shrink-0 ${
                  question.layout === "grid" ? "text-2xl" : "text-xl"
                }`}
                aria-hidden="true"
              >
                {answer.emoji}
              </span>
            )}
            <span>{answer.label}</span>
          </button>
        ))}
      </div>
    </section>
    <BrandFooter />
  </div>
);

const ProfileScreen = ({
  step,
  title,
  helper,
  value,
  inputType = "text",
  placeholder,
  error,
  onChange,
  onContinue,
}: {
  step: number;
  title: string;
  helper: string;
  value: string;
  inputType?: "text" | "date";
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex min-h-[calc(100dvh-72px)] flex-col">
    <section className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
        Paso {step} de {QUIZ_VSL_TOTAL_SCREENS}
      </p>
      <h1 className="mt-4 font-serif text-[30px] font-black leading-tight sm:text-[37px]">
        {title}
      </h1>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-400 sm:text-base">
        {helper}
      </p>

      <input
        type={inputType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && value.trim()) onContinue();
        }}
        placeholder={placeholder}
        autoFocus
        className="mt-8 h-16 w-full rounded-xl border border-white/15 bg-[#151517] px-5 text-[17px] font-bold text-white outline-none transition placeholder:text-neutral-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
      />
      {error && <p className="mt-3 text-sm font-bold text-red-400">{error}</p>}

      <button
        type="button"
        onClick={onContinue}
        disabled={!value.trim()}
        className="mt-4 flex h-16 w-full items-center justify-center gap-2 rounded-xl border border-red-500 bg-red-600 text-[16px] font-black uppercase text-white shadow-[0_16px_38px_rgba(220,38,38,0.22)] transition enabled:hover:bg-red-500 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-neutral-600"
      >
        Continuar
        <ArrowRight className="h-5 w-5" />
      </button>
    </section>
    <BrandFooter />
  </div>
);

const AgeBracketScreen = ({
  value,
  onSelect,
}: {
  value: QuizVslAgeBracket | "";
  onSelect: (ageBracket: QuizVslAgeBracket) => void;
}) => (
  <div className="flex min-h-[calc(100dvh-72px)] flex-col">
    <section className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
        Paso 9 de {QUIZ_VSL_TOTAL_SCREENS}
      </p>
      <h1 className="mt-4 font-serif text-[30px] font-black leading-tight sm:text-[37px]">
        ¿Cuál es tu rango de edad?
      </h1>
      <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-400 sm:text-base">
        Selecciona una opción. No necesitamos tu fecha de nacimiento.
      </p>

      <div className="mt-8 grid gap-3">
        {quizVslAgeBrackets.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`flex min-h-16 w-full items-center justify-between rounded-xl border px-5 py-4 text-left text-[16px] font-black transition focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isSelected
                  ? "border-red-400 bg-red-950/40 text-white"
                  : "border-red-500/70 bg-[#151517] text-white hover:border-red-400 hover:bg-red-950/25"
              }`}
            >
              <span>{option.label}</span>
              <ArrowRight className="h-5 w-5 text-red-400" />
            </button>
          );
        })}
      </div>
    </section>
    <BrandFooter />
  </div>
);

const AnalysisScreen = ({
  duration,
  title,
  subtitle,
  messages,
  image,
  imageAlt,
  storyTitle,
  story,
  onComplete,
}: {
  duration: number;
  title: string;
  subtitle: string;
  messages: string[];
  image: string;
  imageAlt: string;
  storyTitle: string;
  story: string;
  onComplete: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const completionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const nextProgress = Math.min(((now - startedAt) / duration) * 100, 100);
      setProgress(nextProgress);

      if (nextProgress < 100) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      if (!completedRef.current) {
        completedRef.current = true;
        completionTimerRef.current = window.setTimeout(onComplete, 300);
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (completionTimerRef.current) {
        window.clearTimeout(completionTimerRef.current);
      }
    };
  }, [duration, onComplete]);

  const activeIndex = Math.min(
    messages.length - 1,
    Math.floor((progress / 100) * messages.length),
  );

  return (
    <div className="flex min-h-[100dvh] flex-col px-5 py-7 sm:min-h-[calc(100dvh-3rem)] sm:px-8">
      <div className="mx-auto mt-auto w-full max-w-md text-center">
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-red-950 bg-[#151517]">
          <div
            className="absolute inset-[-10px] rounded-full"
            style={{
              background: `conic-gradient(#ef4444 ${progress * 3.6}deg, transparent 0deg)`,
              mask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 0)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 0)",
            }}
          />
          <span className="text-3xl font-black">{Math.round(progress)}%</span>
        </div>

        <h1 className="mt-6 font-serif text-[29px] font-black leading-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm font-medium leading-relaxed text-neutral-400">
          {subtitle}
        </p>

        <div className="mt-6 space-y-2 text-left">
          {messages.map((message, index) => (
            <div
              key={message}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold transition ${
                index <= activeIndex
                  ? "border-red-500/40 bg-red-950/20 text-white"
                  : "border-white/10 bg-white/[0.03] text-neutral-600"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  index <= activeIndex ? "bg-red-500" : "bg-neutral-700"
                }`}
              />
              {message}
            </div>
          ))}
        </div>

        <div className="mt-7 grid grid-cols-[92px_1fr] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
          <img
            src={image}
            alt={imageAlt}
            className="h-28 w-[92px] rounded-xl object-cover object-top"
          />
          <div>
            <p className="text-sm font-black text-red-400">{storyTitle}</p>
            <p className="mt-2 text-xs font-medium leading-relaxed text-neutral-300 sm:text-sm">
              {story}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-auto pt-7">
        <BrandFooter />
      </div>
    </div>
  );
};

const QuizVsl = () => {
  const previewResult = useMemo(getLocalPreviewResult, []);
  const [flow, setFlow] = useState<FlowState>(
    previewResult ? "result" : "stage1",
  );
  const [stageOneIndex, setStageOneIndex] = useState(0);
  const [stageTwoIndex, setStageTwoIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizVslAnswerMap>(() =>
    previewResult ? getLocalPreviewAnswers(previewResult.id) : {},
  );
  const [profile, setProfile] = useState<ProfileState>({
    firstName: "",
    partnerName: "",
    ageBracket: "",
  });
  const [soundEnabled, setSoundEnabledState] = useState(isQuizSoundEnabled());
  const [result, setResult] = useState<QuizVslResult | null>(previewResult);
  const resultTrackedRef = useRef(false);
  const startedRef = useRef(false);
  const engagedRef = useRef(false);
  const viewedStepsRef = useRef(new Set<string>());
  const submittedProfileStepsRef = useRef(new Set<string>());
  const detailedDiagnosis = useMemo(
    () => (result ? buildQuizVslDetailedDiagnosis(answers, result) : null),
    [answers, result],
  );

  useEffect(() => {
    const attribution = persistAttributionFromUrl();
    trackEvent("QuizView", {
      page: "quiz_vsl",
      funnel: "quiz_vsl",
      ...attribution,
    });
  }, []);

  useEffect(() => {
    let nextQuestion: QuizVslQuestion | undefined;

    if (flow === "stage1") {
      nextQuestion = quizVslFirstStageQuestions[stageOneIndex + 1];
    } else if (flow === "stage2") {
      nextQuestion = quizVslSecondStageQuestions[stageTwoIndex + 1];
    }

    if (!nextQuestion) return;

    const nextImage = new Image();
    nextImage.decoding = "async";
    nextImage.src = nextQuestion.image;
  }, [flow, stageOneIndex, stageTwoIndex]);

  useEffect(() => {
    const cleanup = () => {
      window.removeEventListener("pointerdown", markEngaged);
      window.removeEventListener("keydown", markEngaged);
    };
    const markEngaged = (event: Event) => {
      if (engagedRef.current) return;
      engagedRef.current = true;
      trackEvent("QuizVslEngagedView", {
        funnel: "quiz_vsl",
        interaction_type: event.type,
        ...getCurrentAttribution(),
      });
      cleanup();
    };

    window.addEventListener("pointerdown", markEngaged, { passive: true });
    window.addEventListener("keydown", markEngaged);
    return cleanup;
  }, []);

  useEffect(() => {
    if (flow !== "result" || !result || resultTrackedRef.current) return;
    resultTrackedRef.current = true;

    const attribution = getCurrentAttribution();
    const payload = {
      funnel: "quiz_vsl",
      quiz_result: result.id,
      quiz_score: result.score,
      quiz_intent: result.intent,
      age_bracket: profile.ageBracket || "nao_informado",
      high_ticket_readiness_score:
        detailedDiagnosis?.highTicketReadinessScore ?? 0,
      diagnosis_openness:
        detailedDiagnosis?.dimensions.find(
          (dimension) => dimension.id === "abertura",
        )?.score ?? 0,
      diagnosis_rejection_risk:
        detailedDiagnosis?.dimensions.find(
          (dimension) => dimension.id === "percepcao",
        )?.score ?? 0,
      diagnosis_emotional_urgency:
        detailedDiagnosis?.dimensions.find(
          (dimension) => dimension.id === "urgencia",
        )?.score ?? 0,
      diagnosis_complexity:
        detailedDiagnosis?.dimensions.find(
          (dimension) => dimension.id === "complexidade",
        )?.score ?? 0,
      ...attribution,
    };

    trackEvent("QuizResult", payload);
    trackEvent("QuizVslResultView", payload);
    trackEvent("QuizVslDiagnosisBuilt", payload);
    trackEvent(
      result.intent === "qualified" ? "QualifiedLead" : "LowIntentLead",
      payload,
    );

    if (result.intent === "qualified") {
      trackStandardEvent("Lead", {
        content_name: `Quiz VSL ${MARKET.brand}`,
        content_category: "quiz_vsl",
        quiz_result: result.id,
      });
    }
  }, [detailedDiagnosis, flow, profile.ageBracket, result]);

  useEffect(() => {
    let trackingKey = "";
    let payload: Record<string, string | number> | null = null;

    if (flow === "stage1") {
      const question = quizVslFirstStageQuestions[stageOneIndex];
      trackingKey = `question:${question.id}`;
      payload = {
        funnel: "quiz_vsl",
        question_id: question.id,
        question_title: question.title,
        question_order: stageOneIndex + 1,
        phase: 1,
      };
    } else if (flow === "stage2") {
      const question = quizVslSecondStageQuestions[stageTwoIndex];
      trackingKey = `question:${question.id}`;
      payload = {
        funnel: "quiz_vsl",
        question_id: question.id,
        question_title: question.title,
        question_order: 10 + stageTwoIndex,
        phase: 2,
      };
    } else if (
      flow === "profile_name" ||
      flow === "profile_partner" ||
      flow === "profile_age"
    ) {
      const profileOrder = {
        profile_name: 7,
        profile_partner: 8,
        profile_age: 9,
      }[flow];
      trackingKey = `profile:${flow}`;
      payload = {
        funnel: "quiz_vsl",
        profile_step: flow,
        question_order: profileOrder,
      };
    }

    if (!trackingKey || !payload || viewedStepsRef.current.has(trackingKey)) return;
    viewedStepsRef.current.add(trackingKey);
    trackEvent(
      trackingKey.startsWith("question:")
        ? "QuizVslQuestionView"
        : "QuizVslProfileStep",
      {
        ...payload,
        ...getCurrentAttribution(),
      },
    );
  }, [flow, stageOneIndex, stageTwoIndex]);

  const attribution = getCurrentAttribution();
  const absoluteStep =
    flow === "stage1"
      ? stageOneIndex + 1
      : flow === "profile_name"
          ? 7
        : flow === "profile_partner"
          ? 8
          : flow === "profile_age"
            ? 9
            : flow === "stage2"
              ? 10 + stageTwoIndex
              : 0;
  const progress =
    absoluteStep > 0 ? (absoluteStep / QUIZ_VSL_TOTAL_SCREENS) * 100 : 0;

  const toggleSound = () => {
    const nextValue = !soundEnabled;
    setSoundEnabledState(nextValue);
    setQuizSoundEnabled(nextValue);
    if (nextValue) playQuizSound("select");
  };

  const trackProfileSubmission = useCallback(
    (
      profileStep: "profile_name" | "profile_partner" | "profile_age",
      metadata: Record<string, string> = {},
    ) => {
      if (submittedProfileStepsRef.current.has(profileStep)) return;
      submittedProfileStepsRef.current.add(profileStep);
      trackEvent("QuizVslProfileSubmitted", {
        funnel: "quiz_vsl",
        profile_step: profileStep,
        field_status: "completed",
        ...metadata,
        ...getCurrentAttribution(),
      });
    },
    [],
  );

  const handleAnswer = (
    question: QuizVslQuestion,
    answerId: string,
    stage: 1 | 2,
  ) => {
    playQuizSound("select");
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("QuizStart", {
        funnel: "quiz_vsl",
        entry_point: "first_answer",
        ...attribution,
      });
    }

    const nextAnswers = { ...answers, [question.id]: answerId };
    setAnswers(nextAnswers);

    trackEvent("QuizStepAnswer", {
      funnel: "quiz_vsl",
      step: stage === 1 ? stageOneIndex + 1 : 10 + stageTwoIndex,
      question_id: question.id,
      question_title: question.title,
      answer_id: answerId,
      answer_label:
        question.answers.find((answer) => answer.id === answerId)?.label || answerId,
      question_order: stage === 1 ? stageOneIndex + 1 : 10 + stageTwoIndex,
      phase: stage,
      ...attribution,
    });

    window.setTimeout(() => {
      if (stage === 1) {
        if (stageOneIndex < quizVslFirstStageQuestions.length - 1) {
          setStageOneIndex((current) => current + 1);
        } else {
          trackEvent("QuizVslPersonalizationStarted", {
            funnel: "quiz_vsl",
            ...attribution,
          });
          setFlow("profile_name");
        }
        return;
      }

      if (stageTwoIndex < quizVslSecondStageQuestions.length - 1) {
        setStageTwoIndex((current) => current + 1);
      } else {
        trackEvent("QuizComplete", {
          funnel: "quiz_vsl",
          step_count: QUIZ_VSL_TOTAL_SCREENS,
          ...attribution,
        });
        setFlow("final_analysis");
      }
    }, 130);
  };

  const handleBack = () => {
    playQuizSound("select");

    if (flow === "stage1") {
      if (stageOneIndex > 0) {
        setStageOneIndex((current) => current - 1);
      }
      return;
    }

    if (flow === "profile_name") {
      setFlow("stage1");
      setStageOneIndex(quizVslFirstStageQuestions.length - 1);
      return;
    }
    if (flow === "profile_partner") {
      setFlow("profile_name");
      return;
    }
    if (flow === "profile_age") {
      setFlow("profile_partner");
      return;
    }
    if (flow === "stage2" && stageTwoIndex > 0) {
      setStageTwoIndex((current) => current - 1);
    }
  };

  const finishFirstAnalysis = useCallback(() => {
    playQuizSound("complete");
    trackEvent("QuizVslFirstAnalysis", {
      funnel: "quiz_vsl",
      age_bracket: profile.ageBracket || "nao_informado",
      ...getCurrentAttribution(),
    });
    trackEvent("QuizVslSecondStageStarted", {
      funnel: "quiz_vsl",
      ...getCurrentAttribution(),
    });
    setFlow("stage2");
  }, [profile.ageBracket]);

  const finishFinalAnalysis = useCallback(() => {
    const finalResult = calculateQuizVslResult(answers);
    playQuizSound("complete");
    trackEvent("QuizVslFinalAnalysis", {
      funnel: "quiz_vsl",
      quiz_result: finalResult.id,
      quiz_score: finalResult.score,
      quiz_intent: finalResult.intent,
      age_bracket: profile.ageBracket || "nao_informado",
      ...getCurrentAttribution(),
    });
    setResult(finalResult);
    setFlow("result");
  }, [answers, profile.ageBracket]);

  if (flow === "first_analysis") {
    return (
      <PageShell>
        <AnalysisScreen
          duration={FIRST_ANALYSIS_DURATION_MS}
          title={`Comprendiendo la historia de ${profile.firstName}`}
          subtitle={`Estamos analizando las primeras respuestas sobre ti y ${profile.partnerName}.`}
          messages={firstAnalysisMessages}
          image="/images/quiz-vsl/enrico-ferraz.png"
          imageAlt="Enrico Ferraz"
          storyTitle="Enrico Ferraz"
          story="Enrico Ferraz lleva más de 10 años estudiando las relaciones y los patrones que acercan o alejan a una pareja. En El Código de la Reconquista enseña a los hombres a dejar de cometer los errores que alejan a su ex y a reconstruir la atracción."
          onComplete={finishFirstAnalysis}
        />
      </PageShell>
    );
  }

  if (flow === "final_analysis") {
    return (
      <PageShell>
        <AnalysisScreen
          duration={FINAL_ANALYSIS_DURATION_MS}
          title={`${profile.firstName}, tu diagnóstico está casi listo`}
          subtitle={`Estamos terminando el análisis de la situación entre tú y ${profile.partnerName}.`}
          messages={finalAnalysisMessages}
          image="/images/quiz-vsl/camila-ferraz.jpg"
          imageAlt="Camila Ferraz"
          storyTitle="Camila Ferraz"
          story="Camila Ferraz trabaja junto a Enrico en el análisis de los patrones emocionales y de comportamiento presentes en el distanciamiento. Su participación ayuda a explicar qué ocurre con la percepción y los sentimientos durante una reconquista."
          onComplete={finishFinalAnalysis}
        />
      </PageShell>
    );
  }

  if (flow === "result" && result) {
    return (
      <main className="min-h-screen bg-[#f6f3f1] px-4 py-6 text-neutral-950 sm:py-10">
        <article className="mx-auto max-w-3xl rounded-2xl border border-red-100 bg-white p-5 shadow-[0_24px_70px_rgba(15,15,15,0.10)] sm:p-8">
          <img
            src="/images/logo-quiz.webp"
            alt="El Código de la Reconquista"
            width={512}
            height={354}
            decoding="async"
            className="mx-auto h-auto w-40 sm:w-52"
          />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
              {result.label}
            </span>
            <span className="text-xs font-black uppercase tracking-[0.15em] text-neutral-500">
              Diagnóstico de {profile.firstName || "tu caso"}
            </span>
          </div>

          <h1 className="mt-5 text-[29px] font-black leading-tight sm:text-[42px]">
            {result.title}
          </h1>
          <h2 className="mt-3 text-[19px] font-black leading-snug text-red-600 sm:text-[24px]">
            {result.headline}
          </h2>
          <p className="mt-4 text-[16px] font-medium leading-relaxed text-neutral-700 sm:text-[18px]">
            {result.description}
          </p>
          <div className="mt-5 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <Check className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <p className="text-sm font-bold leading-relaxed text-neutral-800 sm:text-base">
              {result.nextStep}
            </p>
          </div>

          {detailedDiagnosis && (
            <>
              <section className="mt-7 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                  Análisis de tu caso
                </p>
                <h3 className="mt-2 text-[21px] font-black leading-tight text-neutral-950 sm:text-[25px]">
                  Lo que revelan tus respuestas
                </h3>

                <div className="mt-5 grid gap-3">
                  {detailedDiagnosis.evidences.map((evidence) => (
                    <div
                      key={evidence.id}
                      className="grid gap-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 sm:grid-cols-[150px_1fr] sm:items-center sm:gap-4"
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-neutral-500">
                        {evidence.label}
                      </span>
                      <span className="text-sm font-bold leading-relaxed text-neutral-900 sm:text-[15px]">
                        {evidence.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <h3 className="text-[19px] font-black text-neutral-950 sm:text-[22px]">
                  Mapa de la situación actual
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {detailedDiagnosis.dimensions.map((dimension) => (
                    <article
                      key={dimension.id}
                      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,15,15,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black leading-snug text-neutral-900">
                          {dimension.label}
                        </p>
                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
                          {dimension.level}
                        </span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className="h-full rounded-full bg-red-600"
                          style={{ width: `${dimension.score}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs font-medium leading-relaxed text-neutral-600">
                        {dimension.description}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}

          {detailedDiagnosis && (
            <QuizVslPlayer
              result={result}
              diagnosis={detailedDiagnosis}
            />
          )}
        </article>
      </main>
    );
  }

  const showHeader =
    flow === "stage1" ||
    flow === "profile_name" ||
    flow === "profile_partner" ||
    flow === "profile_age" ||
    flow === "stage2";

  return (
    <PageShell>
      {showHeader && (
        <FlowHeader
          progress={progress}
          onBack={handleBack}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          hideBack={
            (flow === "stage1" && stageOneIndex === 0) ||
            (flow === "stage2" && stageTwoIndex === 0)
          }
        />
      )}

      {flow === "stage1" && (
        <QuestionScreen
          question={quizVslFirstStageQuestions[stageOneIndex]}
          step={stageOneIndex + 1}
          onAnswer={(answerId) =>
            handleAnswer(quizVslFirstStageQuestions[stageOneIndex], answerId, 1)
          }
        />
      )}

      {flow === "profile_name" && (
        <ProfileScreen
          step={7}
          title="¿Cómo podemos llamarte?"
          helper="Usaremos tu nombre únicamente para personalizar el diagnóstico en esta página."
          placeholder="Escribe tu nombre"
          value={profile.firstName}
          onChange={(firstName) =>
            setProfile((current) => ({ ...current, firstName }))
          }
          onContinue={() => {
            const firstName = profile.firstName.trim();
            if (!firstName) return;
            playQuizSound("advance");
            setProfile((current) => ({ ...current, firstName }));
            trackProfileSubmission("profile_name");
            setFlow("profile_partner");
          }}
        />
      )}

      {flow === "profile_partner" && (
        <ProfileScreen
          step={8}
          title="¿Cuál es el nombre de ella?"
          helper="Esto nos ayuda a hacer los siguientes pasos más claros y personales."
          placeholder="Escribe su nombre"
          value={profile.partnerName}
          onChange={(partnerName) =>
            setProfile((current) => ({ ...current, partnerName }))
          }
          onContinue={() => {
            const partnerName = profile.partnerName.trim();
            if (!partnerName) return;
            playQuizSound("advance");
            setProfile((current) => ({ ...current, partnerName }));
            trackProfileSubmission("profile_partner");
            setFlow("profile_age");
          }}
        />
      )}

      {flow === "profile_age" && (
        <AgeBracketScreen
          value={profile.ageBracket}
          onSelect={(ageBracket) => {
            playQuizSound("advance");
            setProfile((current) => ({ ...current, ageBracket }));
            trackProfileSubmission("profile_age", {
              age_bracket: ageBracket,
            });
            window.setTimeout(() => {
              setFlow("first_analysis");
            }, 130);
          }}
        />
      )}

      {flow === "stage2" && (
        <QuestionScreen
          question={quizVslSecondStageQuestions[stageTwoIndex]}
          step={10 + stageTwoIndex}
          onAnswer={(answerId) =>
            handleAnswer(
              quizVslSecondStageQuestions[stageTwoIndex],
              answerId,
              2,
            )
          }
        />
      )}
    </PageShell>
  );
};

export default QuizVsl;
