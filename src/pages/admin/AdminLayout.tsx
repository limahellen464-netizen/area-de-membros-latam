import { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Activity, BarChart3, Globe, LogOut, Package, Palette, Settings, Shield } from "lucide-react";
import { useAdminSession } from "./useAdminSession";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Shield;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/admin/funil-quiz", label: "Funil Quiz", icon: Activity },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/configuracoes-globais", label: "Textos do site", icon: Globe },
  { to: "/admin/aparencia", label: "Aparência", icon: Palette },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

const AdminLayout = () => {
  const { isLoggedIn, isHydrated, logout } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();

  // Gate: redireciona pra login se não tem sessão (após hidratar)
  useEffect(() => {
    if (isHydrated && !isLoggedIn) {
      navigate("/admin", { replace: true });
    }
  }, [isHydrated, isLoggedIn, navigate]);

  // Splash enquanto hidrata
  if (!isHydrated || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl">
        {/* SIDEBAR */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card px-4 py-6 md:flex md:flex-col">
          <div className="mb-6 flex items-center gap-2 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Painel Admin</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Código da Reconquista
              </p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={false}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="mt-2 w-full justify-start"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </aside>

        {/* MAIN COLUMN */}
        <div className="flex w-full min-w-0 flex-col">
          {/* MOBILE TOP NAV */}
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-bold text-foreground">Admin</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="h-8"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sair
            </Button>
          </header>
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* OUTLET */}
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
