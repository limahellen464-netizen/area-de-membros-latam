import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const AdminLatam = () => (
  <main className="flex min-h-screen items-center justify-center bg-background px-4">
    <section className="w-full max-w-xl rounded-2xl border border-primary/20 bg-card p-8 shadow-[0_18px_54px_-34px_hsl(var(--primary)/0.45)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <ShieldCheck className="h-6 w-6" />
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
        Painel administrativo LATAM
      </p>
      <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-foreground">
        Configuracao pendente do Supabase LATAM
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Este painel ficara em portugues e sera ligado ao Supabase Auth da organizacao LATAM
        quando o projeto `reconquista-latam` estiver disponivel na CLI. Por enquanto, nenhum
        dado brasileiro, comprador, progresso, gateway ou suporte foi conectado aqui.
      </p>
      <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
        <a href="/miembros">Voltar para a area de membros</a>
      </Button>
    </section>
  </main>
);

export default AdminLatam;
