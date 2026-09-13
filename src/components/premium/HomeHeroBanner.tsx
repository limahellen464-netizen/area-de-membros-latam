import type { CSSProperties } from "react";
import type { HeroBannerConfig } from "@/lib/siteSettings";

interface HomeHeroBannerProps {
  config: HeroBannerConfig;
  firstName: string;
  subtitle: string;
}

const POSITION_TO_OBJECT: Record<HeroBannerConfig["position"], string> = {
  center: "center",
  top: "top",
  right: "right center",
  left: "left center",
  "center-right": "70% center",
};

const OVERLAY_GRADIENTS: Record<HeroBannerConfig["overlay"], string> = {
  light:
    "linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.68) 45%, rgba(255,255,255,0.16) 100%)",
  medium:
    "linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.74) 45%, rgba(255,255,255,0.24) 100%)",
  strong:
    "linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.84) 45%, rgba(255,255,255,0.34) 100%)",
};

export const HomeHeroBanner = ({ config, firstName, subtitle }: HomeHeroBannerProps) => {
  const objectPosition = POSITION_TO_OBJECT[config.position] || "center";
  const overlayGradient = OVERLAY_GRADIENTS[config.overlay] || OVERLAY_GRADIENTS.strong;
  const labelText = config.label?.trim() || "Bienvenido de vuelta";

  const heroStyle = {
    "--hero-h-desktop": `${config.height_desktop}px`,
    "--hero-h-mobile": `${config.height_mobile}px`,
    height: "var(--hero-h-mobile)",
  } as CSSProperties;

  return (
    <section
      aria-label="Hero del área de miembros"
      className="relative -mt-px overflow-hidden border-b border-primary/10 bg-background"
      style={heroStyle}
    >
      <img
        src={config.image_url}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition }}
        loading="eager"
        fetchPriority="high"
      />

      <div aria-hidden className="absolute inset-0" style={{ background: overlayGradient }} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent"
      />

      <div className="relative mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6">
        <div className="max-w-xl">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary sm:mb-3">
            {labelText}
          </p>
          <h2 className="font-serif text-[28px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            Hola, {firstName}.
          </h2>
          {subtitle && (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:mt-4 sm:text-base">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          [aria-label="Hero del área de miembros"] {
            height: var(--hero-h-desktop) !important;
          }
        }
      `}</style>
    </section>
  );
};
