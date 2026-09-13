const consultoriaKey = (email: string) =>
  `cdr:consultoria_form_started:${email.trim().toLowerCase() || "anonymous"}`;

export function hasStartedConsultoria(email: string): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(consultoriaKey(email));
}

export function markConsultoriaStarted(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    consultoriaKey(email),
    JSON.stringify({ startedAt: new Date().toISOString() }),
  );
}
