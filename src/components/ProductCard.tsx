import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BookOpen,
  CheckCircle,
  ExternalLink,
  FileText,
  Lock,
  Package,
  ShoppingCart,
  Star,
} from "lucide-react";

interface PurchaseModule {
  id: string;
  module_name: string;
  pdf_url: string | null;
  has_pdf: boolean;
  video_url: string | null;
  has_video: boolean;
  completed: boolean;
}

export interface Purchase {
  id: string;
  product_name: string;
  product_description: string;
  product_image_url: string;
  access_url: string;
  checkout_url: string;
  purchase_date: string | null;
  amount: string | null;
  purchased: boolean;
  pdf_url: string | null;
  modules: PurchaseModule[];
}

interface ProductCardProps {
  purchase: Purchase;
  buyerEmail: string;
  onProductClick: (p: Purchase) => void;
  onCheckoutClick: (p: Purchase) => void;
  onOpenPdf: (url: string, name: string) => void;
}

/**
 * Card de produto reproduzindo o visual do antigo cdrmembros.vercel.app:
 *   - Banner do produto no topo
 *   - Badge "Desbloqueado" verde OU "Bloqueado" cinza no canto superior direito
 *   - Quando bloqueado: overlay com lock + "Conteúdo exclusivo" + nome + "Compre agora e Desbloqueie"
 *   - Estrelas falsas 4.5 + "(11.939)" como social proof (mantido fiel ao antigo)
 *   - CTA dinâmico conforme estado:
 *       desbloqueado + tem modules com video/pdf  → "Acessar Conteúdo" (verde)
 *       desbloqueado + tem só pdf legacy          → "Ler Conteúdo" (verde)
 *       bloqueado + tem checkout_url              → "Desbloquear Agora" (vermelho/destructive)
 *       bloqueado + sem checkout_url              → "Em breve" (cinza disabled)
 */
const ProductCard = ({
  purchase,
  onProductClick,
  onCheckoutClick,
  onOpenPdf,
}: ProductCardProps) => {
  const navigate = useNavigate();

  const hasModuleContent =
    purchase.modules?.length > 0 &&
    purchase.modules.some((m) => m.has_pdf || m.has_video);

  const handleAcessarConteudo = () => {
    onProductClick(purchase);
    navigate(`/produto/${purchase.id}`, {
      state: {
        email: purchase.id, // legacy field — preservado pra compat com ProductContent.tsx existente
        product_name: purchase.product_name,
        product_description: purchase.product_description,
        product_image_url: purchase.product_image_url,
        modules: purchase.modules,
      },
    });
  };

  return (
    <Card
      className={`overflow-hidden border-border transition-shadow ${
        purchase.purchased ? "hover:shadow-md" : ""
      }`}
    >
      {/* Banner area com badge + overlay quando bloqueado */}
      <div className="relative">
        {purchase.product_image_url ? (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={purchase.product_image_url}
              alt={purchase.product_name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-muted">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        <div className="absolute right-2 top-2">
          {purchase.purchased ? (
            <Badge className="flex items-center gap-1 bg-success text-success-foreground hover:bg-success/90">
              <CheckCircle className="h-3 w-3" />
              Desbloqueado
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-muted text-muted-foreground"
            >
              <Lock className="h-3 w-3" />
              Bloqueado
            </Badge>
          )}
        </div>

        {!purchase.purchased && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-3 text-center backdrop-blur-sm">
            <Lock className="mb-1.5 h-6 w-6 text-foreground" />
            <p className="text-sm font-semibold text-foreground">
              Conteúdo exclusivo
            </p>
            <p className="line-clamp-1 max-w-full text-xs text-muted-foreground">
              {purchase.product_name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Compre agora e Desbloqueie
            </p>
          </div>
        )}
      </div>

      <CardHeader>
        <CardTitle className="text-lg text-foreground">
          {purchase.product_name}
        </CardTitle>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex items-center">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <span className="text-xs font-medium text-foreground">4.5</span>
          <span className="text-xs text-muted-foreground">(11.939)</span>
        </div>
        {purchase.product_description && (
          <CardDescription className="line-clamp-2 text-muted-foreground">
            {purchase.product_description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {purchase.purchased && purchase.purchase_date && (
          <p className="text-xs text-muted-foreground">
            Comprado em:{" "}
            {new Date(purchase.purchase_date).toLocaleDateString("pt-BR")}
          </p>
        )}

        {/* Desbloqueado + modules com conteúdo: "Acessar Conteúdo" */}
        {purchase.purchased && hasModuleContent && (
          <Button
            className="w-full bg-success text-success-foreground hover:bg-success/90"
            onClick={handleAcessarConteudo}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Acessar Conteúdo
          </Button>
        )}

        {/* Desbloqueado + sem modules mas tem PDF legacy: "Ler Conteúdo" */}
        {purchase.purchased &&
          (!purchase.modules || purchase.modules.length === 0) &&
          purchase.pdf_url && (
            <Button
              className="w-full bg-success text-success-foreground hover:bg-success/90"
              onClick={() => {
                onProductClick(purchase);
                onOpenPdf(purchase.pdf_url!, purchase.product_name);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              Ler Conteúdo
            </Button>
          )}

        {/* Desbloqueado + sem modules e sem PDF mas tem access_url externo */}
        {purchase.purchased &&
          (!purchase.modules || purchase.modules.length === 0) &&
          !purchase.pdf_url &&
          purchase.access_url && (
            <Button
              asChild
              className="w-full bg-success text-success-foreground hover:bg-success/90"
              onClick={() => onProductClick(purchase)}
            >
              <a href={purchase.access_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Acessar Produto
              </a>
            </Button>
          )}

        {/* Bloqueado: "Desbloquear Agora" (se houver checkout_url) ou "Em breve" */}
        {!purchase.purchased && purchase.checkout_url ? (
          <Button
            asChild
            variant="destructive"
            className="w-full"
            onClick={() => onCheckoutClick(purchase)}
          >
            <a
              href={purchase.checkout_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Desbloquear Agora
            </a>
          </Button>
        ) : !purchase.purchased ? (
          <Button
            variant="secondary"
            className="w-full cursor-not-allowed"
            disabled
          >
            <Lock className="mr-2 h-4 w-4" />
            Em breve
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ProductCard;
