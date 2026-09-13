import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import QuizVslCheckoutButton from "@/components/QuizVslCheckoutButton";
import QuizVslUnlockedContent from "@/components/QuizVslUnlockedContent";
import {
  isQuizVslPlayerConfigured,
  QUIZ_VSL_PLAYER,
  type QuizVslResult,
} from "@/config/quizVsl";
import { useQuizVslProgress } from "@/hooks/useQuizVslProgress";
import { getCurrentAttribution, trackEvent } from "@/lib/tracking";
import { playQuizSound } from "@/lib/quizSound";
import type { QuizVslDetailedDiagnosis } from "@/lib/quizVslDiagnosis";

type QuizVslPlayerProps = {
  result: QuizVslResult;
  diagnosis: QuizVslDetailedDiagnosis;
};

const isLocalPreviewEnabled = () => {
  if (typeof window === "undefined") return false;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const params = new URLSearchParams(window.location.search);

  return isLocalhost && params.get("preview_quiz_vsl") === "1";
};

const QuizVslPlayer = ({ result, diagnosis }: QuizVslPlayerProps) => {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLElement>(null);
  const viewedRef = useRef(false);
  const [showScrollNudge, setShowScrollNudge] = useState(false);
  const previewReveal = useMemo(isLocalPreviewEnabled, []);
  const eventPayload = useMemo(
    () => ({
      ...getCurrentAttribution(),
      quiz_result: result.id,
      quiz_score: result.score,
      quiz_intent: result.intent,
      high_ticket_readiness_score: diagnosis.highTicketReadinessScore,
    }),
    [diagnosis.highTicketReadinessScore, result],
  );

  const { offerRevealed } = useQuizVslProgress({
    containerRef: playerContainerRef,
    playerId: QUIZ_VSL_PLAYER.id,
    pitchSeconds: QUIZ_VSL_PLAYER.pitchSeconds,
    enabled: isQuizVslPlayerConfigured,
    previewReveal,
    onStart: () => trackEvent("QuizVslStart", eventPayload),
    onMilestone: (milestone, milestoneWatchedSeconds) =>
      trackEvent(
        `QuizVsl${milestone}` as "QuizVsl25" | "QuizVsl50" | "QuizVsl75",
        {
          ...eventPayload,
          watched_seconds: Math.round(milestoneWatchedSeconds),
        },
      ),
    onReveal: () => {
      playQuizSound("complete");
      trackEvent("QuizVslOfferReveal", eventPayload);
    },
  });

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackEvent("QuizVslView", eventPayload);
  }, [eventPayload]);

  // Lots of leads land on the diagnosis text and never scroll far enough to
  // reach the video. We nudge them down in two ways: (1) a delayed, partial
  // auto-scroll that gives them time to read the risk/headline first, then
  // brings the player near the top of the viewport (not centered — a soft
  // nudge, not a forced jump); (2) a persistent floating "ver ahora"
  // indicator that stays until the player is actually visible on screen.
  // Both stop the moment the offer is revealed — at that point
  // QuizVslUnlockedContent takes over and scrolls to the CTA instead, and we
  // don't want this nudge fighting that scroll or pointing back at a video
  // that's already done its job.
  useEffect(() => {
    if (offerRevealed) {
      setShowScrollNudge(false);
      return;
    }

    const container = playerContainerRef.current;
    if (!container) return;

    const nudgeAppearTimeout = window.setTimeout(
      () => setShowScrollNudge(true),
      1500,
    );

    const autoScrollTimeout = window.setTimeout(() => {
      const rect = container.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;

      // Skip if the player is already reasonably in view (short pages,
      // tall viewports) — avoids an unnecessary/jarring scroll.
      if (rect.top < viewportHeight * 0.75) return;

      const currentScrollTop = window.scrollY || window.pageYOffset;
      const target = currentScrollTop + rect.top - viewportHeight * 0.28;
      window.scrollTo({ top: Math.max(target, 0), behavior: "smooth" });
    }, 2800);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShowScrollNudge(false);
      },
      { threshold: 0.35 },
    );
    observer.observe(container);

    return () => {
      window.clearTimeout(nudgeAppearTimeout);
      window.clearTimeout(autoScrollTimeout);
      observer.disconnect();
    };
  }, [offerRevealed]);

  useEffect(() => {
    if (!isQuizVslPlayerConfigured) return;

    const container = playerContainerRef.current;
    if (!container) return;

    const performanceWindow = window as Window & { _plt?: number };
    performanceWindow._plt ??=
      window.performance.timeOrigin + window.performance.now();

    const resourceHints: HTMLLinkElement[] = [];
    const addResourceHint = (
      rel: "preload" | "dns-prefetch",
      href: string,
      as?: "script" | "fetch",
    ) => {
      const selector = `link[rel="${rel}"][href="${href}"]`;
      if (document.head.querySelector(selector)) return;

      const link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (as) link.as = as;
      document.head.appendChild(link);
      resourceHints.push(link);
    };

    addResourceHint("preload", QUIZ_VSL_PLAYER.scriptUrl, "script");
    addResourceHint("preload", QUIZ_VSL_PLAYER.smartPlayerScriptUrl, "script");
    addResourceHint("preload", QUIZ_VSL_PLAYER.cdnPreloadUrl, "fetch");
    QUIZ_VSL_PLAYER.dnsPrefetchHosts.forEach((host) =>
      addResourceHint("dns-prefetch", host),
    );

    const mountPlayer = () => {
      if (container.querySelector(`#${QUIZ_VSL_PLAYER.id}`)) return;

      const player = document.createElement("vturb-smartplayer");
      player.id = QUIZ_VSL_PLAYER.id;
      player.setAttribute(
        "style",
        "display:block;margin:0 auto;width:100%;max-width:400px;",
      );

      // Reserves the 9:16 aspect-ratio space (black background) before
      // player.js finishes loading, preventing a layout shift (CLS) on
      // first paint — matches VTurb's official embed markup.
      const placeholder = document.createElement("div");
      placeholder.className = "vturb-player-placeholder";
      placeholder.setAttribute(
        "style",
        "position:relative;width:100%;padding:177.77777777777777% 0 0;z-index:0;background-color:black;",
      );
      player.appendChild(placeholder);

      container.replaceChildren(player);
    };

    mountPlayer();

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${QUIZ_VSL_PLAYER.scriptUrl}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", mountPlayer, { once: true });
      return () => {
        existingScript.removeEventListener("load", mountPlayer);
        resourceHints.forEach((link) => link.remove());
      };
    }

    const script = document.createElement("script");
    script.src = QUIZ_VSL_PLAYER.scriptUrl;
    script.async = true;
    script.type = "text/javascript";
    script.addEventListener("load", mountPlayer, { once: true });
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", mountPlayer);
      resourceHints.forEach((link) => link.remove());
    };
  }, []);

  return (
    <div className="mt-7">
      <div className="mb-5 text-center">
        <p className="text-[18px] font-black leading-snug text-neutral-950 md:text-[22px]">
          {diagnosis.bridgeTitle}
        </p>
        <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
          {diagnosis.bridgeDescription}
        </p>
      </div>

      <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-neutral-200 bg-black p-1.5 shadow-[0_22px_60px_rgba(15,15,15,0.18)]">
        <div ref={playerContainerRef} className="aspect-[9/16] bg-black">
          {!isQuizVslPlayerConfigured && (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-neutral-300">
              Configura el reproductor de la VSL para completar esta prueba.
            </div>
          )}
        </div>
      </div>

      {showScrollNudge && (
        <button
          type="button"
          onClick={() => {
            playerContainerRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            setShowScrollNudge(false);
          }}
          className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-fit animate-bounce items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white shadow-[0_14px_36px_rgba(190,30,30,0.45)]"
        >
          Mira tu diagnóstico en video
          <ChevronDown className="h-4 w-4 shrink-0" />
        </button>
      )}

      {!offerRevealed && isQuizVslPlayerConfigured && (
        <p className="mx-auto mt-4 max-w-md text-center text-sm font-semibold leading-relaxed text-neutral-500">
          Sigue mirando. Los detalles del método y la condición de acceso se
          habilitarán durante la presentación.
        </p>
      )}

      {offerRevealed && (
        <>
          <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-green-200 bg-green-50 p-5 text-center shadow-[0_18px_48px_rgba(22,163,74,0.13)]">
            <CheckCircle2 className="mx-auto h-9 w-9 text-green-600" />
            <p className="mt-3 text-[19px] font-black text-neutral-950 sm:text-[22px]">
              El método completo ya está disponible
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-neutral-600">
              Tu acceso a El Código de la Reconquista ya está disponible con la
              condición presentada en el video.
            </p>

            <div className="mt-5">
              <QuizVslCheckoutButton
                result={result}
                position="below_vsl"
                showSecurityNote
                attention
              />
            </div>
          </div>

          <QuizVslUnlockedContent result={result} productRef={productRef} />
        </>
      )}
    </div>
  );
};

export default QuizVslPlayer;
