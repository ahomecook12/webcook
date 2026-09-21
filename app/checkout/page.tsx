import { redirect } from "next/navigation";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import CheckoutPayment from "@/components/storefront/checkout-payment";
import CheckoutForm from "@/components/storefront/checkout-form";
import { CURRENCY_SYMBOL } from "../constants";

type CartProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[] | null;
  active: boolean;
  stock: number;
};

export default async function CheckoutPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/checkout");
  }

  const [
    { data: profile },
    { data: cart },
    { data: storefrontSettings },
    { data: siteSettings },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "role, full_name, phone, address, city, postal_code, country",
      )
      .eq("id", user.id)
      .maybeSingle(),

    supabase
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),

    supabase
      .from("storefront_settings")
      .select("*")
      .maybeSingle(),

    supabase
      .from("site_settings")
      .select("catalog_mode")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (!cart) {
    redirect("/cart");
  }

  const catalogMode = siteSettings?.catalog_mode ?? false;

  const { data: cartItems, error } = await supabase
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
          stock
        )
      `,
    )
    .eq("cart_id", cart.id)
    .order("created_at");

  if (error) {
    throw new Error(error.message);
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

  const validItems = items.filter((item) => item.product !== null);

  if (validItems.length === 0) {
    redirect("/cart");
  }

  /*
   * IMPORTANT:
   * We still calculate the real prices.
   * Catalog mode only hides them from the customer.
   */
  const subtotal = validItems.reduce((total, item) => {
    if (!item.product) return total;

    const price =
      item.product.sale_price ?? item.product.price;

    return total + Number(price) * item.quantity;
  }, 0);

  const shippingPrice = storefrontSettings?.free_shipping
    ? 0
    : Number(storefrontSettings?.shipping_price ?? 0);

  const total = subtotal + shippingPrice;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Checkout
          </h1>

          <p className="mt-2 text-muted-foreground">
            {catalogMode
              ? "Review your order before placing it. We will contact you with the price details."
              : "Review your order before placing it."}
          </p>
        </div>

        <CheckoutForm>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* SHIPPING ADDRESS */}
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">
                  Shipping address
                </h2>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="full-name"
                      className="text-sm font-medium"
                    >
                      Full name
                    </label>

                    <input
                      id="full-name"
                      name="full_name"
                      type="text"
                      defaultValue={profile?.full_name ?? ""}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="phone"
                      className="text-sm font-medium"
                    >
                      Phone
                    </label>

                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile?.phone ?? ""}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="address"
                      className="text-sm font-medium"
                    >
                      Address
                    </label>

                    <input
                      id="address"
                      name="address"
                      type="text"
                      defaultValue={profile?.address ?? ""}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="postal-code"
                        className="text-sm font-medium"
                      >
                        Postal code
                      </label>

                      <input
                        id="postal-code"
                        name="postal_code"
                        type="text"
                        defaultValue={profile?.postal_code ?? ""}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="city"
                        className="text-sm font-medium"
                      >
                        City
                      </label>

                      <input
                        id="city"
                        name="city"
                        type="text"
                        defaultValue={profile?.city ?? ""}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="country"
                      className="text-sm font-medium"
                    >
                      Country
                    </label>

                    <input
                      id="country"
                      name="country"
                      type="text"
                      defaultValue={
                        profile?.country ?? "Switzerland"
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </section>

              {/* ITEMS */}
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">
                  Your items
                </h2>

                <div className="mt-5 space-y-4">
                  {validItems.map((item) => {
                    if (!item.product) return null;

                    const product = item.product;
                    const price =
                      product.sale_price ?? product.price;
                    const image = product.images?.[0];

                    return (
                      <div
                        key={item.id}
                        className="flex gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                      >
                        {image ? (
                          <Image
                            src={image}
                            alt={product.name}
                            width={80}
                            height={80}
                            unoptimized
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                            No image
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">
                            {product.name}
                          </p>

                          {catalogMode ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {CURRENCY_SYMBOL}{" "}
                              {Number(price).toFixed(2)} ×{" "}
                              {item.quantity}
                            </p>
                          )}
                        </div>

                        {!catalogMode && (
                          <p className="font-medium">
                            {CURRENCY_SYMBOL}{" "}
                            {(
                              Number(price) *
                              item.quantity
                            ).toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SHIPPING */}
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">
                  Shipping
                </h2>

                {storefrontSettings?.shipping_enabled ? (
                  <div className="mt-4">
                    <p className="font-medium">
                      {storefrontSettings.shipping_method ||
                        "Shipping"}
                    </p>

                    {!catalogMode && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {storefrontSettings.free_shipping
                          ? "Free shipping"
                          : `${CURRENCY_SYMBOL} ${shippingPrice.toFixed(2)}`}
                      </p>
                    )}

                    {catalogMode && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Shipping details will be confirmed with you.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Shipping is currently unavailable.
                  </p>
                )}
              </section>

              <CheckoutPayment
                twintEnabled={
                  storefrontSettings?.twint_enabled ?? false
                }
                twintPhone={
                  storefrontSettings?.twint_phone ?? null
                }
                bankTransferEnabled={
                  storefrontSettings?.bank_transfer_enabled ??
                  false
                }
                bankAccountName={
                  storefrontSettings?.bank_account_name ?? null
                }
                bankIban={
                  storefrontSettings?.bank_iban ?? null
                }
              />
            </div>

            {/* ORDER SUMMARY */}
            <aside className="h-fit rounded-xl border p-5">
              <h2 className="text-lg font-semibold">
                Order summary
              </h2>

              {catalogMode ? (
                <div className="mt-5 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">
                    Price details
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    We will contact you after your order with
                    the price and shipping details.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal
                    </span>

                    <span>
                      {CURRENCY_SYMBOL} {subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Shipping
                    </span>

                    <span>
                      {shippingPrice === 0
                        ? "Free"
                        : `${CURRENCY_SYMBOL} ${shippingPrice.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="mt-4 border-t pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>

                      <span>
                        {CURRENCY_SYMBOL} {total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </aside>
          </div>
        </CheckoutForm>
      </div>
    </main>
  );
}