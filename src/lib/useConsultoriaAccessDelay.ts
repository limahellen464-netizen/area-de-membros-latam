const noOp = () => {};

export function useConsultoriaAccessDelay(email: string) {
  void email;

  return {
    unlocked: true,
    startCountdown: noOp,
    unlockNow: noOp,
  };
}
