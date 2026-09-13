import { Quote } from "lucide-react";
import { DAILY_QUOTES, getQuoteOfTheDay } from "@/lib/dailyQuote";
import { parseQuotesJson, useSiteSettings } from "@/lib/siteSettings";

/**
 * Princípio Estratégico — bloco horizontal claro.
 * Pensado pra ser uma assinatura discreta da identidade da mentoria,
 * não um banner motivacional ruidoso. Mantém coesão com o tema claro + vermelho.
 *
 * PR ADMIN 5: label e quotes vêm de site settings. Fallback ao dailyQuote.ts
 * hardcoded quando site.quotes_json estiver vazio ou inválido.
 */
const MotivationalQuoteBanner = () => {
  const { setting } = useSiteSettings();
  const label = setting("site.quote_label");
  const customQuotes = parseQuotesJson(setting("site.quotes_json"), DAILY_QUOTES);
  const quote = getQuoteOfTheDay(undefined, customQuotes);

  return (
    <div
      className={[
        "relative flex items-center gap-4 overflow-hidden rounded-lg",
        "bg-card/90 backdrop-blur-xl",
        "border border-primary/15 ring-1 ring-primary/10",
        "px-5 py-4 sm:px-6 sm:py-5",
        "shadow-[0_18px_44px_-34px_hsl(var(--primary)/0.45)]",
      ].join(" ")}
    >
      {/* Ícone discreto */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
        <Quote className="h-3.5 w-3.5 text-primary" strokeWidth={2.25} />
      </div>

      <blockquote className="flex-1">
        <p className="font-serif text-sm italic leading-snug text-foreground sm:text-base">
          {quote}
        </p>
      </blockquote>

      <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/70 sm:block">
        {label}
      </span>
    </div>
  );
};

export default MotivationalQuoteBanner;
