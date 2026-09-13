import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@reconquista/ui/button";
import { Input } from "@reconquista/ui/input";
import { Label } from "@reconquista/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reconquista/ui/card";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi, AdminApiAuthError } from "./adminApi";
import { useAdminSession } from "./useAdminSession";

const AdminSettings = () => {
  const { password, login, logout } = useAdminSession();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const changePassword = async () => {
    if (!password) return;
    if (newPassword.length < 8) {
      toast.error("A senha precisa ter no mínimo 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setIsSaving(true);
    try {
      await adminApi({
        action: "change_password",
        password,
        new_password: newPassword,
      });
      // Atualiza sessão com nova senha
      login(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha alterada com sucesso!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie credenciais e preferências do painel admin.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Alterar Senha</CardTitle>
              <CardDescription className="text-muted-foreground">
                Mínimo 8 caracteres. Hash bcrypt server-side.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button
              onClick={changePassword}
              disabled={
                isSaving ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nova senha
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Sessão</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sessão admin expira automaticamente após 24h. Pra forçar logout
            agora, use o botão "Sair" na barra lateral.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default AdminSettings;
