export const PENDING_COMPLETIONS_KEY = "cdr:pending_completions";

export interface PendingCompletion {
  email: string;
  moduleId: string;
  productId?: string | null;
  metadata?: Record<string, unknown> | null;
  attempts: number;
  updatedAt: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readPendingCompletions(storage: StorageLike): PendingCompletion[] {
  try {
    const raw = storage.getItem(PENDING_COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePendingCompletions(storage: StorageLike, items: PendingCompletion[]) {
  storage.setItem(PENDING_COMPLETIONS_KEY, JSON.stringify(items));
}

export function enqueuePendingCompletion(
  storage: StorageLike,
  completion: Omit<PendingCompletion, "attempts" | "updatedAt">,
) {
  const items = readPendingCompletions(storage);
  const existing = items.findIndex(
    (item) => item.email === completion.email && item.moduleId === completion.moduleId,
  );
  const next: PendingCompletion = {
    ...completion,
    attempts: existing >= 0 ? items[existing]!.attempts : 0,
    updatedAt: Date.now(),
  };

  if (existing >= 0) items[existing] = next;
  else items.push(next);

  writePendingCompletions(storage, items);
}

export async function flushPendingCompletions(
  storage: StorageLike,
  send: (completion: PendingCompletion) => Promise<boolean>,
) {
  const pending = readPendingCompletions(storage);
  if (pending.length === 0) return { synced: 0, remaining: 0 };

  const remaining: PendingCompletion[] = [];
  let synced = 0;

  for (const completion of pending) {
    try {
      if (await send(completion)) {
        synced += 1;
      } else {
        remaining.push({
          ...completion,
          attempts: completion.attempts + 1,
          updatedAt: Date.now(),
        });
      }
    } catch {
      remaining.push({
        ...completion,
        attempts: completion.attempts + 1,
        updatedAt: Date.now(),
      });
    }
  }

  writePendingCompletions(storage, remaining);
  return { synced, remaining: remaining.length };
}
