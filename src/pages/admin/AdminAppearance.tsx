import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Loader2, Palette, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { adminApi, adminUploadHeroBanner, AdminApiAuthError } from "./adminApi";
import { useAdminSession } from "./useAdminSession";
import {
  applyThemeToRoot,
  DEFAULT_HERO_BANNER,
  DEFAULT_THEME_HEX,
  parseHeroBannerJson,
  parseThemeJson,
  type HeroBannerConfig,
  type ThemeColors,
} from "@/lib/siteSettings";

interface SiteSettingRow {
  key: string;
  value: string;
}

interface ListResponse {
  settings: SiteSettingRow[];
}

interface ColorField {
  key: keyof ThemeColors;
  label: string;
  description: string;
}

const COLOR_FIELDS: ColorField[] = [
  { key: "background", label: "Fundo da página", description: "Cor de fundo principal (preto premium)" },
  { key: "surface", label: "Superfície / muted", description: "Backgrounds de blocos secundários" },
  { key: "card", label: "Card", description: "Background do card / popover" },
  { key: "primary", label: "Primária (vermelho/grená)", description: "Botões primários, badges, destaques" },
  { key: "secondary", label: "Secundária", description: "Botões secundários, estados neutros" },
  { key: "accent", label: "Acento (dourado)", description: "Acabamentos premium, eyebrows, métricas" },
  { key: "text", label: "Texto principal", description: "Cor padrão de textos sobre o fundo" },
  { key: "mutedText", label: "Texto secundário", description: "Descrições, helpers, eyebrows menores" },
  { key: "button", label: "Botão principal (alias da primária)", description: "Mesma cor visual da primária" },
];

const AdminAppearance = () => {
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<ThemeColors>({ ...DEFAULT_THEME_HEX });
  const [initialDraft, setInitialDraft] = useState<ThemeColors>({ ...DEFAULT_THEME_HEX });
  const [rawJson, setRawJson] = useState<string>("");
  const [initialRawJson, setInitialRawJson] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // PR ADMIN 6D — Hero banner state
  const [heroDraft, setHeroDraft] = useState<HeroBannerConfig>({ ...DEFAULT_HERO_BANNER });
  const [heroInitial, setHeroInitial] = useState<HeroBannerConfig>({ ...DEFAULT_HERO_BANNER });
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);

  // Live preview state — aplica o draft ao :root em tempo real
  // pra o admin ver a mudança imediatamente. Quando sai da página,
  // o useTheme global volta a aplicar o que está salvo no DB.
  useEffect(() => {
    const cleanup = applyThemeToRoot(draft);
    return cleanup;
  }, [draft]);

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
      const row = (resp.settings || []).find((r) => r.key === "site.theme_json");
      const rawValue = row?.value ?? "";
      setRawJson(rawValue);
      setInitialRawJson(rawValue);
      const parsed = parseThemeJson(rawValue);
      const merged: ThemeColors = { ...DEFAULT_THEME_HEX, ...parsed };
      setDraft(merged);
      setInitialDraft(merged);

      // PR ADMIN 6D — hero banner config
      const heroRow = (resp.settings || []).find(
        (r) => r.key === "site.hero_banner_json",
      );
      const heroParsed = parseHeroBannerJson(heroRow?.value);
      setHeroDraft(heroParsed);
      setHeroInitial(heroParsed);
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

  const setField = (key: keyof ThemeColors, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const dirty =
    COLOR_FIELDS.some((f) => draft[f.key] !== initialDraft[f.key]) ||
    rawJson.trim() !== initialRawJson.trim();

  const resetToDefault = () => {
    setDraft({ ...DEFAULT_THEME_HEX });
    setRawJson("");
  };

  const applyJsonToFields = () => {
    const parsed = parseThemeJson(rawJson);
    if (Object.keys(parsed).length === 0) {
      toast.error("JSON inválido ou sem cores válidas (#RRGGBB).");
      return;
    }
    setDraft((d) => ({ ...d, ...parsed }));
    toast.success(
      `${Object.keys(parsed).length} cor(es) aplicada(s) ao formulário.`,
    );
  };

  const saveTheme = async () => {
    if (!password) return;
    // Valida que cada cor é hex válido
    for (const f of COLOR_FIELDS) {
      const v = draft[f.key].trim();
      if (!v || !/^#[0-9a-fA-F]{6}$/.test(v)) {
        toast.error(`Cor inválida em "${f.label}": deve ser #RRGGBB.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      // Salva como JSON estável (ordem fixa)
      const obj: ThemeColors = { ...draft };
      const valueJson = JSON.stringify(obj, null, 2);
      await adminApi({
        action: "update_site_setting",
        password,
        key: "site.theme_json",
        value: valueJson,
      });
      toast.success("Tema salvo!");
      setInitialDraft({ ...draft });
      setRawJson(valueJson);
      setInitialRawJson(valueJson);
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDefaultsInDb = async () => {
    if (!password) return;
    if (
      !confirm(
        "Restaurar tema padrão (vai limpar site.theme_json no banco e o front volta a usar o CSS hardcoded).",
      )
    )
      return;
    setIsSaving(true);
    try {
      await adminApi({
        action: "update_site_setting",
        password,
        key: "site.theme_json",
        value: "",
      });
      toast.success("Tema removido. Front voltou ao padrão hardcoded.");
      setDraft({ ...DEFAULT_THEME_HEX });
      setInitialDraft({ ...DEFAULT_THEME_HEX });
      setRawJson("");
      setInitialRawJson("");
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  // PR ADMIN 6D — Hero banner handlers
  const heroDirty =
    JSON.stringify(heroDraft) !== JSON.stringify(heroInitial);

  const saveHero = async () => {
    if (!password) return;
    setHeroSaving(true);
    try {
      // Sanitiza heights (min/max) antes de salvar
      const payload: HeroBannerConfig = {
        ...heroDraft,
        height_desktop: Math.max(200, Math.min(800, Math.floor(heroDraft.height_desktop))),
        height_mobile: Math.max(200, Math.min(600, Math.floor(heroDraft.height_mobile))),
      };
      await adminApi({
        action: "update_site_setting",
        password,
        key: "site.hero_banner_json",
        value: JSON.stringify(payload),
      });
      toast.success("Banner inicial salvo!");
      setHeroInitial(payload);
      setHeroDraft(payload);
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setHeroSaving(false);
    }
  };

  const triggerHeroUpload = () => heroFileRef.current?.click();

  const onHeroFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !password) {
      if (heroFileRef.current) heroFileRef.current.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Apenas JPEG, PNG ou WebP.");
      if (heroFileRef.current) heroFileRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      if (heroFileRef.current) heroFileRef.current.value = "";
      return;
    }
    setHeroUploading(true);
    try {
      const resp = await adminUploadHeroBanner({ password, file });
      // admin-api atualiza image_url + enabled=true automaticamente
      const next: HeroBannerConfig = {
        ...heroDraft,
        image_url: resp.image_url,
        enabled: true,
      };
      setHeroDraft(next);
      setHeroInitial(next);
      toast.success("Banner enviado!");
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setHeroUploading(false);
      if (heroFileRef.current) heroFileRef.current.value = "";
    }
  };

  const removeHeroImage = async () => {
    if (!password) return;
    if (!confirm("Remover imagem do banner? O front volta a renderizar o hero textual padrão.")) return;
    try {
      await adminApi({
        action: "remove_hero_banner_image",
        password,
      });
      const next: HeroBannerConfig = { ...heroDraft, image_url: "" };
      setHeroDraft(next);
      setHeroInitial(next);
      toast.success("Imagem do banner removida.");
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

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
          <h2 className="text-2xl font-bold text-foreground">Aparência</h2>
          <p className="text-sm text-muted-foreground">
            Edita as cores principais da área de membros. Pré-visualização ao
            vivo aplica ao :root enquanto você edita; "Salvar" persiste em
            <code className="ml-1 rounded bg-muted px-1 font-mono text-[11px]">
              site.theme_json
            </code>
            . Se qualquer cor for inválida, o tema salvo é ignorado e o front
            volta ao CSS hardcoded padrão (zero risco de quebrar o visual).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar formulário
          </Button>
          <Button onClick={saveTheme} disabled={!dirty || isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar tema
          </Button>
        </div>
      </div>

      {/* PR ADMIN 6D — Hero Banner */}
      <input
        ref={heroFileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onHeroFileSelected}
      />
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-foreground">
                Banner inicial da área de membros
              </CardTitle>
              <CardDescription>
                Hero premium no topo da home logada. Quando ativo + com imagem,
                substitui o hero textual atual. Quando desativado ou sem imagem,
                front renderiza o layout original (fallback automático).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Toggle enabled */}
          <div className="flex items-center gap-3 rounded border border-border bg-muted/30 p-3">
            <Switch
              id="hero-enabled"
              checked={heroDraft.enabled}
              onCheckedChange={(checked) =>
                setHeroDraft((d) => ({ ...d, enabled: checked }))
              }
            />
            <Label htmlFor="hero-enabled" className="text-xs">
              {heroDraft.enabled
                ? "Banner ativo (aparece na home se houver imagem)"
                : "Banner desativado (home usa hero textual padrão)"}
            </Label>
          </div>

          {/* Imagem + preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Imagem do banner</Label>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="shrink-0">
                {heroDraft.image_url ? (
                  <div
                    className="h-32 w-56 overflow-hidden rounded-md ring-1 ring-border bg-stone-950"
                    style={{ position: "relative" }}
                  >
                    <img
                      src={heroDraft.image_url}
                      alt="Banner atual"
                      className="h-full w-full object-cover"
                      style={{
                        objectPosition:
                          heroDraft.position === "center"
                            ? "center"
                            : heroDraft.position === "top"
                              ? "top"
                              : heroDraft.position === "left"
                                ? "left center"
                                : heroDraft.position === "right"
                                  ? "right center"
                                  : "70% center",
                      }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          heroDraft.overlay === "light"
                            ? "linear-gradient(90deg, rgba(0,0,0,0.55), rgba(0,0,0,0.1))"
                            : heroDraft.overlay === "medium"
                              ? "linear-gradient(90deg, rgba(0,0,0,0.75), rgba(0,0,0,0.2))"
                              : "linear-gradient(90deg, rgba(0,0,0,0.85), rgba(0,0,0,0.3))",
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex h-32 w-56 items-center justify-center rounded-md ring-1 ring-border bg-muted text-xs text-muted-foreground">
                    Sem imagem
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={triggerHeroUpload}
                    disabled={heroUploading}
                  >
                    {heroUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {heroDraft.image_url ? "Substituir imagem" : "Enviar imagem"}
                  </Button>
                  {heroDraft.image_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={removeHeroImage}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover imagem
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  JPEG / PNG / WebP — máximo 5MB. Vai pro bucket público{" "}
                  <code className="font-mono">product-images</code>, prefixo{" "}
                  <code className="font-mono">site/hero-banner/</code>.
                </p>
                {heroDraft.image_url && (
                  <p className="break-all font-mono text-[10px] text-muted-foreground/80">
                    {heroDraft.image_url}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Label + position + overlay */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Label/eyebrow</Label>
              <Input
                value={heroDraft.label}
                onChange={(e) =>
                  setHeroDraft((d) => ({ ...d, label: e.target.value }))
                }
                placeholder="Bem-vindo de volta"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Posição da imagem</Label>
              <Select
                value={heroDraft.position}
                onValueChange={(v) =>
                  setHeroDraft((d) => ({ ...d, position: v as HeroBannerConfig["position"] }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="top">Topo</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center-right">
                    Centro-direita (rec. casal)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Intensidade do overlay</Label>
              <Select
                value={heroDraft.overlay}
                onValueChange={(v) =>
                  setHeroDraft((d) => ({ ...d, overlay: v as HeroBannerConfig["overlay"] }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Leve</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="strong">Forte (rec. melhor leitura)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Heights */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Altura desktop (px) — entre 200 e 800
              </Label>
              <Input
                type="number"
                min={200}
                max={800}
                value={heroDraft.height_desktop}
                onChange={(e) =>
                  setHeroDraft((d) => ({
                    ...d,
                    height_desktop: Number(e.target.value) || 520,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Altura mobile (px) — entre 200 e 600
              </Label>
              <Input
                type="number"
                min={200}
                max={600}
                value={heroDraft.height_mobile}
                onChange={(e) =>
                  setHeroDraft((d) => ({
                    ...d,
                    height_mobile: Number(e.target.value) || 320,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">
              {heroDirty ? "Alterações não salvas." : "Sem alterações pendentes."}
            </p>
            <Button onClick={saveHero} disabled={!heroDirty || heroSaving}>
              {heroSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar banner
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Color inputs */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-foreground">Cores</CardTitle>
              <CardDescription>
                Use color pickers ou digite hex (#RRGGBB). Cada campo aplica
                imediatamente na preview ao :root.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COLOR_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs">{f.label}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={draft[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={DEFAULT_THEME_HEX[f.key]}
                    className="h-9 font-mono text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 px-2 text-[11px] text-muted-foreground"
                    onClick={() => setField(f.key, DEFAULT_THEME_HEX[f.key])}
                    title="Reseta para o default desta cor"
                  >
                    Default
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/85">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview block */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Preview ao vivo</CardTitle>
          <CardDescription>
            Estes elementos refletem as variáveis CSS atualizadas. O fundo da
            página inteira também muda em tempo real conforme você edita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Card
              </p>
              <p className="mt-1 text-foreground">
                Título do card · Lorem ipsum dolor sit amet.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Descrição secundária do card.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm">Primário</Button>
                <Button size="sm" variant="secondary">
                  Secundário
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
              <p className="text-[10px] uppercase tracking-wider text-accent/90">
                Bloco com acento
              </p>
              <p className="mt-1 text-foreground">
                Detalhes premium usam a cor de acento (dourado por padrão).
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Eyebrows, métricas e dividers fininhos.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-accent">
                  acento
                </span>
                <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                  primário
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced JSON editor */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">JSON avançado</CardTitle>
          <CardDescription>
            Cole/edite o JSON diretamente. Use "Aplicar JSON aos campos" pra
            sobrescrever os inputs acima. Salvar persiste o que está nos campos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
            rows={12}
            placeholder='{"background": "#0F0A0A", "primary": "#A6232A", ...}'
            className="font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={applyJsonToFields}>
              Aplicar JSON aos campos
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setRawJson(JSON.stringify(DEFAULT_THEME_HEX, null, 2))
              }
            >
              Preencher com defaults
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={restoreDefaultsInDb}
              disabled={isSaving}
            >
              Limpar tema no DB (volta ao padrão hardcoded)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <span className="text-xs text-muted-foreground">
          {dirty ? "Alterações não salvas." : "Sem alterações pendentes."}
        </span>
        <Button onClick={saveTheme} disabled={!dirty || isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar tema
        </Button>
      </div>
    </div>
  );
};

export default AdminAppearance;
