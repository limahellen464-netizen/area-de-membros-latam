import type { PurchaseModule } from "@/components/premium";

const CONSULTORIA_ACCESS_KEY_PREFIX = "cdr:consultoria_unlocked:";
const CONSULTORIA_ACCESS_STARTED_AT_KEY_PREFIX =
  "cdr:consultoria_unlock_started_at:";

export const CONSULTORIA_UNLOCK_DELAY_MS = 20_000;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const hasCompletedCourseLesson = (
  modules: PurchaseModule[] | undefined | null,
) =>
  !!modules?.some(
    (module) =>
      module.is_published !== false &&
      module.completed &&
      ((module.has_video && !!module.video_url) || module.has_audio || module.has_pdf),
  );

const consultoriaAccessKey = (email: string) =>
  `${CONSULTORIA_ACCESS_KEY_PREFIX}${email.trim().toLowerCase()}`;

const consultoriaAccessStartedAtKey = (email: string) =>
  `${CONSULTORIA_ACCESS_STARTED_AT_KEY_PREFIX}${email.trim().toLowerCase()}`;

export function readConsultoriaAccess(
  storage: Pick<Storage, "getItem">,
  email: string,
) {
  if (!email.trim()) return false;
  return storage.getItem(consultoriaAccessKey(email)) === "1";
}

export function writeConsultoriaAccess(
  storage: StorageLike,
  email: string,
  unlocked: boolean,
) {
  if (!email.trim()) return;
  const key = consultoriaAccessKey(email);
  const startedAtKey = consultoriaAccessStartedAtKey(email);
  if (unlocked) {
    storage.setItem(key, "1");
    storage.removeItem(startedAtKey);
    return;
  }
  storage.removeItem(key);
  storage.removeItem(startedAtKey);
}

export function startConsultoriaUnlockCountdown(
  storage: StorageLike,
  email: string,
  now = Date.now(),
) {
  if (!email.trim() || readConsultoriaAccess(storage, email)) return null;

  const key = consultoriaAccessStartedAtKey(email);
  const stored = Number(storage.getItem(key));
  if (Number.isFinite(stored) && stored > 0) return stored;

  storage.setItem(key, String(now));
  return now;
}

export function readConsultoriaUnlockRemainingMs(
  storage: StorageLike,
  email: string,
  now = Date.now(),
) {
  if (!email.trim() || readConsultoriaAccess(storage, email)) return null;

  const key = consultoriaAccessStartedAtKey(email);
  const startedAt = Number(storage.getItem(key));
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    storage.removeItem(key);
    return null;
  }

  return Math.max(
    0,
    Math.min(CONSULTORIA_UNLOCK_DELAY_MS, startedAt + CONSULTORIA_UNLOCK_DELAY_MS - now),
  );
}
