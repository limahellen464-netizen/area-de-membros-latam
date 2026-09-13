import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle,
  Eye,
  FileText,
  Loader2,
  MousePointer,
  PlayCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import {
  adminApi,
  AdminApiAuthError,
  type AdminAccessDiagnostic,
  type AdminAnalytics,
  type AdminCompletionStats,
} from "./adminApi";
import { useAdminSession } from "./useAdminSession";

type Period = "7d" | "30d" | "90d";

const formatDateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString("pt-BR") : "Nunca";

interface ModuleCompletionsResponse {
  userCompletions: Record<
    string,
    {
      total: number;
      modules: { name: string; product: string; completed_at: string }[];
    }
  >;
  totalModulesAvailable: number;
  dailyCompletions: Record<string, number>;
  moduleStats: AdminCompletionStats["moduleStats"];
  productStats: AdminCompletionStats["productStats"];
  todayCompletions: number;
  todayVideoCompletions: number;
  totalVideoCompletions: number;
  videoCompletionUsers: number;
  videoModulesCount: number;
}

const AdminDashboard = () => {
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [moduleCompletions, setModuleCompletions] = useState<
    ModuleCompletionsResponse["userCompletions"] | null
  >(null);
  const [totalModulesAvailable, setTotalModulesAvailable] = useState(0);
  const [completionStats, setCompletionStats] =
    useState<AdminCompletionStats | null>(null);
  const [diagnosticEmail, setDiagnosticEmail] = useState("");
  const [diagnostic, setDiagnostic] = useState<AdminAccessDiagnostic | null>(null);
  const [isDiagnosticLoading, setIsDiagnosticLoading] = useState(false);
  const [grantingProductId, setGrantingProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const loadAnalytics = useCallback(async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const data = await adminApi<AdminAnalytics>({
        action: "get_analytics",
        password,
        period,
      });
      setAnalytics(data);
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [password, period, handleAuthError]);

  const loadModuleCompletions = useCallback(async () => {
    if (!password) return;
    try {
      const data = await adminApi<ModuleCompletionsResponse>({
        action: "get_module_completions",
        password,
      });
      setModuleCompletions(data.userCompletions || {});
      setTotalModulesAvailable(data.totalModulesAvailable || 0);
      setCompletionStats({
        dailyCompletions: data.dailyCompletions || {},
        moduleStats: data.moduleStats || [],
        productStats: data.productStats || [],
        todayCompletions: data.todayCompletions || 0,
        todayVideoCompletions: data.todayVideoCompletions || 0,
        totalVideoCompletions: data.totalVideoCompletions || 0,
        videoCompletionUsers: data.videoCompletionUsers || 0,
        videoModulesCount: data.videoModulesCount || 0,
      });
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      console.error(err);
    }
  }, [password, handleAuthError]);

  useEffect(() => {
    loadAnalytics();
    loadModuleCompletions();
  }, [loadAnalytics, loadModuleCompletions]);

  const runAccessDiagnostic = useCallback(async () => {
    const email = diagnosticEmail.trim().toLowerCase();
    if (!password || !email) {
      toast.error("Informe o e-mail do cliente.");
      return;
    }
    setIsDiagnosticLoading(true);
    try {
      const data = await adminApi<AdminAccessDiagnostic>({
        action: "diagnose_member_access",
        password,
        email,
      });
      setDiagnostic(data);
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      console.error(err);
      toast.error("Erro ao diagnosticar acesso.");
    } finally {
      setIsDiagnosticLoading(false);
    }
  }, [diagnosticEmail, handleAuthError, password]);

  const grantAccess = useCallback(
    async (productSettingsId: string) => {
      const email = diagnostic?.email || diagnosticEmail.trim().toLowerCase();
      if (!password || !email || !productSettingsId) return;
      if (!window.confirm(`Liberar este produto manualmente para ${email}?`)) return;
      setGrantingProductId(productSettingsId);
      try {
        await adminApi({
          action: "grant_member_access",
          password,
          email,
          product_settings_id: productSettingsId,
        });
        toast.success("Acesso liberado.");
        const data = await adminApi<AdminAccessDiagnostic>({
          action: "diagnose_member_access",
          password,
          email,
        });
        setDiagnostic(data);
      } catch (err) {
        if (err instanceof AdminApiAuthError) {
          handleAuthError();
          return;
        }
        console.error(err);
        toast.error("Erro ao liberar acesso.");
      } finally {
        setGrantingProductId(null);
      }
    },
    [diagnostic?.email, diagnosticEmail, handleAuthError, password],
  );

  const chartData = analytics
    ? Object.entries(analytics.dailyLogins)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          }),
          acessos: count,
        }))
        .slice(-14)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Métricas de acesso, conclusões e atividade.
        </p>
      </div>

      <Card className="border-border bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-primary" />
            <div>
              <p className="text-lg font-semibold text-foreground">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-xs text-muted-foreground">Data de hoje</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {completionStats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {completionStats.todayCompletions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conclusões Hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {completionStats.todayVideoCompletions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vídeos Concluídos Hoje
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {completionStats.totalVideoCompletions}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Vídeos Concluídos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {completionStats.videoCompletionUsers}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Alunos com Vídeo Concluído
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-muted-foreground">Período:</Label>
        {(["7d", "30d", "90d"] as Period[]).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? "default" : "outline"}
            onClick={() => setPeriod(p)}
          >
            {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "90 dias"}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            loadAnalytics();
            loadModuleCompletions();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Search className="h-5 w-5" />
            Diagnóstico de acesso por e-mail
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Verifique compras ativas, produtos liberados, últimos acessos e liberação manual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              placeholder="email@cliente.com"
              value={diagnosticEmail}
              onChange={(event) => setDiagnosticEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runAccessDiagnostic();
              }}
            />
            <Button
              onClick={runAccessDiagnostic}
              disabled={isDiagnosticLoading}
              className="sm:w-44"
            >
              {isDiagnosticLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Diagnosticar
            </Button>
          </div>

          {diagnostic && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">Compras ativas</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diagnostic.activePurchases}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">Produtos liberados</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diagnostic.unlockedProducts.length}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/50 p-3">
                  <p className="text-xs text-muted-foreground">Aulas concluídas</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {diagnostic.moduleCompletionsCount}
                  </p>
                </div>
              </div>

              {diagnostic.issues.length > 0 ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="space-y-1 text-sm text-foreground">
                      {diagnostic.issues.map((issue) => (
                        <p key={issue}>{issue}</p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-600/30 bg-emerald-500/10 p-3 text-sm text-foreground">
                  Nenhum problema encontrado para este e-mail.
                </div>
              )}

              {diagnostic.studentProgress && (
                <div className="rounded-lg border border-border bg-background/40">
                  <div className="border-b border-border p-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Consumo de aulas e consultoria
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mostra o que o aluno acessou, concluiu e qual foi o último ponto conhecido.
                    </p>
                  </div>

                  <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Aulas acessadas</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {diagnostic.studentProgress.viewed_lessons}/
                        {diagnostic.studentProgress.total_lessons}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Aulas concluídas</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {diagnostic.studentProgress.completed_lessons}/
                        {diagnostic.studentProgress.total_lessons}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Último acesso</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatDateTime(diagnostic.studentProgress.last_access_at)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <p className="text-xs text-muted-foreground">Formulário consultoria</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {diagnostic.studentProgress.consultoria_clicks}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {formatDateTime(diagnostic.studentProgress.last_consultoria_click_at)}
                      </p>
                    </div>
                  </div>

                  {diagnostic.studentProgress.last_lesson ? (
                    <div className="mx-3 mb-3 rounded-lg border border-primary/25 bg-primary/5 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Último ponto conhecido
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {diagnostic.studentProgress.last_lesson.product_name} —{" "}
                        {diagnostic.studentProgress.last_lesson.section_title || "Aulas"} —{" "}
                        {diagnostic.studentProgress.last_lesson.module_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última atividade:{" "}
                        {formatDateTime(
                          diagnostic.studentProgress.last_lesson.last_viewed_at ||
                            diagnostic.studentProgress.last_lesson.completed_at,
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="mx-3 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-foreground">
                      Nenhuma aula acessada ou concluída registrada para este e-mail.
                    </div>
                  )}

                  <div className="space-y-3 p-3 pt-0">
                    {diagnostic.studentProgress.products.map((product) => (
                      <div key={product.product_id} className="rounded-lg border border-border bg-card">
                        <div className="border-b border-border p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                {product.product_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.viewed_lessons}/{product.total_lessons} acessadas ·{" "}
                                {product.completed_lessons}/{product.total_lessons} concluídas
                              </p>
                            </div>
                            <Badge variant={product.completed_lessons > 0 ? "default" : "secondary"}>
                              {product.progress_percent}% concluído
                            </Badge>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${product.progress_percent}%` }}
                            />
                          </div>
                        </div>

                        <div className="max-h-80 overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Aula</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Última atividade</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {product.lessons.map((lesson) => (
                                <TableRow key={lesson.module_id}>
                                  <TableCell className="min-w-64">
                                    <p className="text-sm font-medium text-foreground">
                                      {lesson.lesson_number}. {lesson.module_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {lesson.section_number
                                        ? `Módulo ${lesson.section_number}: `
                                        : ""}
                                      {lesson.section_title || "Aulas"}
                                    </p>
                                  </TableCell>
                                  <TableCell>
                                    {lesson.completed ? (
                                      <Badge variant="default">Concluída</Badge>
                                    ) : lesson.viewed ? (
                                      <Badge variant="outline">Acessou</Badge>
                                    ) : (
                                      <Badge variant="secondary">Não acessou</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {formatDateTime(lesson.last_viewed_at || lesson.completed_at)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              {product.lessons.length === 0 && (
                                <TableRow>
                                  <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                    Nenhuma aula publicada para este produto.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}
                    {diagnostic.studentProgress.products.length === 0 && (
                      <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                        Nenhum produto liberado para montar o mapa de aulas.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border p-3">
                    <h3 className="text-sm font-semibold text-foreground">Compras</h3>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mapa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnostic.purchases.map((purchase) => (
                          <TableRow key={purchase.transaction_id}>
                            <TableCell className="max-w-52 truncate text-sm">
                              {purchase.product_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={purchase.status === "active" ? "default" : "secondary"}
                              >
                                {purchase.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {purchase.mapped ? (
                                <Badge variant="outline">OK</Badge>
                              ) : (
                                <Badge variant="destructive">Sem mapa</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {diagnostic.purchases.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                              Nenhuma compra encontrada.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="rounded-lg border border-border">
                  <div className="border-b border-border p-3">
                    <h3 className="text-sm font-semibold text-foreground">Produtos da área</h3>
                  </div>
                  <div className="max-h-72 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {diagnostic.availableProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="max-w-52 truncate text-sm">
                              {product.product_name}
                            </TableCell>
                            <TableCell>
                              {product.alreadyUnlocked ? (
                                <Badge variant="default">Liberado</Badge>
                              ) : product.visible ? (
                                <Badge variant="secondary">Bloqueado</Badge>
                              ) : (
                                <Badge variant="outline">Oculto</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!product.alreadyUnlocked && product.visible && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => grantAccess(product.id)}
                                  disabled={grantingProductId === product.id}
                                >
                                  {grantingProductId === product.id && (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  )}
                                  Liberar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border">
                <div className="border-b border-border p-3">
                  <h3 className="text-sm font-semibold text-foreground">Últimos eventos</h3>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diagnostic.recentAccess.slice(0, 8).map((log, index) => (
                      <TableRow key={`${log.action}-${log.created_at}-${index}`}>
                        <TableCell className="font-mono text-xs">{log.action}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {diagnostic.recentAccess.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                          Nenhum evento registrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.totalLogins}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total de Acessos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.uniqueUsers}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Usuários Únicos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.productViews}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Visualizações
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <MousePointer className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.productClicks}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cliques Produto
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {analytics.checkoutClicks}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cliques Checkout
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {completionStats && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <TrendingUp className="h-5 w-5" />
                  Comparação: Acessos vs Conclusões de Módulos
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Evolução diária de acessos e conclusões de módulos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={(() => {
                      const allDates = new Set<string>();
                      Object.keys(analytics.dailyLogins).forEach((d) =>
                        allDates.add(d),
                      );
                      Object.keys(completionStats.dailyCompletions).forEach(
                        (d) => allDates.add(d),
                      );
                      return [...allDates]
                        .sort()
                        .slice(-14)
                        .map((date) => ({
                          date: new Date(
                            date + "T12:00:00",
                          ).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                          }),
                          acessos: analytics.dailyLogins[date] || 0,
                          conclusoes:
                            completionStats.dailyCompletions[date] || 0,
                        }));
                    })()}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="acessos"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Acessos"
                    />
                    <Line
                      type="monotone"
                      dataKey="conclusoes"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Conclusões"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {completionStats && completionStats.productStats.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-5 w-5" />
                  Conclusões por Produto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={completionStats.productStats}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="name"
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar
                      dataKey="totalCompletions"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      name="Conclusões"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {completionStats && completionStats.moduleStats.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <PlayCircle className="h-5 w-5" />
                  Conclusões por Módulo
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {completionStats.videoModulesCount} módulos com vídeo de{" "}
                  {totalModulesAvailable} total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {completionStats.moduleStats
                    .slice()
                    .sort((a, b) => b.completions - a.completions)
                    .map((mod) => {
                      const max = Math.max(
                        ...completionStats.moduleStats.map(
                          (m) => m.completions,
                        ),
                        1,
                      );
                      return (
                        <div key={mod.id} className="flex items-center gap-3">
                          <div className="flex w-5 shrink-0 items-center gap-1.5">
                            {mod.hasVideo ? (
                              <Video className="h-4 w-4 text-primary" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm text-foreground">
                                {mod.name}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                ({mod.product})
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${(mod.completions / max) * 100}%`,
                                  backgroundColor: mod.hasVideo
                                    ? "hsl(var(--primary))"
                                    : "hsl(var(--muted-foreground))",
                                }}
                              />
                            </div>
                          </div>
                          <Badge
                            variant={
                              mod.completions > 0 ? "default" : "secondary"
                            }
                            className="shrink-0"
                          >
                            {mod.completions}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="h-5 w-5" />
                  Acessos Diários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="date"
                      className="text-xs fill-muted-foreground"
                    />
                    <YAxis className="text-xs fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar
                      dataKey="acessos"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <BookOpen className="h-5 w-5" />
                Conclusão de Módulos por Cliente
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Total de módulos disponíveis: {totalModulesAvailable}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moduleCompletions && Object.keys(moduleCompletions).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Módulos Concluídos</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(moduleCompletions)
                      .sort(([, a], [, b]) => b.total - a.total)
                      .map(([email, data]) => (
                        <TableRow key={email}>
                          <TableCell className="font-mono text-sm">
                            {email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {data.total} / {totalModulesAvailable}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{
                                    width: `${
                                      totalModulesAvailable > 0
                                        ? (data.total /
                                            totalModulesAvailable) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {totalModulesAvailable > 0
                                  ? Math.round(
                                      (data.total / totalModulesAvailable) *
                                        100,
                                    )
                                  : 0}
                                %
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <details className="text-xs">
                              <summary className="cursor-pointer text-primary hover:underline">
                                Ver módulos
                              </summary>
                              <ul className="mt-1 space-y-1 pl-2">
                                {data.modules.map((m, i) => (
                                  <li key={i} className="text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {m.product}
                                    </span>{" "}
                                    → {m.name}
                                    <span className="ml-1 text-xs opacity-60">
                                      (
                                      {new Date(
                                        m.completed_at,
                                      ).toLocaleDateString("pt-BR")}
                                      )
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhuma conclusão de módulo registrada ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Acessos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recentAccess.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">
                        {log.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                  {analytics.recentAccess.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Nenhum acesso registrado ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="flex justify-center py-12">
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem dados de analytics ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
