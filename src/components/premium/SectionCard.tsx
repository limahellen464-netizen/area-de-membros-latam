import {
  ArrowUpRight,
  Book,
  Brain,
  Clock,
  Clock3,
  FileText,
  Heart,
  Lock,
  Play,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@reconquista/ui/lib/utils";
import type { CourseSection } from "@/config/courseSections";

// PR ADMIN 6B — Lucide icon map (allowlist sincronizada com admin-api)
const ICON_MAP: Record<string, LucideIcon> = {
  brain: Brain,
  heart: Heart,
  lock: Lock,
  book: Book,
  clock: Clock,
  target: Target,
  file: FileText,
  play: Play,
};

interface SectionCardProps {
  section: CourseSection;
  /** Quantidade de aulas reais concluídas pelo aluno nesta section. */
  completedCount: number;
  /** Total de aulas reais (não conta placeholders). */
  totalRealLessons: number;
  onClick: (sectionKey: string) => void;
  className?: string;
}

const ROMAN_NUMERALS: Record<string, string> = {
  "01": "I",
  "02": "II",
  "03": "III",
  "04": "IV",
  "05": "V",
  "06": "VI",
  "07": "VII",
  "08": "VIII",
  "09": "IX",
  "10": "X",
  "11": "XI",
  "12": "XII",
};

export const SectionCard = ({
  section,
  completedCount,
  totalRealLessons,
  onClick,
  className,
}: SectionCardProps) => {
  const isProduction = section.status === "in_production";
  const progress =
    totalRealLessons > 0 ? Math.round((completedCount / totalRealLessons) * 100) : 0;
  return (
    <button
      type="button"
      onClick={() => !isProduction && onClick(section.key)}
      aria-disabled={isProduction}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] text-left text-foreground transition-all duration-300",
        "bg-card",
        "border border-primary/15 ring-1 ring-primary/5",
        "shadow-[0_16px_44px_-34px_rgba(190,30,45,0.7)]",
        !isProduction &&
          "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_58px_-36px_rgba(190,30,45,0.9)] cursor-pointer",
        isProduction && "cursor-not-allowed",
        className,
      )}
    >
      {/* THUMBNAIL editorial — PR ADMIN 6B: usa image_url do DB quando presente */}
      <div
        aria-hidden
        className={cn(
          "relative flex items-center justify-center overflow-hidden",
          "aspect-[16/9] bg-[linear-gradient(135deg,#fff5f5_0%,#f7e6e6_55%,#ffffff_100%)]",
        )}
      >
        {section.image_url ? (
          <>
            {/* Imagem custom do admin (capa) */}
            <img
              src={section.image_url}
              alt={section.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {/* Overlay sutil pra manter contraste do eyebrow + status pills */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/0 to-black/25"
            />
          </>
        ) : (
          /* Fallback original: numeral romano gigante */
          <span
            className={cn(
              "select-none font-serif text-[120px] leading-none tracking-tight text-primary/10",
              "transition-transform duration-500 group-hover:scale-110",
            )}
          >
            {ROMAN_NUMERALS[section.number] ?? section.number}
          </span>
        )}

        {/* PR ADMIN 6B: ícone Lucide opcional (se admin escolheu), pequeno no canto inferior esquerdo */}
        {section.icon_key && ICON_MAP[section.icon_key] && (
          <div
            className="absolute bottom-3 left-3 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-white/90 backdrop-blur-sm"
            style={
              section.accent_color
                ? { borderColor: `${section.accent_color}66` }
                : undefined
            }
          >
            {(() => {
              const Icon = ICON_MAP[section.icon_key]!;
              return (
                <Icon
                  className="h-3.5 w-3.5 text-primary"
                  style={
                    section.accent_color ? { color: section.accent_color } : undefined
                  }
                />
              );
            })()}
          </div>
        )}

        {/* Eyebrow MÓDULO XX no canto superior esquerdo */}
        <div className="absolute left-4 top-3 z-10">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.22em]",
              section.image_url
                ? "rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-primary shadow-sm backdrop-blur-md"
                : "text-primary",
            )}
          >
            Módulo {section.number}
          </span>
        </div>

        {/* Status pill canto superior direito */}
        <div className="absolute right-3 top-3 z-10">
          {section.status === "available" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 shadow-sm backdrop-blur-md">
              Disponible
            </span>
          )}
          {section.status === "partial" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur-md">
              En progreso
            </span>
          )}
          {section.status === "in_production" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80 shadow-sm backdrop-blur-md">
              <Clock3 className="h-2.5 w-2.5" />
              En producción
            </span>
          )}
        </div>

        {/* Pequeno cadeado pra "in_production" */}
        {isProduction && (
          <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-white/95 shadow-md backdrop-blur-sm">
            <Lock className="h-3 w-3 text-primary" />
          </div>
        )}

        {/* Indicador discreto de "abre" pra módulos interativos */}
        {!isProduction && (
          <div className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-primary opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Fade pro champagne abaixo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
        />
      </div>

      {/* BODY */}
      <div className="relative flex flex-1 flex-col gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        <div className="space-y-1.5">
          <h3 className="font-serif text-lg font-bold leading-tight text-foreground sm:text-xl">
            {section.title}
          </h3>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {section.subtitle}
          </p>
        </div>

        {/* Métricas: aulas/placeholders/progress */}
        {!isProduction && totalRealLessons > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">
                {completedCount}/{totalRealLessons} clases concluidas
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              {section.accent_color ? (
                /* PR ADMIN 6B: progress com accent_color custom (sólido) */
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: section.accent_color,
                  }}
                />
              ) : (
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
          </div>
        )}

        {/* Mensagem de "em produção" (sem botão; card inteiro é o controle) */}
        {isProduction && (
          <div className="mt-auto pt-3">
            <div className="rounded-md border border-primary/15 bg-muted px-3 py-2.5 text-center">
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                Este módulo será liberado pronto.
              </p>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};
