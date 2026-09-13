import { Button } from "@/components/ui/button";
import { CheckCircle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContinueWatchingProps {
  productName: string;
  moduleName: string;
  sectionTitle?: string;
  lessonLabel?: string;
  ctaLabel?: string;
  isComplete?: boolean;
  progress: number;
  productImage?: string | null;
  onContinue: () => void;
  className?: string;
}

export const ContinueWatching = ({
  productName,
  moduleName,
  sectionTitle,
  lessonLabel,
  ctaLabel = "Continuar ahora",
  isComplete = false,
  progress,
  productImage,
  onContinue,
  className,
}: ContinueWatchingProps) => {
  const safeProgress = Math.max(0, Math.min(100, progress));
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[var(--radius-lg)]",
        "bg-card",
        "border border-primary/25 ring-1 ring-primary/10",
        "shadow-[0_14px_38px_-28px_rgba(190,30,45,0.65)]",
        "transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_20px_46px_-30px_hsl(var(--primary)/0.45)]",
        className,
      )}
    >
      <div className="flex items-center gap-4 p-4 sm:p-5">
        {productImage && (
          <div className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-primary/15 sm:block">
            <img
              src={productImage}
              alt={productName}
              className="h-full w-full object-cover opacity-90"
              loading="lazy"
            />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
              {isComplete ? "Curso concluido" : "Continuar viendo"}
            </p>
            <p className="truncate text-sm font-bold text-foreground sm:text-base">
              {productName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {sectionTitle ? `${sectionTitle} ` : ""}
              {lessonLabel ? `${lessonLabel}: ` : ""}
              {moduleName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${safeProgress}%` }}
              />
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              {Math.round(safeProgress)}%
            </span>
          </div>
        </div>
        <Button
          size="lg"
          onClick={onContinue}
          className="hidden shrink-0 bg-primary px-5 text-primary-foreground shadow-[0_12px_28px_-20px_rgba(190,30,45,0.75)] hover:bg-primary/90 sm:inline-flex"
          aria-label="Continuar de onde parou"
        >
          {isComplete ? (
            <CheckCircle className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4 fill-current" />
          )}
          {ctaLabel}
        </Button>
      </div>
      <div className="px-4 pb-4 sm:hidden">
        <Button
          size="lg"
          onClick={onContinue}
          className="w-full bg-primary text-primary-foreground shadow-[0_12px_28px_-20px_rgba(190,30,45,0.75)] hover:bg-primary/90"
        >
          {isComplete ? (
            <CheckCircle className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4 fill-current" />
          )}
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
};
