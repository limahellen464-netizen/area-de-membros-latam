import { type MouseEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  LogIn,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { MARKET } from "@/config/market";
import {
  buildUrlWithParams,
  persistAttributionFromUrl,
  readUrlParams,
  trackEvent,
} from "@/lib/tracking";

const getBuyerEmail = (params: Record<string, string>) =>
  params.email || params.buyer_email || params.customer_email || params.client_email || "";

const buildWhatsAppMessage = (email: string) => {
  const { contactName } = MARKET.postPurchase.whatsapp;

  if (email) {
    return `Hola, ${contactName}. Compré ${MARKET.brand} y quiero recibir mi acceso. El correo que utilicé en la compra es: ${email}`;
  }

  return `Hola, ${contactName}. Compré ${MARKET.brand} y quiero recibir mi acceso. Te indicaré aquí el correo que utilicé en la compra.`;
};

const ThankYou = () => {
  const [whatsappClicked, setWhatsappClicked] = useState(false);
  const params = readUrlParams();
  const buyerEmail = getBuyerEmail(params);
  const { contactName, phone } = MARKET.postPurchase.whatsapp;
  const membersUrl = buildUrlWithParams(MARKET.postPurchase.membersAreaUrl, {
    market: MARKET.market,
    locale: MARKET.locale,
  });

  const whatsappUrl = useMemo(() => {
    const url = new URL(`https://wa.me/${phone}`);
    url.searchParams.set("text", buildWhatsAppMessage(buyerEmail));
    return url.toString();
  }, [buyerEmail, phone]);

  useEffect(() => {
    persistAttributionFromUrl();
    trackEvent("whatsapp_access_page_view", {
      source: "thank_you_es",
      has_email: Boolean(buyerEmail),
    });
  }, [buyerEmail]);

  const handleWhatsAppClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setWhatsappClicked(true);
    trackEvent("whatsapp_access_click", {
      source: "thank_you_es",
      has_email: Boolean(buyerEmail),
    });

    const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    if (!whatsappWindow) window.location.href = whatsappUrl;
  };

  const trackMembersClick = (source: "direct" | "after_whatsapp") => {
    trackEvent(
      source === "direct"
        ? "member_area_direct_access_click"
        : "member_area_redirect_after_whatsapp",
      {
        source: `thank_you_es_${source}`,
        has_email: Boolean(buyerEmail),
      },
    );
  };

  return (
    <main className="min-h-screen bg-[#fafafa] px-5 py-8 text-neutral-950 md:px-8 md:py-12">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col justify-center">
        <div className="text-center">
          <img
            src="/images/logo.png"
            alt={MARKET.brand}
            className="mx-auto mb-6 w-40 md:w-52"
          />
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-green-100 bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.14em] text-green-700 shadow-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Compra confirmada
          </div>
          <h1 className="text-[34px] font-black leading-tight md:text-[54px]">
            ¡Gracias por tu compra!
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] font-medium leading-relaxed text-neutral-600 md:text-[20px]">
            Tu acceso a {MARKET.brand} está listo. Revisa el correo que utilizaste en la compra o
            solicita ahora las instrucciones por WhatsApp.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-red-100 bg-white p-5 shadow-[0_24px_80px_rgba(15,15,15,0.08)] md:p-8">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-[#fffafa] p-5">
              <Mail className="h-10 w-10 text-red-600" aria-hidden="true" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-red-600">
                Revisa tu correo
              </p>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-neutral-700">
                Enviamos las instrucciones al correo usado en la compra. Revisa también las
                carpetas de spam y promociones
                {buyerEmail ? (
                  <>
                    {" "}de <span className="break-words">{buyerEmail}</span>.
                  </>
                ) : (
                  "."
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-[#f7fff9] p-5 shadow-[0_16px_40px_rgba(22,163,74,0.08)]">
              <MessageCircle className="h-10 w-10 text-green-600" aria-hidden="true" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-green-700">
                Ayuda por WhatsApp
              </p>
              <p className="mt-2 text-[15px] font-semibold leading-relaxed text-neutral-700">
                Envía el mensaje automático a nuestro equipo para recibir las instrucciones de
                acceso.
              </p>
            </div>
          </div>

          {!buyerEmail && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
              No identificamos tu correo en esta página. Informa por WhatsApp el mismo correo que
              utilizaste al comprar para que podamos localizar tu acceso.
            </p>
          )}

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-green-600 px-3 py-4 text-center text-[14px] font-black uppercase leading-snug tracking-wide text-white shadow-[0_18px_42px_rgba(22,163,74,0.24)] transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:px-5 sm:text-[16px] md:text-[18px]"
          >
            <MessageCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            Recibir mi acceso por WhatsApp
          </a>

          <p className="mt-4 text-center text-sm font-medium leading-relaxed text-neutral-500">
            Si WhatsApp no se abre, envía un mensaje a {contactName} indicando el correo usado en
            la compra.
          </p>

          <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
            <p className="text-sm font-bold text-neutral-900">
              ¿Quieres entrar directamente al área de miembros?
            </p>
            <p className="mt-1 text-sm font-medium leading-relaxed text-neutral-600">
              Utiliza el mismo correo de la compra para acceder a tu contenido.
            </p>
            <a
              href={membersUrl}
              onClick={() => trackMembersClick("direct")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-neutral-950 px-3 py-4 text-center text-[13px] font-black uppercase leading-snug tracking-wide text-white transition hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 sm:px-5 sm:text-[15px] md:w-auto"
            >
              <LogIn className="mr-2 h-5 w-5" aria-hidden="true" />
              Acceder al área de miembros
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </div>

          {whatsappClicked && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-green-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold text-green-900">
                El mensaje está listo. Después de enviarlo, también puedes entrar al área de
                miembros.
              </p>
              <a
                href={membersUrl}
                onClick={() => trackMembersClick("after_whatsapp")}
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-green-200 bg-white px-5 py-3 text-center text-sm font-black uppercase tracking-wide text-green-700 transition hover:bg-green-100 md:w-auto"
              >
                Ya envié el mensaje, acceder ahora
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ThankYou;
