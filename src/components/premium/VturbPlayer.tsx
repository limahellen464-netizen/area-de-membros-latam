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

/**
 * Bloco completo <vturb-smartplayer ...>...</vturb-smartplayer>, incluindo
 * a <div class="vturb-player-placeholder"> interna que o VTurb usa pra
 * reservar o box (aspect-ratio via padding-top) antes do player montar.
 * Reconstruir só a tag sem esse filho deixava o player sem altura própria
 * e sem o alvo que o script usa pra injetar o vídeo.
 */
const extractPlayerHtml = (embedCode: string) => {
  const match = embedCode.match(/<vturb-smartplayer[\s\S]*?<\/vturb-smartplayer>/i);
  return match?.[0] || null;
};

/**
 * O snippet real do VTurb não usa <script src="...">: ele injeta um
 * <script> inline que cria a tag via JS (`s.src = "https://...player.js"`).
 * A extração antiga só procurava um atributo src literal e por isso nunca
 * carregava o loader do player — o vídeo simplesmente nunca tocava.
 */
const extractScriptSrc = (embedCode: string) => {
  const attrMatch = embedCode.match(/<script[^>]*\bsrc=["']([^"']+)["']/i);
  if (attrMatch) return attrMatch[1];
  const inlineMatch = embedCode.match(/\.src\s*=\s*["']([^"']+)["']/i);
  return inlineMatch?.[1] || null;
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
  const playerHtml = useMemo(() => extractPlayerHtml(embedCode), [embedCode]);
  const scriptSrc = useMemo(() => extractScriptSrc(embedCode), [embedCode]);

  useEffect(() => {
    if (scriptSrc) loadVturbScript(scriptSrc);
  }, [scriptSrc]);

  if (!playerId || !playerHtml) {
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
        "relative w-full max-w-full overflow-hidden rounded-xl border border-accent/20 bg-black shadow-[0_0_48px_-12px_hsl(var(--primary)/0.3)]",
        className,
      )}
      data-testid="vturb-player"
      aria-label={`Assistir aula: ${title}`}
      // O placeholder interno do VTurb já reserva o aspect-ratio (16:9) via
      // padding-top — não forçamos aspect-video aqui pra não duplicar/
      // conflitar essa reserva de espaço.
      dangerouslySetInnerHTML={{ __html: playerHtml }}
    />
  );
};
