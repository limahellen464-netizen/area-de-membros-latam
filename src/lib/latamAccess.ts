import { HOMOLOGATION_EMAIL } from "./latamCatalog";

export const memberEmailKey = "cdr:latam:member_email";
export const progressKey = (email: string) => `cdr:latam:progress:${email}`;
export const lastLessonKey = (email: string) => `cdr:latam:last_lesson:${email}`;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hasHomologationAccess = (email: string) =>
  normalizeEmail(email) === HOMOLOGATION_EMAIL;

export const firstNameFromEmail = (email: string) => {
  const local = email.split("@")[0] || "Lead";
  const name = local
    .replace(/^preview[._-]?/i, "")
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  return name || "Lead";
};

export const readProgress = (email: string): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(progressKey(email));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
};

export const writeProgress = (email: string, lessonIds: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(progressKey(email), JSON.stringify(Array.from(lessonIds)));
};
