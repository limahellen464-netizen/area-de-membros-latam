import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

interface VturbPlayerProps {
  /** Raw embed snippet copiado do VTurb (contém <script src="..."> e <vturb-smartplayer id="...">). */
  embedCode: string;
  title: string;
  className?: string;
}

const extractPlayerId = (embedCode: string) => {
  const match = embedCode.match(/<vturb-smartplayer[^>]*\bid=["']([^"']+)["']/i);
  return match?.[1] || null;
};

const extractScriptSrc = (embedCode: string) => {
  const match = embedCode.match(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/i);
  return match?.[1] || null;
};

const loadedScripts = new Set<string>();

const loadVturbScript = (src: string) => {
  if (loadedScripts.has(src)) return;
  loadedScripts.add(src);
  const script = document.createElement("script");
  script.src = src;
  script.async = true;
  document.head.appendChild(script);
};

export const VturbPlayer = ({ embedCode, title, className }: VturbPlayerProps) => {
  const playerId = useMemo(() => extractPlayerId(embedCode), [embedCode]);
  const scriptSrc = useMemo(() => extractScriptSrc(embedCode), [embedCode]);

  useEffect(() => {
    if (scriptSrc) loadVturbScript(scriptSrc);
  }, [scriptSrc]);

  if (!playerId) {
    return (
      <div
        className={cn(
          "flex aspect-video flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-card p-6 text-center",
          className,
        )}
      >
        <p className="font-bold text-foreground">Não foi possível carregar o player desta aula.</p>
        <p className="text-sm text-muted-foreground">Avise o suporte para corrigirmos o conteúdo.</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-xl border border-accent/20 bg-black shadow-[0_0_48px_-12px_hsl(var(--primary)/0.3)]",
        className,
      )}
      data-testid="vturb-player"
    >
      <vturb-smartplayer
        id={playerId}
        style={{ display: "block", margin: "0 auto", width: "100%", height: "100%" }}
        aria-label={`Assistir aula: ${title}`}
      />
    </div>
  );
};
