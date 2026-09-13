import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Button } from "@reconquista/ui/button";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabaseAuthHeaders = () =>
  SUPABASE_ANON_KEY
    ? {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      }
    : {};

interface PdfViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  moduleId: string;
  productId?: string | null;
  productName: string;
}

interface MediaResponse {
  url?: string;
  expires_in?: number;
  error?: string;
}

const PdfViewerModal = ({
  open,
  onOpenChange,
  email,
  moduleId,
  productId,
  productName,
}: PdfViewerModalProps) => {
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(760);
  const [refreshAfterMs, setRefreshAfterMs] = useState(0);

  const logFailure = useCallback(
    async (action: string, message: string) => {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/members-api`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...supabaseAuthHeaders(),
          },
          body: JSON.stringify({
            email,
            action,
            cakto_product_id: productId || undefined,
            metadata: { moduleId, message },
          }),
        });
      } catch {
        // Diagnóstico não deve impedir o aluno de tentar novamente.
      }
    },
    [email, moduleId, productId],
  );

  const loadPdf = useCallback(async () => {
    if (!open || !email || !moduleId) return;
    setIsLoading(true);
    setError("");
    setPdfUrl("");
    setNumPages(0);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/members-api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...supabaseAuthHeaders(),
        },
        body: JSON.stringify({
          email,
          action: "get_module_media",
          module_id: moduleId,
          media_type: "pdf",
          cakto_product_id: productId || undefined,
        }),
      });
      const data: MediaResponse = await response.json();
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Não foi possível abrir o PDF.");
      }
      setPdfUrl(data.url);
      setRefreshAfterMs(
        data.expires_in
          ? Math.max(60_000, (data.expires_in - 300) * 1_000)
          : 0,
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível abrir o PDF. Verifique sua internet e tente novamente.";
      setError(message);
      logFailure("pdf_open_error", message);
    } finally {
      setIsLoading(false);
    }
  }, [email, logFailure, moduleId, open, productId]);

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  useEffect(() => {
    if (!open || !pdfUrl || !refreshAfterMs) return;
    const timer = window.setTimeout(loadPdf, refreshAfterMs);
    return () => window.clearTimeout(timer);
  }, [loadPdf, open, pdfUrl, refreshAfterMs]);

  useEffect(() => {
    if (!open) return;
    const updateWidth = () => {
      const width = pageContainerRef.current?.clientWidth || window.innerWidth;
      setPageWidth(Math.max(280, Math.min(width - 24, 900)));
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 shrink-0 px-3 font-bold sm:px-4"
            onClick={() => onOpenChange(false)}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Voltar para a aula
          </Button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground sm:text-base">
            {productName}
          </p>
          {pdfUrl && (
            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir no navegador
                </a>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main
        ref={pageContainerRef}
        className="flex min-h-0 flex-1 justify-center overflow-auto bg-muted/35 px-2 py-4 sm:px-5"
      >
        {isLoading && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold text-foreground">Abrindo seu material...</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Aguarde alguns segundos. Estamos preparando uma nova versão segura do arquivo.
            </p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-lg font-bold text-foreground">Não foi possível abrir o PDF</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
            <Button size="lg" onClick={loadPdf}>
              <RefreshCw className="mr-2 h-5 w-5" />
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !error && pdfUrl && (
          <Document
            file={pdfUrl}
            loading={
              <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }
            onLoadSuccess={({ numPages: pages }) => setNumPages(pages)}
            onLoadError={(reason) => {
              const message =
                reason instanceof Error ? reason.message : "O arquivo não pôde ser exibido.";
              setError("O arquivo expirou ou sua conexão oscilou. Tente novamente.");
              logFailure("pdf_render_error", message);
            }}
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, index) => (
              <Page
                key={`page-${index + 1}`}
                pageNumber={index + 1}
                width={pageWidth}
                renderAnnotationLayer
                renderTextLayer
                className="overflow-hidden rounded-md bg-white shadow-lg"
              />
            ))}
          </Document>
        )}
      </main>

      {pdfUrl && !error && (
        <footer className="sticky bottom-0 z-10 border-t border-border bg-background/95 px-3 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center gap-2">
            <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
              {numPages ? `${numPages} páginas` : "Carregando páginas..."}
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only">Abrir no navegador</span>
              </a>
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PdfViewerModal;
