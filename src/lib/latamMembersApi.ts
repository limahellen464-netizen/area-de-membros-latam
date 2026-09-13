export type LatamAccessResponse = {
  buyer_name: string | null;
  purchasedCount: number;
  totalCount: number;
};

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://phvybounxmtrbohbfxsl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const hasSupabaseMembersApi = () =>
  Boolean(SUPABASE_URL);

export const verifyLatamMemberAccess = async (email: string): Promise<LatamAccessResponse> => {
  if (!SUPABASE_URL) {
    throw new Error("Supabase LATAM nao configurado para este ambiente.");
  }

  const authHeaders = SUPABASE_PUBLISHABLE_KEY
    ? {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      }
    : {};

  const response = await fetch(`${SUPABASE_URL}/functions/v1/members-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      action: "login",
      email,
      metadata: {
        source: "members-es",
        market: "es_global",
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as Partial<LatamAccessResponse> & {
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error || "No fue posible validar el acceso.");
  }

  return {
    buyer_name: payload?.buyer_name || null,
    purchasedCount: Number(payload?.purchasedCount || 0),
    totalCount: Number(payload?.totalCount || 0),
  };
};
