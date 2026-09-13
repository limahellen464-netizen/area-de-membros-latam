import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, KeyRound, Link as LinkIcon, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { adminApi, AdminApiAuthError, type AdminSettingsResponse } from "./adminApi";
import { useAdminSession } from "./useAdminSession";

const copyToClipboard = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado!`);
  } catch {
    toast.error("Não foi possível copiar. Copie manualmente.");
  }
};

const AdminSettings = () => {
  const { password, login, logout } = useAdminSession();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<AdminSettingsResponse | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const loadSettings = useCallback(async () => {
    if (!password) return;
    setLoadingSettings(true);
    try {
      const data = await adminApi<AdminSettingsResponse>({ action: "get_settings", password });
      setSettings(data);
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setLoadingSettings(false);
    }
  }, [password, handleAuthError]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

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

  const regenerateToken = async () => {
    if (!password) return;
    if (
      !confirm(
        "Gerar um novo token invalida o token atual. Você vai precisar atualizar o webhook configurado no Perfect Pay. Continuar?",
      )
    )
      return;
    setRegenerating(true);
    try {
      const data = await adminApi<{ perfectpay_webhook_token: string }>({
        action: "regenerate_perfectpay_token",
        password,
      });
      setSettings((prev) => (prev ? { ...prev, perfectpay_webhook_token: data.perfectpay_webhook_token } : prev));
      toast.success("Novo token gerado! Atualize o Perfect Pay com o novo valor.");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie credenciais e a integração de pagamento do painel admin.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Integração Perfect Pay</CardTitle>
              <CardDescription className="text-muted-foreground">
                Cole esta URL e este token no Perfect Pay em Ferramentas → Postback / Webhook.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : settings ? (
            <div className="max-w-xl space-y-3">
              <div className="space-y-1.5">
                <Label>URL do webhook</Label>
                <div className="flex gap-2">
                  <Input readOnly value={settings.perfectpay_webhook_url} className="font-mono text-xs" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(settings.perfectpay_webhook_url, "URL")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Token secreto</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={settings.perfectpay_webhook_token || ""}
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(settings.perfectpay_webhook_token || "", "Token")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O Perfect Pay envia este valor no campo "token" de cada requisição — é assim que o
                  webhook confirma que a chamada veio mesmo do Perfect Pay.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={regenerateToken} disabled={regenerating}>
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Gerar novo token
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Não foi possível carregar as configurações.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Alterar Senha</CardTitle>
              <CardDescription className="text-muted-foreground">Mínimo 8 caracteres.</CardDescription>
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
              disabled={isSaving || newPassword.length < 8 || newPassword !== confirmPassword}
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
            Sessão admin expira automaticamente após 24h. Pra forçar logout agora, use o botão "Sair"
            na barra lateral.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default AdminSettings;
