import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, FileText, Home, Loader2, ListVideo } from "lucide-react";
import { CourseHeader, LessonRow, MediaPlayer, SectionCard } from "@/components/premium";
import type { Purchase, PurchaseModule } from "@/components/premium/types";
import {
  mergeApiSectionsWithConfig,
  resolveProductSections,
  type CourseSection,
} from "@/config/courseSections";
import { memberEmailKey } from "@/lib/latamAccess";
import { completeLatamModule, loadLatamPurchases } from "@/lib/latamMembersApi";
import { buildCourseLessons, getCourseNavigationState, isPublishedLesson } from "@/lib/courseNavigation";

const MAIN_PRODUCT_SLUG = "el-codigo-de-la-reconquista";

const ProductContent = () => {
  const navigate = useNavigate();
  const { slug, lessonSlug: moduleId } = useParams<{ slug: string; lessonSlug?: string }>();
  const email =
    typeof window !== "undefined" ? window.localStorage.getItem(memberEmailKey) || "" : "";

  // undefined = loading, null = not found / no access
  const [purchase, setPurchase] = useState<Purchase | null | undefined>(undefined);

  useEffect(() => {
    if (!email || !slug) {
      setPurchase(null);
      return;
    }
    let cancelled = false;
    setPurchase(undefined);
    loadLatamPurchases(email)
      .then(({ purchases }) => {
        if (cancelled) return;
        setPurchase(purchases.find((p) => p.id === slug && p.purchased) || null);
      })
      .catch(() => {
        if (!cancelled) setPurchase(null);
      });
    return () => {
      cancelled = true;
    };
  }, [email, slug]);

  const sections: CourseSection[] = useMemo(() => {
    if (!purchase) return [];
    if (purchase.sections && purchase.sections.length > 0) {
      return mergeApiSectionsWithConfig(purchase.sections, purchase.product_settings_id);
    }
    return resolveProductSections(
      purchase.product_settings_id,
      purchase.modules.map((m) => m.id),
    );
  }, [purchase]);

  const moduleById = useMemo(() => {
    const map = new Map<string, PurchaseModule>();
    for (const module of purchase?.modules || []) map.set(module.id, module);
    return map;
  }, [purchase]);

  const allLessons = useMemo(() => buildCourseLessons(sections, moduleById), [sections, moduleById]);
  const nav = moduleId ? getCourseNavigationState(sections, moduleById, moduleId) : null;

  if (!email) return <Navigate to="/" replace />;
  if (purchase === null) return <Navigate to="/" replace />;

  if (purchase === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isMainProduct = purchase.id === MAIN_PRODUCT_SLUG;

  const goToLesson = (id: string) => {
    navigate(`/producto/${purchase.id}/clase/${id}`);
  };

  const markDone = async (module: PurchaseModule) => {
    setPurchase((prev) =>
      prev
        ? {
            ...prev,
            modules: prev.modules.map((m) => (m.id === module.id ? { ...m, completed: true } : m)),
          }
        : prev,
    );
    completeLatamModule(email, module.id).catch(() => {
      // Best-effort: falha de rede não deve travar a navegação do aluno.
    });

    const next = nav?.next;
    if (next) {
      goToLesson(next.module.id);
      return;
    }
    navigate(`/producto/${purchase.id}`);
  };

  const openSection = (sectionKey: string) => {
    const firstLesson = allLessons.find((entry) => entry.section.key === sectionKey);
    if (firstLesson) goToLesson(firstLesson.module.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <CourseHeader
        onBack={() => navigate("/")}
        backLabel="Volver"
        onHome={isMainProduct ? () => navigate("/") : undefined}
        onMainCourse={!isMainProduct ? () => navigate(`/producto/${MAIN_PRODUCT_SLUG}`) : undefined}
        progress={nav?.progress}
        crumbs={[
          { label: "Mis productos", onClick: () => navigate("/") },
          {
            label: purchase.product_name,
            onClick: moduleId ? () => navigate(`/producto/${purchase.id}`) : undefined,
          },
          ...(nav?.current ? [{ label: nav.current.module.module_name }] : []),
        ]}
      />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6">
        {!moduleId ? (
          <>
            <section className="mb-9">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                {purchase.product_name}
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                Tu jornada empieza aquí
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Elige un módulo para continuar tus clases.
              </p>
            </section>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => {
                const realModules = section.moduleIds
                  .map((id) => moduleById.get(id))
                  .filter(isPublishedLesson) as PurchaseModule[];
                return (
                  <SectionCard
                    key={section.key}
                    section={section}
                    completedCount={realModules.filter((m) => m.completed).length}
                    totalRealLessons={realModules.length}
                    onClick={openSection}
                  />
                );
              })}
            </div>
          </>
        ) : nav?.current ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <section className="space-y-5 lg:col-span-8">
              <MediaPlayer
                module={nav.current.module}
                coverImage={nav.current.module.cover_image_url}
                coverIsCustom={Boolean(nav.current.module.cover_image_url)}
                className="min-h-[280px] sm:min-h-[405px]"
              />

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                  Clase {nav.currentLessonNumber} de {nav.totalLessons} · {nav.current.section.title}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  {nav.current.module.module_name}
                </h1>
              </div>

              {nav.current.module.has_pdf && nav.current.module.pdf_url && (
                <a
                  href={nav.current.module.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-primary/20 bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
                >
                  <FileText className="h-4 w-4" />
                  Abrir PDF de esta clase
                </a>
              )}

              <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent/80">
                      Progreso del producto
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {nav.completedLessons}/{nav.totalLessons} clases marcadas como revisadas
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
                    {nav.progress}%
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${nav.progress}%` }}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-primary/20 bg-card p-4 shadow-sm sm:p-5">
                <Button
                  size="lg"
                  className="h-auto min-h-[56px] w-full whitespace-normal bg-primary px-4 py-3 text-center text-base font-bold leading-tight text-primary-foreground hover:bg-primary/90 sm:text-lg"
                  onClick={() => markDone(nav.current!.module)}
                  disabled={nav.current.module.completed}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {nav.current.module.completed ? "Clase revisada" : nav.primaryCtaLabel}
                </Button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/producto/${purchase.id}`)}
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
                    {nav.completedLessons}/{nav.totalLessons}
                  </span>
                </div>
                <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-auto pr-1">
                  {nav.lessons.map((entry) => (
                    <LessonRow
                      key={entry.module.id}
                      index={entry.globalIndex + 1}
                      module={entry.module}
                      state={
                        entry.module.completed
                          ? "completed"
                          : entry.module.id === moduleId
                            ? "current"
                            : "next"
                      }
                      onSelect={() => goToLesson(entry.module.id)}
                    />
                  ))}
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <Navigate to={`/producto/${purchase.id}`} replace />
        )}
      </main>
    </div>
  );
};

export default ProductContent;
