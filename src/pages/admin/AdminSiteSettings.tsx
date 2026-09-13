import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@reconquista/ui/button";
import { Input } from "@reconquista/ui/input";
import { Label } from "@reconquista/ui/label";
import { Switch } from "@reconquista/ui/switch";
import { Textarea } from "@reconquista/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@reconquista/ui/card";
import {
  Globe,
  Loader2,
  LifeBuoy,
  Quote as QuoteIcon,
  Save,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, AdminApiAuthError } from "./adminApi";
import { useAdminSession } from "./useAdminSession";
import { DAILY_QUOTES } from "@/lib/dailyQuote";
import {
  DEFAULT_SITE_SETTINGS,
  parseQuotesJson,
  type SiteSettingKey,
} from "@/lib/siteSettings";

interface SiteSettingRow {
  key: string;
  value: string;
}

interface ListResponse {
  settings: SiteSettingRow[];
}

const ALL_KEYS = Object.keys(DEFAULT_SITE_SETTINGS) as SiteSettingKey[];

const DEFAULT_QUOTES_JSON_PRETTY = JSON.stringify(DAILY_QUOTES, null, 2);

const AdminSiteSettings = () => {
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // form local: cada key → string em edição
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [initialDraft, setInitialDraft] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const load = useCallback(async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const resp = await adminApi<ListResponse>({
        action: "list_site_settings",
        password,
      });
      // Indexa por key. Pra cada key conhecida, usa value do DB OU
      // default se não existir.
      const byKey: Record<string, string> = {};
      for (const row of resp.settings || []) {
        if (typeof row.key === "string" && row.key.startsWith("site.")) {
          byKey[row.key] = row.value ?? "";
        }
      }
      const next: Record<string, string> = {};
      for (const k of ALL_KEYS) {
        next[k] = byKey[k] !== undefined ? byKey[k] : "";
      }
      setDraft(next);
      setInitialDraft(next);
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [password, handleAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const dirty = ALL_KEYS.some((k) => (draft[k] ?? "") !== (initialDraft[k] ?? ""));

  const saveAll = async () => {
    if (!password) return;
    // Valida quotes_json se preenchido
    const qjson = draft["site.quotes_json"]?.trim();
    if (qjson) {
      try {
        const parsed = JSON.parse(qjson);
        if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === "string")) {
          toast.error('"site.quotes_json" deve ser um array de strings JSON. Ex: ["Frase 1", "Frase 2"]');
          return;
        }
      } catch {
        toast.error(`"site.quotes_json" tem JSON inválido. Confere as aspas e vírgulas.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      // Só envia keys com diff vs initial (evita writes inúteis)
      const settings: SiteSettingRow[] = [];
      for (const k of ALL_KEYS) {
        const v = draft[k] ?? "";
        if (v !== (initialDraft[k] ?? "")) {
          settings.push({ key: k, value: v });
        }
      }
      if (settings.length === 0) {
        toast.info("Nada pra salvar.");
        setIsSaving(false);
        return;
      }
      await adminApi({
        action: "bulk_update_site_settings",
        password,
        settings,
      });
      toast.success(`${settings.length} configuração(ões) salva(s)!`);
      setInitialDraft({ ...draft });
      // Invalida cache da members-api de site settings pro front pegar valores novos
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetField = (key: string) => {
    const def = (DEFAULT_SITE_SETTINGS as Record<string, string>)[key] || "";
    setField(key, def);
  };

  const fillQuotesWithDefault = () => {
    setField("site.quotes_json", DEFAULT_QUOTES_JSON_PRETTY);
  };

  const quotesPreviewCount = (() => {
    const v = draft["site.quotes_json"];
    if (!v || !v.trim()) return DAILY_QUOTES.length;
    return parseQuotesJson(v, DAILY_QUOTES).length;
  })();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Configurações globais</h2>
          <p className="text-sm text-muted-foreground">
            Edita textos, links, marca e blocos da área de membros sem precisar
            de deploy. Front lê com fallback aos defaults hardcoded — se um campo
            ficar vazio, o site usa o texto original.
          </p>
        </div>
        <Button onClick={saveAll} disabled={!dirty || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar alterações
        </Button>
      </div>

      {/* === Marca + Suporte === */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <LifeBuoy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Marca & Suporte</CardTitle>
              <CardDescription className="text-muted-foreground">
                Nome do produto, subtítulo do header e e-mail de suporte.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Nome da marca"
            keyName="site.brand_name"
            placeholder={DEFAULT_SITE_SETTINGS["site.brand_name"]}
            value={draft["site.brand_name"] ?? ""}
            onChange={(v) => setField("site.brand_name", v)}
            onReset={() => resetField("site.brand_name")}
          />
          <Field
            label="Subtítulo do header"
            keyName="site.brand_subtitle"
            placeholder={DEFAULT_SITE_SETTINGS["site.brand_subtitle"]}
            value={draft["site.brand_subtitle"] ?? ""}
            onChange={(v) => setField("site.brand_subtitle", v)}
            onReset={() => resetField("site.brand_subtitle")}
          />
          <Field
            label="E-mail de suporte"
            keyName="site.support_email"
            placeholder={DEFAULT_SITE_SETTINGS["site.support_email"]}
            value={draft["site.support_email"] ?? ""}
            onChange={(v) => setField("site.support_email", v)}
            onReset={() => resetField("site.support_email")}
            inputType="email"
          />
        </CardContent>
      </Card>

      {/* === Consultoria === */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">
                Bloco "Análise Estratégica" (consultoria)
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Aparece no Módulo 01. Pode ser desativado deixando a URL vazia
                ou desativando explicitamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded border border-border bg-muted/20 p-3">
            <Switch
              id="cons-enabled"
              checked={(draft["site.consultoria_enabled"] ?? "true").toLowerCase() !== "false"}
              onCheckedChange={(checked) =>
                setField("site.consultoria_enabled", checked ? "true" : "false")
              }
            />
            <Label htmlFor="cons-enabled" className="text-xs">
              Bloco ativo (se desligar, esconde mesmo com URL configurada)
            </Label>
          </div>
          <Field
            label="URL do formulário"
            keyName="site.consultoria_url"
            placeholder="https://docs.google.com/forms/…"
            value={draft["site.consultoria_url"] ?? ""}
            onChange={(v) => setField("site.consultoria_url", v)}
            onReset={() => resetField("site.consultoria_url")}
            inputType="url"
            mono
          />
          <Field
            label="Título"
            keyName="site.consultoria_title"
            placeholder={DEFAULT_SITE_SETTINGS["site.consultoria_title"]}
            value={draft["site.consultoria_title"] ?? ""}
            onChange={(v) => setField("site.consultoria_title", v)}
            onReset={() => resetField("site.consultoria_title")}
          />
          <Field
            label="Texto principal (body)"
            keyName="site.consultoria_body"
            placeholder={DEFAULT_SITE_SETTINGS["site.consultoria_body"]}
            value={draft["site.consultoria_body"] ?? ""}
            onChange={(v) => setField("site.consultoria_body", v)}
            onReset={() => resetField("site.consultoria_body")}
            multiline
          />
          <Field
            label="Texto do botão (CTA)"
            keyName="site.consultoria_cta"
            placeholder={DEFAULT_SITE_SETTINGS["site.consultoria_cta"]}
            value={draft["site.consultoria_cta"] ?? ""}
            onChange={(v) => setField("site.consultoria_cta", v)}
            onReset={() => resetField("site.consultoria_cta")}
          />
          <Field
            label="Texto pequeno de apoio (helper)"
            keyName="site.consultoria_helper_text"
            placeholder={DEFAULT_SITE_SETTINGS["site.consultoria_helper_text"]}
            value={draft["site.consultoria_helper_text"] ?? ""}
            onChange={(v) => setField("site.consultoria_helper_text", v)}
            onReset={() => resetField("site.consultoria_helper_text")}
            multiline
          />
        </CardContent>
      </Card>

      {/* === Visibilidade dos conteúdos em produção === */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">
                Visibilidade de conteúdos em produção
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Controle se aulas, módulos e materiais ainda sem conteúdo final aparecem para o aluno.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded border border-border bg-muted/30 p-3">
            <Switch
              id="show-production-content"
              checked={(draft["site.show_in_production_content"] ?? "false").toLowerCase() === "true"}
              onCheckedChange={(checked) =>
                setField("site.show_in_production_content", checked ? "true" : "false")
              }
            />
            <div className="space-y-1">
              <Label htmlFor="show-production-content" className="text-sm font-semibold">
                Mostrar conteúdos em produção para alunos
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Desligado: esconde módulos "em produção", aulas não publicadas,
                placeholders e materiais futuros. Ligado: mostra esses itens para revisão.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === Princípio Estratégico === */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <QuoteIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">
                Princípio Estratégico (frases rotacionais)
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Banner que aparece na home. Frase do dia rotaciona baseado em
                dayOfYear % N (mesma frase pra todos os usuários, muda à
                meia-noite UTC).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Label do bloco (texto pequeno em CAIXA ALTA)"
            keyName="site.quote_label"
            placeholder={DEFAULT_SITE_SETTINGS["site.quote_label"]}
            value={draft["site.quote_label"] ?? ""}
            onChange={(v) => setField("site.quote_label", v)}
            onReset={() => resetField("site.quote_label")}
          />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="quotes_json" className="text-xs font-medium">
                Frases (JSON array de strings)
              </Label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={fillQuotesWithDefault}
                >
                  Carregar default (20 frases)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-muted-foreground"
                  onClick={() => resetField("site.quotes_json")}
                >
                  Limpar
                </Button>
              </div>
            </div>
            <Textarea
              id="quotes_json"
              value={draft["site.quotes_json"] ?? ""}
              onChange={(e) => setField("site.quotes_json", e.target.value)}
              placeholder={'["Sua frase 1", "Sua frase 2", "..."]'}
              rows={10}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Deixe vazio para usar as {DAILY_QUOTES.length} frases padrão. Atual:{" "}
              <span className="font-medium text-foreground">
                {quotesPreviewCount} frase(s)
              </span>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* === Home === */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Textos da home</CardTitle>
              <CardDescription className="text-muted-foreground">
                Subtítulo do hero e labels/títulos das seções "Sua Jornada" e
                "Continue Expandindo".
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field
            label="Subtítulo do hero (abaixo de 'Olá, {nome}.')"
            keyName="site.home_welcome_subtitle"
            placeholder={DEFAULT_SITE_SETTINGS["site.home_welcome_subtitle"]}
            value={draft["site.home_welcome_subtitle"] ?? ""}
            onChange={(v) => setField("site.home_welcome_subtitle", v)}
            onReset={() => resetField("site.home_welcome_subtitle")}
            multiline
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Eyebrow da seção 'Sua Jornada' (CAIXA ALTA)"
              keyName="site.home_owned_section_label"
              placeholder={DEFAULT_SITE_SETTINGS["site.home_owned_section_label"]}
              value={draft["site.home_owned_section_label"] ?? ""}
              onChange={(v) => setField("site.home_owned_section_label", v)}
              onReset={() => resetField("site.home_owned_section_label")}
            />
            <Field
              label="Título da seção 'Sua Jornada'"
              keyName="site.home_owned_section_title"
              placeholder={DEFAULT_SITE_SETTINGS["site.home_owned_section_title"]}
              value={draft["site.home_owned_section_title"] ?? ""}
              onChange={(v) => setField("site.home_owned_section_title", v)}
              onReset={() => resetField("site.home_owned_section_title")}
            />
            <Field
              label="Eyebrow da seção 'Continue Expandindo' (CAIXA ALTA)"
              keyName="site.home_locked_section_label"
              placeholder={DEFAULT_SITE_SETTINGS["site.home_locked_section_label"]}
              value={draft["site.home_locked_section_label"] ?? ""}
              onChange={(v) => setField("site.home_locked_section_label", v)}
              onReset={() => resetField("site.home_locked_section_label")}
            />
            <Field
              label="Título da seção 'Continue Expandindo'"
              keyName="site.home_locked_section_title"
              placeholder={DEFAULT_SITE_SETTINGS["site.home_locked_section_title"]}
              value={draft["site.home_locked_section_title"] ?? ""}
              onChange={(v) => setField("site.home_locked_section_title", v)}
              onReset={() => resetField("site.home_locked_section_title")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <span className="text-xs text-muted-foreground">
          {dirty ? "Alterações não salvas." : "Sem alterações pendentes."}
        </span>
        <Button onClick={saveAll} disabled={!dirty || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  keyName: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  multiline?: boolean;
  mono?: boolean;
  inputType?: string;
}

const Field = ({
  label,
  keyName,
  placeholder,
  value,
  onChange,
  onReset,
  multiline,
  mono,
  inputType,
}: FieldProps) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground/80">{keyName}</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 text-[11px] text-muted-foreground"
            onClick={onReset}
          >
            Default
          </Button>
        </div>
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={mono ? "font-mono text-xs" : undefined}
        />
      ) : (
        <Input
          type={inputType || "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={mono ? "font-mono text-xs" : undefined}
        />
      )}
    </div>
  );
};

export default AdminSiteSettings;
