import { useCallback, useEffect, useState } from "react";

/**
 * Hook de sessão do admin com expiry de 24h.
 *
 * Estratégia:
 * - Password fica em localStorage (necessário pra cada chamada da admin-api;
 *   bcrypt check é server-side)
 * - login_at em ms epoch
 * - Mount: se login_at < 24h, restaura sessão; senão limpa
 * - logout() limpa imediatamente
 * - Auto-logout: setInterval verifica a cada 5min se expirou
 *
 * Segurança: o servidor ainda valida senha em CADA request via bcrypt. O
 * único risco da localStorage é exposure local (XSS na própria página).
 * Como admin-api roda em domínio dedicado e front Vercel não expõe vars
 * server-side, o risco residual é aceitável pra MVP. Sessão JWT é uma
 * melhoria futura (precisa de endpoint /login no admin-api).
 */

const SESSION_KEY = "cdr:latam:admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5min

interface AdminSessionData {
  password: string;
  login_at: number;
}

function readSession(): AdminSessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSessionData>;
    if (
      typeof parsed?.password === "string" &&
      typeof parsed?.login_at === "number" &&
      Date.now() - parsed.login_at < SESSION_TTL_MS
    ) {
      return { password: parsed.password, login_at: parsed.login_at };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeSession(password: string) {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ password, login_at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export interface UseAdminSession {
  password: string | null;
  isLoggedIn: boolean;
  isHydrated: boolean;
  login: (password: string) => void;
  logout: () => void;
  remainingMs: () => number;
}

export function useAdminSession(): UseAdminSession {
  const [password, setPassword] = useState<string | null>(null);
  const [loginAt, setLoginAt] = useState<number | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hidrata a partir de localStorage
  useEffect(() => {
    const session = readSession();
    if (session) {
      setPassword(session.password);
      setLoginAt(session.login_at);
    }
    setIsHydrated(true);
  }, []);

  // Auto-logout periódico
  useEffect(() => {
    if (!loginAt) return;
    const interval = setInterval(() => {
      if (Date.now() - loginAt >= SESSION_TTL_MS) {
        clearSession();
        setPassword(null);
        setLoginAt(null);
      }
    }, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loginAt]);

  const login = useCallback((newPassword: string) => {
    writeSession(newPassword);
    setPassword(newPassword);
    setLoginAt(Date.now());
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setPassword(null);
    setLoginAt(null);
  }, []);

  const remainingMs = useCallback(() => {
    if (!loginAt) return 0;
    return Math.max(0, SESSION_TTL_MS - (Date.now() - loginAt));
  }, [loginAt]);

  return {
    password,
    isLoggedIn: password !== null,
    isHydrated,
    login,
    logout,
    remainingMs,
  };
}
