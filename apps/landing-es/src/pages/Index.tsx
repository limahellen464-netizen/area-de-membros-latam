import { useState, useEffect, useRef, type ReactNode } from "react";
import FooterSection from "@/components/FooterSection";
import { CHECKOUT_LINKS } from "@/config/checkout";
import { MARKET } from "@/config/market";
import {
  buildUrlWithParams,
  persistAttributionFromUrl,
  readUrlParams,
  trackEvent,
  trackStandardEvent,
} from "@/lib/tracking";

const videoTestimonials = [
  {
    id: "3ag-qYEbZ6A",
    title: "Marcelo recuperó su matrimonio de 5 años con El Código de la Reconquista",
  },
  {
    id: "42wQSo48BCY",
    title: "Mira cómo Rafael volvió a acercarse a su exesposa sin rogarle",
  },
] as const;

const CHECKOUT_URL = CHECKOUT_LINKS.main;
const DEFAULT_PRICE_REVEAL_SECONDS = MARKET.vturb.pitchSeconds;
const CTA_BEFORE_PRICE = "QUIERO RECUPERARLA AHORA";
const CTA_AFTER_PRICE = "QUIERO RECUPERARLA AHORA";
const CTA_SECURITY_COPY =
  "🔒 Acceso inmediato por correo electrónico y WhatsApp después de confirmar el pago.";
const HERO_HEADLINE_CLASS =
  "text-[20px] leading-[1.14] sm:text-[24px] sm:leading-[1.16] md:text-[34px] md:leading-[1.25] font-black";
const HERO_SUBHEADLINE_CLASS =
  "text-[13px] leading-snug sm:text-[14px] md:text-base mt-2 md:mt-3 font-semibold opacity-90";
const SECTION_COPY_CLASS =
  "max-w-4xl mx-auto px-5 sm:px-6 space-y-4 md:space-y-5 text-[16.5px] sm:text-[17px] md:text-[18px] leading-[1.64] md:leading-[1.6]";
const SECTION_TITLE_CLASS =
  "text-[24px] leading-[1.18] sm:text-[27px] md:text-[34px] md:leading-tight font-black text-center mb-6 md:mb-8";
const SECTION_TITLE_COMPACT_CLASS =
  "text-[24px] leading-[1.18] sm:text-[27px] md:text-[34px] md:leading-tight font-black text-center mb-2";
const ITEM_TITLE_CLASS = "text-[18px] leading-snug sm:text-[19px] md:text-[20px] font-black mb-1";
const ITEM_COPY_CLASS = "text-[16.5px] sm:text-[17px] md:text-[18px] leading-[1.64] md:leading-[1.6]";
const INITIATE_CHECKOUT_SESSION_KEY = "recupera_es_initiate_checkout_sent";
const VTURB_TRACKING_EVENT = "recupera-es:vturb-tracking";
const DEFAULT_VSL_PLAYER_ID = MARKET.vturb.playerId;
const DEFAULT_VSL_PLAYER_SCRIPT = MARKET.vturb.scriptUrl;
const DEFAULT_VSL_MEDIA_PRELOAD = MARKET.vturb.preloadUrl;
const VSL_DNS_PREFETCH = [
  "https://cdn.converteai.net",
  "https://scripts.converteai.net",
  "https://images.converteai.net",
  "https://license.vturb.com",
] as const;

interface LandingPageProps {
  allowOfferPreview?: boolean;
  checkoutUrl?: string;
  ctaLabel?: string;
  headline?: ReactNode;
  pitchSeconds?: number;
  playerId?: string;
  playerScript?: string;
  playerPreload?: string;
  pageTitle?: string;
}

const isVturbTelemetryUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl, window.location.href);
    const isTrackingHost =
      url.hostname === "vt-h-1.b-cdn.net" || url.hostname === "a.vturb.com";

    return isTrackingHost && (url.pathname === "/x" || url.pathname === "/y");
  } catch {
    return false;
  }
};

let checkoutIntentTrackedThisPage = false;

const trackInitiateCheckoutOnce = (checkoutUrl: string) => {
  if (checkoutIntentTrackedThisPage) return;

  try {
    if (window.sessionStorage.getItem(INITIATE_CHECKOUT_SESSION_KEY) === "1") {
      checkoutIntentTrackedThisPage = true;
      return;
    }

    window.sessionStorage.setItem(INITIATE_CHECKOUT_SESSION_KEY, "1");
  } catch {
    // If sessionStorage is unavailable, the in-memory guard still prevents repeat clicks.
  }

  checkoutIntentTrackedThisPage = true;
  trackStandardEvent("InitiateCheckout", {
    content_name: MARKET.brand,
    content_ids: "111462",
    content_type: "product",
    value: MARKET.offer.value,
    currency: MARKET.offer.currency,
    checkout_url: checkoutUrl,
  }, { sendToMeta: false });
};

export const CtaButton = ({
  checkoutUrl,
  label = CTA_BEFORE_PRICE,
}: {
  checkoutUrl: string;
  label?: string;
}) => {
  const checkoutUrlWithParams = buildUrlWithParams(checkoutUrl);
  const handleClick = () => {
    trackInitiateCheckoutOnce(checkoutUrl);
  };

  return (
    <div className="text-center">
      <a
        href={checkoutUrlWithParams}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="inline-block max-w-full bg-cta hover:bg-cta-hover text-white font-black text-[15px] sm:text-[16px] md:text-[20px] px-6 sm:px-8 py-4 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 uppercase tracking-wide animate-pulse leading-tight"
      >
        {label}
      </a>
      <p className="mt-3 text-[13px] md:text-[14px] leading-snug text-muted-foreground">
        {CTA_SECURITY_COPY}
      </p>
    </div>
  );
};

const VideoTestimonials = ({
  intro = "Mira estos testimonios breves de hombres que aplicaron el método y empezaron a cambiar su situación:",
}: {
  intro?: string;
}) => (
  <div className="mb-8">
    <p className="mx-auto mb-5 max-w-2xl text-center text-[16px] md:text-[18px] leading-[1.55] text-foreground/90">
      {intro}
    </p>
    <div className="grid gap-5 md:grid-cols-2 md:gap-6 justify-items-center">
      {videoTestimonials.map((testimonial) => (
        <article
          key={testimonial.id}
          className="w-full max-w-[315px] rounded-2xl border border-primary/30 bg-background p-2 shadow-xl shadow-black/10"
        >
          <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${testimonial.id}`}
              title={testimonial.title}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="px-2 pb-1 pt-3 text-center text-sm md:text-base font-bold leading-snug">
            {testimonial.title}
          </p>
        </article>
      ))}
    </div>
  </div>
);

const TestimonialsBlock = ({ intro }: { intro?: string }) => (
  <section className="py-10 md:py-12 bg-card">
    <div className="max-w-4xl mx-auto px-6">
      <h3 className="text-[24px] md:text-[30px] font-black text-center mb-6 leading-tight">
        Lo que dicen nuestros alumnos:
      </h3>
      <VideoTestimonials intro={intro} />
    </div>
  </section>
);

const faqs = [
  {
    question: "¿El Código de la Reconquista funciona de verdad en cualquier situación?",
    answer:
      "Sí. No importa si tú fuiste infiel, si ella lo fue, si la ruptura fue explosiva o si simplemente dijo que ya no sentía lo mismo. Los estímulos que activa el método actúan directamente sobre la respuesta emocional femenina, sin depender de la historia de la pareja.",
  },
  {
    question: "¿Y si ella ya está con otro hombre?",
    answer:
      "Precisamente en esa situación el método puede cobrar más fuerza. Cuando está con otra persona, sigue comparando. Los estímulos del Código de la Reconquista hacen que su mente vuelva a ti de manera involuntaria, incluso cuando está al lado de otro hombre.",
  },
  {
    question: "¿Y si me ha bloqueado en todas partes?",
    answer:
      "El bloqueo es una reacción emocional, no necesariamente una decisión definitiva. El Código de la Reconquista no depende de mensajes ni de contacto directo. Trabaja sobre la percepción que ella tiene de ti y, cuando esa percepción cambia, puede ser ella quien vuelva a buscar el contacto.",
  },
  {
    question: "¿Y si yo le fui infiel?",
    answer:
      "Sí, también puede aplicarse. Una infidelidad rompe la confianza, pero no borra automáticamente la atracción. El método busca reconstruir la imagen emocional que ella tiene de ti y abrir espacio para una respuesta diferente.",
  },
  {
    question: "¿Cuánto tarda en funcionar?",
    answer:
      "Muchos hombres empiezan a notar cambios en su comportamiento en menos de 8 días. El método fue estructurado para ser directo y preciso, no para pasar meses esperando a que ella cambie por sí sola.",
  },
  {
    question: "¿Necesito ser atractivo, tener dinero o alguna ventaja sobre el otro hombre?",
    answer:
      "No. El método trabaja con algo que ningún otro hombre puede replicar: la conexión emocional que ya existe entre ustedes. Los recuerdos, las emociones y las asociaciones de su historia son exclusivamente de los dos.",
  },
];

const Index = ({
  allowOfferPreview = false,
  checkoutUrl = CHECKOUT_URL,
  ctaLabel,
  headline,
  pitchSeconds = DEFAULT_PRICE_REVEAL_SECONDS,
  playerId = DEFAULT_VSL_PLAYER_ID,
  playerScript = DEFAULT_VSL_PLAYER_SCRIPT,
  playerPreload,
  pageTitle,
}: LandingPageProps = {}) => {
  const [contentVisible, setContentVisible] = useState(false);
  const [priceRevealed, setPriceRevealed] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const vslRef = useRef<HTMLDivElement>(null);
  const ctaAfterVslRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primaryCtaLabel =
    ctaLabel ?? (priceRevealed ? CTA_AFTER_PRICE : CTA_BEFORE_PRICE);

  useEffect(() => {
    if (!pageTitle) return;

    const previousTitle = document.title;
    document.title = pageTitle;

    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);

  useEffect(() => {
    persistAttributionFromUrl();
    const urlParams = readUrlParams();

    if (
      urlParams.preview_landing === "1" &&
      (import.meta.env.DEV || allowOfferPreview)
    ) {
      setContentVisible(true);
      setPriceRevealed(true);
    }

    if (urlParams.quiz_result) {
      const dedupeKey = `recupera_es_view_vsl:${window.location.search}`;

      try {
        const alreadyTracked = window.sessionStorage.getItem(dedupeKey);
        if (alreadyTracked) return;
        window.sessionStorage.setItem(dedupeKey, "1");
      } catch {
        // If sessionStorage is unavailable, still track only when quiz_result is in the URL.
      }

      trackEvent("ViewVSL", {
        quiz_result: urlParams.quiz_result,
        quiz_score: urlParams.quiz_score,
        quiz_intent: urlParams.quiz_intent,
      });
      trackStandardEvent("ViewContent", {
        content_name: `VSL ${MARKET.brand}`,
        content_category: "vsl",
        quiz_result: urlParams.quiz_result,
        quiz_score: urlParams.quiz_score,
        quiz_intent: urlParams.quiz_intent,
      });
    }
  }, [allowOfferPreview]);

  // Observe only VTurb telemetry POSTs. Video playlists and segments are never intercepted.
  useEffect(() => {
    const originalFetch = window.fetch;

    const trackedFetch: typeof window.fetch = function (...args) {
      try {
        const input = args[0];
        const rawUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const body = args[1]?.body;

        if (isVturbTelemetryUrl(rawUrl) && typeof body === "string") {
          window.dispatchEvent(
            new CustomEvent(VTURB_TRACKING_EVENT, {
              detail: { body },
            }),
          );
        }
      } catch {
        // Tracking observation must never affect the player request.
      }

      return originalFetch.apply(this, args);
    };

    window.fetch = trackedFetch;

    return () => {
      if (window.fetch === trackedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, []);

  // Inject VSL script into document head
  useEffect(() => {
    const windowWithPerfMarker = window as Window & { _plt?: number };
    windowWithPerfMarker._plt =
      windowWithPerfMarker._plt ||
      (performance?.timeOrigin ? performance.timeOrigin + performance.now() : Date.now());

    const addedResourceHints: HTMLLinkElement[] = [];
    const resolvedPlayerPreload =
      playerPreload ??
      (playerScript === DEFAULT_VSL_PLAYER_SCRIPT ? DEFAULT_VSL_MEDIA_PRELOAD : undefined);

    const preloads = [
      { href: playerScript, as: "script" },
      {
        href: MARKET.vturb.smartPlayerScriptUrl,
        as: "script",
      },
      ...(resolvedPlayerPreload ? [{ href: resolvedPlayerPreload, as: "fetch" }] : []),
    ];

    for (const preload of preloads) {
      const existing = document.querySelector<HTMLLinkElement>(
        `link[rel="preload"][href="${preload.href}"]`
      );
      if (existing) continue;

      const link = document.createElement("link");
      link.rel = "preload";
      link.href = preload.href;
      link.as = preload.as;
      document.head.appendChild(link);
      addedResourceHints.push(link);
    }

    for (const href of VSL_DNS_PREFETCH) {
      const existing = document.querySelector<HTMLLinkElement>(
        `link[rel="dns-prefetch"][href="${href}"]`
      );
      if (existing) continue;

      const link = document.createElement("link");
      link.rel = "dns-prefetch";
      link.href = href;
      document.head.appendChild(link);
      addedResourceHints.push(link);
    }

    const mountPlayer = () => {
      const container = playerContainerRef.current;
      if (!container) return;
      if (container.querySelector(`#${playerId}`)) return;

      const player = document.createElement("vturb-smartplayer");
      player.setAttribute("id", playerId);
      player.setAttribute(
        "style",
        "display:block;margin:0 auto;width:100%;max-width:400px;"
      );

      // Reserves the 9:16 aspect-ratio space (black background) before
      // player.js finishes loading, preventing a layout shift (CLS) on
      // first paint — matches VTurb's official embed markup.
      const placeholder = document.createElement("div");
      placeholder.className = "vturb-player-placeholder";
      placeholder.setAttribute(
        "style",
        "position:relative;width:100%;padding:177.77777777777777% 0 0;z-index:0;background-color:black;"
      );
      player.appendChild(placeholder);

      container.innerHTML = "";
      container.appendChild(player);
    };

    mountPlayer();

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${playerScript}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", mountPlayer, { once: true });
      return () => {
        for (const link of addedResourceHints) link.remove();
      };
    }

    const s = document.createElement("script");
    s.src = playerScript;
    s.async = true;
    s.type = "text/javascript";
    s.addEventListener("load", mountPlayer, { once: true });
    document.head.appendChild(s);

    return () => {
      s.remove();
      for (const link of addedResourceHints) link.remove();
    };
  }, [playerId, playerPreload, playerScript]);

  // Detect play/reveal from VTurb events (resilient to autoplay, iframe/shadow DOM)
  useEffect(() => {
    const el = vslRef.current;
    if (!el) return;

    let started = false;
    let revealed = false;
    let playbackActive = false;
    let hasTimedSignal = false;
    let watchedSeconds = 0;
    let lastPlaybackTick = 0;

    const revealContent = () => {
      if (revealed) return;
      revealed = true;
      setPriceRevealed(true);
      setContentVisible(true);
      setTimeout(() => {
        const vslElement = vslRef.current;
        const ctaElement = ctaAfterVslRef.current;

        if (!vslElement || !ctaElement) return;

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const vslRect = vslElement.getBoundingClientRect();
        const ctaRect = ctaElement.getBoundingClientRect();
        const currentScrollTop = window.scrollY || window.pageYOffset;

        const minimumVisibleVslHeight = Math.max(
          Math.min(vslRect.height * 0.62, 420),
          220,
        );
        const maxScrollToKeepVslVisible = Math.max(
          currentScrollTop + vslRect.bottom - minimumVisibleVslHeight,
          0,
        );
        const desiredScrollForCta = Math.max(
          currentScrollTop + ctaRect.top - (viewportHeight - ctaRect.height - 24),
          0,
        );

        window.scrollTo({
          top: Math.min(desiredScrollForCta, maxScrollToKeepVslVisible),
          behavior: "smooth",
        });
      }, 500);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const checkReveal = () => {
      if (watchedSeconds >= pitchSeconds) {
        setPriceRevealed(true);
        revealContent();
      }
    };

    const accumulateFallbackWatchTime = () => {
      if (!playbackActive || hasTimedSignal || revealed || lastPlaybackTick === 0) return;

      const now = Date.now();
      watchedSeconds += Math.max(0, (now - lastPlaybackTick) / 1000);
      lastPlaybackTick = now;
      checkReveal();
    };

    const armFallbackCounter = () => {
      if (timerRef.current || revealed) return;
      timerRef.current = setInterval(accumulateFallbackWatchTime, 1000);
    };

    const markPlaying = () => {
      if (!started) {
        started = true;
        setHasStarted(true);
      }

      if (!playbackActive) {
        playbackActive = true;
        lastPlaybackTick = Date.now();
      }

      armFallbackCounter();
    };

    const markPaused = () => {
      accumulateFallbackWatchTime();
      playbackActive = false;
      lastPlaybackTick = 0;
    };

    const handleTimedSeconds = (seconds: number) => {
      if (!Number.isFinite(seconds) || seconds < 0) return;
      hasTimedSignal = true;
      watchedSeconds = Math.max(watchedSeconds, seconds);
      markPlaying();
      checkReveal();
    };

    const isPlayEvent = (eventName: string) =>
      eventName === "played" ||
      eventName === "play" ||
      eventName === "start" ||
      eventName === "smartautoplayview";

    const isPauseEvent = (eventName: string) =>
      eventName === "pause" ||
      eventName === "paused" ||
      eventName === "stop" ||
      eventName === "stopped" ||
      eventName === "ended" ||
      eventName === "complete" ||
      eventName === "finished";

    const processEventName = (eventName: string) => {
      if (isPlayEvent(eventName)) {
        markPlaying();
      }

      if (isPauseEvent(eventName)) {
        markPaused();
      }
    };

    const processTrackingBody = (rawBody: string) => {
      if (!rawBody) return;

      try {
        const parsed = JSON.parse(rawBody) as
          | Record<string, unknown>
          | Array<Record<string, unknown>>;
        const events = Array.isArray(parsed) ? parsed : [parsed];

        for (const event of events) {
          const eventName = String(event.event ?? "").toLowerCase();
          processEventName(eventName);

          if (
            eventName === "timed" ||
            eventName === "timeupdate" ||
            eventName === "progress" ||
            eventName === "watching"
          ) {
            const data = event.data as
              | { time?: unknown; currentTime?: unknown; current_time?: unknown }
              | undefined;
            const timedValue = Number(
              data?.time ??
                data?.currentTime ??
                data?.current_time ??
                event.time ??
                event.currentTime,
            );
            handleTimedSeconds(timedValue);
          }
        }
      } catch {
        const eventMatch = rawBody.match(
          /"(?:event|type|action|eventName)"\s*:\s*"([^"]+)"/i,
        );
        if (eventMatch?.[1]) {
          processEventName(eventMatch[1].toLowerCase());
        }

        const timedMatch = rawBody.match(
          /"event"\s*:\s*"timed"[\s\S]{0,180}?"time"\s*:\s*(\d+(?:\.\d+)?)/i,
        );
        if (timedMatch?.[1]) {
          handleTimedSeconds(Number(timedMatch[1]));
        }
      }
    };

    const handleTrackingEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ body?: string }>;
      processTrackingBody(customEvent.detail?.body ?? "");
    };

    const handleMessage = (e: MessageEvent) => {
      if (typeof e.data === "object" && e.data !== null) {
        const d = e.data as Record<string, unknown>;
        const eventName = String(d.event ?? d.type ?? d.action ?? d.eventName ?? "").toLowerCase();

        // VTurb native CTA event (postMessage variant)
        if (eventName === "callaction:current-active-items" || eventName === "callaction") {
          revealContent();
          return;
        }

        processEventName(eventName);

        if (eventName === "timed") {
          const timedValue = Number((d.data as { time?: unknown } | undefined)?.time ?? d.time);
          handleTimedSeconds(timedValue);
        }
      }

      if (typeof e.data === "string") {
        if (e.data.includes("play") || e.data.includes("started")) {
          markPlaying();
        }
        if (e.data.includes("pause") || e.data.includes("stopped") || e.data.includes("ended")) {
          markPaused();
        }
        const timedMatch = e.data.match(/"time":\s*(\d+(?:\.\d+)?)/);
        if (timedMatch?.[1] && e.data.includes("timed")) {
          handleTimedSeconds(Number(timedMatch[1]));
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.addEventListener(VTURB_TRACKING_EVENT, handleTrackingEvent);

    // VTurb native CTA event (DOM CustomEvent variant) — fires when the configured
    // pitch-moment button becomes active. e.target is the <vturb-smartplayer>
    // element itself (not the anchor button), so it must NOT be hidden here —
    // doing so used to hide the whole video player right after the pitch.
    // The anchor button is already hidden permanently via CSS (index.css).
    const handleVturbCTA = () => {
      revealContent();
    };
    document.addEventListener("callaction:current-active-items", handleVturbCTA, { capture: true });

    // Pause accumulation whenever the tab goes to background so that
    // suspended setInterval callbacks don't produce a time-gap burst on resume.
    const handleVisibilityChange = () => {
      if (document.hidden) markPaused();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (revealed) {
        clearInterval(pollInterval);
        return;
      }

      const directVideos = Array.from(el.querySelectorAll("video"));
      const smartPlayer = el.querySelector("vturb-smartplayer");
      const shadowVideos = smartPlayer?.shadowRoot
        ? Array.from(smartPlayer.shadowRoot.querySelectorAll("video"))
        : [];

      for (const video of [...directVideos, ...shadowVideos]) {
        if (video.paused || video.ended) {
          markPaused();
          continue;
        }

        if (video.currentTime > 0) {
          handleTimedSeconds(video.currentTime);
          break;
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener(VTURB_TRACKING_EVENT, handleTrackingEvent);
      document.removeEventListener("callaction:current-active-items", handleVturbCTA, { capture: true });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pitchSeconds]);

  // Timer state for offer
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("offer-timer-end");
    if (saved) {
      const diff = Math.max(0, Math.floor((Number(saved) - Date.now()) / 1000));
      return diff > 0 ? diff : 24 * 60 * 60;
    }
    const end = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("offer-timer-end", String(end));
    return 24 * 60 * 60;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          const end = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem("offer-timer-end", String(end));
          return 24 * 60 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  // Live viewer count (random between 800-1200, updates every 3-5s)
  const [viewerCount, setViewerCount] = useState(() => Math.floor(Math.random() * 400) + 800);
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount((prev) => {
        const delta = Math.floor(Math.random() * 40) - 20;
        return Math.max(700, Math.min(1300, prev + delta));
      });
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="w-full">
      {/* ─── HERO / HEADLINE ─── */}
      <section className="w-full bg-background pt-1 pb-3 sm:pb-4 md:pt-4 md:pb-8">
        <div className="max-w-4xl mx-auto px-3 md:px-4 text-center">
           <img src="/images/logo.png" alt="Logotipo de El Código de la Reconquista" className="cdr-hero-logo mx-auto -mt-1 mb-0.5 w-32 sm:w-40 md:w-60" style={{ marginTop: '-4px' }} />
          <h1 className={`${HERO_HEADLINE_CLASS} cdr-hero-headline`}>
            {headline ?? (
              <>
                <span className="text-destructive">REVELADO:</span> 3 estímulos psicológicos respaldados por la neurociencia que reprograman la forma en que una mujer piensa en ti y hacen que quiera volver, en menos de 8 días, sin entender por qué está sintiendo todo eso.
              </>
            )}
          </h1>
          <p className={`${HERO_SUBHEADLINE_CLASS} cdr-hero-subheadline`}>
            <span className="md:hidden">👇 Míralo ahora antes de que este video deje de estar disponible 👇</span>
            <span className="hidden md:inline">👇 Este video está siendo censurado. Míralo antes de que DESAPAREZCA. 👇</span>
          </p>
        </div>
      </section>
      <div className="w-full h-1 bg-white" />

      {/* ─── VSL ─── */}
      <section className="py-1 md:py-10 bg-black">
        <div className="max-w-2xl mx-auto px-4" ref={vslRef}>
          <div ref={playerContainerRef} />
          {/* Live viewer count */}
          <p className="text-center text-white/80 text-sm mt-3">
            🔴 {viewerCount.toLocaleString("es")} personas están viendo este video ahora.
          </p>
        </div>
      </section>


      {/* ─── CONTENT (rendered only after pitch) ─── */}
      {contentVisible ? (
      <div className="transition-all duration-1000 opacity-100 max-h-none">
        {/* CTA after VSL */}
        <section className="py-10 md:py-12" ref={ctaAfterVslRef}>
          <div className="max-w-3xl mx-auto px-6">
            <CtaButton checkoutUrl={checkoutUrl} label={primaryCtaLabel} />
          </div>
        </section>

        {/* ─── BLOCO 3: O diferencial do método ─── */}
        <section className="py-10 md:py-12 bg-card">
          <div className={SECTION_COPY_CLASS}>
            <h2 className={SECTION_TITLE_CLASS}>
              <span className="text-destructive">El Código de la Reconquista:</span> el método que cambia la forma en que tu ex piensa en ti, revierte el impacto de la ruptura, reactiva el deseo y hace que quiera retomar la relación sin entender qué está ocurriendo.
            </h2>
            <div className="flex justify-center mb-6">
              <img
                src="/images/product-bundle.png"
                alt="Producto El Código de la Reconquista"
                className="w-full max-w-[320px] md:max-w-[400px] rounded-xl"
              />
            </div>
            <p>
              <strong>Olvida todo lo que has visto hasta ahora.</strong> El Código de la Reconquista no depende de juegos mentales, mensajes prefabricados ni de aplicar el famoso "contacto cero" sin una estrategia.
            </p>
            <p>
              Fue creado para <strong>transformar la forma en que ella piensa en ti</strong>, revertir el efecto de la ruptura, reactivar el deseo y reconstruir tu imagen como el hombre al que quiere recuperar.
            </p>
            <p>
              Con una metodología directa, abandonas el patrón de desesperación que aleja a la mayoría de los hombres y recuperas el control sobre el impacto emocional que generas en ella, hasta que quiera volver por decisión propia.
            </p>
            <p>
              No importa lo que haya ocurrido. No importa si tú fuiste infiel, si ella lo fue, si la ruptura fue explosiva o si dijo que ya no sentía lo mismo. Tampoco importa si está con otro hombre, si te bloqueó, si dijo que no quiere volver a verte o si llevan meses sin hablar.
            </p>
            <p>
              <strong>Existe una forma precisa de cambiar esas asociaciones</strong>, dejar atrás la imagen negativa que hoy tiene de ti y sustituirla por una atracción que no logra explicar y que la impulsa a acercarse por voluntad propia.
            </p>

            <div className="pt-4">
              <CtaButton checkoutUrl={checkoutUrl} label={primaryCtaLabel} />
            </div>
          </div>
        </section>

        <TestimonialsBlock />

        {/* ─── BLOCO 4: FAQ ─── */}
        <section className="py-10 md:py-12">
          <div className="max-w-4xl mx-auto px-5 sm:px-6">
            <h2 className={SECTION_TITLE_COMPACT_CLASS}>
              Preguntas frecuentes
            </h2>
            <p className="text-center text-muted-foreground mb-8">¿Te queda alguna duda? Revisa las preguntas frecuentes:</p>
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="bg-card rounded-lg px-6 border-none shadow-sm"
                >
                  <summary className="cursor-pointer list-none text-left text-[16px] sm:text-[17px] leading-snug font-black py-5">
                    {faq.question}
                  </summary>
                  <div className="text-[15.5px] sm:text-[16px] leading-[1.62] text-muted-foreground pb-5">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
            <div className="pt-8">
              <CtaButton checkoutUrl={checkoutUrl} label={primaryCtaLabel} />
            </div>
          </div>
        </section>

        {/* ─── BLOCO 5: Por que estratégias falham ─── */}
        <section className="py-10 md:py-12">
          <div className={SECTION_COPY_CLASS}>
            <h2 className={SECTION_TITLE_CLASS}>
              ¿Por qué las tácticas tradicionales están destruyendo tus posibilidades de recuperarla?
            </h2>
            <p>
              El error más común es intentar convencerla desde la lógica. La atracción no es una decisión racional, sino una respuesta biológica y emocional. El deseo nace de lo que ella siente, no de lo que tú dices. Por eso tus impulsos pueden estar jugando en tu contra:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Disculparte sin parar y declararle todo lo que sientes reduce el valor que ella percibe en ti y puede generar rechazo inmediato.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Perseguirla y rogarle refuerza una imagen de necesidad, uno de los mayores enemigos de la atracción.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Insistir en el mismo error solo hace que su resistencia aumente.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Aplicar el "contacto cero" sin estrategia no crea añoranza; puede ayudarla a seguir adelante y olvidarte.</span></li>
            </ul>
            <p>
              El Código de la Reconquista deja de discutir con la lógica y <strong>trabaja sobre su respuesta emocional</strong>, reduce el impacto de la ruptura, transforma la imagen negativa que tiene de ti y reactiva un deseo que no puede explicar con facilidad.
            </p>
          </div>
        </section>

        {/* ─── BLOCO 6: Benefícios ─── */}
        <section className="py-10 md:py-12 bg-card">
          <div className={SECTION_COPY_CLASS}>
            <h2 className={SECTION_TITLE_CLASS}>
              ¿Qué ocurre cuando aplicas El Código de la Reconquista?
            </h2>
            <p className="font-bold">Al seguir el método paso a paso, podrás:</p>
            <ul className="space-y-3 pl-2">
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Dejar atrás la imagen de la ruptura y reconstruir la forma en que ella te percibe, aunque ahora esté con otro hombre.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Despertar una añoranza y una curiosidad genuinas que hagan que piense en ti de manera espontánea.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Romper el patrón de necesidad que aleja a tantos hombres y sustituirlo por una presencia firme y magnética.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Dirigir el acercamiento con calma y estrategia, sin perseguirla ni enviar mensajes desesperados.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Reactivar la tensión sexual y el deseo de forma natural, despertando una atracción que ella creía haber perdido.</span></li>
              <li className="flex gap-2 items-start"><span className="text-primary font-bold">●</span><span>Crear las condiciones para que sea ella quien se acerque y quiera retomar la relación por voluntad propia.</span></li>
            </ul>
            <p>
              Y lo más importante: el método no se limita a recuperarla. También transforma tu postura, tu claridad mental y tu autocontrol, para que vuelvas a ser un hombre firme, presente y difícil de ignorar.
            </p>
          </div>
        </section>

        <section className="py-10 md:py-12">
          <div className="max-w-3xl mx-auto px-6 pb-8">
            <CtaButton checkoutUrl={checkoutUrl} label={primaryCtaLabel} />
          </div>
        </section>

        {/* ─── BLOCO 7: Ciência e pilares ─── */}
        <section className="py-10 md:py-12 bg-card">
          <div className={SECTION_COPY_CLASS}>
            <h2 className={SECTION_TITLE_CLASS}>
              La ciencia detrás de El Código de la Reconquista
            </h2>
            <p>
              La atracción no vive en la lógica: es una respuesta emocional, química y primitiva. Cuando ruegas, discutes o presionas, su respuesta emocional se enfría. Cuando activas los estímulos correctos, en el momento adecuado, ocurre lo contrario: empieza a pensar en ti de forma espontánea, su resistencia disminuye y aparece una añoranza que no sabe explicar.
            </p>
            <p>
              No necesitas fingir que eres otra persona. Necesitas comprender qué hacer y en qué momento. El Código de la Reconquista pone ese control en tus manos mediante tres pilares:
            </p>
            <div className="space-y-8 pt-4">
              <div className="flex gap-4">
                <span className="text-xl flex-shrink-0">🔹</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Pilar 1: Recuperación de tu imagen</h3>
                  <p className={ITEM_COPY_CLASS}>
                    Sal de la posición de hombre necesitado o rechazado y reconstruye tu valor emocional de forma discreta y atractiva.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-xl flex-shrink-0">🔹</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Pilar 2: Reactivación de la conexión</h3>
                  <p className={ITEM_COPY_CLASS}>
                    Utiliza tu postura, el momento adecuado y la comunicación para reactivar el vínculo y el deseo, sin juegos ni actitudes forzadas.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span className="text-xl flex-shrink-0">🔹</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Pilar 3: Reatracción magnética</h3>
                  <p className={ITEM_COPY_CLASS}>
                    Dirige el acercamiento con control. Vuelve a despertar interés, deseo e intensidad emocional hasta que ella tome la iniciativa de querer volver.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BLOCO 8: Bônus ─── */}
        <section className="py-10 md:py-12">
          <div className="max-w-4xl mx-auto px-5 sm:px-6 space-y-5 md:space-y-6 text-[16.5px] sm:text-[17px] md:text-[18px] leading-[1.64] md:leading-[1.6]">
            <h2 className={SECTION_TITLE_CLASS}>
              Todo lo que te espera dentro de El Código de la Reconquista:
            </h2>
            <div className="space-y-6">
              <div className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">🛡️</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Bono 1: Protección mental para la reconquista</h3>
                  <p>El antídoto contra la desesperación. Aprende a dominar la ansiedad, la necesidad y la impulsividad para <strong><em>dejar de sabotearte</em></strong> y no arruinarlo todo en el momento más importante.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">🧠</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Bono 2: Los 10 estímulos de la atracción femenina</h3>
                  <p>El mapa de su mente. Comprende los patrones emocionales que hacen que una mujer sienta rechazo o deseo y aprende a <strong><em>activar esos estímulos</em></strong> para reconstruir tu valor con inteligencia.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">🔥</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Bono 3: Reactivación del deseo</h3>
                  <p>Cómo generar tensión sexual y emocional. Aprende a recuperar una <strong>presencia atractiva y magnética</strong> sin parecer artificial, necesitado ni insistente.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">💬</span>
                <div>
                  <h3 className={ITEM_TITLE_CLASS}>Bono 4: Acceso a soporte exclusivo</h3>
                  <p>No estarás solo. Accede a un entorno privado de apoyo para resolver dudas, <strong><em>no avanzar a ciegas</em></strong> y aplicar cada etapa con seguridad.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BLOCO 9: Oferta ─── */}
        <section className="py-14 md:py-20 bg-[hsl(0,0%,8%)] text-white">
          <div className="max-w-3xl mx-auto px-5 sm:px-6">
            <h2 className={SECTION_TITLE_CLASS}>
              Obtén hoy el acceso completo con una condición especial:
            </h2>
            <p className="text-center text-[16.5px] sm:text-[17px] md:text-[18px] leading-[1.64] md:leading-[1.6] mb-6 text-white/80">
              Recibirás el <strong className="text-white">método completo</strong> + <strong className="text-white">estructuras prácticas</strong> + <strong className="text-white">los 4 bonos exclusivos</strong>.
            </p>

            {/* Product image */}
            <div className="flex justify-center mb-10">
              <img
                src="/images/product-bundle.png"
                alt="Producto El Código de la Reconquista"
                className="w-full max-w-[320px] md:max-w-[400px] border-2 border-white/20 rounded-xl"
              />
            </div>

            {/* Price card */}
            <div className="rounded-2xl border border-white/10 bg-[hsl(0,0%,12%)] shadow-2xl p-6 md:p-10 max-w-lg mx-auto">
              <div className="bg-destructive text-white rounded-lg px-4 py-3 mb-6 flex items-center justify-center gap-3">
                <span className="text-[14px] font-bold uppercase tracking-wide">Finaliza en:</span>
                <div className="flex gap-1 font-mono text-[28px] md:text-[34px] font-black tracking-widest">
                  <span>{hours}</span><span className="animate-pulse">:</span>
                  <span>{minutes}</span><span className="animate-pulse">:</span>
                  <span>{seconds}</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1 mb-6">
                <span className="text-[16px] text-white/60 font-medium">
                  De <span className="line-through text-red-400 font-bold text-[22px]">{MARKET.offer.referencePrice}</span>
                </span>
                <span className="text-[14px] text-white/60">por solo</span>
                <span className="text-[22px] md:text-[28px] font-black leading-none">
                   <span className="text-[hsl(120,70%,45%)] text-[36px] md:text-[44px]">{MARKET.offer.currentPrice}</span>
                 </span>
                 <span className="text-[16px] md:text-[18px] font-bold text-white">pago una sola vez</span>
              </div>

              <CtaButton checkoutUrl={checkoutUrl} label={primaryCtaLabel} />
            </div>
          </div>
        </section>

      </div>
      ) : null}
      {contentVisible && <FooterSection />}
    </main>
  );
};

export default Index;
