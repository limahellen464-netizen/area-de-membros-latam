import { LockKeyhole } from "lucide-react";
import type { MouseEvent } from "react";
import { CHECKOUT_LINKS } from "@/config/checkout";
import { MARKET } from "@/config/market";
import type { QuizVslResult } from "@/config/quizVsl";
import {
  buildUrlWithParams,
  getCurrentAttribution,
  getQuizFunnelSessionId,
  trackEvent,
  trackStandardEvent,
} from "@/lib/tracking";
import { playQuizSound } from "@/lib/quizSound";

type QuizVslCheckoutButtonProps = {
  result: QuizVslResult;
  position: "below_vsl" | "after_product" | "after_testimonials" | "after_faq" | "final_offer";
  label?: string;
  showSecurityNote?: boolean;
  attention?: boolean;
};

const INITIATE_CHECKOUT_SESSION_KEY = "recupera_es_quiz_vsl_checkout_sent";
const CHECKOUT_CLICK_DEBOUNCE_MS = 1500;
let lastCheckoutClickAt = 0;

const createCheckoutClickId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback below.
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const trackInitiateCheckoutOnce = (result: QuizVslResult) => {
  try {
    if (window.sessionStorage.getItem(INITIATE_CHECKOUT_SESSION_KEY) === "1") {
      return;
    }
    window.sessionStorage.setItem(INITIATE_CHECKOUT_SESSION_KEY, "1");
  } catch {
    // Tracking remains available when sessionStorage is restricted.
  }

  trackStandardEvent("InitiateCheckout", {
    content_name: MARKET.brand,
    content_ids: "111462",
    content_type: "product",
    value: MARKET.offer.value,
    currency: MARKET.offer.currency,
    source: "quiz_vsl",
    quiz_result: result.id,
  }, { sendToMeta: false });
};

const QuizVslCheckoutButton = ({
  result,
  position,
  label = "Quiero recuperarla ahora",
  showSecurityNote = false,
  attention = false,
}: QuizVslCheckoutButtonProps) => {
  const quizSessionId = getQuizFunnelSessionId();
  const checkoutUrl = buildUrlWithParams(CHECKOUT_LINKS.main, {
    quiz_session_id: quizSessionId,
    quiz_origin: "quizvsl",
  });

  const handleCheckoutClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const clickedAt = Date.now();
    if (clickedAt - lastCheckoutClickAt < CHECKOUT_CLICK_DEBOUNCE_MS) {
      event.preventDefault();
      return;
    }
    lastCheckoutClickAt = clickedAt;

    const checkoutClickId = createCheckoutClickId();
    const checkoutUrlWithClick = buildUrlWithParams(CHECKOUT_LINKS.main, {
      quiz_session_id: quizSessionId,
      quiz_origin: "quizvsl",
      quiz_checkout_click_id: checkoutClickId,
    });

    playQuizSound("advance");
    trackEvent("QuizVslCheckoutClick", {
      ...getCurrentAttribution(),
      quiz_session_id: quizSessionId,
      quiz_origin: "quizvsl",
      quiz_checkout_click_id: checkoutClickId,
      quiz_result: result.id,
      quiz_score: result.score,
      quiz_intent: result.intent,
      cta_position: position,
    }, { preferBeacon: true });
    trackInitiateCheckoutOnce(result);

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    event.preventDefault();
    window.setTimeout(() => {
      window.location.assign(checkoutUrlWithClick);
    }, 120);
  };

  return (
    <div className="mx-auto w-full max-w-[520px]">
      <a
        href={checkoutUrl}
        onClick={handleCheckoutClick}
        className={`flex min-h-16 w-full items-center justify-center rounded-xl bg-green-600 px-5 py-4 text-center text-[16px] font-black uppercase leading-tight text-white shadow-[0_18px_45px_rgba(22,163,74,0.32)] transition hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-[#111] ${
          attention ? "quiz-vsl-cta-pulse" : ""
        }`}
      >
        {label}
      </a>

      {showSecurityNote && (
        <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs font-semibold text-neutral-400">
          <LockKeyhole className="h-4 w-4 text-green-500" />
          Pago seguro y acceso enviado después de la confirmación.
        </p>
      )}
    </div>
  );
};

export default QuizVslCheckoutButton;
