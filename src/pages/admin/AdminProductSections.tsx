import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Music,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  adminApi,
  adminUploadAudio,
  adminUploadMaterialPdf,
  adminUploadModuleCoverImage,
  adminUploadPdf,
  adminUploadSectionImage,
  AdminApiAuthError,
  type AdminProduct,
  type AdminProductSection,
  type AdminSectionMaterial,
  type AdminSectionModule,
  type AdminSectionsResponse,
} from "./adminApi";
import { ConsultoriaFieldset } from "./ConsultoriaFieldset";
import type { ConsultoriaConfig } from "@/lib/siteSettings";
import { useAdminSession } from "./useAdminSession";

const SECTION_KINDS = [
  { value: "welcome", label: "Welcome (boas-vindas)" },
  { value: "track", label: "Track (trilha de aulas)" },
  { value: "journey", label: "Journey (jornada diária)" },
  { value: "coming-soon", label: "Coming soon (em produção)" },
] as const;

const SECTION_STATUSES = [
  { value: "available", label: "Liberado" },
  { value: "partial", label: "Parcial" },
  { value: "in_production", label: "Em produção" },
] as const;

const MATERIAL_KINDS = [
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "Áudio" },
  { value: "video", label: "Vídeo" },
  { value: "link", label: "Link externo" },
] as const;

const MATERIAL_STATES = [
  { value: "ready", label: "Disponível" },
  { value: "coming-soon", label: "Em breve" },
] as const;

// PR ADMIN 6B — Lucide icon allowlist (mesma usada no backend pra validação)
const SECTION_ICON_OPTIONS = [
  { value: "", label: "Sem ícone (usa fallback)" },
  { value: "brain", label: "🧠 Brain (cérebro)" },
  { value: "heart", label: "❤️ Heart (coração)" },
  { value: "lock", label: "🔒 Lock (cadeado)" },
  { value: "book", label: "📖 Book (livro)" },
  { value: "clock", label: "⏰ Clock (relógio)" },
  { value: "target", label: "🎯 Target (alvo)" },
  { value: "file", label: "📄 File (arquivo)" },
  { value: "play", label: "▶️ Play (vídeo)" },
] as const;

interface SectionFormState {
  section_key: string;
  number: string;
  title: string;
  subtitle: string;
  kind: string;
  status: string;
  sequential: boolean;
  in_production_copy: string;
  /** PR ADMIN 6B */
  icon_key: string;
  accent_color: string;
}

const emptySectionForm = (): SectionFormState => ({
  section_key: "",
  number: "",
  title: "",
  subtitle: "",
  kind: "track",
  status: "available",
  sequential: false,
  in_production_copy: "",
  icon_key: "",
  accent_color: "",
});

interface MaterialFormState {
  title: string;
  kind: string;
  state: string;
  external_url: string;
}

const emptyMaterialForm = (): MaterialFormState => ({
  title: "",
  kind: "pdf",
  state: "coming-soon",
  external_url: "",
});

interface ModuleFormState {
  module_name: string;
  video_url: string;
  section_id: string;
  section_order: number;
  is_published: boolean;
}

const moduleFormFrom = (
  m: AdminSectionModule,
  fallbackSectionId: string,
): ModuleFormState => ({
  module_name: m.module_name,
  video_url: m.video_url || "",
  section_id: m.section_id || fallbackSectionId,
  section_order: m.section_order ?? 0,
  is_published: m.is_published !== false,
});

const AdminProductSections = () => {
  const { id } = useParams<{ id: string }>();
  const { password, logout } = useAdminSession();
  const navigate = useNavigate();

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [data, setData] = useState<AdminSectionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Section edit dialog
  const [sectionDialog, setSectionDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    sectionId: string | null;
    form: SectionFormState;
  }>({ open: false, mode: "create", sectionId: null, form: emptySectionForm() });
  const [sectionSaving, setSectionSaving] = useState(false);
  // PR ADMIN 6E — consultoria_config draft pro dialog de section
  const [sectionConsultoriaDraft, setSectionConsultoriaDraft] = useState<
    ConsultoriaConfig | null
  >(null);

  // Material edit dialog
  const [materialDialog, setMaterialDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    sectionId: string;
    materialId: string | null;
    form: MaterialFormState;
  }>({
    open: false,
    mode: "create",
    sectionId: "",
    materialId: null,
    form: emptyMaterialForm(),
  });
  const [materialSaving, setMaterialSaving] = useState(false);

  // Assign module drawer state (per-section)
  const [assignDrawerSection, setAssignDrawerSection] = useState<string | null>(
    null,
  );

  // Material PDF upload
  const [uploadingMaterial, setUploadingMaterial] = useState<string | null>(null);
  const [pendingUploadMaterialId, setPendingUploadMaterialId] = useState<
    string | null
  >(null);
  const materialFileRef = useRef<HTMLInputElement>(null);

  // PR ADMIN 6B — Section image upload
  const [uploadingSectionImage, setUploadingSectionImage] = useState<string | null>(null);
  const [pendingSectionImageId, setPendingSectionImageId] = useState<string | null>(null);
  const sectionImageRef = useRef<HTMLInputElement>(null);

  // ===== Module edit dialog =====
  const [moduleDialog, setModuleDialog] = useState<{
    open: boolean;
    moduleId: string | null;
    form: ModuleFormState;
  }>({
    open: false,
    moduleId: null,
    form: {
      module_name: "",
      video_url: "",
      section_id: "",
      section_order: 0,
      is_published: true,
    },
  });
  const [moduleSaving, setModuleSaving] = useState(false);
  // PR ADMIN 6E — consultoria_config draft pro dialog de módulo
  const [moduleConsultoriaDraft, setModuleConsultoriaDraft] = useState<
    ConsultoriaConfig | null
  >(null);
  // PR ADMIN 6F — Create lesson dialog state
  const [createLessonDialog, setCreateLessonDialog] = useState<{
    open: boolean;
    sectionId: string;
    sectionTitle: string;
    name: string;
    videoUrl: string;
    isPublished: boolean;
  }>({
    open: false,
    sectionId: "",
    sectionTitle: "",
    name: "",
    videoUrl: "",
    isPublished: true,
  });
  const [creatingLesson, setCreatingLesson] = useState(false);
  // Upload de PDF/áudio dentro do modal de módulo
  const [moduleUploadingPdf, setModuleUploadingPdf] = useState(false);
  const [moduleUploadingAudio, setModuleUploadingAudio] = useState(false);
  const [moduleUploadingCover, setModuleUploadingCover] = useState(false);
  const modulePdfRef = useRef<HTMLInputElement>(null);
  const moduleAudioRef = useRef<HTMLInputElement>(null);
  const moduleCoverRef = useRef<HTMLInputElement>(null);

  const handleAuthError = useCallback(() => {
    logout();
    navigate("/admin", { replace: true });
    toast.error("Sessão expirada");
  }, [logout, navigate]);

  const load = useCallback(async () => {
    if (!password || !id) return;
    setIsLoading(true);
    try {
      // Carrega produto pra header + lista global de modules
      const prodData = await adminApi<{ products: AdminProduct[] }>({
        action: "get_products",
        password,
      });
      const target = (prodData.products || []).find((p) => p.id === id);
      if (!target) {
        toast.error("Produto não encontrado");
        navigate("/admin/produtos", { replace: true });
        return;
      }
      setProduct(target);

      const secData = await adminApi<AdminSectionsResponse>({
        action: "list_product_sections",
        password,
        product_id: target.id,
        include_archived: includeArchived,
      });
      setData(secData);
    } catch (err) {
      if (err instanceof AdminApiAuthError) {
        handleAuthError();
        return;
      }
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [password, id, includeArchived, navigate, handleAuthError]);

  useEffect(() => {
    load();
  }, [load]);

  // ===== Derived data =====
  const sortedSections = useMemo(
    () =>
      [...(data?.sections || [])].sort(
        (a, b) => a.display_order - b.display_order,
      ),
    [data?.sections],
  );

  const modulesBySection = useMemo(() => {
    const map = new Map<string, AdminSectionModule[]>();
    for (const m of data?.modules || []) {
      if (!m.section_id) continue;
      if (!map.has(m.section_id)) map.set(m.section_id, []);
      map.get(m.section_id)!.push(m);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0));
    }
    return map;
  }, [data?.modules]);

  const unassignedModules = useMemo(
    () => (data?.modules || []).filter((m) => !m.section_id),
    [data?.modules],
  );

  const materialsBySection = useMemo(() => {
    const map = new Map<string, AdminSectionMaterial[]>();
    for (const mat of data?.materials || []) {
      if (!mat.section_id) continue;
      if (!map.has(mat.section_id)) map.set(mat.section_id, []);
      map.get(mat.section_id)!.push(mat);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.display_order - b.display_order);
    }
    return map;
  }, [data?.materials]);

  // ===== Section CRUD =====
  const openCreateSection = () => {
    setSectionDialog({
      open: true,
      mode: "create",
      sectionId: null,
      form: emptySectionForm(),
    });
    setSectionConsultoriaDraft(null); // inherit por padrão
  };

  const openEditSection = (sec: AdminProductSection) => {
    setSectionDialog({
      open: true,
      mode: "edit",
      sectionId: sec.id,
      form: {
        section_key: sec.section_key,
        number: sec.number,
        title: sec.title,
        subtitle: sec.subtitle || "",
        kind: sec.kind,
        status: sec.status,
        sequential: sec.sequential,
        in_production_copy: sec.in_production_copy || "",
        icon_key: sec.icon_key || "",
        accent_color: sec.accent_color || "",
      },
    });
    // PR ADMIN 6E: popula draft de consultoria (null = herda)
    setSectionConsultoriaDraft(
      sec.consultoria_config === null || sec.consultoria_config === undefined
        ? null
        : (sec.consultoria_config as ConsultoriaConfig),
    );
  };

  const saveSection = async () => {
    if (!password || !product) return;
    const { form, mode, sectionId } = sectionDialog;
    if (!form.title.trim() || !form.number.trim() || !form.section_key.trim()) {
      toast.error("Preencha section_key, número e título");
      return;
    }
    // PR ADMIN 6B: validação de accent_color hex (server-side reforça)
    const accentTrim = form.accent_color.trim();
    if (accentTrim && !/^#[0-9a-fA-F]{6}$/.test(accentTrim)) {
      toast.error("accent_color deve ser hex no formato #RRGGBB.");
      return;
    }
    setSectionSaving(true);
    try {
      if (mode === "create") {
        await adminApi({
          action: "create_product_section",
          password,
          product_id: product.id,
          section_key: form.section_key,
          number: form.number,
          title: form.title,
          subtitle: form.subtitle || null,
          kind: form.kind,
          status: form.status,
          sequential: form.sequential,
          in_production_copy: form.in_production_copy || null,
        });
        toast.success("Section criada!");
      } else if (sectionId) {
        await adminApi({
          action: "update_product_section",
          password,
          section_id: sectionId,
          section_key: form.section_key,
          number: form.number,
          title: form.title,
          subtitle: form.subtitle || null,
          kind: form.kind,
          status: form.status,
          sequential: form.sequential,
          in_production_copy: form.in_production_copy || null,
          // PR ADMIN 6B
          icon_key: form.icon_key || null,
          accent_color: accentTrim || null,
          // PR ADMIN 6E (null = herda do produto)
          consultoria_config: sectionConsultoriaDraft,
        });
        toast.success("Section atualizada!");
      }
      setSectionDialog((s) => ({ ...s, open: false }));
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setSectionSaving(false);
    }
  };

  const archiveSection = async (sec: AdminProductSection, archived: boolean) => {
    if (!password) return;
    try {
      await adminApi({
        action: "archive_product_section",
        password,
        section_id: sec.id,
        archived,
      });
      toast.success(archived ? "Section arquivada" : "Section reativada");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const deleteSection = async (sec: AdminProductSection) => {
    if (!password) return;
    const hasModules = (modulesBySection.get(sec.id) || []).length > 0;
    if (hasModules) {
      toast.error(
        "Section tem módulos vinculados. Reatribua antes de excluir, ou use arquivar.",
      );
      return;
    }
    if (
      !confirm(
        `Excluir DEFINITIVAMENTE a section "${sec.title}"? Materials também serão removidos. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    try {
      await adminApi({
        action: "delete_product_section",
        password,
        section_id: sec.id,
      });
      toast.success("Section excluída");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const moveSection = async (
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!password || !product) return;
    const list = [...sortedSections];
    const idx = list.findIndex((s) => s.id === sectionId);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === list.length - 1)
    )
      return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    const ordered_ids = list.map((s) => s.id);
    // Optimistic
    setData((d) =>
      d
        ? {
            ...d,
            sections: list.map((s, i) => ({ ...s, display_order: i })),
          }
        : d,
    );
    try {
      await adminApi({
        action: "reorder_product_sections",
        password,
        ordered_ids,
      });
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
      load();
    }
  };

  // ===== Module assignment =====
  const assignModule = async (
    moduleId: string,
    sectionId: string | null,
    sectionOrder?: number,
  ) => {
    if (!password) return;
    try {
      await adminApi({
        action: "assign_module_to_section",
        password,
        module_id: moduleId,
        section_id: sectionId,
        section_order: sectionOrder,
      });
      toast.success(sectionId ? "Módulo atribuído" : "Módulo removido da section");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const moveModuleInSection = async (
    sectionId: string,
    moduleId: string,
    direction: "up" | "down",
  ) => {
    if (!password) return;
    const list = [...(modulesBySection.get(sectionId) || [])];
    const idx = list.findIndex((m) => m.id === moduleId);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === list.length - 1)
    )
      return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    const ordered_module_ids = list.map((m) => m.id);
    try {
      await adminApi({
        action: "reorder_modules_in_section",
        password,
        section_id: sectionId,
        ordered_module_ids,
      });
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  // ===== Material CRUD =====
  const openCreateMaterial = (sectionId: string) => {
    setMaterialDialog({
      open: true,
      mode: "create",
      sectionId,
      materialId: null,
      form: emptyMaterialForm(),
    });
  };

  const openEditMaterial = (mat: AdminSectionMaterial) => {
    setMaterialDialog({
      open: true,
      mode: "edit",
      sectionId: mat.section_id || "",
      materialId: mat.id,
      form: {
        title: mat.title,
        kind: mat.kind,
        state: mat.state,
        external_url: mat.external_url || "",
      },
    });
  };

  const saveMaterial = async () => {
    if (!password) return;
    const { form, mode, sectionId, materialId } = materialDialog;
    if (!form.title.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    setMaterialSaving(true);
    try {
      if (mode === "create") {
        await adminApi({
          action: "create_section_material",
          password,
          section_id: sectionId,
          title: form.title,
          kind: form.kind,
          state: form.state,
          external_url: form.external_url || null,
        });
        toast.success("Material criado!");
      } else if (materialId) {
        await adminApi({
          action: "update_section_material",
          password,
          material_id: materialId,
          title: form.title,
          kind: form.kind,
          state: form.state,
          external_url: form.external_url || null,
        });
        toast.success("Material atualizado!");
      }
      setMaterialDialog((s) => ({ ...s, open: false }));
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setMaterialSaving(false);
    }
  };

  const deleteMaterial = async (mat: AdminSectionMaterial) => {
    if (!password) return;
    if (!confirm(`Excluir material "${mat.title}"?`)) return;
    try {
      await adminApi({
        action: "delete_section_material",
        password,
        material_id: mat.id,
      });
      toast.success("Material excluído");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const moveMaterial = async (
    sectionId: string,
    materialId: string,
    direction: "up" | "down",
  ) => {
    if (!password) return;
    const list = [...(materialsBySection.get(sectionId) || [])];
    const idx = list.findIndex((m) => m.id === materialId);
    if (
      (direction === "up" && idx === 0) ||
      (direction === "down" && idx === list.length - 1)
    )
      return;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    [list[idx], list[swap]] = [list[swap], list[idx]];
    const ordered_material_ids = list.map((m) => m.id);
    try {
      await adminApi({
        action: "reorder_section_materials",
        password,
        section_id: sectionId,
        ordered_material_ids,
      });
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const triggerMaterialUpload = (materialId: string) => {
    setPendingUploadMaterialId(materialId);
    materialFileRef.current?.click();
  };

  // PR ADMIN 6B — Section image upload handlers
  const triggerSectionImageUpload = (sectionId: string) => {
    setPendingSectionImageId(sectionId);
    sectionImageRef.current?.click();
  };

  const onSectionImageSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    const sectionId = pendingSectionImageId;
    if (!file || !sectionId || !password) {
      setPendingSectionImageId(null);
      if (sectionImageRef.current) sectionImageRef.current.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Apenas JPEG, PNG ou WebP.");
      setPendingSectionImageId(null);
      if (sectionImageRef.current) sectionImageRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      setPendingSectionImageId(null);
      if (sectionImageRef.current) sectionImageRef.current.value = "";
      return;
    }
    setUploadingSectionImage(sectionId);
    try {
      await adminUploadSectionImage({ password, sectionId, file });
      toast.success("Imagem da section enviada!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingSectionImage(null);
      setPendingSectionImageId(null);
      if (sectionImageRef.current) sectionImageRef.current.value = "";
    }
  };

  const removeSectionImage = async (sectionId: string) => {
    if (!password) return;
    if (!confirm("Remover imagem desta section? Card volta a usar fallback visual.")) return;
    try {
      await adminApi({
        action: "remove_section_image",
        password,
        section_id: sectionId,
      });
      toast.success("Imagem removida.");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  // ===== Module edit =====
  // PR ADMIN 6F — Open + submit do dialog "Criar aula"
  const openCreateLesson = (sec: AdminProductSection) => {
    setCreateLessonDialog({
      open: true,
      sectionId: sec.id,
      sectionTitle: sec.title,
      name: "",
      videoUrl: "",
      isPublished: true,
    });
  };

  const submitCreateLesson = async () => {
    if (!password || !product) return;
    const f = createLessonDialog;
    if (!f.name.trim()) {
      toast.error("Nome da aula é obrigatório.");
      return;
    }
    if (f.videoUrl.trim()) {
      try {
        const u = new URL(f.videoUrl.trim());
        if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      } catch {
        toast.error("Link do vídeo deve ser uma URL HTTP(S) válida.");
        return;
      }
    }
    setCreatingLesson(true);
    try {
      await adminApi({
        action: "create_product_module",
        password,
        product_id: product.id,
        section_id: f.sectionId,
        module_name: f.name.trim(),
        video_url: f.videoUrl.trim() || null,
        is_published: f.isPublished,
      });
      toast.success("Aula criada!");
      setCreateLessonDialog((s) => ({ ...s, open: false }));
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setCreatingLesson(false);
    }
  };

  const openEditModule = (mod: AdminSectionModule) => {
    setModuleDialog({
      open: true,
      moduleId: mod.id,
      form: moduleFormFrom(mod, mod.section_id || ""),
    });
    // PR ADMIN 6E: popula draft (null = herda da section)
    setModuleConsultoriaDraft(
      mod.consultoria_config === null || mod.consultoria_config === undefined
        ? null
        : (mod.consultoria_config as ConsultoriaConfig),
    );
  };

  const currentModule = useMemo<AdminSectionModule | null>(() => {
    if (!moduleDialog.moduleId) return null;
    return (data?.modules || []).find((m) => m.id === moduleDialog.moduleId) || null;
  }, [moduleDialog.moduleId, data?.modules]);

  const saveModule = async () => {
    if (!password || !moduleDialog.moduleId) return;
    const { form, moduleId } = moduleDialog;
    if (!form.module_name.trim()) {
      toast.error("Nome da aula é obrigatório");
      return;
    }
    setModuleSaving(true);
    try {
      await adminApi({
        action: "update_product_module",
        password,
        module_id: moduleId,
        module_name: form.module_name,
        video_url: form.video_url || null,
        section_id: form.section_id || null,
        section_order: form.section_order,
        is_published: form.is_published,
        // PR ADMIN 6E (null = herda da section)
        consultoria_config: moduleConsultoriaDraft,
      });
      toast.success("Aula atualizada!");
      setModuleDialog((s) => ({ ...s, open: false }));
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setModuleSaving(false);
    }
  };

  const onModulePdfSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    const moduleId = moduleDialog.moduleId;
    if (!file || !moduleId || !password) {
      if (modulePdfRef.current) modulePdfRef.current.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Apenas PDF.");
      if (modulePdfRef.current) modulePdfRef.current.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF acima de 20MB.");
      if (modulePdfRef.current) modulePdfRef.current.value = "";
      return;
    }
    setModuleUploadingPdf(true);
    try {
      await adminUploadPdf({ password, moduleId, file });
      toast.success("PDF da aula atualizado!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setModuleUploadingPdf(false);
      if (modulePdfRef.current) modulePdfRef.current.value = "";
    }
  };

  const onModuleAudioSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    const moduleId = moduleDialog.moduleId;
    if (!file || !moduleId || !password) {
      if (moduleAudioRef.current) moduleAudioRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("audio/")) {
      toast.error("Apenas áudio.");
      if (moduleAudioRef.current) moduleAudioRef.current.value = "";
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error("Áudio acima de 500MB.");
      if (moduleAudioRef.current) moduleAudioRef.current.value = "";
      return;
    }
    setModuleUploadingAudio(true);
    try {
      await adminUploadAudio({ password, moduleId, file });
      toast.success("Áudio da aula atualizado!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setModuleUploadingAudio(false);
      if (moduleAudioRef.current) moduleAudioRef.current.value = "";
    }
  };

  // PR ADMIN 6I: upload + remove de capa por aula
  const onModuleCoverSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    const moduleId = moduleDialog.moduleId;
    if (!file || !moduleId || !password) {
      if (moduleCoverRef.current) moduleCoverRef.current.value = "";
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Tipo inválido. Use JPEG, PNG ou WebP.");
      if (moduleCoverRef.current) moduleCoverRef.current.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem acima de 5MB.");
      if (moduleCoverRef.current) moduleCoverRef.current.value = "";
      return;
    }
    setModuleUploadingCover(true);
    try {
      await adminUploadModuleCoverImage({ password, moduleId, file });
      toast.success("Capa da aula atualizada!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setModuleUploadingCover(false);
      if (moduleCoverRef.current) moduleCoverRef.current.value = "";
    }
  };

  const removeModuleCoverFromDialog = async () => {
    if (!password || !moduleDialog.moduleId) return;
    if (!confirm("Remover capa desta aula?")) return;
    try {
      await adminApi({
        action: "remove_module_cover_image",
        password,
        module_id: moduleDialog.moduleId,
      });
      toast.success("Capa removida!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const removeModulePdfFromDialog = async () => {
    if (!password || !moduleDialog.moduleId) return;
    if (!confirm("Remover PDF desta aula?")) return;
    try {
      await adminApi({
        action: "remove_module_pdf",
        password,
        module_id: moduleDialog.moduleId,
      });
      toast.success("PDF removido");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const removeModuleAudioFromDialog = async () => {
    if (!password || !moduleDialog.moduleId) return;
    if (!confirm("Remover áudio desta aula?")) return;
    try {
      await adminApi({
        action: "remove_module_audio",
        password,
        module_id: moduleDialog.moduleId,
      });
      toast.success("Áudio removido");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    }
  };

  const onMaterialFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadMaterialId || !password) {
      setPendingUploadMaterialId(null);
      if (materialFileRef.current) materialFileRef.current.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Apenas PDF é aceito por aqui.");
      setPendingUploadMaterialId(null);
      if (materialFileRef.current) materialFileRef.current.value = "";
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("PDF acima de 20MB.");
      setPendingUploadMaterialId(null);
      if (materialFileRef.current) materialFileRef.current.value = "";
      return;
    }
    setUploadingMaterial(pendingUploadMaterialId);
    try {
      await adminUploadMaterialPdf({
        password,
        materialId: pendingUploadMaterialId,
        file,
      });
      toast.success("PDF enviado!");
      load();
    } catch (err) {
      if (err instanceof AdminApiAuthError) return handleAuthError();
      toast.error((err as Error).message);
    } finally {
      setUploadingMaterial(null);
      setPendingUploadMaterialId(null);
      if (materialFileRef.current) materialFileRef.current.value = "";
    }
  };

  if (isLoading || !product || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={materialFileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onMaterialFileSelected}
      />
      <input
        ref={modulePdfRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onModulePdfSelected}
      />
      <input
        ref={sectionImageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onSectionImageSelected}
      />
      <input
        ref={moduleAudioRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={onModuleAudioSelected}
      />
      {/* PR ADMIN 6I — input hidden pra upload de capa da aula */}
      <input
        ref={moduleCoverRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onModuleCoverSelected}
      />

      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/admin/produtos/${product.id}`)}
          className="mb-2 -ml-2 h-8 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar pro produto
        </Button>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground">
            Sections — {product.product_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            Edite a estrutura interna do produto. Sections agrupam módulos do
            curso e materiais de apoio. Front lê sections do banco com fallback
            ao courseSections.ts.
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Label className="text-sm text-foreground">
              Mostrar arquivadas
            </Label>
            <Switch
              checked={includeArchived}
              onCheckedChange={setIncludeArchived}
            />
          </div>
          <Button size="sm" onClick={openCreateSection}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Nova section
          </Button>
        </CardContent>
      </Card>

      {/* Unassigned modules warning */}
      {unassignedModules.length > 0 && (
        <Card className="border-amber-700/40 bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-200">
              {unassignedModules.length} aula(s) sem section
            </CardTitle>
            {sortedSections.length === 0 && (
              // PR ADMIN 6C-BUGFIX: produto sem sections → dropdown ficaria
              // vazio e travado. Avisa o usuário e abre o dialog de section
              // nova direto daqui.
              <p className="mt-1 text-xs text-amber-200/80">
                Este produto ainda não tem nenhuma section. Crie a primeira
                pra poder organizar as aulas abaixo.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedSections.length === 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-700/40 bg-amber-950/40 text-amber-100 hover:bg-amber-900/40"
                onClick={openCreateSection}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Criar primeira section
              </Button>
            )}
            {unassignedModules.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-2 rounded border border-amber-900/40 bg-amber-950/30 px-3 py-2"
              >
                <span className="truncate text-sm text-amber-100">
                  {m.module_name}
                </span>
                <div className="flex items-center gap-1">
                  {sortedSections.length === 0 ? (
                    <span className="text-[11px] text-amber-200/70">
                      Crie uma section primeiro
                    </span>
                  ) : (
                    <Select
                      value=""
                      onValueChange={(secId) => assignModule(m.id, secId, 0)}
                    >
                      <SelectTrigger className="h-8 w-[200px] text-xs">
                        <SelectValue placeholder="Atribuir a section…" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedSections.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.number} — {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sections list */}
      <div className="space-y-4">
        {sortedSections.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma section. Crie a primeira em "Nova section".
            </CardContent>
          </Card>
        ) : (
          sortedSections.map((sec, idx) => {
            const sectionModules = modulesBySection.get(sec.id) || [];
            const sectionMaterials = materialsBySection.get(sec.id) || [];
            const isDrawerOpen = assignDrawerSection === sec.id;
            const candidates = (data.modules || []).filter(
              (m) => m.section_id !== sec.id,
            );
            return (
              <Card
                key={sec.id}
                className={`border-border ${sec.archived ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={idx === 0}
                          onClick={() => moveSection(sec.id, "up")}
                          title="Subir"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          disabled={idx === sortedSections.length - 1}
                          onClick={() => moveSection(sec.id, "down")}
                          title="Descer"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* PR ADMIN 6B — thumbnail da section (image_url do DB ou placeholder) */}
                      {sec.image_url ? (
                        <img
                          src={sec.image_url}
                          alt={sec.title}
                          className="h-14 w-14 shrink-0 rounded object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded ring-1 ring-border bg-muted font-mono text-xs text-muted-foreground"
                          title="Sem imagem (usa fallback do front)"
                        >
                          {sec.number}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {sec.number}
                          </Badge>
                          <CardTitle className="text-base">{sec.title}</CardTitle>
                          <Badge variant="secondary" className="text-[10px]">
                            {sec.kind}
                          </Badge>
                          <Badge
                            variant={
                              sec.status === "available"
                                ? "default"
                                : sec.status === "partial"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {sec.status}
                          </Badge>
                          {sec.archived && (
                            <Badge variant="outline" className="border-amber-700/40 text-amber-700">
                              Arquivada
                            </Badge>
                          )}
                          {sec.sequential && (
                            <Badge variant="outline" className="text-[10px]">
                              sequencial
                            </Badge>
                          )}
                          {/* PR ADMIN 6B — visual indicators */}
                          {sec.icon_key && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              icon: {sec.icon_key}
                            </Badge>
                          )}
                          {sec.accent_color && (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]"
                              title={`Cor de acento: ${sec.accent_color}`}
                            >
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: sec.accent_color }}
                              />
                              {sec.accent_color}
                            </span>
                          )}
                        </div>
                        {sec.subtitle && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {sec.subtitle}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                          key: {sec.section_key} · ordem: {sec.display_order}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => openEditSection(sec)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      {/* PR ADMIN 6B — botão upload/substituir imagem */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => triggerSectionImageUpload(sec.id)}
                        disabled={uploadingSectionImage === sec.id}
                      >
                        {uploadingSectionImage === sec.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1 h-3.5 w-3.5" />
                        )}
                        {sec.image_url ? "Substituir imagem" : "Enviar imagem"}
                      </Button>
                      {sec.image_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:text-destructive"
                          onClick={() => removeSectionImage(sec.id)}
                          title="Remover imagem da section"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => archiveSection(sec, !sec.archived)}
                      >
                        {sec.archived ? (
                          <>
                            <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                            Reativar
                          </>
                        ) : (
                          <>
                            <Archive className="mr-1 h-3.5 w-3.5" />
                            Arquivar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => deleteSection(sec)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Modules in section */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5" />
                        Aulas ({sectionModules.length})
                      </h4>
                      <div className="flex gap-1">
                        {/* PR ADMIN 6F — Criar aula nova */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => openCreateLesson(sec)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Criar aula
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() =>
                            setAssignDrawerSection(isDrawerOpen ? null : sec.id)
                          }
                        >
                          <Layers className="mr-1 h-3 w-3" />
                          {isDrawerOpen ? "Fechar" : "Atribuir aula"}
                        </Button>
                      </div>
                    </div>
                    {sectionModules.length === 0 ? (
                      <p className="rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        Sem aulas. Use "Criar aula" pra adicionar uma nova ou
                        "Atribuir aula" pra associar um módulo existente.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sectionModules.map((mod, mIdx) => (
                          <div
                            key={mod.id}
                            className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5"
                          >
                            <div className="flex flex-col gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                disabled={mIdx === 0}
                                onClick={() =>
                                  moveModuleInSection(sec.id, mod.id, "up")
                                }
                                title="Mover pra cima"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                disabled={mIdx === sectionModules.length - 1}
                                onClick={() =>
                                  moveModuleInSection(sec.id, mod.id, "down")
                                }
                                title="Mover pra baixo"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              #{mod.section_order ?? 0}
                            </span>
                            <span className="flex-1 truncate text-sm">
                              {mod.module_name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-0.5 text-[11px] ${
                                  mod.video_url
                                    ? "text-primary"
                                    : "text-muted-foreground/50"
                                }`}
                                title={
                                  mod.video_url
                                    ? "Tem vídeo"
                                    : "Sem vídeo"
                                }
                              >
                                <Video className="h-3.5 w-3.5" />
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 text-[11px] ${
                                  mod.pdf_file_path
                                    ? "text-success"
                                    : "text-muted-foreground/50"
                                }`}
                                title={
                                  mod.pdf_file_path ? "Tem PDF" : "Sem PDF"
                                }
                              >
                                <FileText className="h-3.5 w-3.5" />
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 text-[11px] ${
                                  mod.audio_file_path
                                    ? "text-accent"
                                    : "text-muted-foreground/50"
                                }`}
                                title={
                                  mod.audio_file_path ? "Tem áudio" : "Sem áudio"
                                }
                              >
                                <Music className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            {mod.is_published === false ? (
                              <Badge
                                variant="outline"
                                className="border-amber-700/40 text-[10px] text-amber-700"
                              >
                                <EyeOff className="mr-1 h-3 w-3" />
                                em produção
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                <Eye className="mr-1 h-3 w-3" />
                                publicada
                              </Badge>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              title="Editar aula"
                              onClick={() => openEditModule(mod)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Remover desta section"
                              onClick={() => assignModule(mod.id, null)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isDrawerOpen && (
                      <div className="mt-2 rounded border border-dashed border-border bg-muted/10 p-2">
                        <p className="mb-2 text-xs text-muted-foreground">
                          Módulos disponíveis pra atribuir/mover pra esta
                          section:
                        </p>
                        {candidates.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground">
                            Nenhum módulo disponível.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {candidates.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between gap-2 rounded bg-background px-2 py-1.5"
                              >
                                <span className="truncate text-xs">
                                  {m.module_name}
                                  {m.section_id ? (
                                    <span className="ml-2 text-muted-foreground">
                                      (em outra section)
                                    </span>
                                  ) : (
                                    <span className="ml-2 text-amber-500">
                                      (sem section)
                                    </span>
                                  )}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[11px]"
                                  onClick={() =>
                                    assignModule(
                                      m.id,
                                      sec.id,
                                      sectionModules.length,
                                    )
                                  }
                                >
                                  Mover pra cá
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Materials */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <Paperclip className="h-3.5 w-3.5" />
                        Materiais de apoio ({sectionMaterials.length})
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => openCreateMaterial(sec.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar material
                      </Button>
                    </div>
                    {sectionMaterials.length === 0 ? (
                      <p className="rounded border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        Sem materiais.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {sectionMaterials.map((mat, matIdx) => (
                          <div
                            key={mat.id}
                            className="flex items-center gap-2 rounded border border-border bg-muted/30 px-2 py-1.5"
                          >
                            <div className="flex flex-col gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                disabled={matIdx === 0}
                                onClick={() =>
                                  moveMaterial(sec.id, mat.id, "up")
                                }
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                disabled={
                                  matIdx === sectionMaterials.length - 1
                                }
                                onClick={() =>
                                  moveMaterial(sec.id, mat.id, "down")
                                }
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                            </div>
                            <Badge variant="outline" className="text-[10px]">
                              {mat.kind}
                            </Badge>
                            <span className="flex-1 truncate text-sm">
                              {mat.title}
                            </span>
                            {mat.state === "ready" ? (
                              <Badge variant="default" className="text-[10px]">
                                pronto
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">
                                em breve
                              </Badge>
                            )}
                            {mat.file_path && (
                              <FileText className="h-3.5 w-3.5 text-success" />
                            )}
                            {mat.external_url && (
                              <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            )}
                            {mat.kind === "pdf" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => triggerMaterialUpload(mat.id)}
                                disabled={uploadingMaterial === mat.id}
                              >
                                {uploadingMaterial === mat.id ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Upload className="mr-1 h-3 w-3" />
                                )}
                                {mat.file_path ? "Substituir" : "Upload PDF"}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Editar material"
                              onClick={() => openEditMaterial(mat)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              title="Excluir material"
                              onClick={() => deleteMaterial(mat)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Section dialog */}
      <Dialog
        open={sectionDialog.open}
        onOpenChange={(open) =>
          setSectionDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {sectionDialog.mode === "create" ? "Nova section" : "Editar section"}
            </DialogTitle>
            <DialogDescription>
              {sectionDialog.mode === "create"
                ? "Cria um novo módulo interno do curso."
                : "Atualiza metadata da section. Aulas e materiais são gerenciados nos cards abaixo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sec-number" className="text-xs">
                  Número
                </Label>
                <Input
                  id="sec-number"
                  value={sectionDialog.form.number}
                  onChange={(e) =>
                    setSectionDialog((s) => ({
                      ...s,
                      form: { ...s.form, number: e.target.value },
                    }))
                  }
                  placeholder="01"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sec-key" className="text-xs">
                  section_key
                </Label>
                <Input
                  id="sec-key"
                  value={sectionDialog.form.section_key}
                  onChange={(e) =>
                    setSectionDialog((s) => ({
                      ...s,
                      form: { ...s.form, section_key: e.target.value },
                    }))
                  }
                  placeholder="boas-vindas"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-title" className="text-xs">
                Título
              </Label>
              <Input
                id="sec-title"
                value={sectionDialog.form.title}
                onChange={(e) =>
                  setSectionDialog((s) => ({
                    ...s,
                    form: { ...s.form, title: e.target.value },
                  }))
                }
                placeholder="Boas-vindas"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-subtitle" className="text-xs">
                Subtítulo / descrição curta
              </Label>
              <Textarea
                id="sec-subtitle"
                value={sectionDialog.form.subtitle}
                onChange={(e) =>
                  setSectionDialog((s) => ({
                    ...s,
                    form: { ...s.form, subtitle: e.target.value },
                  }))
                }
                placeholder="Onboarding e orientação inicial"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo (kind)</Label>
                <Select
                  value={sectionDialog.form.kind}
                  onValueChange={(v) =>
                    setSectionDialog((s) => ({
                      ...s,
                      form: { ...s.form, kind: v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={sectionDialog.form.status}
                  onValueChange={(v) =>
                    setSectionDialog((s) => ({
                      ...s,
                      form: { ...s.form, status: v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="sec-sequential"
                checked={sectionDialog.form.sequential}
                onCheckedChange={(checked) =>
                  setSectionDialog((s) => ({
                    ...s,
                    form: { ...s.form, sequential: checked },
                  }))
                }
              />
              <Label htmlFor="sec-sequential" className="text-xs">
                Sequencial — aulas bloqueiam até a anterior ser concluída
              </Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sec-prod-copy" className="text-xs">
                Copy de "em produção" (override; vazio = padrão)
              </Label>
              <Textarea
                id="sec-prod-copy"
                value={sectionDialog.form.in_production_copy}
                onChange={(e) =>
                  setSectionDialog((s) => ({
                    ...s,
                    form: { ...s.form, in_production_copy: e.target.value },
                  }))
                }
                placeholder="Este módulo está em produção e será disponibilizado em breve."
                rows={2}
              />
            </div>
            {/* PR ADMIN 6B — Visuais editáveis (icon + accent color).
                Imagem é gerenciada pelos botões "Enviar/Substituir imagem"
                fora do dialog. */}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Ícone Lucide</Label>
                <Select
                  value={sectionDialog.form.icon_key || ""}
                  onValueChange={(v) =>
                    setSectionDialog((s) => ({
                      ...s,
                      form: { ...s.form, icon_key: v === "__none__" ? "" : v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sem ícone (usa fallback)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Sem ícone (usa fallback)
                    </SelectItem>
                    {SECTION_ICON_OPTIONS.filter((i) => i.value !== "").map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  Cor de acento (#RRGGBB; vazio = dourado padrão)
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Cor de acento"
                    value={sectionDialog.form.accent_color || "#c99a3a"}
                    onChange={(e) =>
                      setSectionDialog((s) => ({
                        ...s,
                        form: { ...s.form, accent_color: e.target.value },
                      }))
                    }
                    className="h-9 w-10 cursor-pointer rounded border border-border"
                  />
                  <Input
                    value={sectionDialog.form.accent_color}
                    onChange={(e) =>
                      setSectionDialog((s) => ({
                        ...s,
                        form: { ...s.form, accent_color: e.target.value },
                      }))
                    }
                    placeholder="#c99a3a"
                    className="h-9 font-mono text-xs"
                  />
                  {sectionDialog.form.accent_color && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 text-[11px]"
                      onClick={() =>
                        setSectionDialog((s) => ({
                          ...s,
                          form: { ...s.form, accent_color: "" },
                        }))
                      }
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            {/* PR ADMIN 6E — Consultoria por section (só em edit; create cria com null=herda) */}
            {sectionDialog.mode === "edit" && (
              <div className="border-t border-border pt-3">
                <ConsultoriaFieldset
                  value={sectionConsultoriaDraft}
                  onChange={setSectionConsultoriaDraft}
                  levelLabel="section"
                  parentLabel="produto"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSectionDialog((s) => ({ ...s, open: false }))}
            >
              Cancelar
            </Button>
            <Button onClick={saveSection} disabled={sectionSaving}>
              {sectionSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material dialog */}
      <Dialog
        open={materialDialog.open}
        onOpenChange={(open) =>
          setMaterialDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {materialDialog.mode === "create"
                ? "Novo material"
                : "Editar material"}
            </DialogTitle>
            <DialogDescription>
              Materiais de apoio aparecem dentro da section no front. Upload de
              PDF é feito após criar (botão na lista).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Título</Label>
              <Input
                value={materialDialog.form.title}
                onChange={(e) =>
                  setMaterialDialog((s) => ({
                    ...s,
                    form: { ...s.form, title: e.target.value },
                  }))
                }
                placeholder="Contrato de Compromisso — 15 Dias"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={materialDialog.form.kind}
                  onValueChange={(v) =>
                    setMaterialDialog((s) => ({
                      ...s,
                      form: { ...s.form, kind: v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_KINDS.map((k) => (
                      <SelectItem key={k.value} value={k.value}>
                        {k.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={materialDialog.form.state}
                  onValueChange={(v) =>
                    setMaterialDialog((s) => ({
                      ...s,
                      form: { ...s.form, state: v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_STATES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                URL externa (link, vídeo, áudio externo — opcional)
              </Label>
              <Input
                value={materialDialog.form.external_url}
                onChange={(e) =>
                  setMaterialDialog((s) => ({
                    ...s,
                    form: { ...s.form, external_url: e.target.value },
                  }))
                }
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMaterialDialog((s) => ({ ...s, open: false }))}
            >
              Cancelar
            </Button>
            <Button onClick={saveMaterial} disabled={materialSaving}>
              {materialSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module edit dialog (PR ADMIN 4.1) */}
      <Dialog
        open={moduleDialog.open}
        onOpenChange={(open) =>
          setModuleDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar aula</DialogTitle>
            <DialogDescription>
              Edita nome, vídeo, PDF, áudio, status e posição da aula dentro da
              section. PDF e áudio são salvos imediatamente após o upload; o
              resto salva ao clicar em "Salvar".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Nome da aula</Label>
              <Input
                value={moduleDialog.form.module_name}
                onChange={(e) =>
                  setModuleDialog((s) => ({
                    ...s,
                    form: { ...s.form, module_name: e.target.value },
                  }))
                }
                placeholder="Ex: A Química do Amor"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Link do vídeo (YouTube ou URL completa)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={moduleDialog.form.video_url}
                  onChange={(e) =>
                    setModuleDialog((s) => ({
                      ...s,
                      form: { ...s.form, video_url: e.target.value },
                    }))
                  }
                  placeholder="https://youtube.com/watch?v=…"
                  className="font-mono text-xs"
                />
                {moduleDialog.form.video_url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setModuleDialog((s) => ({
                        ...s,
                        form: { ...s.form, video_url: "" },
                      }))
                    }
                    title="Limpar"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              {moduleDialog.form.video_url && (
                <p className="break-all text-[10px] text-muted-foreground">
                  {moduleDialog.form.video_url}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Section</Label>
                <Select
                  value={moduleDialog.form.section_id}
                  onValueChange={(v) =>
                    setModuleDialog((s) => ({
                      ...s,
                      form: { ...s.form, section_id: v },
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sem section" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.number} — {s.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ordem dentro da section</Label>
                <Input
                  type="number"
                  min={0}
                  value={moduleDialog.form.section_order}
                  onChange={(e) =>
                    setModuleDialog((s) => ({
                      ...s,
                      form: {
                        ...s.form,
                        section_order: Number(e.target.value) || 0,
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded border border-border bg-muted/20 p-3">
              <Switch
                id="mod-published"
                checked={moduleDialog.form.is_published}
                onCheckedChange={(checked) =>
                  setModuleDialog((s) => ({
                    ...s,
                    form: { ...s.form, is_published: checked },
                  }))
                }
              />
              <Label htmlFor="mod-published" className="text-xs">
                {moduleDialog.form.is_published
                  ? "Publicada (visível na área de membros)"
                  : "Em produção (escondida, badge dourado)"}
              </Label>
            </div>

            {/* PR ADMIN 6I — Imagem de capa da aula */}
            <div className="space-y-2 rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-accent" />
                <Label className="text-xs font-medium">Imagem de capa</Label>
                <span className="text-[10px] text-muted-foreground">
                  (JPEG / PNG / WebP — max 5MB)
                </span>
              </div>
              {currentModule?.cover_image_url ? (
                <div className="space-y-2">
                  {/* Preview */}
                  <div className="overflow-hidden rounded-md border border-border bg-muted/30">
                    <img
                      src={currentModule.cover_image_url}
                      alt="Capa da aula"
                      className="h-32 w-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={moduleUploadingCover}
                      onClick={() => moduleCoverRef.current?.click()}
                    >
                      {moduleUploadingCover ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-3 w-3" />
                      )}
                      Substituir capa
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={removeModuleCoverFromDialog}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] italic text-muted-foreground">
                    Sem capa. Sem capa custom, o front usa fallback (imagem
                    do produto).
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={moduleUploadingCover}
                    onClick={() => moduleCoverRef.current?.click()}
                  >
                    {moduleUploadingCover ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3 w-3" />
                    )}
                    Enviar capa
                  </Button>
                </div>
              )}
            </div>

            {/* PDF */}
            <div className="space-y-1 rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-success" />
                <Label className="text-xs font-medium">PDF da aula</Label>
              </div>
              {currentModule?.pdf_file_path ? (
                <>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    {currentModule.pdf_file_path}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={moduleUploadingPdf}
                      onClick={() => modulePdfRef.current?.click()}
                    >
                      {moduleUploadingPdf ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-3 w-3" />
                      )}
                      Substituir PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={removeModulePdfFromDialog}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] italic text-muted-foreground">
                    Sem PDF anexado.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={moduleUploadingPdf}
                    onClick={() => modulePdfRef.current?.click()}
                  >
                    {moduleUploadingPdf ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3 w-3" />
                    )}
                    Enviar PDF
                  </Button>
                </div>
              )}
            </div>

            {/* Áudio */}
            <div className="space-y-1 rounded border border-border p-3">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-accent" />
                <Label className="text-xs font-medium">Áudio da aula</Label>
              </div>
              {currentModule?.audio_file_path ? (
                <>
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    {currentModule.audio_file_path}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={moduleUploadingAudio}
                      onClick={() => moduleAudioRef.current?.click()}
                    >
                      {moduleUploadingAudio ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="mr-1 h-3 w-3" />
                      )}
                      Substituir áudio
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={removeModuleAudioFromDialog}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] italic text-muted-foreground">
                    Sem áudio.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={moduleUploadingAudio}
                    onClick={() => moduleAudioRef.current?.click()}
                  >
                    {moduleUploadingAudio ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 h-3 w-3" />
                    )}
                    Enviar áudio
                  </Button>
                </div>
              )}
            </div>

            {/* PR ADMIN 6E — Consultoria por aula */}
            <ConsultoriaFieldset
              value={moduleConsultoriaDraft}
              onChange={setModuleConsultoriaDraft}
              levelLabel="aula"
              parentLabel="section"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setModuleDialog((s) => ({ ...s, open: false }))}
            >
              Fechar
            </Button>
            <Button onClick={saveModule} disabled={moduleSaving}>
              {moduleSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar aula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PR ADMIN 6F — Dialog "Criar aula" (cria product_module novo) */}
      <Dialog
        open={createLessonDialog.open}
        onOpenChange={(open) =>
          setCreateLessonDialog((s) => ({ ...s, open }))
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova aula</DialogTitle>
            <DialogDescription>
              {createLessonDialog.sectionTitle ? (
                <>
                  Em <strong>{createLessonDialog.sectionTitle}</strong>. Você
                  pode adicionar mais detalhes depois (PDF, áudio, ordem,
                  consultoria).
                </>
              ) : (
                "Você pode adicionar mais detalhes depois (PDF, áudio, ordem, consultoria)."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-lesson-name">Nome da aula *</Label>
              <Input
                id="create-lesson-name"
                value={createLessonDialog.name}
                onChange={(e) =>
                  setCreateLessonDialog((s) => ({ ...s, name: e.target.value }))
                }
                placeholder="Ex: A Química do Amor"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-lesson-video">Link do vídeo (opcional)</Label>
              <Input
                id="create-lesson-video"
                value={createLessonDialog.videoUrl}
                onChange={(e) =>
                  setCreateLessonDialog((s) => ({
                    ...s,
                    videoUrl: e.target.value,
                  }))
                }
                placeholder="https://youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                YouTube, Vimeo ou qualquer URL HTTP(S). Pode editar depois.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
              <div className="space-y-0.5">
                <Label
                  htmlFor="create-lesson-published"
                  className="text-sm font-medium"
                >
                  Publicar agora?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desligado = "Em produção" (aparece bloqueada pro aluno).
                </p>
              </div>
              <Switch
                id="create-lesson-published"
                checked={createLessonDialog.isPublished}
                onCheckedChange={(checked) =>
                  setCreateLessonDialog((s) => ({
                    ...s,
                    isPublished: checked,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() =>
                setCreateLessonDialog((s) => ({ ...s, open: false }))
              }
              disabled={creatingLesson}
            >
              Cancelar
            </Button>
            <Button onClick={submitCreateLesson} disabled={creatingLesson}>
              {creatingLesson ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Criar aula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductSections;
