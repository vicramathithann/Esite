import { revalidatePath } from "next/cache";

/**
 * Server-side cache invalidation helper.
 * Immediately purges cached pages and product views across the storefront.
 */
export function revalidateProducts(productId?: string) {
  try {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/compare");
    revalidatePath("/cart");
    if (productId) {
      revalidatePath(`/products/${productId}`);
      revalidatePath(`/mobile/${productId}`);
    }
  } catch (err) {
    console.warn("Revalidation warning (non-fatal):", err);
  }
}
