import type { CourseSection } from "@/config/courseSections";
import type { Purchase, PurchaseModule } from "@/components/premium";

export interface CourseLessonRef {
  section: CourseSection;
  sectionIndex: number;
  module: PurchaseModule;
  moduleIndex: number;
  globalIndex: number;
  totalInSection: number;
  completedInSection: number;
}

export interface CourseNavigationState {
  lessons: CourseLessonRef[];
  current: CourseLessonRef | null;
  previous: CourseLessonRef | null;
  next: CourseLessonRef | null;
  currentLessonNumber: number;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  isLastLesson: boolean;
  isLastSection: boolean;
  primaryCtaLabel: string;
  nextStepLabel: string;
}

export const hasAvailableLessonContent = (module: PurchaseModule | undefined | null) =>
  !!module &&
  ((module.has_video && !!module.video_url) ||
    module.has_audio ||
    module.has_pdf);

export const isPublishedLesson = (module: PurchaseModule | undefined | null) =>
  !!module && module.is_published !== false && hasAvailableLessonContent(module);

export function buildCourseLessons(
  sections: CourseSection[],
  moduleById: Map<string, PurchaseModule>,
): CourseLessonRef[] {
  const lessons: CourseLessonRef[] = [];

  sections.forEach((section, sectionIndex) => {
    if (section.status === "in_production") return;

    const sectionModules = section.moduleIds
      .map((id) => moduleById.get(id))
      .filter(isPublishedLesson) as PurchaseModule[];
    const completedInSection = sectionModules.filter((module) => module.completed).length;

    sectionModules.forEach((module, moduleIndex) => {
      lessons.push({
        section,
        sectionIndex,
        module,
        moduleIndex,
        globalIndex: lessons.length,
        totalInSection: sectionModules.length,
        completedInSection,
      });
    });
  });

  return lessons;
}

export function getCourseProgress(lessons: CourseLessonRef[]) {
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter((lesson) => lesson.module.completed).length;

  return {
    totalLessons,
    completedLessons,
    progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
  };
}

export function getFirstPendingLesson(lessons: CourseLessonRef[]) {
  return lessons.find((lesson) => !lesson.module.completed) || null;
}

export function getCourseNavigationState(
  sections: CourseSection[],
  moduleById: Map<string, PurchaseModule>,
  currentModuleId: string,
): CourseNavigationState {
  const lessons = buildCourseLessons(sections, moduleById);
  const current = lessons.find((lesson) => lesson.module.id === currentModuleId) || null;
  const { totalLessons, completedLessons, progress } = getCourseProgress(lessons);

  const previous =
    current && current.globalIndex > 0 ? lessons[current.globalIndex - 1] || null : null;
  const next =
    current && current.globalIndex < lessons.length - 1
      ? lessons[current.globalIndex + 1] || null
      : null;
  const currentLessonNumber = current ? current.globalIndex + 1 : 0;
  const isLastLesson = !!current && !next;
  const isLastSection = !!current && (!next || next.section.key !== current.section.key);

  let primaryCtaLabel = "Continuar";
  let nextStepLabel = "Continue para a próxima etapa.";

  if (!current) {
    primaryCtaLabel = "Meus produtos";
    nextStepLabel = "Não foi possível encontrar esta aula na sequência do curso.";
  } else if (!next && current.module.completed) {
    primaryCtaLabel = "Voltar aos produtos";
    nextStepLabel = "Curso concluído.";
  } else if (!next) {
    primaryCtaLabel = "Concluir curso";
    nextStepLabel = "Última aula do curso.";
  } else if (next.section.key !== current.section.key) {
    primaryCtaLabel = "Concluir aula e continuar para o próximo módulo";
    nextStepLabel = `Depois: Módulo ${next.section.number} - ${next.section.title}.`;
  } else {
    primaryCtaLabel = "Concluir aula e ir para a próxima";
    nextStepLabel = `Depois: ${next.module.module_name}.`;
  }

  return {
    lessons,
    current,
    previous,
    next,
    currentLessonNumber,
    totalLessons,
    completedLessons,
    progress,
    isLastLesson,
    isLastSection,
    primaryCtaLabel,
    nextStepLabel,
  };
}

export function getResumeLesson(
  purchase: Purchase,
  sections: CourseSection[],
  preferredModuleId?: string | null,
) {
  const moduleById = new Map<string, PurchaseModule>();
  for (const module of purchase.modules || []) moduleById.set(module.id, module);

  const lessons = buildCourseLessons(sections, moduleById);
  if (lessons.length === 0) return null;

  const pending = getFirstPendingLesson(lessons);
  const preferred =
    preferredModuleId && lessons.find((lesson) => lesson.module.id === preferredModuleId);
  const lesson = pending || preferred || lessons[lessons.length - 1] || null;
  const { progress, totalLessons } = getCourseProgress(lessons);

  if (!lesson) return null;

  return {
    lesson,
    progress,
    totalLessons,
    isCourseComplete: !pending,
  };
}
