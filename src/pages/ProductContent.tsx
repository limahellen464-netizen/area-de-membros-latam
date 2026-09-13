import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock3, Home, ListVideo } from "lucide-react";
import { CourseHeader, LessonRow, SectionCard } from "@/components/premium";
import type { PurchaseModule } from "@/components/premium/types";
import type { CourseSection } from "@/config/courseSections";
import {
  countLessons,
  findProductBySlug,
  type LatamLesson,
  type LatamProduct,
  type LatamSection,
} from "@/lib/latamCatalog";
import {
  lastLessonKey,
  memberEmailKey,
  readProgress,
  writeProgress,
} from "@/lib/latamAccess";
import { resolveSectionImage } from "@/lib/sectionImageOverrides";

const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

type LessonEntry = {
  section: LatamSection;
  lesson: LatamLesson;
  index: number;
  globalIndex: number;
};

const flattenLessons = (product: LatamProduct): LessonEntry[] => {
  let globalIndex = 0;
  return product.sections.flatMap((section) =>
    section.lessons.map((lesson, index) => {
      const entry = { section, lesson, index, globalIndex };
      globalIndex += 1;
      return entry;
    }),
  );
};

const toCourseSection = (product: LatamProduct, section: LatamSection): CourseSection => ({
  key: section.slug,
  number: section.number,
  title: section.title,
  subtitle: section.description,
  kind: section.number === "01" ? "welcome" : "track",
  status: "available",
  moduleIds: section.lessons.map((lesson) => lesson.slug),
  placeholders: [],
  image_url:
    resolveSectionImage(product.id, section.slug, null) ||
    (section.imageUrl ? assetUrl(section.imageUrl) : null),
});

const toPurchaseModule = (lesson: LatamLesson, completed: boolean): PurchaseModule => ({
  id: lesson.slug,
  module_name: lesson.title,
  pdf_url: null,
  has_pdf: lesson.type === "pdf",
  video_url: null,
  has_video: lesson.type === "video",
  audio_url: null,
  has_audio: lesson.type === "audio",
  is_published: true,
  media_status: "in_production",
  completed,
});

const ProductContent = () => {
  const navigate = useNavigate();
  const { slug, lessonSlug } = useParams<{ slug: string; lessonSlug?: string }>();
  const product = findProductBySlug(slug);
  const email =
    typeof window !== "undefined" ? window.localStorage.getItem(memberEmailKey) || "" : "";
  const [completed, setCompleted] = useState<Set<string>>(() => readProgress(email));

  const flatLessons = useMemo(() => (product ? flattenLessons(product) : []), [product]);
  const selected =
    flatLessons.find((item) => item.lesson.slug === lessonSlug) || flatLessons[0] || null;

  useEffect(() => {
    if (!email) return;
    setCompleted(readProgress(email));
  }, [email]);

  useEffect(() => {
    if (!email || !selected || !product || !lessonSlug) return;
    window.localStorage.setItem(
      lastLessonKey(email),
      `/producto/${product.slug}/clase/${selected.lesson.slug}`,
    );
  }, [email, lessonSlug, product, selected]);

  if (!email) return <Navigate to="/" replace />;
  if (!product) return <Navigate to="/" replace />;

  const total = countLessons(product);
  const completedInProduct = flatLessons.filter((item) => completed.has(item.lesson.id)).length;
  const progress = total > 0 ? Math.round((completedInProduct / total) * 100) : 0;

  const goToLesson = (lesson: LatamLesson) => {
    navigate(`/producto/${product.slug}/clase/${lesson.slug}`);
  };

  const markDone = (lesson: LatamLesson) => {
    const next = new Set(completed);
    next.add(lesson.id);
    setCompleted(next);
    writeProgress(email, next);
    const currentIndex = flatLessons.findIndex((item) => item.lesson.id === lesson.id);
    const nextLesson = flatLessons[currentIndex + 1];
    if (nextLesson) {
      goToLesson(nextLesson.lesson);
      return;
    }
    navigate(`/producto/${product.slug}`);
  };

  const openSection = (sectionKey: string) => {
    const section = product.sections.find((item) => item.slug === sectionKey);
    const firstLesson = section?.lessons[0];
    if (firstLesson) goToLesson(firstLesson);
  };

  const mainProductSlug = "el-codigo-de-la-reconquista";
  const isMainProduct = product.slug === mainProductSlug;

  return (
    <div className="min-h-screen bg-background">
      <CourseHeader
        onBack={() => navigate("/")}
        backLabel="Volver"
        onHome={isMainProduct ? () => navigate("/") : undefined}
        onMainCourse={!isMainProduct ? () => navigate(`/producto/${mainProductSlug}`) : undefined}
        progress={progress}
        crumbs={[
          { label: "Mis productos", onClick: () => navigate("/") },
          {
            label: product.title,
            onClick: lessonSlug ? () => navigate(`/producto/${product.slug}`) : undefined,
          },
          ...(selected ? [{ label: selected.lesson.title }] : []),
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {!lessonSlug ? (
          <>
            <section className="mb-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                {product.title}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Tu jornada empieza aquí
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Elige un módulo para continuar tus clases.
              </p>
            </section>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {product.sections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={toCourseSection(product, section)}
                  completedCount={section.lessons.filter((lesson) => completed.has(lesson.id)).length}
                  totalRealLessons={section.lessons.length}
                  onClick={openSection}
                />
              ))}
            </div>
          </>
        ) : selected ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-5 lg:col-span-8">
              <div className="overflow-hidden rounded-xl border border-primary/20 bg-card shadow-[0_18px_54px_-34px_hsl(var(--primary)/0.45)]">
                <div className="flex min-h-[280px] items-center justify-center bg-[linear-gradient(135deg,#1f1111_0%,#3d1519_48%,#111_100%)] p-8 text-center sm:min-h-[405px]">
                  <div className="max-w-md">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
                      <Clock3 className="h-7 w-7" />
                    </div>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
                      Contenido en producción
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-bold leading-tight text-white">
                      {selected.lesson.title}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-white/70">
                      Esta clase no publica contenido en portugués. El video, PDF o audio en
                      español será conectado aquí cuando el material final llegue.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Clase {selected.globalIndex + 1} de {total} · {selected.section.title}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {selected.lesson.title}
                </h1>
              </div>

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                      Progreso del producto
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {completedInProduct}/{total} clases marcadas como revisadas
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                    {progress}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm sm:p-5">
                <Button
                  size="lg"
                  className="h-auto min-h-[56px] w-full whitespace-normal bg-primary px-4 py-3 text-center text-base font-bold leading-tight text-primary-foreground hover:bg-primary/90 sm:text-lg"
                  onClick={() => markDone(selected.lesson)}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Marcar como revisada y continuar
                </Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/producto/${product.slug}`)}
                    className="h-auto min-h-11 whitespace-normal px-2 text-xs sm:text-sm"
                  >
                    <ListVideo className="mr-1 h-4 w-4" />
                    Ver módulos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="h-auto min-h-11 whitespace-normal px-2 text-xs sm:text-sm"
                  >
                    <Home className="mr-1 h-4 w-4" />
                    Productos
                  </Button>
                </div>
              </section>
            </section>

            <aside className="lg:col-span-4">
              <div className="sticky top-[88px] space-y-4 rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-serif text-base font-bold text-foreground">Clases</h2>
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {completedInProduct}/{total}
                  </span>
                </div>
                <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-auto pr-1">
                  {flatLessons.map((entry) => {
                    const module = toPurchaseModule(
                      entry.lesson,
                      completed.has(entry.lesson.id),
                    );
                    return (
                      <LessonRow
                        key={entry.lesson.id}
                        index={entry.globalIndex + 1}
                        module={module}
                        state={
                          completed.has(entry.lesson.id)
                            ? "completed"
                            : entry.lesson.id === selected.lesson.id
                              ? "current"
                              : "next"
                        }
                        onSelect={() => goToLesson(entry.lesson)}
                      />
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default ProductContent;
