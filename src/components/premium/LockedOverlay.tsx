import { Lock } from "lucide-react";
import { cn } from "@reconquista/ui/lib/utils";

interface LockedOverlayProps {
  productName: string;
  /**
   * Mantido na API por compatibilidade com chamadas antigas.
   * Após PR de polish final (cards inteiramente clicáveis), o overlay
   * passa a ser puramente visual — o click é tratado pelo card pai.
   */
  ctaUrl?: string | null;
  ctaLabel?: string;
  variant?: "full" | "inline";
  className?: string;
}

export const LockedOverlay = ({
  productName,
  ctaUrl,
  variant = "full",
  className,
}: LockedOverlayProps) => {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Lock className="h-3 w-3 text-primary" />
        <span>Contenido bloqueado</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-gradient-to-b from-white/30 via-white/70 to-white/95 p-5 text-center backdrop-blur-[2px]",
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-white/95 shadow-md backdrop-blur-md">
        <Lock className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="line-clamp-2 max-w-[80%] font-serif text-sm font-semibold text-foreground sm:text-base">
        {productName}
      </p>
      {!ctaUrl && (
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">
          Contenido en preparación
        </p>
      )}
    </div>
  );
};
