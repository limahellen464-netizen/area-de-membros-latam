import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import QuizVslCheckoutButton from "@/components/QuizVslCheckoutButton";
import type { QuizVslResult } from "@/config/quizVsl";
import { MARKET } from "@/config/market";
import {
  getCurrentAttribution,
  trackEvent,
} from "@/lib/tracking";
import { playQuizSound } from "@/lib/quizSound";

type QuizVslUnlockedContentProps = {
  result: QuizVslResult;
  productRef: React.RefObject<HTMLElement>;
};

const faqs = [
  {
    question:
      "¿El Código de la Reconquista funciona de verdad en cualquier situación?",
    answer:
      "Sí. No importa si tú fuiste infiel, si ella lo fue, si la ruptura fue explosiva o si dijo que ya no sentía lo mismo. El método trabaja sobre la respuesta emocional femenina sin depender de la historia de la pareja.",
  },
  {
    question: "¿Y si ella ya está con otro hombre?",
    answer:
      "En esa situación el método puede cobrar más fuerza. Cuando está con otra persona, sigue comparando. Los estímulos del Código de la Reconquista hacen que su mente vuelva a ti de manera involuntaria.",
  },
  {
    question: "¿Y si me ha bloqueado en todas partes?",
    answer:
      "El bloqueo es una reacción emocional, no necesariamente una decisión definitiva. El Código de la Reconquista no depende de mensajes ni de contacto directo. Cuando cambia la percepción que ella tiene de ti, puede ser ella quien vuelva a buscar el contacto.",
  },
  {
    question: "¿Y si yo le fui infiel?",
    answer:
      "También puede aplicarse. Una infidelidad rompe la confianza, pero no borra automáticamente la atracción. El método busca reconstruir la imagen emocional que ella tiene de ti.",
  },
  {
    question: "¿Cuánto tarda en funcionar?",
    answer:
      "Muchos hombres empiezan a notar cambios en menos de 8 días. El método fue estructurado para ser directo y preciso, no para esperar durante meses.",
  },
  {
    question:
      "¿Necesito ser atractivo, tener dinero o alguna ventaja sobre el otro hombre?",
    answer:
      "No. El método trabaja con algo que ningún otro hombre puede replicar: la conexión emocional que ya existe entre ustedes y los recuerdos exclusivos de su historia.",
  },
];

const useOfferTimer = () => {
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 - 1);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTimeLeft((current) => (current > 0 ? current - 1 : 24 * 60 * 60 - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  return {
    hours: String(Math.floor(timeLeft / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0"),
    seconds: String(timeLeft % 60).padStart(2, "0"),
  };
};

const useSectionTracking = (
  eventName:
    | "QuizVslProductSectionView"
    | "QuizVslTestimonialsView"
    | "QuizVslFaqView"
    | "QuizVslOfferView",
  payload: Record<string, string>,
) => {
  const ref = useRef<HTMLElement>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || trackedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || trackedRef.current) return;
        trackedRef.current = true;
        trackEvent(eventName, payload);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [eventName, payload]);

  return ref;
};

const QuizVslUnlockedContent = ({
  result,
  productRef,
}: QuizVslUnlockedContentProps) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { hours, minutes, seconds } = useOfferTimer();
  const payload = useMemo(
    () => ({
      ...getCurrentAttribution(),
      quiz_result: result.id,
      quiz_score: result.score,
      quiz_intent: result.intent,
    }),
    [result],
  );
  const testimonialRef = useSectionTracking("QuizVslTestimonialsView", payload);
  const faqRef = useSectionTracking("QuizVslFaqView", payload);
  const offerRef = useSectionTracking("QuizVslOfferView", payload);
  const afterFaqCtaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackEvent("QuizVslContentUnlocked", payload);
  }, [payload]);

  // This component only mounts once the pitch reveals the offer — auto-scroll
  // straight to the CTA button after the FAQ, so the lead lands on a buy
  // button instead of having to scroll through product/testimonials/FAQ
  // manually. Small delay lets images/iframes above it finish laying out.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      afterFaqCtaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const element = productRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackEvent("QuizVslProductSectionView", payload);
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [payload, productRef]);

  return (
    <div className="mt-8 overflow-hidden rounded-[24px] border border-white/10 bg-[#0e0e0f] text-white shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
      <section
        ref={productRef}
        className="px-5 py-10 text-center sm:px-8 md:py-14"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
          Conoce el método
        </p>
        <h2 className="mx-auto mt-4 max-w-3xl text-[27px] font-black leading-[1.08] sm:text-[34px] md:text-[42px]">
          <span className="text-red-500">El Código de la Reconquista:</span> el
          método que transforma la forma en que tu ex piensa en ti, revierte el
          impacto de la ruptura, reactiva el deseo y hace que quiera retomar la
          relación sin entender qué está ocurriendo.
        </h2>

        <div className="mx-auto mt-8 max-w-[430px] overflow-hidden rounded-2xl border border-white/10 bg-white">
          <img
            src="/images/product-bundle.png"
            alt="Producto El Código de la Reconquista"
            className="h-auto w-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="mx-auto mt-7 max-w-2xl space-y-4 text-left text-[15px] font-medium leading-relaxed text-neutral-300 sm:text-[17px]">
          <p>
            <strong className="text-white">
              Olvida todo lo que has visto hasta ahora.
            </strong>{" "}
            El Código de la Reconquista no depende de juegos mentales, mensajes
            prefabricados ni de aplicar el “contacto cero” sin una estrategia.
          </p>
          <p>
            Fue creado para{" "}
            <strong className="text-white">
              transformar la forma en que ella piensa en ti
            </strong>
            , reducir el impacto de la ruptura, reactivar el deseo y reconstruir
            tu imagen como el hombre al que quiere recuperar.
          </p>
          <p>
            No importa si está con otro hombre, si te bloqueó, si dijo que no
            quiere volver a verte o si llevan meses sin hablar.
          </p>
        </div>

        <div className="mt-8">
          <QuizVslCheckoutButton
            result={result}
            position="after_product"
            showSecurityNote
            attention
          />
        </div>
      </section>

      <section
        ref={testimonialRef}
        className="border-t border-white/10 bg-[#f7f4f2] px-5 py-10 text-neutral-950 sm:px-8 md:py-14"
      >
        <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-red-600">
          Testimonios de alumnos
        </p>
        <h2 className="mt-3 text-center text-[27px] font-black leading-tight sm:text-[34px]">
          Lo que dicen nuestros alumnos
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm font-medium leading-relaxed text-neutral-600 sm:text-base">
          Mira estos testimonios breves de hombres que empezaron a aplicar el
          contenido.
        </p>

        <div className="mx-auto mt-8 grid max-w-[650px] gap-5 sm:grid-cols-2">
          {[
            {
              id: "3ag-qYEbZ6A",
              title: "Marcelo cuenta su experiencia con El Código de la Reconquista",
            },
            {
              id: "42wQSo48BCY",
              title: "Rafael cuenta cómo volvió a acercarse a su exesposa",
            },
          ].map((testimonial) => (
            <article
              key={testimonial.id}
              className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-[0_16px_38px_rgba(30,20,20,0.10)]"
            >
              <div className="aspect-[9/16] bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${testimonial.id}`}
                  title={testimonial.title}
                  className="h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="px-4 py-4 text-center text-sm font-bold leading-snug">
                {testimonial.title}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <QuizVslCheckoutButton
            result={result}
            position="after_testimonials"
            attention
          />
        </div>
      </section>

      <section
        ref={faqRef}
        className="border-t border-neutral-200 bg-white px-5 py-10 text-neutral-950 sm:px-8 md:py-14"
      >
        <h2 className="text-center text-[28px] font-black sm:text-[36px]">
          Preguntas frecuentes
        </h2>
        <p className="mt-2 text-center text-sm font-medium text-neutral-500">
          ¿Te queda alguna duda? Revisa las preguntas frecuentes:
        </p>

        <div className="mx-auto mt-7 max-w-2xl space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"
              >
                <button
                  type="button"
                  onClick={() => {
                    playQuizSound("select");
                    setOpenFaq(isOpen ? null : index);
                  }}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-black sm:px-5 sm:text-base"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-red-600" : "text-neutral-500"
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="border-t border-neutral-200 px-4 py-4 text-sm font-medium leading-relaxed text-neutral-600 sm:px-5 sm:text-[15px]">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8" ref={afterFaqCtaRef}>
          <QuizVslCheckoutButton result={result} position="after_faq" attention />
        </div>
      </section>

      <section
        ref={offerRef}
        className="border-t border-white/10 px-5 py-11 text-center sm:px-8 md:py-16"
      >
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-500">
          Oferta especial
        </p>
        <h2 className="mx-auto mt-4 max-w-2xl text-[28px] font-black leading-tight sm:text-[38px]">
          Obtén hoy el acceso completo con una condición especial:
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-relaxed text-neutral-300 sm:text-base">
          Recibirás el método completo, estructuras prácticas y los 4 bonos
          exclusivos.
        </p>

        <img
          src="/images/product-bundle.png"
          alt="El Código de la Reconquista"
          className="mx-auto mt-8 w-full max-w-[360px] rounded-xl bg-white"
          loading="lazy"
        />

        <div className="mx-auto mt-8 max-w-[440px] rounded-2xl border border-white/15 bg-white/[0.05] p-5 shadow-2xl sm:p-7">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-black uppercase">
            <Clock3 className="h-5 w-5" />
            <span className="mr-1 text-[11px] sm:text-sm">Finaliza en:</span>
            <span className="font-mono text-xl tracking-wider sm:text-2xl">
              {hours}:{minutes}:{seconds}
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center gap-1">
            <span className="text-base font-medium text-white/60">
              De{" "}
              <span className="text-xl font-bold text-red-400 line-through">
                {MARKET.offer.referencePrice}
              </span>
            </span>
            <span className="text-sm text-white/60">por solo</span>
            <span className="text-[36px] font-black leading-none text-green-400 sm:text-[44px]">
              {MARKET.offer.currentPrice}
            </span>
            <span className="text-base font-bold sm:text-lg">pago una sola vez</span>
          </div>

          <div className="mt-5">
            <QuizVslCheckoutButton
              result={result}
              position="final_offer"
              attention
            />
          </div>

          <div className="mt-5 space-y-2 text-left text-xs font-semibold text-neutral-300 sm:text-sm">
            <p className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-green-400" />
              Pago procesado en un entorno seguro.
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-400" />
              Acceso enviado después de confirmar el pago.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuizVslUnlockedContent;
