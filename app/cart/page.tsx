import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import CartItemControls from "@/components/storefront/cart-item-controls";

type CartProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[] | null;
  active: boolean;
  stock: number;
  available_for_sale: boolean;
};

export default async function CartPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/cart");
  }

  const [
    { data: profile },
    { data: cart, error: cartError },
    { data: siteSettings },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),

    supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle(),

    supabase
      .from("site_settings")
      .select("catalog_mode")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (cartError) {
    throw new Error(cartError.message);
  }

  const isAdmin = profile?.role === "admin";
  const catalogMode = siteSettings?.catalog_mode === true;

  /*
   * User does not have a cart yet.
   */
  if (!cart) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

          <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">Your cart is empty.</p>

            <Link
              href="/products"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Continue shopping →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * Get cart items.
   *
   * IMPORTANT:
   * available_for_sale is included because pre-booking
   * products have stock = 0 but are still allowed in cart.
   */
  const { data: cartItems, error: itemsError } = await supabase
    .from("cart_items")
    .select(
      `
          id,
          quantity,
          product:products!cart_items_product_id_fkey(
            id,
            name,
            price,
            sale_price,
            images,
            active,
            stock,
            available_for_sale
          )
        `,
    )
    .eq("cart_id", cart.id)
    .order("created_at");

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const items = (cartItems ?? []).map((item) => ({
    ...item,

    product: Array.isArray(item.product)
      ? (item.product[0] ?? null)
      : item.product,
  })) as {
    id: string;
    quantity: number;
    product: CartProduct | null;
  }[];

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  const subtotal = items.reduce((total, item) => {
    if (!item.product) return total;

    const price = item.product.sale_price ?? item.product.price;

    return total + Number(price) * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>

            <p className="mt-2 text-muted-foreground">
              Review your selected items.
            </p>
          </div>

          <Link
            href="/products"
            className="text-sm font-medium text-primary hover:underline"
          >
            Continue shopping →
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">Your cart is empty.</p>

            <Link
              href="/products"
              className="mt-4 inline-block text-sm text-primary hover:underline"
            >
              Browse products →
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {items.map((item) => {
                if (!item.product) return null;

                const product = item.product;

                const image = product.images?.[0];

                const price = product.sale_price ?? product.price;

                /*
                 * Pre-booking:
                 *
                 * available_for_sale = false
                 * stock = 0
                 *
                 * These products are still allowed in
                 * the cart.
                 */
                const isPreBooking =
                  !product.available_for_sale && product.stock <= 0;

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-xl border p-4"
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={product.name}
                        width={120}
                        height={120}
                        unoptimized
                        className="h-24 w-24 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="font-medium hover:underline"
                      >
                        {product.name}
                      </Link>

                      {isPreBooking && (
                        <p className="mt-1 text-sm font-medium text-primary">
                          Pre-booking
                        </p>
                      )}

                      {!catalogMode && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          CHF {Number(price).toFixed(2)}
                        </p>
                      )}

                      <CartItemControls
                        cartItemId={item.id}
                        quantity={item.quantity}
                        stock={product.stock}
                        cartCount={cartCount}
                        availableForSale={product.available_for_sale}
                      />
                    </div>

                    {!catalogMode && (
                      <div className="text-right font-medium">
                        CHF {(Number(price) * item.quantity).toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="h-fit rounded-xl border p-5">
              <h2 className="text-lg font-semibold">
                {catalogMode ? "Your selection" : "Order summary"}
              </h2>

              {!catalogMode ? (
                <>
                  <div className="mt-5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>

                    <span>CHF {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>

                      <span>CHF {subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  Continue to checkout to submit your selection.
                </p>
              )}

              <Link href="/checkout" className="mt-6 block">
                <Button className="w-full">Proceed to checkout</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
