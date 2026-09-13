import { Check, FileText, Lock, Music, Play, Clock3 } from "lucide-react";
import { cn } from "@reconquista/ui/lib/utils";
import type { ModuleState, PurchaseModule } from "./types";

interface ModuleListItemProps {
  module: PurchaseModule;
  index: number;
  state: ModuleState;
  onSelect?: (moduleId: string) => void;
  className?: string;
}

const stateStyles: Record<ModuleState, string> = {
  completed:
    "border-success/30 bg-card/60 hover:bg-card/80 cursor-pointer",
  current:
    "border-primary bg-primary/10 shadow-[0_0_24px_-8px_hsl(var(--accent)/0.4)] cursor-pointer",
  next: "border-border bg-card hover:bg-card/80 cursor-pointer",
  locked:
    "border-border/50 bg-card/30 opacity-60 cursor-not-allowed",
  soon:
    "border-accent/30 bg-card/40 cursor-not-allowed",
};

export const ModuleListItem = ({
  module,
  index,
  state,
  onSelect,
  className,
}: ModuleListItemProps) => {
  const interactive = state === "completed" || state === "current" || state === "next";
  const handleClick = () => {
    if (interactive && onSelect) onSelect(module.id);
  };

  const contentIcons: { icon: typeof Play; label: string }[] = [];
  if (module.has_video) contentIcons.push({ icon: Play, label: "Video" });
  if (module.has_audio) contentIcons.push({ icon: Music, label: "Audiobook" });
  if (module.has_pdf) contentIcons.push({ icon: FileText, label: "PDF" });

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!interactive}
      aria-current={state === "current"}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all",
        stateStyles[state],
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md font-bold tabular-nums",
          state === "completed"
            ? "bg-success/15 text-success"
            : state === "current"
              ? "bg-primary text-primary-foreground"
              : state === "soon"
                ? "bg-accent/15 text-accent"
                : state === "locked"
                  ? "bg-muted text-muted-foreground"
                  : "bg-accent/10 text-accent",
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
          <span className="text-sm">{String(index + 1).padStart(2, "0")}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            state === "completed" ? "text-muted-foreground line-through decoration-success/40" : "text-foreground",
          )}
        >
          {module.module_name}
        </p>
        {state === "soon" ? (
          <p className="mt-0.5 text-[11px] text-accent">En preparación</p>
        ) : state === "locked" ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Concluye la clase anterior</p>
        ) : contentIcons.length > 0 ? (
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            {contentIcons.map(({ icon: Icon, label }) => (
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
