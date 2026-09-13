import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, MessageSquareText } from "lucide-react";
import logo from "@/assets/logo.png";
import { PremiumCard, PremiumHeader } from "@/components/premium";
import type { Purchase } from "@/components/premium/types";
import { CONSULTORIA_FORM_FALLBACK_URL } from "@/config/courseSections";
import { firstNameFromEmail, memberEmailKey, normalizeEmail } from "@/lib/latamAccess";
import { loadLatamPurchases } from "@/lib/latamMembersApi";

const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;

const Index = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(memberEmailKey);
    if (!saved) return;
    setEmail(saved);
    setLoadingSession(true);
    loadLatamPurchases(saved)
      .then(({ buyerName: resolvedName, purchases: resolvedPurchases }) => {
        setCurrentEmail(saved);
        setBuyerName(resolvedName || firstNameFromEmail(saved));
        setPurchases(resolvedPurchases);
      })
      .catch(() => {
        window.localStorage.removeItem(memberEmailKey);
      })
      .finally(() => setLoadingSession(false));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    setLoading(true);

    try {
      const { buyerName: resolvedName, purchases: resolvedPurchases } =
        await loadLatamPurchases(normalized);
      window.localStorage.setItem(memberEmailKey, normalized);
      setCurrentEmail(normalized);
      setBuyerName(resolvedName || firstNameFromEmail(normalized));
      setPurchases(resolvedPurchases);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible validar el acceso.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(memberEmailKey);
    setCurrentEmail("");
    setBuyerName("");
    setEmail("");
    setPurchases([]);
  };

  if (!currentEmail) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, hsl(var(--accent) / 0.10), transparent 60%), radial-gradient(circle at 50% 80%, hsl(var(--primary) / 0.08), transparent 50%)",
          }}
        />
        <div className="relative w-full max-w-md">
          <div className="rounded-[var(--radius-lg)] border border-accent/20 bg-card/80 p-8 shadow-[0_0_64px_-16px_hsl(var(--accent)/0.25)] backdrop-blur-xl">
            <div className="space-y-5 text-center">
              <div className="mx-auto inline-flex items-center justify-center rounded-xl border border-primary/15 bg-white px-6 py-4 shadow-[0_18px_42px_-32px_hsl(var(--primary)/0.55)]">
                <img
                  src={logo}
                  alt="El Código de la Reconquista"
                  className="h-14 w-auto object-contain sm:h-16"
                />
              </div>
              <div className="space-y-2 pt-1">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                  Área de Miembros
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ingresa el e-mail usado en la compra para acceder a tus productos.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-accent/30 bg-background/60 pl-10 focus-visible:ring-accent"
                  required
                  disabled={loadingSession}
                />
              </div>
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Usa{" "}
                <span className="font-semibold text-foreground">exactamente el mismo e-mail</span>{" "}
                informado en el checkout de la compra.
              </p>
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading || loadingSession}
              >
                {loading || loadingSession ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  "Acceder a mis productos"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const firstName = buyerName || firstNameFromEmail(currentEmail);
  const mainPurchase = purchases[0];
  const ownedProducts = purchases.filter(
    (purchase, index) => purchase.purchased && index !== 0,
  );
  const lockedProducts = purchases.filter((purchase) => !purchase.purchased);
  const purchasedCount = purchases.filter((purchase) => purchase.purchased).length;

  const goToLesson = (purchase: Purchase, moduleId: string) => {
    navigate(`/producto/${purchase.id}/clase/${moduleId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PremiumHeader
        buyerName={firstName}
        email={currentEmail}
        purchasedCount={purchasedCount}
        totalCount={purchases.length}
        onLogout={handleLogout}
      />

      <section
        aria-label="Hero del área de miembros"
        className="relative -mt-px h-[320px] overflow-hidden border-b border-primary/10 bg-background md:h-[520px]"
      >
        <img
          src={assetUrl("/images/hero-members.png")}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.84) 45%, rgba(255,255,255,0.34) 100%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent"
        />
        <div className="relative mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6">
          <div className="max-w-xl">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
              Bienvenido de vuelta
            </p>
            <h2 className="font-serif text-[34px] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Hola, {firstName}.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              Estás a un paso de aplicar los métodos correctos para reconstruir el vínculo
              emocional. Continúa desde donde te quedaste o explora los próximos contenidos.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {mainPurchase && (
          <section className="mb-8 sm:mb-10">
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_22px_70px_-42px_hsl(var(--primary)/0.65)]">
              <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
                <button
                  type="button"
                  onClick={() => {
                    const firstModuleId = mainPurchase.sections?.[0]?.moduleIds?.[0];
                    if (firstModuleId) goToLesson(mainPurchase, firstModuleId);
                    else navigate(`/producto/${mainPurchase.id}`);
                  }}
                  className="group relative min-h-[260px] overflow-hidden bg-muted text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[320px] lg:min-h-full"
                >
                  <img
                    src={mainPurchase.product_image_url}
                    alt={mainPurchase.product_name}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7">
                    <h3 className="max-w-md font-serif text-2xl font-bold leading-tight sm:text-3xl">
                      {mainPurchase.product_name}
                    </h3>
                  </div>
                </button>

                <div className="p-5 sm:p-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
                    Tu jornada
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                    Inicia {mainPurchase.product_name}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {mainPurchase.product_description}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {(mainPurchase.sections || []).map((section) => (
                      <button
                        key={section.key}
                        type="button"
                        onClick={() => {
                          const firstModuleId = section.moduleIds?.[0];
                          if (firstModuleId) goToLesson(mainPurchase, firstModuleId);
                        }}
                        className="group relative min-h-[140px] overflow-hidden rounded-xl border border-primary/15 bg-background p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {section.image_url && (
                          <img
                            src={section.image_url}
                            alt=""
                            aria-hidden
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/10"
                        />
                        <div className="relative flex h-full min-h-[108px] flex-col justify-end">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">
                                Módulo {section.number}
                              </p>
                              <h4 className="mt-1 text-xl font-extrabold leading-tight text-white drop-shadow-sm">
                                {section.title}
                              </h4>
                            </div>
                            <ArrowRight className="mb-1 h-5 w-5 shrink-0 text-white transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8 sm:mb-10">
          <a
            href={CONSULTORIA_FORM_FALLBACK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir formulario de análisis estratégico con Enrico Ferraz"
            className="group block overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-[0_18px_54px_-34px_hsl(var(--primary)/0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_24px_72px_-38px_hsl(var(--primary)/0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div className="grid gap-0 md:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_16px_34px_-20px_hsl(var(--primary)/0.75)]">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                  Análisis estratégico de tu caso
                </p>
                <h3 className="max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-3xl">
                  Envía tu caso para un análisis más dirigido con Enrico Ferraz.
                </h3>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Si quieres una orientación más específica para tu situación, cuenta qué
                  ocurrió, hace cuánto tiempo se alejaron y qué errores ya intentaste corregir.
                  Tus respuestas ayudan al equipo a entender tu momento antes de indicar el
                  próximo paso.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  Abrir formulario de análisis
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
              <div className="relative min-h-[220px] bg-primary/5 md:min-h-[300px]">
                <img
                  src={assetUrl("/images/enrico-consultoria.webp")}
                  alt="Enrico Ferraz"
                  className="absolute inset-0 h-full w-full object-cover object-[50%_22%] transition duration-500 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-background/25"
                />
              </div>
            </div>
          </a>
        </section>

        {ownedProducts.length > 0 && (
          <section className="mb-10 sm:mb-12">
            <div className="mb-4 flex items-end justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent/80">
                Mis contenidos
              </p>
              <span className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
                {ownedProducts.length} {ownedProducts.length === 1 ? "producto" : "productos"}
              </span>
            </div>
            <h3 className="mb-5 font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Otros contenidos liberados
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ownedProducts.map((purchase) => (
                <PremiumCard key={purchase.id} purchase={purchase} variant="owned" />
              ))}
            </div>
          </section>
        )}

        {lockedProducts.length > 0 && (
          <section className="mb-12">
            <div className="mb-4 flex items-end justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent/80">
                Otros contenidos
              </p>
              <span className="hidden whitespace-nowrap text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
                {lockedProducts.length}{" "}
                {lockedProducts.length === 1 ? "contenido" : "contenidos"}
              </span>
            </div>
            <h3 className="mb-5 font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Contenidos complementarios
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {lockedProducts.map((purchase) => (
                <PremiumCard key={purchase.id} purchase={purchase} variant="locked" />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Index;
