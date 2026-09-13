import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getYouTubeVideoId } from "@/lib/youtubeVideo";

type YouTubePlayerStatus = "idle" | "loading" | "ready" | "error";

export interface VideoPlayerTelemetryEvent {
  action: "activate" | "ready" | "playing" | "paused" | "error" | "retry" | "fallback";
  videoId: string;
  attempt: number;
  errorCode?: number | string;
}

interface YouTubePlayerProps {
  url: string;
  title: string;
  className?: string;
  onTelemetry?: (event: VideoPlayerTelemetryEvent) => void;
}

interface YouTubePlayerInstance {
  destroy: () => void;
  playVideo: () => void;
}

interface YouTubePlayerEvent {
  data: number;
  target: YouTubePlayerInstance;
}

interface YouTubePlayerOptions {
  host: string;
  videoId: string;
  playerVars: Record<string, string | number>;
  events: {
    onReady: (event: YouTubePlayerEvent) => void;
    onStateChange: (event: YouTubePlayerEvent) => void;
    onError: (event: YouTubePlayerEvent) => void;
  };
}

interface YouTubeNamespace {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayerInstance;
}

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_API_SCRIPT_ID = "youtube-iframe-api";
const PLAYER_READY_TIMEOUT_MS = 15_000;
let youtubeApiPromise: Promise<YouTubeNamespace> | null = null;

const loadYouTubeApi = (): Promise<YouTubeNamespace> => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("browser_unavailable"));
  }

  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeNamespace>((resolve, reject) => {
    let settled = false;
    const previousReady = window.onYouTubeIframeAPIReady;

    const finish = (namespace?: YouTubeNamespace, error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      if (namespace?.Player) {
        resolve(namespace);
      } else {
        youtubeApiPromise = null;
        reject(error || new Error("youtube_api_unavailable"));
      }
    };

    const checkReady = () => {
      if (window.YT?.Player) finish(window.YT);
    };

    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      checkReady();
    };

    const poll = window.setInterval(checkReady, 250);
    const timeout = window.setTimeout(
      () => finish(undefined, new Error("youtube_api_timeout")),
      PLAYER_READY_TIMEOUT_MS,
    );

    const existingScript = document.getElementById(YOUTUBE_API_SCRIPT_ID);
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = YOUTUBE_API_SCRIPT_ID;
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => finish(undefined, new Error("youtube_api_script_error"));
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
};

const getPlayerErrorMessage = (code?: number | string) => {
  if (code === 101 || code === 150) {
    return "O proprietário do vídeo não permitiu a reprodução dentro desta página.";
  }
  if (code === 153) {
    return "O YouTube bloqueou a identificação deste navegador. Tente novamente ou abra o vídeo diretamente.";
  }
  if (code === 100) return "Este vídeo não está mais disponível.";
  return "Não foi possível carregar esta aula neste navegador.";
};

export const YouTubePlayer = ({
  url,
  title,
  className,
  onTelemetry,
}: YouTubePlayerProps) => {
  const videoId = useMemo(() => getYouTubeVideoId(url), [url]);
  const [status, setStatus] = useState<YouTubePlayerStatus>("idle");
  const [activated, setActivated] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [errorCode, setErrorCode] = useState<number | string>();
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayerInstance | null>(null);

  const emit = useCallback(
    (event: Omit<VideoPlayerTelemetryEvent, "videoId" | "attempt">) => {
      if (!videoId) return;
      onTelemetry?.({ ...event, videoId, attempt });
    },
    [attempt, onTelemetry, videoId],
  );

  useEffect(() => {
    setStatus("idle");
    setActivated(false);
    setAttempt(0);
    setErrorCode(undefined);
  }, [videoId]);

  useEffect(() => {
    if (!activated || !videoId || !mountRef.current) return;

    let disposed = false;
    let readyTimeout: number | null = null;

    const fail = (code: number | string) => {
      if (disposed) return;
      if (readyTimeout !== null) window.clearTimeout(readyTimeout);
      setErrorCode(code);
      setStatus("error");
      emit({ action: "error", errorCode: code });
    };

    const initialize = async () => {
      try {
        const youtube = await loadYouTubeApi();
        if (disposed || !mountRef.current) return;

        const origin = window.location.origin;
        playerRef.current = new youtube.Player(mountRef.current, {
          host: "https://www.youtube-nocookie.com",
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            playsinline: 1,
            rel: 0,
            origin,
            widget_referrer: window.location.href,
          },
          events: {
            onReady: (event) => {
              if (disposed) return;
              if (readyTimeout !== null) {
                window.clearTimeout(readyTimeout);
                readyTimeout = null;
              }
              playerRef.current = event.target;
              setStatus("ready");
              emit({ action: "ready" });
              try {
                event.target.playVideo();
              } catch {
                // Autoplay may be blocked; native controls remain available.
              }
            },
            onStateChange: (event) => {
              if (disposed) return;
              if (event.data === 1) emit({ action: "playing" });
              if (event.data === 2) emit({ action: "paused" });
            },
            onError: (event) => fail(event.data),
          },
        });

        readyTimeout = window.setTimeout(
          () => fail("player_ready_timeout"),
          PLAYER_READY_TIMEOUT_MS,
        );
      } catch (error) {
        fail(error instanceof Error ? error.message : "youtube_api_error");
      }
    };

    void initialize();

    return () => {
      disposed = true;
      if (readyTimeout !== null) window.clearTimeout(readyTimeout);
      try {
        playerRef.current?.destroy();
      } catch {
        // The YouTube iframe may already have removed itself.
      }
      playerRef.current = null;
    };
  }, [activated, attempt, emit, videoId]);

  const retry = () => {
    emit({ action: "retry", errorCode });
    setStatus("loading");
    setErrorCode(undefined);
    setAttempt((value) => value + 1);
  };

  if (!videoId) {
    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-card p-6 text-center",
          className,
        )}
      >
        <p className="font-bold text-foreground">Não foi possível identificar o vídeo desta aula.</p>
        <p className="text-sm text-muted-foreground">Avise o suporte para corrigirmos o conteúdo.</p>
      </div>
    );
  }

  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-xl border border-accent/20 bg-black shadow-[0_0_48px_-12px_hsl(var(--primary)/0.3)]",
        className,
      )}
      data-testid="youtube-player"
    >
      {status === "idle" && (
        <button
          type="button"
          className="group absolute inset-0 z-10 flex min-h-44 w-full touch-manipulation items-center justify-center overflow-hidden text-white"
          onClick={() => {
            setActivated(true);
            setStatus("loading");
            emit({ action: "activate" });
          }}
          aria-label={`Assistir aula: ${title}`}
        >
          <img
            src={thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-300 group-active:scale-[0.99]"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <span className="absolute inset-0 bg-black/25" />
          <span className="relative flex min-h-14 items-center gap-3 rounded-lg bg-primary px-5 py-3 text-sm font-bold shadow-xl sm:text-base">
            <Play className="h-6 w-6 fill-current" />
            Assistir aula
          </span>
        </button>
      )}

      <div
        key={`${videoId}-${attempt}`}
        className="absolute inset-0 h-full w-full [&>iframe]:h-full [&>iframe]:w-full"
      >
        <div ref={mountRef} className="h-full w-full" />
      </div>

      {status === "loading" && (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center text-white"
          role="status"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-semibold">Carregando sua aula...</p>
          <p className="text-xs text-white/70">Isso pode levar alguns segundos em conexões móveis.</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-card px-5 text-center">
          <p className="font-bold text-foreground">Não foi possível carregar esta aula.</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {getPlayerErrorMessage(errorCode)}
          </p>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
            <Button className="min-h-11 flex-1" onClick={retry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-11 flex-1"
              onClick={() => emit({ action: "fallback", errorCode })}
            >
              <a href={watchUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir vídeo
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
