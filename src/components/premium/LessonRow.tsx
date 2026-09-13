import { Check, Clock3, FileText, Lock, Music, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@reconquista/ui/lib/utils";
import type { PurchaseModule } from "./types";
import type { PlaceholderLesson } from "@/config/courseSections";

type LessonState = "completed" | "current" | "next" | "locked" | "soon";

interface LessonRowProps {
  /** Index 1-based usado pra label "Aula 01". */
  index: number;
  /** Aula real (vinda do DB) OU placeholder (vindo do config). */
  module?: PurchaseModule;
  placeholder?: PlaceholderLesson;
  state: LessonState;
  onSelect?: (moduleId: string) => void;
  onLockedSelect?: (moduleId: string) => void;
  className?: string;
}

const stateStyles: Record<LessonState, string> = {
  completed:
    "border-emerald-700/25 bg-white hover:bg-muted/35 cursor-pointer",
  current:
    "border-primary/55 bg-white shadow-[0_0_24px_-10px_rgba(190,30,45,0.45)] cursor-pointer",
  next: "border-primary/20 bg-white hover:bg-muted/40 cursor-pointer",
  locked: "border-border bg-muted/45 cursor-not-allowed",
  soon: "border-primary/20 bg-muted/55 cursor-not-allowed",
};

export const LessonRow = ({
  index,
  module,
  placeholder,
  state,
  onSelect,
  onLockedSelect,
  className,
}: LessonRowProps) => {
  const interactive =
    !!module && (state === "completed" || state === "current" || state === "next");

  const title = module?.module_name ?? placeholder?.title ?? "Clase";
  const kindBadges: { icon: typeof Play; label: string }[] = [];

  if (module) {
    if (module.has_video) kindBadges.push({ icon: Play, label: "Video" });
    if (module.has_audio) kindBadges.push({ icon: Music, label: "Audio" });
    if (module.has_pdf) kindBadges.push({ icon: FileText, label: "PDF" });
  } else if (placeholder) {
    if (placeholder.kind === "video") kindBadges.push({ icon: Play, label: "Video" });
    if (placeholder.kind === "audio") kindBadges.push({ icon: Music, label: "Audio" });
    if (placeholder.kind === "pdf") kindBadges.push({ icon: FileText, label: "PDF" });
  }

  return (
    <button
      type="button"
      onClick={() => {
        // Placeholder (aula futura, sem module): em vez de toque mudo, dá
        // retorno claro pro aluno leigo de que a aula ainda não abriu.
        if (!module) {
          if (state === "soon") {
            toast.info("Esta clase todavía está siendo preparada y será liberada pronto.");
          }
          return;
        }
        if (interactive && onSelect) {
          onSelect(module.id);
          return;
        }
        if (state === "locked" && onLockedSelect) onLockedSelect(module.id);
      }}
      aria-disabled={!interactive}
      aria-current={state === "current"}
      className={cn(
        "flex w-full touch-manipulation items-start gap-3 rounded-lg border px-3 py-3 text-left text-foreground transition-all active:scale-[0.99] sm:gap-4 sm:px-4",
        stateStyles[state],
        className,
      )}
    >
      {/* Number/Status indicator */}
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-bold tabular-nums",
          state === "completed"
            ? "bg-emerald-700/15 text-emerald-800"
            : state === "current"
              ? "bg-primary text-primary-foreground"
              : state === "soon"
                ? "bg-primary/10 text-primary"
                : state === "locked"
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary",
        )}
      >
        {state === "completed" ? (
          <Check className="h-5 w-5" />
        ) : state === "current" ? (
          <Play className="h-4 w-4 fill-current" />
        ) : state === "locked" ? (
          <Lock className="h-4 w-4" />
        ) : state === "soon" ? (
          <Clock3 className="h-4 w-4" />
        ) : (
          <span className="text-sm">{String(index).padStart(2, "0")}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Clase {String(index).padStart(2, "0")}
        </p>
        <p
          className={cn(
            "mt-0.5 text-sm font-semibold leading-snug sm:text-[15px]",
            // Título sempre legível, independente do state — só varia a saturação.
            // "soon"/"locked" ficam esmaecidos pra não parecerem aula liberada.
            state === "locked" || state === "soon" ? "text-muted-foreground" : "text-foreground",
            "line-clamp-2",
          )}
        >
          {title}
        </p>
        {state === "soon" ? (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/80">
            <Clock3 className="h-2.5 w-2.5" />
            En producción
          </p>
        ) : state === "locked" ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Concluye la clase anterior</p>
        ) : kindBadges.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
            {kindBadges.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1">
                <Icon className="h-3 w-3" />
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </button>
  );
};
