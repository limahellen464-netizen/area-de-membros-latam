import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useConsultoriaAccessDelay } from "./useConsultoriaAccessDelay";

describe("useConsultoriaAccessDelay", () => {
  it("deixa a consultoria disponivel desde o primeiro acesso", () => {
    const { result } = renderHook(() =>
      useConsultoriaAccessDelay("aluno@example.com"),
    );

    expect(result.current.unlocked).toBe(true);

    act(() => {
      result.current.startCountdown();
      result.current.unlockNow();
    });

    expect(result.current.unlocked).toBe(true);
  });
});
