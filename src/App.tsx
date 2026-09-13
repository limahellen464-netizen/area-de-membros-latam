import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@reconquista/ui/sonner";
import { Toaster } from "@reconquista/ui/toaster";
import { TooltipProvider } from "@reconquista/ui/tooltip";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index.tsx"));
const ProductContent = lazy(() => import("./pages/ProductContent.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin.tsx"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout.tsx"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard.tsx"));
const AdminQuizFunnel = lazy(() => import("./pages/admin/AdminQuizFunnel.tsx"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts.tsx"));
const AdminProductDetail = lazy(() => import("./pages/admin/AdminProductDetail.tsx"));
const AdminProductSections = lazy(() => import("./pages/admin/AdminProductSections.tsx"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings.tsx"));
const AdminSiteSettings = lazy(() => import("./pages/admin/AdminSiteSettings.tsx"));
const AdminAppearance = lazy(() => import("./pages/admin/AdminAppearance.tsx"));

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <div className="rounded-xl border border-accent/20 bg-card px-5 py-4 text-sm font-semibold text-muted-foreground">
      Cargando...
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename="/miembros">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/producto/:slug" element={<ProductContent />} />
            <Route path="/producto/:slug/clase/:lessonSlug" element={<ProductContent />} />
            <Route path="/produto/*" element={<Navigate to="/" replace />} />

            <Route path="/admin" element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/funil-quiz" element={<AdminQuizFunnel />} />
              <Route path="/admin/produtos" element={<AdminProducts />} />
              <Route path="/admin/produtos/:id" element={<AdminProductDetail />} />
              <Route path="/admin/produtos/:id/sections" element={<AdminProductSections />} />
              <Route path="/admin/configuracoes-globais" element={<AdminSiteSettings />} />
              <Route path="/admin/aparencia" element={<AdminAppearance />} />
              <Route path="/admin/configuracoes" element={<AdminSettings />} />
            </Route>
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
