import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Gauge, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  src: string;
  title?: string;
  coverImage?: string | null;
  /** PR ADMIN 6I: quando true, usa object-contain pra preservar proporção
      da imagem custom uploaded pelo admin (sem cortar). */
  coverIsCustom?: boolean;
  onProgress?: (currentSec: number, durationSec: number) => void;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const AudioPlayer = ({ src, title, coverImage, coverIsCustom, onProgress, className }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setCurrent(audio.currentTime);
      onProgress?.(audio.currentTime, audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
    };
  }, [onProgress]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = value[0] ?? 0;
    audio.currentTime = next;
    setCurrent(next);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-surface-elevated p-6 shadow-[0_0_48px_-12px_hsl(var(--primary)/0.25)]",
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Cover */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-accent/20 bg-muted sm:h-32 sm:w-32">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title || "Audiobook"}
              className={cn(
                "h-full w-full",
                // PR ADMIN 6I: custom cover preserva proporção; fallback hardcoded
                // (16:9 desenhado pra preencher quadrado) usa object-cover.
                coverIsCustom ? "object-contain bg-stone-900" : "object-cover",
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/30 to-accent/20">
              <Play className="h-10 w-10 text-accent" />
            </div>
          )}
          {/* fake waveform overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        {/* Controls */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {title && (
            <p className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">{title}</p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(-15)}
              className="h-9 w-9 text-foreground hover:text-accent"
              aria-label="Retroceder 15 segundos"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={togglePlay}
              className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => skip(15)}
              className="h-9 w-9 text-foreground hover:text-accent"
              aria-label="Avanzar 15 segundos"
            >
              <SkipForward className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-accent"
                  aria-label="Velocidad de reproducción"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  {speed}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[80px]">
                {SPEEDS.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn("justify-center", s === speed && "bg-accent/10 text-accent")}
                  >
                    {s}x
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-accent"
              aria-label="Descargar audiobook"
            >
              <a href={src} download>
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatTime(current)}
            </span>
            <Slider
              value={[current]}
              max={duration || 1}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              aria-label="Posición del audiobook"
            />
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
