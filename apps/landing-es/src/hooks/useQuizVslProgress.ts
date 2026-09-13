import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  applyQuizVslPosition,
  createQuizVslProgressState,
  hasReachedQuizVslPitch,
  type QuizVslProgressState,
} from "@/lib/quizVslProgress";

type QuizVslMilestone = 25 | 50 | 75;

type UseQuizVslProgressOptions = {
  containerRef: RefObject<HTMLElement>;
  playerId: string;
  pitchSeconds: number;
  enabled: boolean;
  previewReveal: boolean;
  onStart: () => void;
  onMilestone: (milestone: QuizVslMilestone, watchedSeconds: number) => void;
  onReveal: () => void;
};

type TrackingRecord = Record<string, unknown>;

const isVturbTelemetryUrl = (rawUrl: string) => {
  try {
    const url = new URL(rawUrl, window.location.href);
    const validHost =
      url.hostname === "vt-h-1.b-cdn.net" || url.hostname === "a.vturb.com";

    return validHost && (url.pathname === "/x" || url.pathname === "/y");
  } catch {
    return false;
  }
};

const getEventName = (event: TrackingRecord) =>
  String(event.event ?? event.type ?? event.action ?? event.eventName ?? "").toLowerCase();

const getEventPosition = (event: TrackingRecord) => {
  const data = event.data as TrackingRecord | undefined;
  return Number(
    data?.time ??
      data?.currentTime ??
      data?.current_time ??
      event.time ??
      event.currentTime ??
      event.current_time,
  );
};

const getStorageKey = (playerId: string) =>
  `reconquista_quiz_vsl_watch:${playerId || "pending"}`;

const readPersistedWatch = (storageKey: string) => {
  try {
    const value = Number(window.sessionStorage.getItem(storageKey));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

export const useQuizVslProgress = ({
  containerRef,
  playerId,
  pitchSeconds,
  enabled,
  previewReveal,
  onStart,
  onMilestone,
  onReveal,
}: UseQuizVslProgressOptions) => {
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [offerRevealed, setOfferRevealed] = useState(previewReveal);
  const progressStateRef = useRef<QuizVslProgressState>(createQuizVslProgressState());
  const startedRef = useRef(false);
  const revealedRef = useRef(previewReveal);
  const milestonesRef = useRef(new Set<QuizVslMilestone>());
  const callbacksRef = useRef({ onStart, onMilestone, onReveal });

  callbacksRef.current = { onStart, onMilestone, onReveal };

  const reveal = useCallback(() => {
    if (revealedRef.current) return;

    revealedRef.current = true;
    setOfferRevealed(true);
    callbacksRef.current.onReveal();
  }, []);

  const persistWatch = useCallback(
    (seconds: number) => {
      try {
        window.sessionStorage.setItem(getStorageKey(playerId), String(seconds));
      } catch {
        // Storage may be unavailable in private or restricted browser contexts.
      }
    },
    [playerId],
  );

  const observePosition = useCallback(
    (positionSeconds: number) => {
      if (!enabled || revealedRef.current) return;

      const previousWatched = progressStateRef.current.watchedSeconds;
      const nextState = applyQuizVslPosition(
        progressStateRef.current,
        positionSeconds,
      );

      progressStateRef.current = nextState;

      if (nextState.watchedSeconds <= previousWatched) return;

      if (!startedRef.current) {
        startedRef.current = true;
        callbacksRef.current.onStart();
      }

      setWatchedSeconds(nextState.watchedSeconds);
      persistWatch(nextState.watchedSeconds);

      if (pitchSeconds > 0) {
        const progressPercent = (nextState.watchedSeconds / pitchSeconds) * 100;

        ([25, 50, 75] as QuizVslMilestone[]).forEach((milestone) => {
          if (
            progressPercent >= milestone &&
            !milestonesRef.current.has(milestone)
          ) {
            milestonesRef.current.add(milestone);
            callbacksRef.current.onMilestone(
              milestone,
              nextState.watchedSeconds,
            );
          }
        });
      }

      if (hasReachedQuizVslPitch(nextState, pitchSeconds)) {
        reveal();
      }
    },
    [enabled, persistWatch, pitchSeconds, reveal],
  );

  const processTrackingEvent = useCallback(
    (event: TrackingRecord) => {
      const eventName = getEventName(event);

      if (
        eventName === "played" ||
        eventName === "play" ||
        eventName === "start" ||
        eventName === "smartautoplayview"
      ) {
        const position = getEventPosition(event);
        observePosition(Number.isFinite(position) ? position : 0);
      }

      if (
        eventName === "timed" ||
        eventName === "timeupdate" ||
        eventName === "progress" ||
        eventName === "watching"
      ) {
        observePosition(getEventPosition(event));
      }
    },
    [observePosition],
  );

  const processTrackingBody = useCallback(
    (rawBody: string) => {
      if (!rawBody) return;

      try {
        const parsed = JSON.parse(rawBody) as TrackingRecord | TrackingRecord[];
        const events = Array.isArray(parsed) ? parsed : [parsed];
        events.forEach(processTrackingEvent);
        return;
      } catch {
        const eventMatch = rawBody.match(
          /"(?:event|type|action|eventName)"\s*:\s*"([^"]+)"/i,
        );
        const timeMatch = rawBody.match(
          /"(?:time|currentTime|current_time)"\s*:\s*(\d+(?:\.\d+)?)/i,
        );

        if (eventMatch?.[1]) {
          processTrackingEvent({
            event: eventMatch[1],
            time: timeMatch?.[1] ? Number(timeMatch[1]) : undefined,
          });
        }
      }
    },
    [processTrackingEvent],
  );

  useEffect(() => {
    if (previewReveal) {
      revealedRef.current = true;
      setOfferRevealed(true);
      return;
    }

    if (!enabled) return;

    const persistedWatch = readPersistedWatch(getStorageKey(playerId));
    progressStateRef.current = createQuizVslProgressState(persistedWatch);
    setWatchedSeconds(persistedWatch);

    if (persistedWatch >= pitchSeconds) {
      reveal();
      return;
    }

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
          processTrackingBody(body);
        }
      } catch {
        // Telemetry observation must never affect the player request.
      }

      return originalFetch.apply(this, args);
    };

    window.fetch = trackedFetch;

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    type XhrOpenRest = [
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ];

    const trackedOpen = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: XhrOpenRest
    ) {
      (this as XMLHttpRequest & { __quizVslUrl?: string }).__quizVslUrl = String(url);

      if (rest.length > 0) {
        return originalOpen.call(this, method, url, rest[0] ?? true, rest[1], rest[2]);
      }

      return originalOpen.call(this, method, url);
    };

    const trackedSend = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ) {
      try {
        const rawUrl =
          (this as XMLHttpRequest & { __quizVslUrl?: string }).__quizVslUrl ?? "";

        if (isVturbTelemetryUrl(rawUrl) && typeof body === "string") {
          processTrackingBody(body);
        }
      } catch {
        // Telemetry observation must never affect the player request.
      }

      return originalSend.call(this, body);
    };

    XMLHttpRequest.prototype.open = trackedOpen;
    XMLHttpRequest.prototype.send = trackedSend;

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === "object" && event.data !== null) {
        const record = event.data as TrackingRecord;
        const eventName = getEventName(record);

        // VTurb native CTA event (postMessage variant) — fires when the
        // pitch moment configured in the VTurb dashboard is reached.
        // Reveal immediately instead of waiting on watched-seconds.
        if (eventName === "callaction:current-active-items" || eventName === "callaction") {
          reveal();
          return;
        }

        processTrackingEvent(record);
        return;
      }

      if (typeof event.data === "string") {
        processTrackingBody(event.data);
      }
    };

    window.addEventListener("message", handleMessage);

    // VTurb native CTA event (DOM CustomEvent variant). It has no
    // `bubbles: true`, so it never reaches `document` via the bubbling
    // phase — { capture: true } intercepts it on the way down instead.
    // This mirrors the main VSL page (Index.tsx) so the pitch moment
    // configured in the VTurb dashboard is the source of truth here too.
    const handleVturbCTA = () => {
      reveal();
    };
    document.addEventListener("callaction:current-active-items", handleVturbCTA, {
      capture: true,
    });

    const pollInterval = window.setInterval(() => {
      const container = containerRef.current;
      if (!container || revealedRef.current) return;

      const smartPlayer = container.querySelector("vturb-smartplayer");
      const videos = [
        ...Array.from(container.querySelectorAll("video")),
        ...(smartPlayer?.shadowRoot
          ? Array.from(smartPlayer.shadowRoot.querySelectorAll("video"))
          : []),
      ];

      const playingVideo = videos.find((video) => !video.paused && !video.ended);
      if (playingVideo) {
        observePosition(playingVideo.currentTime);
      }
    }, 1000);

    return () => {
      if (window.fetch === trackedFetch) {
        window.fetch = originalFetch;
      }
      if (XMLHttpRequest.prototype.open === trackedOpen) {
        XMLHttpRequest.prototype.open = originalOpen;
      }
      if (XMLHttpRequest.prototype.send === trackedSend) {
        XMLHttpRequest.prototype.send = originalSend;
      }
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("callaction:current-active-items", handleVturbCTA, {
        capture: true,
      });
      window.clearInterval(pollInterval);
    };
  }, [
    containerRef,
    enabled,
    observePosition,
    pitchSeconds,
    playerId,
    previewReveal,
    processTrackingBody,
    processTrackingEvent,
    reveal,
  ]);

  return {
    watchedSeconds,
    offerRevealed,
  };
};
