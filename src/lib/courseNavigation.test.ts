import { describe, expect, it } from "vitest";
import {
  buildCourseLessons,
  getCourseNavigationState,
  getResumeLesson,
} from "./courseNavigation";
import type { CourseSection } from "@/config/courseSections";
import type { Purchase, PurchaseModule } from "@/components/premium";

const makeModule = (
  id: string,
  completed = false,
  isPublished: boolean | undefined = true,
): PurchaseModule => ({
  id,
  module_name: `Aula ${id}`,
  pdf_url: null,
  has_pdf: false,
  video_url: `https://youtu.be/${id}`,
  has_video: true,
  is_published: isPublished,
  completed,
});

const sections: CourseSection[] = [
  {
    key: "inicio",
    number: "01",
    title: "Início",
    subtitle: "Primeiro módulo",
    kind: "track",
    status: "available",
    moduleIds: ["a", "b"],
    placeholders: [],
  },
  {
    key: "avancado",
    number: "02",
    title: "Avançado",
    subtitle: "Segundo módulo",
    kind: "track",
    status: "available",
    moduleIds: ["c", "d"],
    placeholders: [],
  },
  {
    key: "futuro",
    number: "03",
    title: "Futuro",
    subtitle: "Em produção",
    kind: "coming-soon",
    status: "in_production",
    moduleIds: ["e"],
    placeholders: [],
  },
];

it("ignora aulas em produção e sections em produção", () => {
  const modules = new Map([
    ["a", makeModule("a")],
    ["b", makeModule("b", false, false)],
    ["c", makeModule("c")],
    ["d", makeModule("d")],
    ["e", makeModule("e")],
  ]);

  expect(buildCourseLessons(sections, modules).map((lesson) => lesson.module.id)).toEqual([
    "a",
    "c",
    "d",
  ]);
});

it("mantém aulas publicadas que possuem somente PDF ou áudio", () => {
  const pdfOnly = {
    ...makeModule("pdf"),
    has_video: false,
    video_url: null,
    has_pdf: true,
    pdf_url: null,
  };
  const audioOnly = {
    ...makeModule("audio"),
    has_video: false,
    video_url: null,
    has_audio: true,
    audio_url: null,
  };
  const contentSections: CourseSection[] = [
    {
      ...sections[0],
      moduleIds: ["pdf", "audio"],
    },
  ];
  const modules = new Map<string, PurchaseModule>([
    ["pdf", pdfOnly],
    ["audio", audioOnly],
  ]);

  expect(
    buildCourseLessons(contentSections, modules).map((lesson) => lesson.module.id),
  ).toEqual(["pdf", "audio"]);
});

describe("getCourseNavigationState", () => {
  it("aponta para a próxima aula no mesmo módulo", () => {
    const modules = new Map([
      ["a", makeModule("a")],
      ["b", makeModule("b")],
      ["c", makeModule("c")],
      ["d", makeModule("d")],
    ]);

    const nav = getCourseNavigationState(sections, modules, "a");

    expect(nav.next?.module.id).toBe("b");
    expect(nav.primaryCtaLabel).toBe("Concluir aula e ir para a próxima");
  });

  it("aponta para o próximo módulo ao finalizar o módulo atual", () => {
    const modules = new Map([
      ["a", makeModule("a", true)],
      ["b", makeModule("b")],
      ["c", makeModule("c")],
      ["d", makeModule("d")],
    ]);

    const nav = getCourseNavigationState(sections, modules, "b");

    expect(nav.next?.module.id).toBe("c");
    expect(nav.isLastSection).toBe(true);
    expect(nav.primaryCtaLabel).toBe("Concluir aula e continuar para o próximo módulo");
  });

  it("mostra conclusão na última aula do curso", () => {
    const modules = new Map([
      ["a", makeModule("a", true)],
      ["b", makeModule("b", true)],
      ["c", makeModule("c", true)],
      ["d", makeModule("d")],
    ]);

    const nav = getCourseNavigationState(sections, modules, "d");

    expect(nav.next).toBeNull();
    expect(nav.primaryCtaLabel).toBe("Concluir curso");
  });
});

it("resume prioriza a primeira aula pendente", () => {
  const purchase: Purchase = {
    id: "produto",
    product_name: "Produto",
    product_description: "",
    product_image_url: "",
    access_url: "",
    checkout_url: "",
    purchase_date: null,
    amount: null,
    purchased: true,
    pdf_url: null,
    modules: [
      makeModule("a", true),
      makeModule("b", false),
      makeModule("c", false),
      makeModule("d", false),
    ],
  };

  const resume = getResumeLesson(purchase, sections, "c");

  expect(resume?.lesson.module.id).toBe("b");
  expect(resume?.isCourseComplete).toBe(false);
});
