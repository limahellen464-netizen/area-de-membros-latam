/**
 * site settings — leitura pública via members-api (action=get_site_settings).
 *
 * Retorna mapa { "site.xxx": "value" } a partir de admin_settings com prefix
 * "site.". members-api filtra estrictamente por prefix; admin_password e
 * outras keys sensíveis nunca chegam aqui. Defaults em DEFAULT_SITE_SETTINGS
 * mantêm o front renderizando idêntico ao estado atual se o DB estiver
 * vazio ou o fetch falhar.
 *
 * Cache: 5 minutos via TanStack Query (já configurado no QueryClient root).
 */

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export type SiteSettingsMap = Record<string, string>;

// Allowlist + defaults — toda copy global hoje hardcoded fica aqui como
// fallback. Toda key consumida no front precisa estar nesta lista.
export const DEFAULT_SITE_SETTINGS = {
  // Marca / suporte
  "site.brand_name": "Código da Reconquista",
  "site.brand_subtitle": "Área de Membros",
  "site.support_email": "soporte@recuperaatuexahora.com",

  // Consultoria / análise estratégica (Módulo 1)
  "site.consultoria_enabled": "true",
  "site.consultoria_url": "",
  "site.consultoria_title": "Envie seu caso para uma análise mais direcionada com o Enrico Ferraz",
  "site.consultoria_body":
    "Conte rapidamente o que está acontecendo, há quanto tempo vocês se afastaram e quais erros você já tentou corrigir. Assim nossa equipe consegue entender seu momento e te orientar com mais precisão.",
  "site.consultoria_cta": "Enviar meu caso para análise",
  "site.consultoria_helper_text":
    "Leva poucos minutos e ajuda a identificar uma direção mais clara para o seu caso.",

  // Princípio Estratégico / quotes rotacionais
  "site.quote_label": "Princípio Estratégico",
  "site.quotes_json": "", // JSON.stringify(string[]); vazio = usa fallback de dailyQuote.ts

  // Home — labels / títulos das seções
  "site.home_welcome_subtitle":
    "Você está a um passo de aplicar os métodos certos para reconstruir o vínculo emocional. Continue de onde parou ou explore os próximos conteúdos.",
  "site.home_owned_section_label": "Sua Jornada",
  "site.home_owned_section_title": "Conteúdos liberados",
  "site.home_locked_section_label": "Continue Expandindo",
  "site.home_locked_section_title": "Conteúdos complementares",
  "site.show_in_production_content": "false",

  // PR ADMIN 6B — Tema visual (JSON.stringify de ThemeColors). Vazio = front
  // mantém CSS variables hardcoded em :root (apps/members/src/index.css).
  "site.theme_json": "",

  // PR ADMIN 6D — Banner hero da home (JSON.stringify de HeroBannerConfig).
  // Vazio ou enabled=false → home não renderiza banner (layout atual).
  "site.hero_banner_json": "",
} as const satisfies SiteSettingsMap;

export type SiteSettingKey = keyof typeof DEFAULT_SITE_SETTINGS;

interface SiteSettingsResponse {
  settings: SiteSettingsMap;
  error?: string;
}

async function fetchSiteSettings(): Promise<SiteSettingsMap> {
  const authHeaders = SUPABASE_ANON_KEY
    ? {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }
    : {};
  const res = await fetch(`${SUPABASE_URL}/functions/v1/members-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ action: "get_site_settings" }),
  });
  if (!res.ok) {
    // fallback silencioso pra defaults
    return {};
  }
  const data: SiteSettingsResponse = await res.json().catch(() => ({ settings: {} }));
  return data.settings || {};
}

/**
 * Hook React Query — site settings com fallback aos defaults.
 *
 * Uso:
 *   const { setting, settings } = useSiteSettings();
 *   const title = setting("site.consultoria_title");
 */
export function useSiteSettings() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: fetchSiteSettings,
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 30 * 60 * 1000, // 30min
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const settings: SiteSettingsMap = { ...DEFAULT_SITE_SETTINGS, ...(data || {}) };

  const setting = <K extends SiteSettingKey>(key: K): string => {
    const v = settings[key];
    if (v && v.trim() !== "") return v;
    return DEFAULT_SITE_SETTINGS[key];
  };

  return { settings, setting, isLoading, error };
}

/**
 * Parse seguro do site.quotes_json. Espera JSON.stringify(string[]).
 * Se falhar ou vier vazio, retorna fallback do dailyQuote.ts.
 */
export function parseQuotesJson(raw: string | undefined, fallback: ReadonlyArray<string>): ReadonlyArray<string> {
  if (!raw || raw.trim() === "") return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((s) => typeof s === "string")) {
      const filtered = (parsed as string[]).map((s) => s.trim()).filter(Boolean);
      return filtered.length > 0 ? filtered : fallback;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}

// =========================================================================
// PR ADMIN 6B — Tema visual editável (site.theme_json)
// =========================================================================
//
// O CSS atual da área de membros (apps/members/src/index.css :root) define
// CSS variables HSL em formato "0 0% 6%" — usadas via hsl(var(--xxx)).
// Esse mecanismo permite que o admin edite um JSON de cores hex (#RRGGBB)
// e o front converte cada uma em HSL string e aplica via setProperty no
// documentElement. Sem nenhum hex válido configurado → CSS estático
// permanece (tema aprovado).
//
// Defaults aqui correspondem ao índice.css atual (base clara + vermelho).

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  mutedText: string;
  button: string;
}

export const DEFAULT_THEME_HEX: ThemeColors = {
  background: "#FAFAFA",
  surface: "#F0F0F0",
  card: "#FFFFFF",
  primary: "#BE1E2D",
  secondary: "#FDEDED",
  accent: "#BE1E2D",
  text: "#221B1B",
  mutedText: "#6B5F5F",
  button: "#BE1E2D",
};

/** Mapeamento ThemeColors → CSS variable name (no :root). */
const THEME_TO_CSSVAR: Record<keyof ThemeColors, string> = {
  background: "--background",
  surface: "--muted",
  card: "--card",
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  text: "--foreground",
  mutedText: "--muted-foreground",
  button: "--primary", // alias (mesma var)
};

/** Converte #RRGGBB para "H S% L%" (formato esperado pelo CSS HSL var). */
export function hexToHsl(hex: string): string | null {
  const m = hex.trim().replace("#", "").match(/^([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Parse seguro do site.theme_json. Retorna parcial — só cores válidas.
 * Cor inválida é silenciosamente ignorada (não derruba o tema inteiro).
 * Se JSON inválido ou vazio, retorna {} (front mantém CSS estático).
 */
export function parseThemeJson(raw: string | undefined): Partial<ThemeColors> {
  if (!raw || raw.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const parsedTheme = parsed as Record<string, unknown>;
  const out: Partial<ThemeColors> = {};
  for (const key of Object.keys(THEME_TO_CSSVAR) as (keyof ThemeColors)[]) {
    const v = parsedTheme[key];
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim())) {
      out[key] = v.trim();
    }
  }
  return out;
}

/**
 * Aplica um tema parcial ao documentElement como CSS variables. Cores
 * inválidas (sem hexToHsl) são ignoradas silenciosamente.
 *
 * Retorna função de cleanup que remove os setProperty aplicados.
 */
export function applyThemeToRoot(theme: Partial<ThemeColors>): () => void {
  if (typeof document === "undefined") return () => {};
  const root = document.documentElement;
  const applied: string[] = [];
  for (const [key, hex] of Object.entries(theme)) {
    if (!hex) continue;
    const hsl = hexToHsl(hex);
    if (!hsl) continue;
    const cssVar = THEME_TO_CSSVAR[key as keyof ThemeColors];
    if (!cssVar) continue;
    root.style.setProperty(cssVar, hsl);
    applied.push(cssVar);
  }
  return () => {
    for (const v of applied) root.style.removeProperty(v);
  };
}

/**
 * Hook React — aplica o tema do DB ao :root automaticamente quando muda.
 * Fallback total ao CSS estático em caso de erro/vazio/JSON inválido.
 */
export function useTheme(): { theme: Partial<ThemeColors> } {
  const { setting } = useSiteSettings();
  const raw = setting("site.theme_json");
  const theme = parseThemeJson(raw);
  useEffect(() => {
    const cleanup = applyThemeToRoot(theme);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  return { theme };
}

// =========================================================================
// PR ADMIN 6D — Hero Banner inicial da home (site.hero_banner_json)
// =========================================================================
//
// Banner premium no topo da home da área de membros, configurável via admin.
// Vazio/disabled/inválido → home renderiza layout atual (sem banner).

export type HeroBannerPosition = "center" | "top" | "right" | "left" | "center-right";
export type HeroBannerOverlay = "light" | "medium" | "strong";

export interface HeroBannerConfig {
  enabled: boolean;
  /** URL absoluta (bucket público) OU path relativo (asset estático). */
  image_url: string;
  /** object-position do CSS — onde ancorar a imagem dentro do container. */
  position: HeroBannerPosition;
  /** Intensidade do overlay claro pra legibilidade do texto. */
  overlay: HeroBannerOverlay;
  /** Altura em pixels no desktop. Min 200, max 800. */
  height_desktop: number;
  /** Altura em pixels no mobile. Min 200, max 600. */
  height_mobile: number;
  /** Label opcional acima do hero ("Bem-vindo de volta", etc). Vazio = usa padrão. */
  label: string;
}

export const DEFAULT_HERO_BANNER: HeroBannerConfig = {
  enabled: false,
  image_url: "",
  position: "center-right",
  overlay: "strong",
  height_desktop: 520,
  height_mobile: 320,
  label: "Bem-vindo de volta",
};

const HERO_POSITIONS: HeroBannerPosition[] = [
  "center",
  "top",
  "right",
  "left",
  "center-right",
];

const HERO_OVERLAYS: HeroBannerOverlay[] = ["light", "medium", "strong"];

/**
 * Parse seguro do site.hero_banner_json. Retorna config com defaults
 * preenchidos. Campos inválidos individualmente caem nos defaults.
 * JSON inválido ou enabled=false → retorna {...DEFAULT, enabled:false}.
 */
export function parseHeroBannerJson(raw: string | undefined): HeroBannerConfig {
  const fallback: HeroBannerConfig = { ...DEFAULT_HERO_BANNER };
  if (!raw || raw.trim() === "") return fallback;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
  const parsedHero = parsed as Record<string, unknown>;
  const out: HeroBannerConfig = { ...DEFAULT_HERO_BANNER };
  if (typeof parsedHero.enabled === "boolean") out.enabled = parsedHero.enabled;
  if (typeof parsedHero.image_url === "string") {
    // Aceita URL absoluta http(s) OU path começando com /
    const v = parsedHero.image_url.trim();
    if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) {
      out.image_url = v;
    }
  }
  if (typeof parsedHero.position === "string" && HERO_POSITIONS.includes(parsedHero.position as HeroBannerPosition)) {
    out.position = parsedHero.position as HeroBannerPosition;
  }
  if (typeof parsedHero.overlay === "string" && HERO_OVERLAYS.includes(parsedHero.overlay as HeroBannerOverlay)) {
    out.overlay = parsedHero.overlay as HeroBannerOverlay;
  }
  if (typeof parsedHero.height_desktop === "number" && Number.isFinite(parsedHero.height_desktop)) {
    out.height_desktop = Math.max(200, Math.min(800, Math.floor(parsedHero.height_desktop)));
  }
  if (typeof parsedHero.height_mobile === "number" && Number.isFinite(parsedHero.height_mobile)) {
    out.height_mobile = Math.max(200, Math.min(600, Math.floor(parsedHero.height_mobile)));
  }
  if (typeof parsedHero.label === "string") {
    out.label = parsedHero.label;
  }
  return out;
}

/**
 * Hook React — retorna config do hero banner com defaults aplicados.
 * Front decide renderizar ou não com base em enabled + image_url.
 */
export function useHeroBanner(): HeroBannerConfig {
  const { setting } = useSiteSettings();
  const raw = setting("site.hero_banner_json");
  return parseHeroBannerJson(raw);
}

// =========================================================================
// PR ADMIN 6E — Consultoria config + resolver com herança 4 níveis
// =========================================================================
//
// O formulário de consultoria pode ser configurado em 3 níveis no DB
// (product/section/module) + tem fallback no global (site.consultoria_*).
//
// Regra de resolução (mais específico ganha):
//   Aula > Section > Produto > Global
//
// Por nível, o config pode estar:
//   - null/undefined → herda do nível superior
//   - { mode: "inherit", ... } → herda do nível superior (explícito)
//   - { mode: "disabled", ... } → para a cascata, não renderiza
//   - { mode: "enabled", showBelow, showSidebar, useGlobalCopy, ...copy }
//     → renderiza com este config (copy custom faz merge com global)

export type ConsultoriaMode = "inherit" | "enabled" | "disabled";

export interface ConsultoriaConfig {
  mode: ConsultoriaMode;
  showBelow: boolean;
  showSidebar: boolean;
  useGlobalCopy: boolean;
  title?: string | null;
  body?: string | null;
  cta?: string | null;
  helperText?: string | null;
  url?: string | null;
}

/** Sane defaults pro form do admin quando criando config nova. */
export const DEFAULT_CONSULTORIA_CONFIG: ConsultoriaConfig = {
  mode: "inherit",
  showBelow: true,
  showSidebar: false,
  useGlobalCopy: true,
  title: null,
  body: null,
  cta: null,
  helperText: null,
  url: null,
};

/** Parse defensivo de jsonb vindo do members-api. Retorna null se inválido. */
export function parseConsultoriaConfig(raw: unknown): ConsultoriaConfig | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out: ConsultoriaConfig = { ...DEFAULT_CONSULTORIA_CONFIG };
  if (typeof obj.mode === "string" && ["inherit", "enabled", "disabled"].includes(obj.mode)) {
    out.mode = obj.mode as ConsultoriaMode;
  }
  if (typeof obj.showBelow === "boolean") out.showBelow = obj.showBelow;
  if (typeof obj.showSidebar === "boolean") out.showSidebar = obj.showSidebar;
  if (typeof obj.useGlobalCopy === "boolean") out.useGlobalCopy = obj.useGlobalCopy;
  for (const k of ["title", "body", "cta", "helperText", "url"] as const) {
    const v = obj[k];
    if (v === null || v === undefined) out[k] = null;
    else if (typeof v === "string") out[k] = v;
  }
  return out;
}

/**
 * Configuração resolvida pra renderização. Inclui copy final (com fallback
 * pro global) e flags de posição. Se `shouldRender=false`, nada renderiza.
 */
export interface ResolvedConsultoriaConfig {
  shouldRender: boolean;
  showBelow: boolean;
  showSidebar: boolean;
  title: string;
  body: string;
  cta: string;
  helperText: string;
  url: string;
}

/** Copy global (vinda de site.* via useSiteSettings) que entra no resolver. */
export interface ConsultoriaGlobalCopy {
  enabled: boolean; // site.consultoria_enabled
  url: string;
  title: string;
  body: string;
  cta: string;
  helperText: string;
}

interface ResolveContext {
  module?: unknown; // jsonb cru
  section?: unknown;
  product?: unknown;
  global: ConsultoriaGlobalCopy;
  /**
   * Fallback legacy: se TODOS os 3 níveis vierem null/inherit, e o
   * caller setar isLegacyBoasVindas=true, retorna o comportamento
   * atual (showBelow=true, sem sidebar). Garante zero regressão na
   * aula Boas-Vindos do produto principal.
   */
  isLegacyBoasVindas?: boolean;
}

/**
 * Resolver com herança 4-níveis. Retorna config pronta pra renderização.
 *
 * Ordem de resolução: módulo → section → produto → global.
 * Em qualquer nível, mode="disabled" para a cascata e desativa.
 * mode="enabled" no nível mais específico vence; copy faz merge campo a
 * campo (custom preenchido → custom; vazio/null → global).
 */
export function resolveConsultoriaConfig(ctx: ResolveContext): ResolvedConsultoriaConfig {
  const off: ResolvedConsultoriaConfig = {
    shouldRender: false,
    showBelow: false,
    showSidebar: false,
    title: "",
    body: "",
    cta: "",
    helperText: "",
    url: "",
  };

  const levels = [
    parseConsultoriaConfig(ctx.module),
    parseConsultoriaConfig(ctx.section),
    parseConsultoriaConfig(ctx.product),
  ];

  let active: ConsultoriaConfig | null = null;
  let allNullOrInherit = true;
  for (const cfg of levels) {
    if (cfg === null) continue;
    if (cfg.mode === "inherit") continue;
    allNullOrInherit = false;
    if (cfg.mode === "disabled") return off; // para a cascata
    if (cfg.mode === "enabled") {
      active = cfg;
      break;
    }
  }

  // Fallback legacy se nada foi setado e é a Boas-Vindos do CDR
  if (!active && allNullOrInherit && ctx.isLegacyBoasVindas) {
    if (!ctx.global.enabled || !ctx.global.url.trim()) return off;
    return {
      shouldRender: true,
      showBelow: true,
      showSidebar: false,
      title: ctx.global.title,
      body: ctx.global.body,
      cta: ctx.global.cta,
      helperText: ctx.global.helperText,
      url: ctx.global.url,
    };
  }

  if (!active) return off;

  // Se global desabilitado e não há URL custom, não renderiza
  const url = (active.url && active.url.trim()) || ctx.global.url || "";
  if (!url.trim()) return off;
  if (!ctx.global.enabled && !active.url?.trim()) return off;

  // Copy merge: custom > global
  const useGlobal = active.useGlobalCopy !== false;
  const pick = (custom: string | null | undefined, global: string) => {
    const c = custom?.trim();
    if (c) return c;
    return useGlobal ? global : c || "";
  };

  return {
    shouldRender: active.showBelow || active.showSidebar,
    showBelow: !!active.showBelow,
    showSidebar: !!active.showSidebar,
    title: pick(active.title, ctx.global.title),
    body: pick(active.body, ctx.global.body),
    cta: pick(active.cta, ctx.global.cta),
    helperText: pick(active.helperText, ctx.global.helperText),
    url,
  };
}
