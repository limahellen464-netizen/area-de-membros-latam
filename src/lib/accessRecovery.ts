import type { Purchase } from "@/components/premium";

export function hasPurchasedAccess(
  products: Purchase[] | undefined,
  purchasedCount: number | undefined,
): boolean {
  if (!products || products.length === 0) return false;
  if ((purchasedCount || 0) <= 0) return false;
  return products.some((product) => product.purchased);
}

export function findPurchasedProductForRoute(
  products: Purchase[] | undefined,
  routeProductId: string | undefined,
): Purchase | null {
  if (!products || !routeProductId) return null;
  return (
    products.find(
      (product) =>
        product.purchased &&
        (product.id === routeProductId || product.product_settings_id === routeProductId),
    ) || null
  );
}
