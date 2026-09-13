import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Check,
  Clock3,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Music,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingCart,
  Star,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  adminApi,
  adminUploadAudio,
  adminUploadPdf,
  adminUploadProductImage,
  AdminApiAuthError,
  PRODUCT_KIND_LABEL,
  PRODUCT_KIND_OPTIONS,
  type AdminModule,
  type AdminProduct,
} from "./adminApi";
import { ConsultoriaFieldset } from "./ConsultoriaFieldset";
import { useAdminSession } from "./useAdminSession";
import type { ConsultoriaConfig } from "@/lib/siteSettings";
import {
  DEFAULT_UPSELL_CTA,
  pickContrastText,
  resolveUpsellCta,
} from "@/lib/upsellCta";

const AdminProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingCheckout, setEditingCheckout] = useState(false);
  const [checkoutValue, setCheckoutValue] = useState("");

  const [renamingModule, setRenamingModule] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [editingVideoModule, setEditingVideoModule] = useState<string | null>(
    null,
  );
  const [videoUrlValue, setVideoUrlValue] = useState("");

  const [uploadingModulePdf, setUploadingModulePdf] = useState<string | null>(
    null,
  );
  const [pendingUploadModuleId, setPendingUploadModuleId] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio upload state
  const [uploadingModuleAudio, setUploadingModuleAudio] = useState<string | null>(null);
  const [pendingAudioModuleId, setPendingAudioModuleId] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // is_published toggle state
  const [togglingPublished, setTogglingPublished] = useState<string | null>(null);

  // PR ADMIN 6A: product image upload + commercial fields
  const [uploadingProductImage, setUploadingProductImage] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [ratingValue, setRatingValue] = useState<string>("");
  const [reviewsValue, setReviewsValue] = useState<string>("");
  const [savingCommercial, setSavingCommercial] = useState(false);
  // PR ADMIN 6C: tipo do produto
  const [kindValue, setKindValue] = useState<string>("");
  const [savingKind, setSavingKind] = useState(false);
  // PR ADMIN 6E: consultoria_config draft + saving flag
  const [consultoriaDraft, setConsultoriaDraft] = useState<ConsultoriaConfig | null | undefined>(undefined);
  const [savingConsultoria, setSavingConsultoria] = useState(false);
  // PR ADMIN 6G: editar nome + descrição do produto
  const [nameDraft, setNameDraft] = useState<string>("");
  const [descriptionDraft, setDescriptionDraft] = useState<string>("");
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  // PR ADMIN 6H: CTA de compra editável por produto
  const [upsellEnabled, setUpsellEnabled] = useState<boolean>(true);
  const [upsellMessage, setUpsellMessage] = useState<string>("");
  const [upsellButtonLabel, setUpsellButtonLabel] = useState<string>("");
  const [upsellButtonColor, setUpsellButtonColor] = useState<string>("#b8860b");
  const [savingUpsell, setSavingUpsell] = useState(false);

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
      // PR ADMIN 6A: inicializa inputs de rating/reviews_count
      setRatingValue(target.rating !== null && target.rating !== undefined ? String(target.rating) : "");
      setReviewsValue(
        target.reviews_count !== null && target.reviews_count !== undefined
          ? String(target.reviews_count)
          : "",
      );
      // PR ADMIN 6C: tipo do produto
      setKindValue(target.product_kind || "");
      // PR ADMIN 6E: consultoria_config (null = herda do global)
      setConsultoriaDraft(
        target.consultoria_config === null || target.consultoria_config === undefined
          ? null
          : (target.consultoria_config as ConsultoriaConfig),
      );
      // PR ADMIN 6G: drafts pra editar nome + descrição
      setNameDraft(target.product_name || "");
      setDescriptionDraft(target.product_description || "");
      // PR ADMIN 6H: drafts pra CTA de compra (usa helper pra aplicar defaults)
      const cta = resolveUpsellCta(target.upsell_cta_config);
      setUpsellEnabled(cta.enabled);
      setUpsellMessage(cta.message);
      setUpsellButtonLabel(cta.buttonLabel);
      setUpsellButtonColor(cta.buttonColor);
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
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

  const sortedModules = [...product.modules].sort(
    (a, b) => a.display_order - b.display_order,
  );

  const updateModuleInState = (
    moduleId: string,
    patch: Partial<AdminModule>,
  ) => {
    setProduct((prev) =>
      prev
        ? {
            ...prev,
            modules: prev.modules.map((m) =>
              m.id === moduleId ? { ...m, ...patch } : m,
            ),
          }
        : prev,
    );
  };

  const toggleVisibility = async () => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_product",
        password,
        product_id: product.id,
        visible: !product.visible,
      });
      setProduct({ ...product, visible: !product.visible });
      toast.success(
        !product.visible ? "Produto agora visível" : "Produto ocultado",
      );
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const saveCheckoutUrl = async () => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_product",
        password,
        product_id: product.id,
        checkout_url: checkoutValue,
      });
      setProduct({ ...product, checkout_url: checkoutValue });
      setEditingCheckout(false);
      toast.success("Link de checkout salvo!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const createModule = async () => {
    if (!password) return;
    try {
      const data = await adminApi<{ module: AdminModule }>({
        action: "create_module",
        password,
        product_id: product.id,
      });
      setProduct({ ...product, modules: [...product.modules, data.module] });
      toast.success("Módulo criado!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const renameModule = async (moduleId: string) => {
    if (!password) return;
    try {
      await adminApi({
        action: "rename_module",
        password,
        module_id: moduleId,
        module_name: renameValue,
      });
      updateModuleInState(moduleId, { module_name: renameValue });
      setRenamingModule(null);
      toast.success("Módulo renomeado!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!password) return;
    if (!confirm("Tem certeza que deseja excluir este módulo?")) return;
    try {
      await adminApi({
        action: "delete_module",
        password,
        module_id: moduleId,
      });
      setProduct({
        ...product,
        modules: product.modules.filter((m) => m.id !== moduleId),
      });
      toast.success("Módulo excluído!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const moveModule = async (moduleId: string, direction: "up" | "down") => {
    if (!password) return;
    const mods = [...sortedModules];
    const idx = mods.findIndex((m) => m.id === moduleId);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === mods.length - 1)
    )
      return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const tempOrder = mods[idx].display_order;
    mods[idx].display_order = mods[swapIdx].display_order;
    mods[swapIdx].display_order = tempOrder;

    // Optimistic
    setProduct({ ...product, modules: mods });

    try {
      await adminApi({
        action: "reorder_modules",
        password,
        modules: [
          { id: mods[idx].id, display_order: mods[idx].display_order },
          { id: mods[swapIdx].id, display_order: mods[swapIdx].display_order },
        ],
      });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
      loadProduct();
    }
  };

  const handleUploadModulePdf = async (moduleId: string, file: File) => {
    if (!password) return;
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF são permitidos.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 20MB.");
      return;
    }
    setUploadingModulePdf(moduleId);
    try {
      const data = await adminUploadPdf({ password, moduleId, file });
      updateModuleInState(moduleId, { pdf_file_path: data.pdf_file_path });
      toast.success("PDF enviado com sucesso!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingModulePdf(null);
    }
  };

  const triggerModuleFileInput = (moduleId: string) => {
    setPendingUploadModuleId(moduleId);
    fileInputRef.current?.click();
  };

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingUploadModuleId) {
      handleUploadModulePdf(pendingUploadModuleId, file);
    }
    setPendingUploadModuleId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeModulePdf = async (moduleId: string) => {
    if (!password) return;
    try {
      await adminApi({
        action: "remove_module_pdf",
        password,
        module_id: moduleId,
      });
      updateModuleInState(moduleId, { pdf_file_path: null });
      toast.success("PDF removido!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const saveVideoUrl = async (moduleId: string) => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_module_video",
        password,
        module_id: moduleId,
        video_url: videoUrlValue,
      });
      updateModuleInState(moduleId, {
        video_url: videoUrlValue || null,
      });
      setEditingVideoModule(null);
      toast.success("Link do vídeo salvo!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const removeVideoUrl = async (moduleId: string) => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_module_video",
        password,
        module_id: moduleId,
        video_url: "",
      });
      updateModuleInState(moduleId, { video_url: null });
      toast.success("Vídeo removido!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  // === Audio handlers ===
  const handleUploadModuleAudio = async (moduleId: string, file: File) => {
    if (!password) return;
    if (!file.type.startsWith("audio/")) {
      toast.error("Apenas arquivos de áudio são permitidos.");
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("O áudio deve ter no máximo 500MB.");
      return;
    }
    setUploadingModuleAudio(moduleId);
    try {
      const data = await adminUploadAudio({ password, moduleId, file });
      updateModuleInState(moduleId, { audio_file_path: data.audio_file_path });
      toast.success("Áudio enviado com sucesso!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingModuleAudio(null);
    }
  };

  const triggerAudioInput = (moduleId: string) => {
    setPendingAudioModuleId(moduleId);
    audioInputRef.current?.click();
  };

  const onAudioFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && pendingAudioModuleId) {
      handleUploadModuleAudio(pendingAudioModuleId, file);
    }
    setPendingAudioModuleId(null);
    if (audioInputRef.current) audioInputRef.current.value = "";
  };

  const removeModuleAudio = async (moduleId: string) => {
    if (!password) return;
    try {
      await adminApi({
        action: "remove_module_audio",
        password,
        module_id: moduleId,
      });
      updateModuleInState(moduleId, { audio_file_path: null });
      toast.success("Áudio removido!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  // === PR ADMIN 6A: Product image upload + commercial fields ===
  const handleUploadProductImage = async (file: File) => {
    if (!password || !product) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Apenas JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      return;
    }
    setUploadingProductImage(true);
    try {
      const data = await adminUploadProductImage({
        password,
        productId: product.id,
        file,
      });
      setProduct({ ...product, product_image_url: data.product_image_url });
      toast.success("Imagem enviada!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingProductImage(false);
    }
  };

  const onProductImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUploadProductImage(file);
    if (productImageInputRef.current) productImageInputRef.current.value = "";
  };

  const removeProductImage = async () => {
    if (!password || !product) return;
    if (!confirm("Remover imagem deste produto? O card volta a usar placeholder padrão.")) return;
    try {
      await adminApi({
        action: "remove_product_image",
        password,
        product_id: product.id,
      });
      setProduct({ ...product, product_image_url: "" });
      toast.success("Imagem removida.");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const saveCommercial = async () => {
    if (!password || !product) return;
    // Validações leves no front (server-side já valida tb)
    const rTrim = ratingValue.trim();
    const wTrim = reviewsValue.trim();
    let ratingPayload: number | null = null;
    let reviewsPayload: number | null = null;
    if (rTrim) {
      const n = Number(rTrim.replace(",", "."));
      if (Number.isNaN(n) || n < 0 || n > 5) {
        toast.error("Rating deve ser entre 0 e 5 (ex: 4.9).");
        return;
      }
      ratingPayload = Math.round(n * 10) / 10;
    }
    if (wTrim) {
      const n = Math.floor(Number(wTrim));
      if (Number.isNaN(n) || n < 0) {
        toast.error("Avaliações deve ser inteiro >= 0.");
        return;
      }
      reviewsPayload = n;
    }
    setSavingCommercial(true);
    try {
      await adminApi({
        action: "update_product_commercial",
        password,
        product_id: product.id,
        rating: ratingPayload,
        reviews_count: reviewsPayload,
      });
      setProduct({
        ...product,
        rating: ratingPayload,
        reviews_count: reviewsPayload,
      });
      toast.success("Rating/avaliações salvos!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingCommercial(false);
    }
  };

  // PR ADMIN 6G — Salvar nome + descrição do produto
  const saveBasicInfo = async () => {
    if (!password || !product) return;
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      toast.error("Nome do produto não pode ficar vazio.");
      return;
    }
    if (trimmedName.length > 200) {
      toast.error("Nome do produto deve ter no máximo 200 caracteres.");
      return;
    }
    const trimmedDesc = descriptionDraft.trim();
    if (trimmedDesc.length > 2000) {
      toast.error("Descrição deve ter no máximo 2000 caracteres.");
      return;
    }
    setSavingBasicInfo(true);
    try {
      await adminApi({
        action: "update_product_commercial",
        password,
        product_id: product.id,
        product_name: trimmedName,
        product_description: trimmedDesc,
      });
      setProduct({
        ...product,
        product_name: trimmedName,
        product_description: trimmedDesc,
      });
      toast.success("Informações do produto salvas!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingBasicInfo(false);
    }
  };

  // PR ADMIN 6H — Salvar CTA de compra
  const saveUpsell = async () => {
    if (!password || !product) return;
    const msgTrim = upsellMessage.trim();
    const labelTrim = upsellButtonLabel.trim();
    const colorTrim = upsellButtonColor.trim();
    if (msgTrim.length > 200) {
      toast.error("Mensagem deve ter no máximo 200 caracteres.");
      return;
    }
    if (labelTrim.length > 40) {
      toast.error("Texto do botão deve ter no máximo 40 caracteres.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(colorTrim)) {
      toast.error("Cor inválida. Use hex no formato #RRGGBB (ex: #b8860b).");
      return;
    }
    setSavingUpsell(true);
    try {
      const config = {
        enabled: upsellEnabled,
        message: msgTrim || null,
        button_label: labelTrim || null,
        button_color: colorTrim.toLowerCase(),
      };
      await adminApi({
        action: "update_product_commercial",
        password,
        product_id: product.id,
        upsell_cta_config: config,
      });
      setProduct({ ...product, upsell_cta_config: config });
      toast.success("Chamada para compra salva!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingUpsell(false);
    }
  };

  // PR ADMIN 6C — Salvar tipo do produto
  const saveKind = async () => {
    if (!password || !product) return;
    setSavingKind(true);
    try {
      await adminApi({
        action: "update_product_commercial",
        password,
        product_id: product.id,
        product_kind: kindValue || null,
      });
      setProduct({ ...product, product_kind: kindValue || null });
      toast.success("Tipo do produto salvo!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingKind(false);
    }
  };

  // PR ADMIN 6E — Salvar consultoria_config do produto
  const saveConsultoria = async () => {
    if (!password || !product) return;
    setSavingConsultoria(true);
    try {
      await adminApi({
        action: "update_product_commercial",
        password,
        product_id: product.id,
        consultoria_config: consultoriaDraft, // null = herda do global
      });
      setProduct({
        ...product,
        consultoria_config: consultoriaDraft as unknown,
      });
      toast.success("Configuração do formulário salva!");
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSavingConsultoria(false);
    }
  };

  // === is_published toggle ===
  const togglePublished = async (moduleId: string, current: boolean) => {
    if (!password) return;
    setTogglingPublished(moduleId);
    try {
      await adminApi({
        action: "set_module_published",
        password,
        module_id: moduleId,
        is_published: !current,
      });
      updateModuleInState(moduleId, { is_published: !current });
      toast.success(
        !current ? "Aula publicada" : "Aula marcada como em produção",
      );
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setTogglingPublished(null);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onFileSelected}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={onAudioFileSelected}
      />
      <input
        ref={productImageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onProductImageSelected}
      />

      {/* Back + heading */}
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
              <h2 className="truncate text-2xl font-bold text-foreground">
                {product.product_name}
              </h2>
              <Badge variant={product.visible ? "default" : "secondary"}>
                {product.visible ? "Visível" : "Oculto"}
              </Badge>
              {/* PR ADMIN 6C — badge de tipo do produto */}
              {product.product_kind && (
                <Badge variant="outline" className="text-[10px]">
                  {PRODUCT_KIND_LABEL[String(product.product_kind)] ||
                    product.product_kind}
                </Badge>
              )}
            </div>
            {product.product_description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {product.product_description}
              </p>
            )}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
              ID: {product.id} · gateway: {product.cakto_product_id}
            </p>
          </div>
        </div>
      </div>

      {/* PR ADMIN 6G — Informações básicas (nome + descrição) */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Informações básicas</CardTitle>
              <p className="text-xs text-muted-foreground">
                Nome e descrição que aparecem no card e na tela do produto.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="product-name">Nome do produto *</Label>
            <Input
              id="product-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ex: O Código da Reconquista"
              maxLength={200}
            />
            <p className="text-[11px] text-muted-foreground">
              {nameDraft.trim().length}/200 caracteres
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="product-description">Descrição</Label>
            <Textarea
              id="product-description"
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="Curta descrição que aparece embaixo do nome (opcional)."
              rows={3}
              maxLength={2000}
            />
            <p className="text-[11px] text-muted-foreground">
              {descriptionDraft.trim().length}/2000 caracteres
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveBasicInfo}
              disabled={
                savingBasicInfo ||
                (nameDraft.trim() === (product.product_name || "").trim() &&
                  descriptionDraft.trim() ===
                    (product.product_description || "").trim())
              }
            >
              {savingBasicInfo ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PR ADMIN 6H — Chamada para compra (lead não-comprador) */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base">Chamada para compra</CardTitle>
              <p className="text-xs text-muted-foreground">
                Mensagem + botão exibidos no card do produto pra leads que
                ainda não compraram. Aparece quando o produto tem checkout_url
                preenchido e o aluno não tem acesso.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <div className="space-y-0.5">
              <Label
                htmlFor="upsell-enabled"
                className="text-sm font-medium"
              >
                Mostrar chamada
              </Label>
              <p className="text-xs text-muted-foreground">
                Desligado = não aparece no card (mantém UX atual).
              </p>
            </div>
            <Switch
              id="upsell-enabled"
              checked={upsellEnabled}
              onCheckedChange={setUpsellEnabled}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upsell-message">Mensagem</Label>
            <Input
              id="upsell-message"
              value={upsellMessage}
              onChange={(e) => setUpsellMessage(e.target.value)}
              placeholder={DEFAULT_UPSELL_CTA.message}
              maxLength={200}
              disabled={!upsellEnabled}
            />
            <p className="text-[11px] text-muted-foreground">
              {upsellMessage.trim().length}/200 caracteres
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upsell-button-label">Texto do botão</Label>
            <Input
              id="upsell-button-label"
              value={upsellButtonLabel}
              onChange={(e) => setUpsellButtonLabel(e.target.value)}
              placeholder={DEFAULT_UPSELL_CTA.buttonLabel}
              maxLength={40}
              disabled={!upsellEnabled}
            />
            <p className="text-[11px] text-muted-foreground">
              {upsellButtonLabel.trim().length}/40 caracteres
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="upsell-button-color">Cor do botão</Label>
            <div className="flex items-center gap-2">
              <input
                id="upsell-button-color"
                type="color"
                value={upsellButtonColor}
                onChange={(e) => setUpsellButtonColor(e.target.value)}
                disabled={!upsellEnabled}
                className="h-9 w-12 cursor-pointer rounded border border-border bg-background disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Input
                value={upsellButtonColor}
                onChange={(e) => setUpsellButtonColor(e.target.value)}
                placeholder="#b8860b"
                maxLength={7}
                disabled={!upsellEnabled}
                className="font-mono"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Formato hex #RRGGBB. Padrão: dourado ({DEFAULT_UPSELL_CTA.buttonColor}).
            </p>
          </div>

          {/* Preview ao vivo */}
          {upsellEnabled && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="rounded-md border border-amber-800/20 bg-stone-50 px-3 py-2.5">
                {upsellMessage.trim() && (
                  <p className="mb-2 text-xs leading-snug text-stone-700">
                    {upsellMessage.trim()}
                  </p>
                )}
                <div
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
                  style={{
                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(upsellButtonColor)
                      ? upsellButtonColor
                      : DEFAULT_UPSELL_CTA.buttonColor,
                    color: pickContrastText(
                      /^#[0-9a-fA-F]{6}$/.test(upsellButtonColor)
                        ? upsellButtonColor
                        : DEFAULT_UPSELL_CTA.buttonColor,
                    ),
                  }}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {upsellButtonLabel.trim() || DEFAULT_UPSELL_CTA.buttonLabel}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveUpsell}
              disabled={savingUpsell}
            >
              {savingUpsell ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PR ADMIN 6A — Imagem do produto */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Imagem do card</CardTitle>
              <p className="text-xs text-muted-foreground">
                JPEG / PNG / WebP — máximo 5MB. Vai pro bucket público
                product-images.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            {/* Preview atual */}
            <div className="shrink-0">
              {product.product_image_url ? (
                <img
                  src={product.product_image_url}
                  alt={product.product_name}
                  className="h-32 w-32 rounded-md object-cover ring-1 ring-border bg-muted"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-md ring-1 ring-border bg-muted">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingProductImage}
                  onClick={() => productImageInputRef.current?.click()}
                >
                  {uploadingProductImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {product.product_image_url ? "Substituir imagem" : "Enviar imagem"}
                </Button>
                {product.product_image_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={removeProductImage}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover imagem
                  </Button>
                )}
              </div>
              {product.product_image_url && (
                <p className="break-all font-mono text-[10px] text-muted-foreground/80">
                  {product.product_image_url}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                A imagem aparece como capa no card de produtos na home da área
                de membros, mantendo o tratamento champagne premium aprovado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PR ADMIN 6C — Tipo do produto */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Tag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Tipo do produto</CardTitle>
              <p className="text-xs text-muted-foreground">
                Classificação comercial do produto. Sem efeito visual hoje;
                fica registrado pra futura diferenciação de render
                (ex: order bumps escondidos da home).
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={kindValue || "__none__"}
                onValueChange={(v) => setKindValue(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Não definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não definido</SelectItem>
                  {PRODUCT_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Atual no DB:{" "}
                <span className="font-mono">
                  {product.product_kind
                    ? PRODUCT_KIND_LABEL[String(product.product_kind)] ||
                      product.product_kind
                    : "null (não definido)"}
                </span>
              </p>
            </div>
            <Button size="sm" onClick={saveKind} disabled={savingKind}>
              {savingKind ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar tipo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PR ADMIN 6E — Formulário de consultoria por produto */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Pencil className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                Formulário de consultoria (nível produto)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Controle onde o formulário aparece neste produto. Sections e
                aulas podem sobrescrever este config (Aula &gt; Section &gt;
                Produto &gt; Global).
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ConsultoriaFieldset
            value={consultoriaDraft}
            onChange={(next) => setConsultoriaDraft(next)}
            levelLabel="produto"
            parentLabel="global"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={saveConsultoria}
              disabled={savingConsultoria}
            >
              {savingConsultoria ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar consultoria
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* PR ADMIN 6A — Status comercial */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Prova social do card</CardTitle>
              <p className="text-xs text-muted-foreground">
                Rating e número de avaliações exibidos no card. Deixe vazio pra
                usar o fallback hardcoded (4.9 / 11.939) durante a transição.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rating" className="text-xs">
                Rating (0 a 5, ex: 4.9)
              </Label>
              <Input
                id="rating"
                inputMode="decimal"
                placeholder="4.9"
                value={ratingValue}
                onChange={(e) => setRatingValue(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Atual no DB:{" "}
                <span className="font-mono">
                  {product.rating === null || product.rating === undefined
                    ? "null (fallback)"
                    : product.rating}
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reviews" className="text-xs">
                Número de avaliações
              </Label>
              <Input
                id="reviews"
                inputMode="numeric"
                placeholder="11939"
                value={reviewsValue}
                onChange={(e) => setReviewsValue(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Atual no DB:{" "}
                <span className="font-mono">
                  {product.reviews_count === null || product.reviews_count === undefined
                    ? "null (fallback)"
                    : product.reviews_count}
                </span>
              </p>
            </div>
          </div>
          <Button size="sm" onClick={saveCommercial} disabled={savingCommercial}>
            {savingCommercial ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar prova social
          </Button>
        </CardContent>
      </Card>

      {/* Quick toggles */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-foreground">Visibilidade</Label>
            <Switch
              checked={product.visible}
              onCheckedChange={toggleVisibility}
            />
            <span className="text-xs text-muted-foreground">
              {product.visible
                ? "Aparece na área de membros."
                : "Oculto pra clientes."}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {product.modules.length}{" "}
            {product.modules.length === 1 ? "módulo" : "módulos"}
          </div>
        </CardContent>
      </Card>

      {/* Sections shortcut */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Layers className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Estrutura interna (sections)
              </p>
              <p className="text-xs text-muted-foreground">
                Edita módulos do curso (01–10), aulas dentro de cada módulo,
                materiais de apoio e ordem. Front lê do DB com fallback ao
                config.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/admin/produtos/${product.id}/sections`)}
          >
            Editar sections
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Checkout URL */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">URL de Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          {editingCheckout ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="https://checkout.ticto.app/..."
                value={checkoutValue}
                onChange={(e) => setCheckoutValue(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <Button size="sm" onClick={saveCheckoutUrl}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingCheckout(false)}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                {product.checkout_url || (
                  <span className="italic">Sem URL de checkout definida</span>
                )}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingCheckout(true);
                  setCheckoutValue(product.checkout_url || "");
                }}
              >
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Editar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modules CRUD */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">
            Módulos ({product.modules.length})
          </CardTitle>
          <Button size="sm" variant="outline" onClick={createModule}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Novo módulo
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {sortedModules.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum módulo. Clique em "Novo módulo" pra criar.
            </p>
          ) : (
            sortedModules.map((mod, idx) => (
              <div
                key={mod.id}
                className="rounded-md border border-border bg-muted/30 px-3 py-2"
              >
                {/* Top row */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      disabled={idx === 0}
                      onClick={() => moveModule(mod.id, "up")}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      disabled={idx === sortedModules.length - 1}
                      onClick={() => moveModule(mod.id, "down")}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />

                  {renamingModule === mod.id ? (
                    <div className="flex flex-1 items-center gap-1">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameModule(mod.id);
                          if (e.key === "Escape") setRenamingModule(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => renameModule(mod.id)}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setRenamingModule(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm text-foreground">
                        {mod.module_name}
                      </span>
                      {mod.pdf_file_path && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-success" />
                          <span className="text-xs text-success">PDF</span>
                        </div>
                      )}
                      {mod.video_url && (
                        <div className="flex items-center gap-1">
                          <Video className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-primary">Vídeo</span>
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Renomear"
                        onClick={() => {
                          setRenamingModule(mod.id);
                          setRenameValue(mod.module_name);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        title="Excluir módulo"
                        onClick={() => deleteModule(mod.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Content management row */}
                {renamingModule !== mod.id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-8">
                    {/* PDF */}
                    {mod.pdf_file_path ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => triggerModuleFileInput(mod.id)}
                          disabled={uploadingModulePdf === mod.id}
                        >
                          Substituir PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Remover PDF"
                          onClick={() => removeModulePdf(mod.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => triggerModuleFileInput(mod.id)}
                        disabled={uploadingModulePdf === mod.id}
                      >
                        {uploadingModulePdf === mod.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="mr-1 h-3 w-3" />
                        )}
                        Enviar PDF
                      </Button>
                    )}

                    <div className="h-4 w-px bg-border" />

                    {/* Video */}
                    {editingVideoModule === mod.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <Input
                          placeholder="https://youtube.com/watch?v=..."
                          value={videoUrlValue}
                          onChange={(e) => setVideoUrlValue(e.target.value)}
                          className="h-7 flex-1 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveVideoUrl(mod.id);
                            if (e.key === "Escape") setEditingVideoModule(null);
                          }}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => saveVideoUrl(mod.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingVideoModule(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : mod.video_url ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingVideoModule(mod.id);
                            setVideoUrlValue(mod.video_url || "");
                          }}
                        >
                          Editar Vídeo
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Remover vídeo"
                          onClick={() => removeVideoUrl(mod.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingVideoModule(mod.id);
                          setVideoUrlValue("");
                        }}
                      >
                        <Video className="mr-1 h-3 w-3" />
                        Adicionar Vídeo
                      </Button>
                    )}

                    <div className="h-4 w-px bg-border" />

                    {/* Audio */}
                    {mod.audio_file_path ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <Music className="h-3.5 w-3.5" />
                          Áudio
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => triggerAudioInput(mod.id)}
                          disabled={uploadingModuleAudio === mod.id}
                        >
                          {uploadingModuleAudio === mod.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : null}
                          Substituir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          title="Remover áudio"
                          onClick={() => removeModuleAudio(mod.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => triggerAudioInput(mod.id)}
                        disabled={uploadingModuleAudio === mod.id}
                      >
                        {uploadingModuleAudio === mod.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Music className="mr-1 h-3 w-3" />
                        )}
                        Enviar Áudio
                      </Button>
                    )}

                    <div className="h-4 w-px bg-border" />

                    {/* is_published toggle */}
                    <Button
                      size="sm"
                      variant={mod.is_published === false ? "outline" : "ghost"}
                      className={`h-7 text-xs ${mod.is_published === false ? "border-amber-700/40 text-amber-700" : ""}`}
                      onClick={() =>
                        togglePublished(mod.id, mod.is_published !== false)
                      }
                      disabled={togglingPublished === mod.id}
                    >
                      {togglingPublished === mod.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : mod.is_published === false ? (
                        <>
                          <Clock3 className="mr-1 h-3 w-3" />
                          Em produção
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3 w-3" />
                          Publicada
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProductDetail;
