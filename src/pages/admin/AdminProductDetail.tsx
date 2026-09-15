import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  adminUploadModuleCoverImage,
  adminUploadProductImage,
  AdminApiAuthError,
  type AdminProduct,
  type AdminModule,
  type AdminSection,
} from "./adminApi";
import { useAdminSession } from "./useAdminSession";

const emptyModuleDraft = () => ({
  module_name: "",
  video_provider: "youtube" as "youtube" | "vturb",
  video_url: "",
});

const AdminProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [nameDraft, setNameDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [gatewayIdDraft, setGatewayIdDraft] = useState("");
  const [checkoutDraft, setCheckoutDraft] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [newModuleSectionId, setNewModuleSectionId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState(emptyModuleDraft());
  const [creatingModule, setCreatingModule] = useState(false);

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState(emptyModuleDraft());
  const [savingModule, setSavingModule] = useState(false);

  const [uploadingModuleImageId, setUploadingModuleImageId] = useState<string | null>(null);
  const [pendingImageModuleId, setPendingImageModuleId] = useState<string | null>(null);
  const moduleImageInputRef = useRef<HTMLInputElement>(null);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const loadProduct = useCallback(async () => {
    if (!password || !id) return;
    setIsLoading(true);
    try {
      const data = await adminApi<{ products: AdminProduct[] }>({
        action: "get_products",
        password,
      });
      const target = (data.products || []).find((p) => p.id === id);
      if (!target) {
        toast.error("Produto não encontrado");
        navigate("/admin/produtos", { replace: true });
        return;
      }
      setProduct(target);
      setNameDraft(target.product_name || "");
      setDescriptionDraft(target.product_description || "");
      setGatewayIdDraft(target.gateway_product_id || "");
      setCheckoutDraft(target.checkout_url || "");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [password, id, navigate, handleAuthError]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (isLoading || !product) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [...product.product_sections].sort((a, b) => a.display_order - b.display_order);
  const modulesBySection = new Map<string | null, AdminModule[]>();
  for (const module of [...product.product_modules].sort((a, b) => a.module_order - b.module_order)) {
    const key = module.section_id;
    modulesBySection.set(key, [...(modulesBySection.get(key) || []), module]);
  }

  const saveBasicInfo = async () => {
    if (!password) return;
    if (!nameDraft.trim()) {
      toast.error("Nome do produto não pode ficar vazio.");
      return;
    }
    if (!gatewayIdDraft.trim()) {
      toast.error("Código do produto (Perfect Pay) não pode ficar vazio.");
      return;
    }
    setSavingInfo(true);
    try {
      await adminApi({
        action: "update_product",
        password,
        product_id: product.id,
        product_name: nameDraft.trim(),
        product_description: descriptionDraft.trim(),
        gateway_product_id: gatewayIdDraft.trim(),
        checkout_url: checkoutDraft.trim() || null,
      });
      setProduct({
        ...product,
        product_name: nameDraft.trim(),
        product_description: descriptionDraft.trim(),
        gateway_product_id: gatewayIdDraft.trim(),
        checkout_url: checkoutDraft.trim() || null,
      });
      toast.success("Produto salvo!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingInfo(false);
    }
  };

  const toggleVisibility = async () => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_product",
        password,
        product_id: product.id,
        is_visible: !product.is_visible,
      });
      setProduct({ ...product, is_visible: !product.is_visible });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!password) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Apenas JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      return;
    }
    setUploadingImage(true);
    try {
      const data = await adminUploadProductImage({ password, productId: product.id, file });
      setProduct({ ...product, product_image_url: data.image_url });
      toast.success("Imagem enviada!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadModuleImage = async (moduleId: string, file: File) => {
    if (!password) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Apenas JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      return;
    }
    setUploadingModuleImageId(moduleId);
    try {
      const data = await adminUploadModuleCoverImage({ password, moduleId, file });
      setProduct({
        ...product,
        product_modules: product.product_modules.map((m) =>
          m.id === moduleId ? { ...m, cover_image_url: data.image_url } : m,
        ),
      });
      toast.success("Imagem da aula enviada!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingModuleImageId(null);
    }
  };

  const createSection = async () => {
    if (!password || !newSectionTitle.trim()) return;
    setCreatingSection(true);
    try {
      const data = await adminApi<{ section: AdminSection }>({
        action: "create_section",
        password,
        product_id: product.id,
        title: newSectionTitle.trim(),
      });
      setProduct({ ...product, product_sections: [...product.product_sections, data.section] });
      setNewSectionTitle("");
      toast.success("Módulo (section) criado!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setCreatingSection(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!password) return;
    if (!confirm("Excluir este módulo? As aulas dentro dele também serão excluídas.")) return;
    try {
      await adminApi({ action: "delete_section", password, section_id: sectionId });
      setProduct({
        ...product,
        product_sections: product.product_sections.filter((s) => s.id !== sectionId),
        product_modules: product.product_modules.filter((m) => m.section_id !== sectionId),
      });
      toast.success("Módulo excluído!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const startCreateModule = (sectionId: string | null) => {
    setNewModuleSectionId(sectionId);
    setModuleDraft(emptyModuleDraft());
  };

  const submitCreateModule = async () => {
    if (!password || newModuleSectionId === undefined) return;
    if (!moduleDraft.module_name.trim()) {
      toast.error("Nome da aula é obrigatório.");
      return;
    }
    setCreatingModule(true);
    try {
      const data = await adminApi<{ module: AdminModule }>({
        action: "create_module",
        password,
        product_id: product.id,
        section_id: newModuleSectionId,
        module_name: moduleDraft.module_name.trim(),
        video_provider: moduleDraft.video_provider,
        video_url: moduleDraft.video_url.trim() || null,
      });
      setProduct({ ...product, product_modules: [...product.product_modules, data.module] });
      setNewModuleSectionId(null);
      toast.success("Aula criada!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setCreatingModule(false);
    }
  };

  const startEditModule = (module: AdminModule) => {
    setEditingModuleId(module.id);
    setEditDraft({
      module_name: module.module_name,
      video_provider: (module.video_provider as "youtube" | "vturb") || "youtube",
      video_url: module.video_url || "",
    });
  };

  const submitEditModule = async (moduleId: string) => {
    if (!password) return;
    setSavingModule(true);
    try {
      const data = await adminApi<{ module: AdminModule }>({
        action: "update_module",
        password,
        module_id: moduleId,
        module_name: editDraft.module_name.trim(),
        video_provider: editDraft.video_provider,
        video_url: editDraft.video_url.trim() || null,
      });
      setProduct({
        ...product,
        product_modules: product.product_modules.map((m) => (m.id === moduleId ? data.module : m)),
      });
      setEditingModuleId(null);
      toast.success("Aula salva!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingModule(false);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!password) return;
    if (!confirm("Excluir esta aula?")) return;
    try {
      await adminApi({ action: "delete_module", password, module_id: moduleId });
      setProduct({
        ...product,
        product_modules: product.product_modules.filter((m) => m.id !== moduleId),
      });
      toast.success("Aula excluída!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const togglePublished = async (module: AdminModule) => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_module",
        password,
        module_id: module.id,
        is_published: !module.is_published,
      });
      setProduct({
        ...product,
        product_modules: product.product_modules.map((m) =>
          m.id === module.id ? { ...m, is_published: !m.is_published } : m,
        ),
      });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const moveModule = async (module: AdminModule, direction: "up" | "down") => {
    if (!password) return;
    const siblings = modulesBySection.get(module.section_id) || [];
    const idx = siblings.findIndex((m) => m.id === module.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const other = siblings[swapIdx];

    const nextModules = product.product_modules.map((m) => {
      if (m.id === module.id) return { ...m, module_order: other.module_order };
      if (m.id === other.id) return { ...m, module_order: module.module_order };
      return m;
    });
    setProduct({ ...product, product_modules: nextModules });

    try {
      await Promise.all([
        adminApi({ action: "update_module", password, module_id: module.id, module_order: other.module_order }),
        adminApi({ action: "update_module", password, module_id: other.id, module_order: module.module_order }),
      ]);
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
      loadProduct();
    }
  };

  const renderModuleForm = (draft: typeof moduleDraft, setDraft: (d: typeof moduleDraft) => void) => (
    <div className="space-y-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-3">
      <Input
        placeholder="Nome da aula"
        value={draft.module_name}
        onChange={(e) => setDraft({ ...draft, module_name: e.target.value })}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={draft.video_provider}
          onValueChange={(v) => setDraft({ ...draft, video_provider: v as "youtube" | "vturb" })}
        >
          <SelectTrigger className="h-9 text-sm sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="vturb">VTurb</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder={
            draft.video_provider === "youtube"
              ? "https://youtube.com/watch?v=..."
              : "Cole o embed completo do VTurb (<script> + <vturb-smartplayer>)"
          }
          value={draft.video_url}
          onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
          className="flex-1"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadImage(file);
          if (imageInputRef.current) imageInputRef.current.value = "";
        }}
      />
      <input
        ref={moduleImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingImageModuleId) handleUploadModuleImage(pendingImageModuleId, file);
          setPendingImageModuleId(null);
          if (moduleImageInputRef.current) moduleImageInputRef.current.value = "";
        }}
      />

      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/produtos")}
          className="mb-2 -ml-2 h-8 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Produtos
        </Button>
        <div className="flex items-start gap-4">
          {product.product_image_url ? (
            <img
              src={product.product_image_url}
              alt={product.product_name}
              className="h-20 w-20 shrink-0 rounded-md object-cover bg-muted"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-muted">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-2xl font-bold text-foreground">{product.product_name}</h2>
              <Badge variant={product.is_visible ? "default" : "secondary"}>
                {product.is_visible ? "Visível" : "Oculto"}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
              código Perfect Pay: {product.gateway_product_id}
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informações do produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={2} value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Código do produto (Perfect Pay)</Label>
              <Input
                value={gatewayIdDraft}
                onChange={(e) => setGatewayIdDraft(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Precisa ser idêntico ao código do produto configurado no Perfect Pay — é assim que o
                webhook sabe qual produto liberar quando alguém compra.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Checkout URL</Label>
              <Input
                value={checkoutDraft}
                onChange={(e) => setCheckoutDraft(e.target.value)}
                placeholder="https://checkout.perfectpay.com.br/..."
                className="font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <Switch checked={product.is_visible} onCheckedChange={toggleVisibility} />
              <span className="text-sm text-foreground">
                {product.is_visible ? "Visível na área de membros" : "Oculto"}
              </span>
            </div>
            <Button size="sm" variant="outline" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
              {uploadingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {product.product_image_url ? "Substituir imagem" : "Enviar imagem"}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={saveBasicInfo} disabled={savingInfo}>
              {savingInfo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Módulos e aulas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do novo módulo (ex: Módulo 1 — Boas-vindas)"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSection()}
            />
            <Button onClick={createSection} disabled={creatingSection || !newSectionTitle.trim()}>
              {creatingSection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Novo módulo
            </Button>
          </div>

          {sections.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum módulo ainda. Crie um módulo acima e depois adicione aulas dentro dele.
            </p>
          )}

          {sections.map((section) => {
            const sectionModules = modulesBySection.get(section.id) || [];
            return (
              <div key={section.id} className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Módulo {section.section_number} — {section.title}
                  </h3>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startCreateModule(section.id)}>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Aula
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteSection(section.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {sectionModules.map((module, idx) =>
                    editingModuleId === module.id ? (
                      <div key={module.id} className="space-y-2">
                        {renderModuleForm(editDraft, setEditDraft)}
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => setEditingModuleId(null)}>
                            Cancelar
                          </Button>
                          <Button size="sm" onClick={() => submitEditModule(module.id)} disabled={savingModule}>
                            {savingModule ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={module.id}
                        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex flex-col gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            disabled={idx === 0}
                            onClick={() => moveModule(module, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0"
                            disabled={idx === sectionModules.length - 1}
                            onClick={() => moveModule(module, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        {module.cover_image_url ? (
                          <img
                            src={module.cover_image_url}
                            alt=""
                            className="h-8 w-8 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <Video className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1 truncate text-sm text-foreground">{module.module_name}</span>
                        {module.video_url && (
                          <Badge variant="outline" className="text-[10px]">
                            {module.video_provider === "vturb" ? "VTurb" : "YouTube"}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Imagem de capa da aula"
                          disabled={uploadingModuleImageId === module.id}
                          onClick={() => {
                            setPendingImageModuleId(module.id);
                            moduleImageInputRef.current?.click();
                          }}
                        >
                          {uploadingModuleImageId === module.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ImageIcon className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title={module.is_published ? "Publicada" : "Em produção"}
                          onClick={() => togglePublished(module)}
                        >
                          {module.is_published ? (
                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditModule(module)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteModule(module.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  )}

                  {newModuleSectionId === section.id && (
                    <div className="space-y-2">
                      {renderModuleForm(moduleDraft, setModuleDraft)}
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setNewModuleSectionId(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={submitCreateModule} disabled={creatingModule}>
                          {creatingModule ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                          Criar aula
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductDetail;
