import { Input } from "@reconquista/ui/input";
import { Label } from "@reconquista/ui/label";
import { Switch } from "@reconquista/ui/switch";
import { Textarea } from "@reconquista/ui/textarea";
import {
  DEFAULT_CONSULTORIA_CONFIG,
  parseConsultoriaConfig,
  type ConsultoriaConfig,
} from "@/lib/siteSettings";

/**
 * PR ADMIN 6E — Fieldset reutilizável pros 3 dialogs (produto / section / aula).
 *
 * Recebe o jsonb cru do DB, normaliza pro shape ConsultoriaConfig, e devolve
 * o config atualizado pelo caller via onChange. Caller decide submit/cancel.
 *
 * `levelLabel` aparece nos placeholders/copy ("produto", "section", "aula").
 * `parentLabel` é usado no botão "Herdar do {parent}" (ex: "produto", "global").
 */

interface ConsultoriaFieldsetProps {
  value: unknown;
  onChange: (next: ConsultoriaConfig | null) => void;
  levelLabel: string;
  parentLabel: string;
}

/** Helper: prepara state inicial a partir do raw jsonb. */
function normalize(raw: unknown): ConsultoriaConfig {
  const parsed = parseConsultoriaConfig(raw);
  if (parsed) return parsed;
  return { ...DEFAULT_CONSULTORIA_CONFIG };
}

export const ConsultoriaFieldset = ({
  value,
  onChange,
  levelLabel,
  parentLabel,
}: ConsultoriaFieldsetProps) => {
  const cfg = normalize(value);

  const update = (patch: Partial<ConsultoriaConfig>) => {
    onChange({ ...cfg, ...patch });
  };

  const inherit = () => onChange(null);

  // Verifica se está "herdando" (mode=inherit ou raw é null/undefined)
  const isInherit = cfg.mode === "inherit" && value === null || value === undefined || value === null;

  return (
    <div className="space-y-3 rounded border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Formulário de consultoria
        </p>
        <button
          type="button"
          onClick={inherit}
          className="text-[11px] text-muted-foreground underline hover:text-foreground"
        >
          Herdar do {parentLabel}
        </button>
      </div>

      {/* Mode selector — radio-ish */}
      <div className="grid grid-cols-3 gap-1.5">
        {(["inherit", "enabled", "disabled"] as const).map((m) => {
          const labels = {
            inherit: "Herdar",
            enabled: "Ativar",
            disabled: "Desativar",
          };
          const active = cfg.mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => update({ mode: m })}
              className={`rounded border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {labels[m]}
            </button>
          );
        })}
      </div>

      {cfg.mode === "inherit" && (
        <p className="text-[11px] italic text-muted-foreground">
          Configuração herda do {parentLabel}. Para sobrescrever só nesta{" "}
          {levelLabel}, escolha "Ativar" ou "Desativar".
        </p>
      )}
      {cfg.mode === "disabled" && (
        <p className="text-[11px] italic text-muted-foreground">
          Formulário não aparece nesta {levelLabel} (mesmo se o nível superior
          estiver ativado).
        </p>
      )}

      {cfg.mode === "enabled" && (
        <>
          {/* Posições */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={cfg.showBelow}
                onCheckedChange={(c) => update({ showBelow: c })}
              />
              <Label className="text-xs">
                Mostrar abaixo do conteúdo (card grande sob o vídeo/PDF/áudio)
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={cfg.showSidebar}
                onCheckedChange={(c) => update({ showSidebar: c })}
              />
              <Label className="text-xs">
                Mostrar na lateral direita (mini-card abaixo da lista de aulas)
              </Label>
            </div>
          </div>

          {/* Copy customizável */}
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={cfg.useGlobalCopy}
                onCheckedChange={(c) =>
                  update({
                    useGlobalCopy: c,
                    // Limpa custom copy quando volta pro global
                    ...(c
                      ? {
                          title: null,
                          body: null,
                          cta: null,
                          helperText: null,
                          url: null,
                        }
                      : {}),
                  })
                }
              />
              <Label className="text-xs">
                Usar copy global (
                <code className="font-mono">site.consultoria_*</code> via /admin/configuracoes-globais)
              </Label>
            </div>

            {!cfg.useGlobalCopy && (
              <div className="space-y-2 pl-1">
                <div className="space-y-1">
                  <Label className="text-[11px]">Título</Label>
                  <Input
                    value={cfg.title || ""}
                    onChange={(e) =>
                      update({ title: e.target.value || null })
                    }
                    placeholder="(usa global se vazio)"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Texto principal</Label>
                  <Textarea
                    rows={3}
                    value={cfg.body || ""}
                    onChange={(e) =>
                      update({ body: e.target.value || null })
                    }
                    placeholder="(usa global se vazio)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">CTA do botão</Label>
                    <Input
                      value={cfg.cta || ""}
                      onChange={(e) =>
                        update({ cta: e.target.value || null })
                      }
                      placeholder="(usa global se vazio)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">URL do formulário</Label>
                    <Input
                      value={cfg.url || ""}
                      onChange={(e) =>
                        update({ url: e.target.value || null })
                      }
                      placeholder="(usa global se vazio)"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Texto de apoio (helper)</Label>
                  <Input
                    value={cfg.helperText || ""}
                    onChange={(e) =>
                      update({ helperText: e.target.value || null })
                    }
                    placeholder="(usa global se vazio)"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
