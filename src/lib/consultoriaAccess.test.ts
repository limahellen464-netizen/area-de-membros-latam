import { describe, expect, it } from "vitest";
import {
  CONSULTORIA_UNLOCK_DELAY_MS,
  hasCompletedCourseLesson,
  readConsultoriaAccess,
  readConsultoriaUnlockRemainingMs,
  startConsultoriaUnlockCountdown,
  writeConsultoriaAccess,
} from "./consultoriaAccess";
import type { PurchaseModule } from "@/components/premium";

const makeModule = (
  completed: boolean,
  overrides: Partial<PurchaseModule> = {},
): PurchaseModule => ({
  id: "lesson-1",
  module_name: "Primeira aula",
  pdf_url: null,
  has_pdf: false,
  video_url: "https://youtu.be/FCYJzFukO8I",
  has_video: true,
  is_published: true,
  completed,
  ...overrides,
});

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("consultoriaAccess", () => {
  it("mantem a consultoria bloqueada sem aula concluida", () => {
    expect(hasCompletedCourseLesson([makeModule(false)])).toBe(false);
  });

  it("libera a consultoria ao concluir uma aula publicada com conteudo", () => {
    expect(hasCompletedCourseLesson([makeModule(true)])).toBe(true);
  });

  it("ignora conclusao de aula nao publicada", () => {
    expect(
      hasCompletedCourseLesson([makeModule(true, { is_published: false })]),
    ).toBe(false);
  });

  it("persiste a liberacao por email e permite remove-la", () => {
    const storage = createStorage();
    const email = "Aluno.Teste@Example.com";

    writeConsultoriaAccess(storage, email, true);
    expect(readConsultoriaAccess(storage, email.toLowerCase())).toBe(true);

    writeConsultoriaAccess(storage, email, false);
    expect(readConsultoriaAccess(storage, email)).toBe(false);
  });

  it("mantem a consultoria bloqueada durante os primeiros 20 segundos", () => {
    const storage = createStorage();
    const email = "aluno@example.com";
    const startedAt = 1_000;

    startConsultoriaUnlockCountdown(storage, email, startedAt);

    expect(
      readConsultoriaUnlockRemainingMs(
        storage,
        email,
        startedAt + CONSULTORIA_UNLOCK_DELAY_MS - 1,
      ),
    ).toBe(1);
    expect(readConsultoriaAccess(storage, email)).toBe(false);
  });

  it("permite liberar a consultoria 20 segundos depois do clique", () => {
    const storage = createStorage();
    const email = "aluno@example.com";
    const startedAt = 1_000;

    startConsultoriaUnlockCountdown(storage, email, startedAt);

    expect(
      readConsultoriaUnlockRemainingMs(
        storage,
        email,
        startedAt + CONSULTORIA_UNLOCK_DELAY_MS,
      ),
    ).toBe(0);
  });

  it("nao reinicia a contagem quando o player volta a emitir eventos", () => {
    const storage = createStorage();
    const email = "aluno@example.com";

    expect(startConsultoriaUnlockCountdown(storage, email, 1_000)).toBe(1_000);
    expect(startConsultoriaUnlockCountdown(storage, email, 10_000)).toBe(1_000);
  });
});
