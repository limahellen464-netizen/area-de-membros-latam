import { describe, expect, it, vi } from "vitest";
import {
  enqueuePendingCompletion,
  flushPendingCompletions,
  readPendingCompletions,
} from "./progressSync";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe("progressSync", () => {
  it("mantém somente uma pendência por aula e e-mail", () => {
    const storage = createStorage();

    enqueuePendingCompletion(storage, {
      email: "aluno@example.com",
      moduleId: "aula-1",
      productId: "produto",
    });
    enqueuePendingCompletion(storage, {
      email: "aluno@example.com",
      moduleId: "aula-1",
      productId: "produto-atualizado",
    });

    expect(readPendingCompletions(storage)).toHaveLength(1);
    expect(readPendingCompletions(storage)[0]?.productId).toBe("produto-atualizado");
  });

  it("remove conclusões sincronizadas e preserva falhas para nova tentativa", async () => {
    const storage = createStorage();
    enqueuePendingCompletion(storage, { email: "a@a.com", moduleId: "ok" });
    enqueuePendingCompletion(storage, { email: "a@a.com", moduleId: "falha" });
    const send = vi.fn(async ({ moduleId }) => moduleId === "ok");

    const result = await flushPendingCompletions(storage, send);

    expect(result).toEqual({ synced: 1, remaining: 1 });
    expect(readPendingCompletions(storage)[0]?.moduleId).toBe("falha");
    expect(readPendingCompletions(storage)[0]?.attempts).toBe(1);
  });
});
