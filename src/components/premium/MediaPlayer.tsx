import { FileText, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AudioPlayer } from "./AudioPlayer";
import { YouTubePlayer, type VideoPlayerTelemetryEvent } from "./YouTubePlayer";
import type { PurchaseModule } from "./types";

interface MediaPlayerProps {
  module: PurchaseModule;
  coverImage?: string | null;
  /** PR ADMIN 6I: quando true, capa veio do admin (cover_image_url custom)
      → renderiza com object-contain pra preservar proporção; quando false,
      usa MODULE_IMAGES hardcoded ou product_image_url (object-cover, ok cortar). */
  coverIsCustom?: boolean;
  className?: string;
  onVideoTelemetry?: (event: VideoPlayerTelemetryEvent) => void;
}

export const MediaPlayer = ({
  module,
  coverImage,
  coverIsCustom,
  className,
  onVideoTelemetry,
}: MediaPlayerProps) => {
  if (module.is_published === false) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-xl border border-accent/30 bg-card p-12 text-center",
          className,
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
          <Clock3 className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Contenido en producción</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta clase está siendo finalizada y estará disponible pronto.
          </p>
        </div>
      </div>
    );
  }

  if (module.has_video && module.video_url) {
    return (
      <YouTubePlayer
        url={module.video_url}
        title={module.module_name}
        className={className}
        onTelemetry={onVideoTelemetry}
      />
    );
  }

  if (module.has_audio && module.audio_url) {
    return <AudioPlayer src={module.audio_url} title={module.module_name} coverImage={coverImage} coverIsCustom={coverIsCustom} className={className} />;
  }

  if (module.has_pdf) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-12 text-center",
          className,
        )}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Material en PDF</h3>
          <p className="mt-1 text-sm text-muted-foreground">Haz clic en "Abrir PDF" abajo para empezar.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-sm text-muted-foreground",
        className,
      )}
    >
      Ningún contenido disponible en esta clase.
    </div>
  );
};
