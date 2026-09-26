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

type PaymentMethod = {
  id: string;
  method_type: string;
  display_name: string;
  enabled: boolean;
  account_name: string | null;
  phone_number: string | null;
  payment_url: string | null;
  instructions: string | null;
  qr_code_url: string | null;
  sort_order: number;
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
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, full_name, phone, address, city, postal_code, country")
      .eq("id", user.id)
      .maybeSingle(),

    supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle(),

    supabase.from("storefront_settings").select("*").maybeSingle(),

    supabase
      .from("site_settings")
      .select("catalog_mode")
      .eq("id", true)
      .maybeSingle(),

    supabase
      .from("payment_methods")
      .select(
        `
          id,
          method_type,
          display_name,
          enabled,
          account_name,
          phone_number,
          payment_url,
          instructions,
          qr_code_url,
          sort_order
        `,
      )
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
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

    const price = item.product.sale_price ?? item.product.price;

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
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>

          <p className="mt-2 text-muted-foreground">
            {catalogMode
              ? "Review your order before placing it. We will contact you with the price details."
              : "Review your order before placing it."}
          </p>
        </div>

        <CheckoutForm>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-6">
              {/* =====================================================
                  SHIPPING ADDRESS
              ===================================================== */}
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Shipping address</h2>

                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="full-name" className="text-sm font-medium">
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
                    <label htmlFor="phone" className="text-sm font-medium">
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
                    <label htmlFor="address" className="text-sm font-medium">
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
                      <label htmlFor="city" className="text-sm font-medium">
                        City
                      </label>

                      <input
                        id="city"
                        name="city"
                        type="text"
                        defaultValue={profile?.city ?? "Bangalore"}
                        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="country" className="text-sm font-medium">
                      Country
                    </label>

                    <input
                      id="country"
                      name="country"
                      type="text"
                      defaultValue={profile?.country ?? "India"}
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    />
                  </div>
                </div>
              </section>

{/* =====================================================
    PREFERRED FULFILLMENT
===================================================== */}
<section className="rounded-xl border p-5">
  <h2 className="text-lg font-semibold">
    Preferred fulfillment
  </h2>

  <p className="mt-1 text-sm text-muted-foreground">
    Let us know when you would prefer your order to be fulfilled.
  </p>

  <div className="mt-4 space-y-2">
    <label
      htmlFor="preferred-fulfillment-at"
      className="text-sm font-medium"
    >
      Preferred date and time
    </label>

    <input
      id="preferred-fulfillment-at"
      name="preferred_fulfillment_at"
      type="datetime-local"
      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
    />

    <p className="text-xs text-muted-foreground">
      This is your preferred fulfillment time and is not a guaranteed
      delivery time.
    </p>
  </div>
</section>
              {/* =====================================================
                  ITEMS
              ===================================================== */}
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold">Your items</h2>

                <div className="mt-5 space-y-4">
                  {validItems.map((item) => {
                    if (!item.product) return null;

                    const product = item.product;

                    const price = product.sale_price ?? product.price;

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
                          <p className="font-medium">{product.name}</p>

                          {catalogMode ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </p>
                          ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {CURRENCY_SYMBOL} {Number(price).toFixed(2)} ×{" "}
                              {item.quantity}
                            </p>
                          )}
                        </div>

                        {!catalogMode && (
                          <p className="font-medium">
                            {CURRENCY_SYMBOL}{" "}
                            {(Number(price) * item.quantity).toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

{/* =====================================================
    DELIVERY SERVICE
===================================================== */}
<section className="rounded-xl border p-5">
  <h2 className="text-lg font-semibold">
    Delivery service
  </h2>

  <p className="mt-1 text-sm text-muted-foreground">
    Choose who should arrange the delivery service.
  </p>

  <div className="mt-4 space-y-4">
    {/* CUSTOMER BOOKS */}
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:bg-muted/40">
      <input
        type="radio"
        name="porter_status"
        value="booked"
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block font-medium">
          I will book the delivery service myself
        </span>

        <span className="mt-1 block text-xs text-muted-foreground">
          Add the delivery company, contact details, or other
          delivery information below.
        </span>
      </span>
    </label>

    {/* ADMIN BOOKS */}
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition hover:bg-muted/40">
      <input
        type="radio"
        name="porter_status"
        value="requested"
        defaultChecked
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block font-medium">
          Request admin to book the delivery service
        </span>

        <span className="mt-1 block text-xs text-muted-foreground">
          We will arrange the delivery service for you.
          Extra delivery charges may apply.
        </span>
      </span>
    </label>

    {/* DETAILS */}
    <div className="space-y-2">
      <label
        htmlFor="porter-details"
        className="text-sm font-medium"
      >
        Delivery details
      </label>

      <textarea
        id="porter-details"
        name="porter_details"
        rows={4}
        placeholder="Add the delivery company, contact details, or notes"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />

      <p className="text-xs text-muted-foreground">
        If you ask us to arrange the delivery, you can leave this blank.
      </p>
    </div>
  </div>
</section>


              {/* =====================================================
                  PAYMENT
              ===================================================== */}
              <CheckoutPayment paymentMethods={paymentMethods ?? []} />
            </div>

            {/* =====================================================
                ORDER SUMMARY
            ===================================================== */}
            <aside className="h-fit rounded-xl border p-5">
              <h2 className="text-lg font-semibold">Order summary</h2>

              {catalogMode ? (
                <div className="mt-5 rounded-lg bg-muted/50 p-4">
                  <p className="text-sm font-medium">Price details</p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    We will contact you after your order with the price and
                    shipping details.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-5 flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>

                    <span>
                      {CURRENCY_SYMBOL} {subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping - dont pay if you book porter</span>

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
