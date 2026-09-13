import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  ChevronRight,
  Link as LinkIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  AdminApiAuthError,
  PRODUCT_KIND_LABEL,
  PRODUCT_KIND_OPTIONS,
  type AdminProduct,
  type AdminProductKind,
} from "./adminApi";
import { useAdminSession } from "./useAdminSession";

interface CreateFormState {
  product_name: string;
  product_description: string;
  cakto_product_id: string;
  product_kind: AdminProductKind | "";
  visible: boolean;
  checkout_url: string;
  rating: string;
  reviews_count: string;
}

const emptyCreateForm = (): CreateFormState => ({
  product_name: "",
  product_description: "",
  cakto_product_id: "",
  product_kind: "",
  visible: true,
  checkout_url: "",
  rating: "",
  reviews_count: "",
});

const AdminProducts = () => {
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // PR ADMIN 6C — Create product dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm());
  const [creating, setCreating] = useState(false);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const loadProducts = useCallback(async () => {
    if (!password) return;
    setIsLoading(true);
    try {
      const data = await adminApi<{ products: AdminProduct[] }>({
        action: "get_products",
        password,
      });
      setProducts(data.products || []);
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [password, handleAuthError]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleVisibility = async (product: AdminProduct) => {
    if (!password) return;
    try {
      await adminApi({
        action: "update_product",
        password,
        product_id: product.id,
        visible: !product.visible,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, visible: !p.visible } : p,
        ),
      );
      toast.success(
        !product.visible ? "Produto agora visível" : "Produto ocultado",
      );
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      toast.error((err as Error).message);
    }
  };

  const openCreateDialog = () => {
    setCreateForm(emptyCreateForm());
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!password) return;
    const f = createForm;
    if (!f.product_name.trim()) {
      toast.error("Nome do produto é obrigatório.");
      return;
    }
    if (!f.cakto_product_id.trim()) {
      toast.error("ID do produto na Ticto/Gateway é obrigatório.");
      return;
    }
    if (f.checkout_url.trim()) {
      try {
        const u = new URL(f.checkout_url.trim());
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      } catch {
        toast.error("checkout_url deve ser uma URL HTTP(S) válida.");
        return;
      }
    }
    let ratingPayload: number | null = null;
    if (f.rating.trim()) {
      const n = Number(f.rating.trim().replace(",", "."));
      if (Number.isNaN(n) || n < 0 || n > 5) {
        toast.error("Rating deve ser entre 0 e 5.");
        return;
      }
      ratingPayload = Math.round(n * 10) / 10;
    }
    let reviewsPayload: number | null = null;
    if (f.reviews_count.trim()) {
      const n = Math.floor(Number(f.reviews_count.trim()));
      if (Number.isNaN(n) || n < 0) {
        toast.error("Número de avaliações deve ser inteiro >= 0.");
        return;
      }
      reviewsPayload = n;
    }
    setCreating(true);
    try {
      const resp = await adminApi<{ product: AdminProduct }>({
        action: "create_product",
        password,
        cakto_product_id: f.cakto_product_id.trim(),
        product_name: f.product_name.trim(),
        product_description: f.product_description.trim(),
        checkout_url: f.checkout_url.trim() || null,
        visible: f.visible,
        product_kind: f.product_kind || null,
        rating: ratingPayload,
        reviews_count: reviewsPayload,
      });
      toast.success("Produto criado! Redirecionando…");
      setCreateOpen(false);
      // PR ADMIN 6C — redirect imediato pra detail pra editar imagem/sections/etc
      if (resp.product?.id) {
        navigate(`/admin/produtos/${resp.product.id}`);
      } else {
        loadProducts();
      }
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Produtos</h2>
          <p className="text-sm text-muted-foreground">
            {products.length}{" "}
            {products.length === 1 ? "produto cadastrado" : "produtos cadastrados"}{" "}
            · Clique em um produto para editar módulos e detalhes.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      {isLoading && products.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">
              Nenhum produto cadastrado ainda.
            </p>
            <Button size="sm" className="mt-4" onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeiro produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <Card key={product.id} className="border-border">
              <CardHeader className="p-0">
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                  {/* Thumb */}
                  {product.product_image_url ? (
                    <img
                      src={product.product_image_url}
                      alt={product.product_name}
                      className="h-16 w-16 shrink-0 rounded-md object-cover bg-muted"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="truncate text-base text-foreground sm:text-lg">
                        {product.product_name}
                      </CardTitle>
                      <Badge variant={product.visible ? "default" : "secondary"}>
                        {product.visible ? "Visível" : "Oculto"}
                      </Badge>
                      {/* PR ADMIN 6C — badge de tipo se definido */}
                      {product.product_kind && (
                        <Badge variant="outline" className="text-[10px]">
                          {PRODUCT_KIND_LABEL[String(product.product_kind)] ||
                            product.product_kind}
                        </Badge>
                      )}
                      {/* PR ADMIN 6C — indicador checkout */}
                      {product.checkout_url ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-700/40 text-[10px] text-emerald-500"
                        >
                          <LinkIcon className="mr-1 h-3 w-3" />
                          checkout configurado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-700/40 text-[10px] text-amber-500"
                        >
                          sem checkout
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {product.modules.length}{" "}
                        {product.modules.length === 1 ? "aula" : "aulas"}
                      </span>
                      <span>·</span>
                      <span className="truncate font-mono text-[11px]">
                        ID: {product.cakto_product_id}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 self-stretch sm:self-center">
                    <div className="flex items-center gap-2">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Visível
                      </span>
                      <Switch
                        checked={product.visible}
                        onCheckedChange={() => toggleVisibility(product)}
                        aria-label={`Visibilidade: ${product.product_name}`}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/produtos/${product.id}`)}
                    >
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Editar
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* PR ADMIN 6C — Create product dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>
              Cria o registro mínimo. Imagem do card, sections, aulas, PDFs,
              vídeos e áudios são adicionados depois na tela de edição.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-name" className="text-xs">
                Nome do produto *
              </Label>
              <Input
                id="create-name"
                value={createForm.product_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, product_name: e.target.value }))
                }
                placeholder="Ex: O Código da Reconquista"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-desc" className="text-xs">
                Descrição curta
              </Label>
              <Textarea
                id="create-desc"
                rows={2}
                value={createForm.product_description}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    product_description: e.target.value,
                  }))
                }
                placeholder="Aparece no card do produto na home da área de membros."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-cakto" className="text-xs">
                ID do produto na Ticto/Gateway *
              </Label>
              <Input
                id="create-cakto"
                value={createForm.cakto_product_id}
                onChange={(e) =>
                  setCreateForm((f) => ({
                    ...f,
                    cakto_product_id: e.target.value,
                  }))
                }
                placeholder="Ex: 111462 ou pending-novo-produto"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Use o ID do produto/oferta usado pelo webhook para liberar o
                acesso automaticamente após a compra. Se ainda não tem ID
                definitivo, use um placeholder tipo{" "}
                <code className="font-mono">pending-nome-produto</code> e
                atualize quando criar na Ticto.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo do produto</Label>
                <Select
                  value={createForm.product_kind || "__none__"}
                  onValueChange={(v) =>
                    setCreateForm((f) => ({
                      ...f,
                      product_kind: v === "__none__" ? "" : (v as AdminProductKind),
                    }))
                  }
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
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visível na home</Label>
                <div className="flex h-9 items-center gap-3 rounded-md border border-border bg-background px-3">
                  <Switch
                    checked={createForm.visible}
                    onCheckedChange={(checked) =>
                      setCreateForm((f) => ({ ...f, visible: checked }))
                    }
                  />
                  <span className="text-xs text-muted-foreground">
                    {createForm.visible ? "Aparece na home" : "Oculto da home"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-checkout" className="text-xs">
                Checkout URL
              </Label>
              <Input
                id="create-checkout"
                value={createForm.checkout_url}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, checkout_url: e.target.value }))
                }
                placeholder="https://pay.ticto.app/..."
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Vazio = card aparece como "Em breve". Preenchido = card bloqueado
                vira "Desbloquear agora" e abre essa URL.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="create-rating" className="text-xs">
                  Rating (0–5, opcional)
                </Label>
                <Input
                  id="create-rating"
                  inputMode="decimal"
                  placeholder="4.9"
                  value={createForm.rating}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, rating: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-reviews" className="text-xs">
                  Avaliações (opcional)
                </Label>
                <Input
                  id="create-reviews"
                  inputMode="numeric"
                  placeholder="11939"
                  value={createForm.reviews_count}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      reviews_count: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              Após criar, você vai cair na tela de edição do produto onde dá pra
              fazer upload da imagem, configurar sections, adicionar aulas, PDFs,
              vídeos e áudios.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Criar produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
