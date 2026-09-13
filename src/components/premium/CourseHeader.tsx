import { Button } from "@reconquista/ui/button";
import { ArrowLeft, ChevronRight, Home, PlayCircle } from "lucide-react";
import { cn } from "@reconquista/ui/lib/utils";
import { CircularProgress } from "./ProgressBar";

interface CrumbItem {
  label: string;
  onClick?: () => void;
}

interface CourseHeaderProps {
  /** Breadcrumb path: [{label, onClick?}]. Último item é a posição atual. */
  crumbs: CrumbItem[];
  /** Mostra a barra circular dourada no canto direito. 0-100. */
  progress?: number;
  /** Callback do botão "voltar" (esquerda). */
  onBack: () => void;
  /** Rótulo do botão voltar. Default "Voltar". */
  backLabel?: string;
  /**
   * Quando fornecido, mostra um botão "Início" (vai ao dashboard de
   * produtos). Ignorado se onMainCourse estiver presente.
   */
  onHome?: () => void;
  /**
   * Quando fornecido (aluno dentro de um bônus/produto não-principal),
   * mostra um botão primário "Curso principal" que leva direto ao
   * curso "O Código da Reconquista". Tem prioridade sobre onHome.
   */
  onMainCourse?: () => void;
  className?: string;
}

export const CourseHeader = ({
  crumbs,
  progress,
  onBack,
  backLabel = "Volver",
  onHome,
  onMainCourse,
  className,
}: CourseHeaderProps) => {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-accent/20 bg-background/85 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Button
          variant="ghost"
          onClick={onBack}
          className="h-10 shrink-0 gap-1.5 px-2.5 text-foreground hover:bg-accent/10 hover:text-accent sm:px-3"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-semibold">{backLabel}</span>
        </Button>

        {/* Breadcrumb — escondido no mobile pra dar espaço aos botões rotulados */}
        <nav aria-label="breadcrumb" className="hidden min-w-0 flex-1 sm:block">
          <ol className="flex items-center gap-1 text-xs sm:text-sm">
            {crumbs.map((crumb, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex min-w-0 items-center gap-1">
                  {crumb.onClick && !isLast ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="truncate text-muted-foreground transition-colors hover:text-accent"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "truncate",
                        isLast ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Spacer pro mobile, quando o breadcrumb está escondido */}
        <div className="flex-1 sm:hidden" />

        {onMainCourse ? (
          <Button
            onClick={onMainCourse}
            className="h-10 shrink-0 gap-1.5 bg-primary px-2.5 text-primary-foreground hover:bg-primary/90 sm:px-3"
            aria-label="Ir para o curso principal"
          >
            <PlayCircle className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap text-sm font-semibold">Curso principal</span>
          </Button>
        ) : onHome ? (
          <Button
            variant="outline"
            onClick={onHome}
            className="h-10 shrink-0 gap-1.5 px-2.5 sm:px-3"
            aria-label="Ir para o início"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">Inicio</span>
          </Button>
        ) : null}

        {typeof progress === "number" && (
          <span className="hidden shrink-0 sm:block">
            <CircularProgress value={progress} size={40} strokeWidth={3} accent="gold" />
          </span>
        )}
      </div>
    </header>
  );
};
