import type { MouseEvent } from "react";
import { Button } from "@reconquista/ui/button";
import { ArrowRight, ClipboardCheck, MessageSquareText } from "lucide-react";
import { cn } from "@reconquista/ui/lib/utils";
import { useSiteSettings } from "@/lib/siteSettings";

export type ConsultoriaCalloutVariant = "below" | "sidebar";

interface ConsultoriaCalloutProps {
  /** Resolved copy override (PR ADMIN 6E). Se ausente, usa globais via useSiteSettings. */
  title?: string;
  body?: string;
  cta?: string;
  helperText?: string;
  /**
   * URL do formulário. Tem prioridade quando fornecida. Se vazia, cai em
   * site.consultoria_url do DB e depois no fallback.
   */
  formUrl?: string;
  /** below = card grande abaixo do conteúdo (default); sidebar = mini-card lateral. */
  variant?: ConsultoriaCalloutVariant;
  className?: string;
  onFormClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
}

export const ConsultoriaCallout = ({
  title,
  body,
  cta,
  helperText,
  formUrl,
  variant = "below",
  className,
  onFormClick,
}: ConsultoriaCalloutProps) => {
  const { setting } = useSiteSettings();
  const enabledRaw = setting("site.consultoria_enabled").trim().toLowerCase();
  const globalEnabled = enabledRaw !== "false" && enabledRaw !== "0";

  // Resolved values: prop > global setting
  const url = (formUrl && formUrl.trim()) || setting("site.consultoria_url").trim();
  const finalTitle = title?.trim() || setting("site.consultoria_title");
  const finalBody = body?.trim() || setting("site.consultoria_body");
  const finalCta = cta?.trim() || setting("site.consultoria_cta");
  const finalHelper = helperText?.trim() || setting("site.consultoria_helper_text");

  // Se admin desabilitou globalmente E não tem URL custom OU não há URL → esconde
  if (!url) return null;
  // Se globalEnabled=false e nenhuma copy custom foi passada, esconde
  // (sinaliza que admin desligou o sistema todo).
  if (!globalEnabled && !title && !body && !cta && !formUrl) return null;

  if (variant === "sidebar") {
    // === Sidebar mini-card — compacto, fica abaixo da lista lateral ===
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-accent/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-sm",
          className,
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent/90">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Formulário
          </div>
          <h4 className="text-sm font-bold leading-snug text-foreground">
            {finalTitle}
          </h4>
          {finalBody && (
            <p className="overflow-hidden text-xs leading-relaxed text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]">
              {finalBody}
            </p>
          )}
          <Button
            asChild
            size="sm"
            className="group mt-1 h-10 w-full bg-primary font-bold text-primary-foreground shadow-[0_10px_24px_-16px_hsl(var(--primary)/0.75)] hover:bg-primary/90"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => onFormClick?.(event, url)}
            >
              {finalCta}
              <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  // === Below (default) — card grande premium abaixo do conteúdo ===
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-accent/45 bg-gradient-to-br from-primary/18 via-card to-card p-5 shadow-[0_18px_45px_-32px_rgba(122,30,30,0.95)] sm:p-6",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border before:border-accent/15 before:[mask:linear-gradient(135deg,#000,transparent_72%)]",
        className,
      )}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_34px_-18px_hsl(var(--primary)/0.95)]">
          <MessageSquareText className="h-7 w-7" />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <h3 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
            {finalTitle}
          </h3>

          {finalBody && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {finalBody}
            </p>
          )}

          <Button
            asChild
            size="lg"
            className="group min-h-[56px] w-full bg-primary px-6 text-base font-extrabold text-primary-foreground shadow-[0_18px_40px_-22px_hsl(var(--primary)/0.95)] hover:bg-primary/90 sm:w-auto"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => onFormClick?.(event, url)}
            >
              {finalCta}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
          {finalHelper && (
            <p className="text-xs font-medium leading-relaxed text-muted-foreground/90 sm:text-sm">
              {finalHelper}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
