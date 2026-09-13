/**
 * courseSections.ts — estrutura interna dos produtos.
 *
 * Por que existe:
 * O schema atual (product_modules em lista plana com display_order) não
 * suporta agrupamento por módulos/sections. Em vez de aplicar migration
 * agora, agrupamos a UI via config local — UUID-based mapping.
 *
 * Quando promover pra DB:
 *   Quando precisar de admin-managed sections OU multi-produto com
 *   sections distintas, considerar migration product_sections (descrito
 *   no plano PR 4.4). Até lá, este config é a fonte da verdade.
 *
 * Como atualizar:
 *   - Adicionar aula nova → inserir module no Admin → trocar entry
 *     do `placeholders[]` por moduleId no `moduleIds[]`.
 *   - Adicionar produto → criar nova entry em COURSE_SECTIONS keyed
 *     por product_settings.id.
 *
 * Fallback:
 *   Produtos sem entry → resolveProductSections retorna 1 section
 *   "Aulas" com todos os modules em sequência (comportamento antigo).
 */

export type SectionStatus = "available" | "partial" | "in_production";
export type SectionKind = "welcome" | "track" | "journey" | "coming-soon";
export type PlaceholderKind = "video" | "pdf" | "audio";

export interface PlaceholderLesson {
  /** Título exibido no card (ex: "Dia 1 — Reconstrução de Base"). */
  title: string;
  /** Indica que tipo de asset será disponibilizado. Apenas visual. */
  kind: PlaceholderKind;
}

export interface SectionMaterial {
  title: string;
  kind: PlaceholderKind;
  /** "ready" exigiria moduleId; por enquanto só "coming-soon" suportado. */
  state: "coming-soon";
}

export interface CourseSection {
  /** Identifier único da section dentro do produto. URL-safe. */
  key: string;
  /** Numeração visual ("01", "02", ...). */
  number: string;
  /** Título do módulo. */
  title: string;
  /** Sub-headline curta. */
  subtitle: string;
  /** Tipo da section — afeta visual da SectionCard. */
  kind: SectionKind;
  /** Status atual do conteúdo. */
  status: SectionStatus;
  /** UUIDs de product_modules reais (em ordem de aula). */
  moduleIds: string[];
  /** Aulas que vão existir mas ainda não foram inseridas no banco. */
  placeholders: PlaceholderLesson[];
  /** Materiais de apoio (PDFs anexos ao módulo). Opcional. */
  materials?: SectionMaterial[];
  /**
   * Se true, aulas reais bloqueiam até a anterior estar concluída.
   * Default false — todas as aulas reais ficam acessíveis o tempo todo.
   * Placeholders sempre são "soon" independente desse flag.
   */
  sequential?: boolean;
  /** PR ADMIN 6B: visual customizations vindas do admin. */
  image_url?: string | null;
  icon_key?: string | null;
  accent_color?: string | null;
  /** PR ADMIN 6E: consultoria_config jsonb (passa direto pro resolver). */
  consultoria_config?: unknown;
}

/**
 * UUIDs dos product_modules atuais do produto "O Código da Reconquista"
 * (product_settings.id = d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e).
 *
 * Esses UUIDs foram preservados desde a migração inicial do Supabase
 * antigo e estão atualmente em produção. Se mudarem, atualizar aqui.
 */
const MODULE_IDS = {
  BOAS_VINDOS: "ef59bdb2-4008-46ef-87a5-6028d5649d7f",
  COMPROMISSO: "8079af50-a52f-448f-b743-0b8375f19f9e",
  QUIMICA: "495cfa3d-a6ae-4333-a58e-a38c3be12d24",
  OXITOCINA: "5d03c823-4f0b-4c71-a722-09889ba8f3ef",
  DOPAMINA: "fbc0d7ee-9808-4f8a-ac5c-66207956e30c",
  EQUILIBRIO: "720741db-9359-45a6-bf81-e58d3e4ce1fa",
} as const;

const COD_RECONQUISTA_ID = "d7b877ff-93ba-4dc7-b3c2-7b5012d3e19e";

const COD_RECONQUISTA_SECTIONS: CourseSection[] = [
  {
    key: "boas-vindas",
    number: "01",
    title: "Boas vindas",
    subtitle: "Onboarding e orientação inicial",
    kind: "welcome",
    status: "available",
    moduleIds: [MODULE_IDS.BOAS_VINDOS],
    placeholders: [],
  },
  {
    key: "ocitocina-dopamina",
    number: "02",
    title: "Oxitocina e Dopamina",
    subtitle: "A neurociência da reconexão",
    kind: "track",
    status: "partial",
    moduleIds: [
      MODULE_IDS.QUIMICA,
      MODULE_IDS.OXITOCINA,
      MODULE_IDS.DOPAMINA,
      MODULE_IDS.EQUILIBRIO,
    ],
    placeholders: [
      { title: "O Perigoso Território de Acertar", kind: "video" },
      { title: "Bônus: Gatilhos Emocionais Silenciosos", kind: "pdf" },
    ],
  },
  {
    key: "fundamentos-15-dias",
    number: "03",
    title: "Fundamentos da Reconexão: 15 Dias",
    subtitle: "Jornada prática diária",
    kind: "journey",
    status: "partial",
    moduleIds: [MODULE_IDS.COMPROMISSO],
    // As aulas "Dia 1–15" já existem como product_modules reais no DB
    // (formato YouTube) e renderizam a partir do merge com o members-api.
    // Mantê-las também como placeholders aqui geraria linha "Em breve"
    // duplicada quando o nome no DB não bate exatamente com o título do
    // placeholder (filterPlaceholdersAgainstModules é match exato). Por isso
    // ficam vazias — o DB é a fonte de verdade.
    placeholders: [],
    materials: [
      { title: "Contrato de Compromisso — 15 Dias", kind: "pdf", state: "coming-soon" },
      { title: "Radar de Autocontrole — 7 Dias", kind: "pdf", state: "coming-soon" },
    ],
    sequential: false,
  },
  // ===== Módulos futuros — 100% em produção =====
  {
    key: "ainda-tenho-contato",
    number: "04",
    title: "Ainda Tenho Contato",
    subtitle:
      "Estratégias para quem ainda mantém algum canal aberto e precisa agir com precisão, sem parecer carente ou previsível.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "termino-recente",
    number: "05",
    title: "Ela Terminou Recentemente",
    subtitle:
      "Orientações para os primeiros dias e semanas após o término, quando cada movimento pode fortalecer ou destruir sua posição emocional.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "bloqueado-em-tudo",
    number: "06",
    title: "Estou Bloqueado em Tudo",
    subtitle:
      "Uma trilha estratégica para situações em que o contato direto não existe e a reconstrução precisa acontecer pela presença indireta.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "ja-faz-tempo",
    number: "07",
    title: "Já Faz Mais de 2 Meses",
    subtitle:
      "Estratégias para reabrir percepção e curiosidade quando a separação já esfriou e a distância parece ter virado rotina.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "conteudos-rapidos",
    number: "08",
    title: "Conteúdos Rápidos",
    subtitle:
      "Aulas curtas, diretas e práticas para revisar pontos importantes e aplicar ajustes rápidos na sua postura.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "pos-reconquista",
    number: "09",
    title: "Pós-Reconquista",
    subtitle:
      "Como manter a postura, evitar recaídas emocionais e não destruir a reconexão depois que os primeiros sinais positivos aparecem.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
  {
    key: "bonus",
    number: "10",
    title: "Área de Bônus",
    subtitle:
      "Materiais extras, protocolos complementares e recursos adicionais para aprofundar sua evolução dentro do método.",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: [],
    placeholders: [],
  },
];

export const COURSE_SECTIONS: Record<string, CourseSection[]> = {
  [COD_RECONQUISTA_ID]: COD_RECONQUISTA_SECTIONS,
};

/**
 * Mensagem padrão para módulos/aulas em produção.
 * Não menciona adaptação, tradução, versão americana, datas ou bastidores.
 */
export const IN_PRODUCTION_COPY =
  "Este módulo está em produção e será disponibilizado dentro da sua área de membros em breve.";

export const IN_PRODUCTION_LESSON_COPY =
  "Esta aula está sendo preparada e será liberada em uma próxima atualização da sua jornada.";

/**
 * Fallback do formulário de consultoria/análise estratégica.
 * Usado quando VITE_CONSULTORIA_URL não está setada como env var no Vercel.
 * Mantém o link funcional no front sem precisar de redeploy só por env var.
 */
export const CONSULTORIA_FORM_FALLBACK_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSca7TwJwiIdHg4nIN5i1MbRJUh8WGiVCvzAFEr8ip_C3aYQoA/viewform?usp=header";

/**
 * Resolve sections de um produto. Se não houver entry no config,
 * retorna fallback: 1 section "Aulas" com todos os modules em sequência
 * (preserva comportamento antigo de lista plana).
 */
export function resolveProductSections(
  productSettingsId: string | undefined | null,
  allModuleIds: string[],
): CourseSection[] {
  if (productSettingsId && COURSE_SECTIONS[productSettingsId]) {
    return COURSE_SECTIONS[productSettingsId]!;
  }
  // Fallback: produto sem config customizada → 1 section única
  return [
    {
      key: "default",
      number: "01",
      title: "Aulas",
      subtitle: "Conteúdo do curso",
      kind: "track",
      status: "available",
      moduleIds: allModuleIds,
      placeholders: [],
    },
  ];
}

// =========================================================================
// PR ADMIN 3 — shape vinda do members-api (DB-driven sections)
// =========================================================================
//
// members-api retorna `sections` por produto quando product_sections tem
// dados no DB. A shape espelha CourseSection mas SEM placeholders (DB
// ainda não tem schema pra placeholders). Front faz merge com config
// local pra grafar placeholders preservando comportamento atual.

export interface ApiCourseSection {
  key: string;
  number: string;
  title: string;
  subtitle: string;
  kind: string;
  status: string;
  moduleIds: string[];
  materials?: SectionMaterial[];
  sequential?: boolean;
  in_production_copy?: string;
  // PR ADMIN 6B: visual customizations
  image_url?: string | null;
  icon_key?: string | null;
  accent_color?: string | null;
  // PR ADMIN 6E: consultoria config jsonb (any pra evitar coupling com resolver)
  consultoria_config?: unknown;
}

/**
 * Merge das sections vindas do members-api com o config local. DB é a
 * fonte de verdade pra estrutura (key, title, ordering, modules,
 * materials); o config local supre apenas placeholders[] (aulas "em
 * produção" que ainda não têm representação no DB).
 *
 * Match feito por section_key. Sections do DB sem match no config
 * passam adiante com placeholders=[].
 */
/**
 * PR ADMIN 6F — Filtro defensivo: remove placeholders do config cujo título
 * já existe como product_module real no DB. Evita duplicação quando o admin
 * seeda/cria a aula em produção como module real (caso M02/M03 no seed da
 * PR ADMIN 6F).
 *
 * Match case-insensitive + trim. Placeholders restantes continuam
 * renderizando como soon (visual atual preservado).
 */
export function filterPlaceholdersAgainstModules(
  placeholders: PlaceholderLesson[],
  moduleNames: string[],
): PlaceholderLesson[] {
  if (placeholders.length === 0) return placeholders;
  const realNames = new Set(
    moduleNames.map((n) => n.trim().toLowerCase()).filter(Boolean),
  );
  return placeholders.filter(
    (p) => !realNames.has(p.title.trim().toLowerCase()),
  );
}

export function mergeApiSectionsWithConfig(
  apiSections: ApiCourseSection[],
  productSettingsId: string | undefined | null,
): CourseSection[] {
  const configSections = productSettingsId ? COURSE_SECTIONS[productSettingsId] : undefined;
  const configByKey = new Map<string, CourseSection>();
  if (configSections) {
    for (const sec of configSections) configByKey.set(sec.key, sec);
  }
  return apiSections.map((api) => {
    const cfg = configByKey.get(api.key);
    return {
      key: api.key,
      number: api.number,
      title: api.title,
      subtitle: api.subtitle,
      kind: api.kind as SectionKind,
      status: api.status as SectionStatus,
      moduleIds: api.moduleIds,
      // placeholders sempre do config (DB ainda não suporta); se config não
      // tem entry, fica vazio.
      placeholders: cfg?.placeholders || [],
      // materials: prioridade DB; fallback config.
      materials: api.materials && api.materials.length > 0 ? api.materials : cfg?.materials,
      sequential: api.sequential ?? cfg?.sequential,
      // PR ADMIN 6B: visuais editáveis (DB; null = front cai no fallback do SectionCard)
      image_url: api.image_url ?? null,
      icon_key: api.icon_key ?? null,
      accent_color: api.accent_color ?? null,
      // PR ADMIN 6E: consultoria_config jsonb (passa direto)
      consultoria_config: api.consultoria_config ?? null,
    };
  });
}
