import { useState } from "react";
import { Button } from "@reconquista/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@reconquista/ui/sheet";
import { Avatar, AvatarFallback } from "@reconquista/ui/avatar";
import { HelpCircle, LogOut, Menu, ScrollText, User } from "lucide-react";
import { useSiteSettings } from "@/lib/siteSettings";

interface PremiumHeaderProps {
  buyerName: string;
  email: string;
  purchasedCount: number;
  totalCount: number;
  onLogout: () => void;
  /** Override do support_email do site settings (uso opcional). */
  supportEmail?: string;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CR";
  if (parts.length === 1) return parts[0]!.substring(0, 2).toUpperCase();
  return `${parts[0]![0]!}${parts[parts.length - 1]![0]!}`.toUpperCase();
};

export const PremiumHeader = ({
  buyerName,
  email,
  purchasedCount,
  totalCount,
  onLogout,
  supportEmail,
}: PremiumHeaderProps) => {
  const { setting } = useSiteSettings();
  const brandName = "El Código de la Reconquista";
  const brandSubtitle = "Área de Miembros";
  const resolvedSupportEmail = supportEmail || setting("site.support_email");
  const [open, setOpen] = useState(false);
  const initials = getInitials(buyerName);

  return (
    <header className="sticky top-0 z-30 border-b border-accent/20 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/40 bg-accent/10 font-serif text-base font-bold text-accent">
            CR
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-bold text-foreground sm:text-base">
              {brandName}
            </h1>
            <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              {brandSubtitle}
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* Counter pill */}
        <div className="hidden items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 sm:flex">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Acceso</span>
          <span className="font-mono text-sm font-bold tabular-nums text-accent">
            {purchasedCount}<span className="text-muted-foreground">/{totalCount}</span>
          </span>
        </div>

        {/* Avatar trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full p-0 hover:bg-accent/10"
              aria-label="Abrir menú"
            >
              <Avatar className="h-9 w-9 border border-accent/40">
                <AvatarFallback className="bg-primary/20 text-xs font-bold text-accent">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px] border-l border-accent/20 bg-card">
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-accent/40">
                  <AvatarFallback className="bg-primary/20 font-bold text-accent">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-base">{buyerName}</SheetTitle>
                  <SheetDescription className="truncate text-xs">{email}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 sm:hidden">
              <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Contenidos liberados
                </span>
                <span className="font-mono text-base font-bold tabular-nums text-accent">
                  {purchasedCount}/{totalCount}
                </span>
              </div>
            </div>

            <nav className="mt-6 flex flex-col gap-1">
              <Button
                asChild
                variant="ghost"
                className="justify-start gap-3 text-foreground"
                onClick={() => setOpen(false)}
              >
                <a href={`mailto:${resolvedSupportEmail}`}>
                  <HelpCircle className="h-4 w-4" />
                  Soporte
                </a>
              </Button>
              <Button asChild variant="ghost" className="justify-start gap-3 text-foreground">
                <a
                  href="https://recuperaatuexahora.com/terminos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ScrollText className="h-4 w-4" />
                  Términos de uso
                </a>
              </Button>
              <Button asChild variant="ghost" className="justify-start gap-3 text-foreground">
                <a
                  href="https://recuperaatuexahora.com/privacidad"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <User className="h-4 w-4" />
                  Privacidad
                </a>
              </Button>

              <div className="my-3 border-t border-border" />

              <Button
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
