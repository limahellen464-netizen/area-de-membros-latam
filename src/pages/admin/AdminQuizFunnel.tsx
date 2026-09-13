import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  Loader2,
  MousePointerClick,
  RefreshCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
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
  type AdminQuizFunnelAnalytics,
} from "./adminApi";
import { useAdminSession } from "./useAdminSession";

type Period = "today" | "yesterday" | "7d" | "30d" | "90d" | "custom";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "custom", label: "Personalizado" },
];

const RESULT_LABELS: Record<string, string> = {
  emergencia: "Emergência emocional",
  reconstrucao: "Reconstrução de imagem",
  reatracao: "Reatração estratégica",
  curioso: "Clareza inicial",
};

const currency = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const percent = (value: number) => `${Number(value || 0).toLocaleString("pt-BR")}%`;

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const localDateInput = (date: Date) => {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

const AdminQuizFunnel = () => {
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("today");
  const [startDate, setStartDate] = useState(() => localDateInput(new Date()));
  const [endDate, setEndDate] = useState(() => localDateInput(new Date()));
  const [data, setData] = useState<AdminQuizFunnelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const response = await adminApi<AdminQuizFunnelAnalytics>({
        action: "get_quiz_funnel_analytics_v2",
        password,
        period,
        startDate: period === "custom" ? startDate : undefined,
        endDate: period === "custom" ? endDate : undefined,
      });
      setData(response);
    } catch (error) {
      if (error instanceof AdminApiAuthError) {
        logout();
        navigate("/admin", { replace: true });
        return;
      }
      toast.error("Não foi possível carregar o funil do quiz.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [endDate, logout, navigate, password, period, startDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const stageValue = useCallback(
    (key: string) => data?.stages.find((stage) => stage.key === key)?.sessions || 0,
    [data],
  );

  const uniqueSessions = data?.uniqueSessions || 0;
  const starts = stageValue("starts");
  const offerReveals = stageValue("offerReveals");
  const checkoutClicks = data?.checkoutClicksWithRecovery ?? stageValue("checkoutClicks");
  const trackedCheckoutClicks = data?.trackedCheckoutClicks ?? checkoutClicks;
  const recoveredCheckoutClicks = data?.recoveredCheckoutClicks ?? 0;
  const purchases = data?.totalPurchases ?? stageValue("purchases");
  const revenue = data?.totalRevenue ?? 0;

  const startRate = uniqueSessions > 0 ? Math.round((starts / uniqueSessions) * 1000) / 10 : 0;
  const checkoutRate =
    uniqueSessions > 0 ? Math.round((checkoutClicks / uniqueSessions) * 1000) / 10 : 0;
  const purchaseRate =
    checkoutClicks > 0 ? Math.round((purchases / checkoutClicks) * 1000) / 10 : 0;

  const topCampaigns = useMemo(() => data?.campaigns.slice(0, 30) || [], [data]);
  const purchaseRows = useMemo(() => data?.purchases?.slice(0, 80) || [], [data]);
  const biggestQuestionBottleneck = useMemo(
    () =>
      (data?.questions || [])
        .filter((question) => question.reached > 0)
        .sort((a, b) => a.answerRate - b.answerRate)[0] || null,
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Aquisição
          </p>
          <h1 className="text-2xl font-bold text-foreground">Funil Quiz + Mini VSL</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dados de /quizvsl com UTMs, checkout iniciado e compras reais do
            Payt. Webhooks legados ficam apenas para histórico.
          </p>
          {data?.periodLabel && (
            <p className="mt-2 text-xs text-muted-foreground">
              Período analisado: <strong>{data.periodLabel}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={period === item.value ? "default" : "outline"}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                className="h-9 rounded-md border bg-background px-2 text-sm"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">até</span>
              <input
                className="h-9 rounded-md border bg-background px-2 text-sm"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          )}
          <Button size="icon" variant="outline" onClick={() => void loadData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              ["Sessões no quiz", uniqueSessions, Users],
              ["Iniciaram o quiz", `${starts} · ${percent(startRate)}`, Activity],
              ["Oferta liberada", offerReveals, Activity],
              ["Checkout iniciado", checkoutClicks, MousePointerClick],
              ["Compras aprovadas", purchases, CircleDollarSign],
              ["Checkout → compra", `${percent(purchaseRate)} · ${currency(revenue)}`, ShoppingCart],
            ].map(([label, value, Icon]) => (
              <Card key={String(label)}>
                <CardContent className="flex items-center justify-between gap-3 p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{String(label)}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{String(value)}</p>
                    {String(label) === "Checkout iniciado" && (
                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                        {recoveredCheckoutClicks > 0
                          ? `${trackedCheckoutClicks} registrados + ${recoveredCheckoutClicks} recuperados`
                          : "Cliques registrados no botão"}
                      </p>
                    )}
                  </div>
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                </CardContent>
              </Card>
            ))}
          </div>

          {biggestQuestionBottleneck && (
            <Card className="border-amber-300 bg-amber-50/80">
              <CardContent className="flex items-start gap-3 p-5">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-950">
                    Maior gargalo entre as perguntas
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    Etapa {biggestQuestionBottleneck.order}:{" "}
                    <strong>{biggestQuestionBottleneck.title}</strong>
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {biggestQuestionBottleneck.reached} chegaram,{" "}
                    {biggestQuestionBottleneck.answered} responderam e{" "}
                    {biggestQuestionBottleneck.abandoned} abandonaram nesta tela.
                    Taxa de resposta: {biggestQuestionBottleneck.answerRate}%.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Progressão do funil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.stages || []).map((stage) => (
                  <div key={stage.key}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-foreground">{stage.label}</span>
                      <span className="text-muted-foreground">
                        {stage.sessions} · {stage.overallRate}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(1, stage.overallRate)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessões, checkout e compras por dia</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.daily || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" name="Sessões" stroke="#c91d2e" strokeWidth={2} />
                    <Line type="monotone" dataKey="checkoutClicks" name="Checkout" stroke="#16a34a" strokeWidth={2} />
                    <Line type="monotone" dataKey="purchases" name="Compras" stroke="#2563eb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Compradores atribuídos ao quiz</CardTitle>
              <p className="text-sm text-muted-foreground">
                Compras aprovadas encontradas nos webhooks e cruzadas por sessão,
                fbclid, UTMs, src/sck/xcod ou campanhas com nomenclatura de quiz.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {purchaseRows.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nenhuma compra aprovada atribuída ao quiz neste período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Atribuição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseRows.map((purchase) => (
                      <TableRow key={`${purchase.transactionId}-${purchase.purchaseDate}`}>
                        <TableCell>{formatDateTime(purchase.purchaseDate)}</TableCell>
                        <TableCell className="font-medium">{purchase.buyerEmail}</TableCell>
                        <TableCell className="max-w-56 truncate">{purchase.productName}</TableCell>
                        <TableCell>{purchase.gateway}</TableCell>
                        <TableCell>{currency(purchase.value)}</TableCell>
                        <TableCell className="max-w-60 truncate">{purchase.campaign}</TableCell>
                        <TableCell className="max-w-48 truncate">{purchase.content || "—"}</TableCell>
                        <TableCell>{purchase.attributionMethod}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Gargalo por pergunta e resposta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Alcance, abandono e distribuição das alternativas em cada etapa.
                Nenhum nome, e-mail ou resposta pessoal de texto é gravado nesta
                seção do funil.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data?.questions || []).length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Os detalhes por pergunta aparecerão conforme novos leads passarem
                  pelo quiz após a atualização do rastreamento.
                </p>
              ) : (
                (data?.questions || []).map((question) => (
                  <div key={question.questionId} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                          Etapa {question.order} · Fase {question.phase || "—"}
                        </p>
                        <h3 className="mt-1 font-semibold text-foreground">
                          {question.title}
                        </h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted px-3 py-2">
                          <strong className="block text-base text-foreground">
                            {question.reached}
                          </strong>
                          chegaram
                        </div>
                        <div className="rounded-md bg-emerald-50 px-3 py-2 text-emerald-800">
                          <strong className="block text-base">{question.answered}</strong>
                          responderam
                        </div>
                        <div className="rounded-md bg-red-50 px-3 py-2 text-red-800">
                          <strong className="block text-base">{question.abandoned}</strong>
                          abandonaram
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>Resposta: {question.answerRate}%</span>
                      <span>Retenção da etapa: {question.stepRetention}%</span>
                      <span>Alcance total: {question.arrivalRate}%</span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {question.answers.map((answer) => (
                        <div key={answer.answerId}>
                          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                            <span className="text-foreground">{answer.label}</span>
                            <span className="shrink-0 text-muted-foreground">
                              {answer.sessions} · {answer.share}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(answer.share, 1)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campanhas e criativos</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Origem / campanha</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Concluiu quiz</TableHead>
                    <TableHead>Oferta</TableHead>
                    <TableHead>Checkout</TableHead>
                    <TableHead>Quiz → checkout</TableHead>
                    <TableHead>Compras</TableHead>
                    <TableHead>Checkout → compra</TableHead>
                    <TableHead>Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topCampaigns.map((campaign) => (
                    <TableRow key={`${campaign.source}-${campaign.campaign}-${campaign.content}`}>
                      <TableCell>
                        <p className="font-medium">{campaign.source}</p>
                        <p className="max-w-64 truncate text-xs text-muted-foreground">
                          {campaign.campaign}
                        </p>
                      </TableCell>
                      <TableCell className="max-w-48 truncate">{campaign.content || "—"}</TableCell>
                      <TableCell>{campaign.sessions}</TableCell>
                      <TableCell>{campaign.starts}</TableCell>
                      <TableCell>{campaign.completes}</TableCell>
                      <TableCell>{campaign.offerReveals}</TableCell>
                      <TableCell>{campaign.checkoutClicks}</TableCell>
                      <TableCell>{campaign.checkoutRate}%</TableCell>
                      <TableCell>{campaign.purchases || 0}</TableCell>
                      <TableCell>{campaign.purchaseRate || 0}%</TableCell>
                      <TableCell>{currency(campaign.revenue || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Dispositivos e diagnósticos</CardTitle></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Dispositivos</p>
                  {(data?.devices || []).map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{item.name}</span>
                      <strong>{item.sessions}</strong>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Resultados</p>
                  {(data?.results || []).map((item) => (
                    <div key={item.name} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {RESULT_LABELS[item.name] || item.name}
                      </span>
                      <strong>{item.sessions}</strong>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Sessões recentes</CardTitle></CardHeader>
              <CardContent className="max-h-96 space-y-3 overflow-y-auto">
                {(data?.recentSessions || []).map((session) => (
                  <div key={`${session.sessionId}-${session.lastSeenAt}`} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{session.deepestStage}</p>
                        <p className="text-xs text-muted-foreground">
                          {session.source} · {session.campaign}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(session.lastSeenAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {session.device} ·{" "}
                      {session.result ? RESULT_LABELS[session.result] || session.result : "sem resultado"} ·{" "}
                      {session.durationSeconds}s
                    </p>
                    {session.purchaseValue > 0 && (
                      <p className="mt-2 text-xs font-semibold text-emerald-700">
                        Compra aprovada · {currency(session.purchaseValue)}
                        {session.purchaseAttributionMethod
                          ? ` · ${session.purchaseAttributionMethod}`
                          : ""}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminQuizFunnel;
