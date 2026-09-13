import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <section className="w-full max-w-md rounded-2xl border border-accent/20 bg-card p-6 text-center shadow-[0_18px_60px_-32px_rgba(0,0,0,0.8)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent/80">
          Página no encontrada
        </p>
        <h1 className="mt-3 font-serif text-3xl font-bold text-foreground">
          Este camino no existe
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Vuelve a tus productos y continúa con las clases liberadas.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Mis productos
          </Button>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
