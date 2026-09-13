import { useNavigate } from "react-router-dom";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ArrowUpRight,
  CheckCircle,
  Clock3,
  Package,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LockedOverlay } from "./LockedOverlay";
import type { Purchase, PremiumCardVariant } from "./types";
import { pickContrastText, resolveUpsellCta } from "@/lib/upsellCta";

const hasVisibleModuleContent = (module: Purchase["modules"][number]) =>
  module.is_published !== false &&
  (module.media_status === "in_production" ||
    module.media_status === "production" ||
    (module.has_video && !!module.video_url) ||
    (module.has_audio && !!module.audio_url) ||
    (module.has_pdf && !!module.pdf_url));

interface PremiumCardProps {
  purchase: Purchase;
  variant?: PremiumCardVariant;
  /** Quando true, dá destaque visual extra (ex: produto principal do dono). */
  featured?: boolean;
  onProductClick?: (p: Purchase) => void;
  onCheckoutClick?: (p: Purchase) => void;
  onOpenPdf?: (url: string, name: string) => void;
  className?: string;
}

export const PremiumCard = ({
  purchase,
  variant,
  featured = false,
  onProductClick,
  onCheckoutClick,
  onOpenPdf,
  className,
}: PremiumCardProps) => {
  const navigate = useNavigate();

  const hasRealCheckoutUrl =
    typeof purchase.checkout_url === "string" &&
    purchase.checkout_url.trim().length > 0 &&
    !purchase.checkout_url.startsWith("pending");

  const resolvedVariant: PremiumCardVariant =
    variant ?? (purchase.purchased ? "owned" : hasRealCheckoutUrl ? "locked" : "soon");

  const hasModuleContent =
    purchase.modules?.length > 0 &&
    purchase.modules.some(hasVisibleModuleContent);

  const completedCount =
    purchase.modules?.filter((m) => hasVisibleModuleContent(m) && m.completed).length ?? 0;
  const publishedModules =
    purchase.modules?.filter(hasVisibleModuleContent) ?? [];
  const totalCount = publishedModules.length || purchase.modules?.length || 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Card inteiro é a área de clique. Comportamento varia por variant.
  const isInteractive =
    resolvedVariant === "owned" ||
    (resolvedVariant === "locked" && hasRealCheckoutUrl) ||
    (resolvedVariant === "upsell" && hasRealCheckoutUrl);

  // PR ADMIN 6H: CTA de compra customizável por produto. Só faz sentido
  // pra produtos não-comprados com checkout real (locked/upsell).
  const upsellCta = resolveUpsellCta(purchase.upsell_cta_config);
  const shouldShowCta =
    !purchase.purchased &&
    hasRealCheckoutUrl &&
    upsellCta.enabled &&
    (resolvedVariant === "locked" || resolvedVariant === "upsell");
  const ctaContrastText = pickContrastText(upsellCta.buttonColor);

  const handleCardClick = () => {
    if (resolvedVariant === "owned") {
      onProductClick?.(purchase);
      // Owned com módulos → tela interna do produto
      if (hasModuleContent) {
        navigate(`/producto/${purchase.id}`, {
          state: {
            product_settings_id: purchase.product_settings_id,
            product_name: purchase.product_name,
            product_description: purchase.product_description,
            product_image_url: purchase.product_image_url,
            modules: purchase.modules,
            sections: purchase.sections,
            consultoria_config: purchase.consultoria_config,
          },
        });
        return;
      }
      // Owned legacy PDF (sem módulos) → abre PDF direto
      if (purchase.pdf_url) {
        onOpenPdf?.(purchase.pdf_url, purchase.product_name);
        return;
      }
      return;
    }

    // Locked / Upsell com URL → abre checkout em nova aba
    if (isInteractive && hasRealCheckoutUrl && purchase.checkout_url) {
      onCheckoutClick?.(purchase);
      window.open(purchase.checkout_url, "_blank", "noopener,noreferrer");
    }
    // Soon ou sem URL: no-op
  };

  const Tag: "button" | "div" = isInteractive ? "button" : "div";

  return (
    <Tag
      {...(isInteractive
        ? { type: "button" as const, onClick: handleCardClick }
        : {})}
      aria-disabled={!isInteractive}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-lg)] text-left text-foreground transition-all duration-300",
        "bg-card",
        "border border-primary/15 ring-1 ring-primary/5",
        "shadow-[0_16px_44px_-34px_rgba(190,30,45,0.7)]",
        isInteractive && "cursor-pointer",
        !isInteractive && "cursor-default",
        resolvedVariant === "owned" &&
          "hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_58px_-36px_rgba(190,30,45,0.9)]",
        resolvedVariant !== "owned" &&
          isInteractive &&
          "hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_48px_-34px_rgba(190,30,45,0.8)]",
        featured &&
          "ring-2 ring-primary/35 shadow-[0_24px_60px_-34px_hsl(var(--primary)/0.55)]",
        className,
      )}
    >
      {/* IMAGE */}
      <div className="relative">
        {purchase.product_image_url ? (
          <AspectRatio ratio={16 / 9} className="bg-muted">
            <img
              src={purchase.product_image_url}
              alt={purchase.product_name}
              className={cn(
                "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]",
                resolvedVariant !== "owned" && "brightness-[0.85]",
              )}
              loading="lazy"
            />
            {/* Bottom gradient fade integrando image ao champagne body */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"
            />
          </AspectRatio>
        ) : (
          <AspectRatio ratio={16 / 9} className="flex items-center justify-center bg-muted">
            <Package className="h-12 w-12 text-muted-foreground" />
          </AspectRatio>
        )}

        {/* Status pill */}
        <div className="absolute right-3 top-3 z-10">
          {resolvedVariant === "owned" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600/25 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 shadow-sm backdrop-blur-md">
              <CheckCircle className="h-3 w-3" />
              Disponible
            </span>
          )}
          {resolvedVariant === "upsell" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary shadow-sm backdrop-blur-md">
              Premium
            </span>
          )}
          {resolvedVariant === "soon" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80 shadow-sm backdrop-blur-md">
              <Clock3 className="h-3 w-3" />
              Próximamente
            </span>
          )}
          {resolvedVariant === "locked" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/80 shadow-sm backdrop-blur-md">
              Complementario
            </span>
          )}
        </div>

        {/* Indicador discreto de "abre externamente" pra locked/upsell */}
        {isInteractive && (resolvedVariant === "locked" || resolvedVariant === "upsell") && (
          <div className="absolute right-3 bottom-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-primary opacity-0 shadow-md transition-opacity duration-300 group-hover:opacity-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        )}

        {/* Locked overlay — sobre imagem apenas (visual only, sem botão interno) */}
        {resolvedVariant !== "owned" && (
          <LockedOverlay
            productName={purchase.product_name}
            ctaUrl={hasRealCheckoutUrl ? purchase.checkout_url : null}
          />
        )}
      </div>

      {/* BODY */}
      <div className="relative flex flex-1 flex-col gap-3 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {/* Thin gold divider acima do título */}
        <div aria-hidden className="absolute inset-x-0 top-0 mx-5 h-px bg-primary/10 sm:mx-6" />

        <div className="space-y-1.5 pt-1">
          <h3 className="font-serif text-lg font-bold leading-tight text-foreground sm:text-xl">
            {purchase.product_name}
          </h3>
        </div>

        {purchase.product_description && resolvedVariant !== "owned" && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {purchase.product_description}
          </p>
        )}

        {/* PR ADMIN 6H — CTA de compra (mensagem + botão custom por produto) */}
        {shouldShowCta && (
          <div className="mt-1 space-y-2 rounded-md border border-primary/15 bg-muted px-3 py-2.5">
            {upsellCta.message && (
              <p className="text-xs leading-snug text-muted-foreground">
                {upsellCta.message}
              </p>
            )}
            <div
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm transition-transform group-hover:scale-[1.02]"
              style={{
                backgroundColor: upsellCta.buttonColor,
                color: ctaContrastText,
              }}
              aria-hidden
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {upsellCta.buttonLabel}
            </div>
          </div>
        )}

        {resolvedVariant === "owned" && totalCount > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-muted-foreground">
                {completedCount}/{totalCount} clases concluidas
              </span>
              {purchase.purchase_date && (
                <span className="text-muted-foreground">
                  Desde {new Date(purchase.purchase_date).toLocaleDateString("es")}
                </span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {resolvedVariant === "owned" && (
          <div className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform group-hover:scale-[1.01]">
            Acceder al contenido
            <ArrowUpRight className="h-4 w-4" />
          </div>
        )}
      </div>
    </Tag>
  );
};
