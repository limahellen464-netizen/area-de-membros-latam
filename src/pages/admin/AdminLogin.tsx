import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { adminApi, AdminApiAuthError } from "./adminApi";
import { useAdminSession } from "./useAdminSession";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminSession();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await adminApi({ action: "get_products", password });
      login(password);
      toast.success("Login realizado com sucesso!");
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        toast.error("Senha incorreta");
      } else {
        toast.error("Erro ao conectar com o servidor");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Painel Admin
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Insira a senha de administrador para continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Entrar
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              Sessão válida por 24 horas.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
