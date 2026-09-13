import { useState } from "react";
import { Button } from "@reconquista/ui/button";
import { LogOut, Menu, X } from "lucide-react";

interface MembersHeaderProps {
  /** Nome do comprador (dinâmico — customer.name do raw_payload OU email split). */
  buyerName: string;
  /** Email logado (exibido no menu hamburger expandido). */
  email: string;
  /** Produtos comprados pelo usuário. */
  purchasedCount: number;
  /** Total de produtos visíveis no catálogo. */
  totalCount: number;
  /** Callback de logout (limpa state + localStorage no parent). */
  onLogout: () => void;
}

/**
 * Header da área de membros. Visual reproduzido do antigo
 * cdrmembros.vercel.app:
 *   [Centro: "Código da Reconquista" / buyerName + X/N]   [hamburger ▤]
 * Quando hamburger aberto, painel desce mostrando email + "Sair da conta".
 *
 * Brand "Código da Reconquista" é fixo (matching old bundle); buyerName
 * é dinâmico conforme escolha do usuário (resposta #1 do plano).
 */
const MembersHeader = ({
  buyerName,
  email,
  purchasedCount,
  totalCount,
  onLogout,
}: MembersHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-base font-bold text-foreground sm:text-lg">
              Código da Reconquista
            </h1>
            <span className="block truncate text-[10px] text-muted-foreground sm:text-xs">
              {buyerName}
            </span>
          </div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {purchasedCount}/{totalCount}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-border text-foreground"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </Button>
        </div>
      </div>
      {menuOpen && (
        <div className="border-t border-border bg-card">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <p className="mb-2 truncate text-xs text-muted-foreground">{email}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default MembersHeader;
