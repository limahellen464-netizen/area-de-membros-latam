import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { MARKET } from "./config/market";

const Index = lazy(() => import("./pages/Index"));
const QuizVsl = lazy(() => import("./pages/QuizVsl"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const ThankYou = lazy(() => import("./pages/ThankYou"));

const routeMetadata: Record<string, { title: string; description: string }> = {
  "/": {
    title: MARKET.brand,
    description: "El método para reconstruir la conexión emocional y recuperar a tu ex.",
  },
  "/quizvsl": {
    title: `Diagnóstico personalizado | ${MARKET.brand}`,
    description: "Responde unas preguntas y descubre el próximo paso más adecuado para recuperar la conexión con tu ex.",
  },
  "/terminos-de-uso": {
    title: `Términos de uso | ${MARKET.brand}`,
    description: "Términos de uso de El Código de la Reconquista.",
  },
  "/politica-de-privacidad": {
    title: `Política de privacidad | ${MARKET.brand}`,
    description: "Política de privacidad de El Código de la Reconquista.",
  },
  "/gracias": {
    title: `¡Gracias por tu compra! | ${MARKET.brand}`,
    description: "Tu compra fue confirmada. Consulta cómo acceder a El Código de la Reconquista.",
  },
};

const PageMetadata = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = routeMetadata[pathname] ?? routeMetadata["/"];
    const canonicalPath = pathname === "/" ? "/" : pathname;
    const canonicalUrl = `${MARKET.canonicalOrigin}${canonicalPath}`;
    document.title = metadata.title;

    const setMeta = (selector: string, attribute: "content" | "href", value: string) => {
      document.querySelector<HTMLElement>(selector)?.setAttribute(attribute, value);
    };

    setMeta('meta[name="description"]', "content", metadata.description);
    setMeta('meta[property="og:title"]', "content", metadata.title);
    setMeta('meta[property="og:description"]', "content", metadata.description);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "content", metadata.title);
    setMeta('meta[name="twitter:description"]', "content", metadata.description);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
  }, [pathname]);

  return null;
};

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#080809] font-semibold text-neutral-300">
    Cargando...
  </div>
);

const App = () => (
  <BrowserRouter>
    <PageMetadata />
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/quizvsl" element={<QuizVsl />} />
        <Route path="/quiz-vsl" element={<Navigate to="/quizvsl" replace />} />
        <Route path="/terminos-de-uso" element={<TermsOfUse />} />
        <Route path="/politica-de-privacidad" element={<PrivacyPolicy />} />
        <Route path="/gracias" element={<ThankYou />} />
        <Route path="/obrigado" element={<Navigate to="/gracias" replace />} />
        <Route path="/thank-you" element={<Navigate to="/gracias" replace />} />
        <Route path="/youtube" element={<Navigate to="/yt" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
