import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import OrderPaymentActions from "@/components/admin/order-payment-actions";
import OrderStatusActions from "@/components/admin/order-status-actions";
import { CURRENCY_SYMBOL } from "@/app/constants";

type AdminOrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderPage({
  params,
}: AdminOrderPageProps) {
  const { id } = await params;

  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        status,
        payment_method,
        payment_status,
        subtotal,
        shipping_cost,
        total,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        customer_note,
        payment_verified_at,
        shipped_at,
        delivered_at,
        created_at,
        updated_at,
        order_items (
          id,
          product_name,
          quantity,
          unit_price,
          total_price,
          weight_grams,
          size,
          height,
          width,
          depth
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!order) {
    notFound();
  }

  const paymentLabel =
    order.payment_method === "twint"
      ? "TWINT"
      : "Bank Transfer";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to orders
        </Link>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Order {order.order_number}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Placed on{" "}
              {new Date(order.created_at).toLocaleDateString(
                "en-CH",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                },
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {order.status}
            </span>

            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {order.payment_status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold">
              Order items
            </h2>

            <div className="mt-5 space-y-4">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {item.product_name}
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {CURRENCY_SYMBOL}{" "}
                        {Number(item.unit_price).toFixed(2)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <p className="font-medium">
                      {CURRENCY_SYMBOL}{" "}
                      {Number(item.total_price).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item.weight_grams != null && (
                      <span>
                        Weight: {Number(item.weight_grams)} g
                      </span>
                    )}

                    {item.size && (
                      <span>Size: {item.size}</span>
                    )}

                    {item.height != null &&
                      item.width != null &&
                      item.depth != null && (
                        <span>
                          Dimensions:{" "}
                          {Number(item.height)} ×{" "}
                          {Number(item.width)} ×{" "}
                          {Number(item.depth)}
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold">
              Customer & shipping
            </h2>

            <div className="mt-4 space-y-1 text-sm">
              <p className="font-medium">
                {order.shipping_name}
              </p>

              <p>{order.shipping_phone}</p>

              <p className="pt-2">
                {order.shipping_address}
              </p>

              <p>
                {order.shipping_postal_code}{" "}
                {order.shipping_city}
              </p>

              <p>{order.shipping_country}</p>
            </div>
          </section>

          {order.customer_note ? (
            <section className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold">
                Customer note
              </h2>

              <p className="mt-4 text-sm">
                {order.customer_note}
              </p>
            </section>
          ) : null}

          <section className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold">
              Payment
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Method
                </span>

                <span className="font-medium">
                  {paymentLabel}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Payment status
                </span>

                <span className="font-medium">
                  {order.payment_status}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Verified
                </span>

                <span className="font-medium">
                  {order.payment_verified_at
                    ? new Date(
                        order.payment_verified_at,
                      ).toLocaleString("en-CH")
                    : "Not verified"}
                </span>
              </div>
            </div>

            <OrderPaymentActions
  orderId={order.id}
  paymentStatus={order.payment_status}
/>
<OrderStatusActions
  orderId={order.id}
  status={order.status}
  paymentStatus={order.payment_status}
/>
          </section>
        </div>

        <aside className="h-fit space-y-6">
          <section className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold">
              Order summary
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal
                </span>

                <span>
                  {CURRENCY_SYMBOL} {Number(order.subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Shipping
                </span>

                <span>
                  {Number(order.shipping_cost) === 0
                    ? "Free"
                    : `${CURRENCY_SYMBOL} ${Number(
                        order.shipping_cost,
                      ).toFixed(2)}`}
                </span>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>

                  <span>
                    {CURRENCY_SYMBOL} {Number(order.total).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border p-5">
            <h2 className="text-lg font-semibold">
              Order timeline
            </h2>

            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="font-medium">Order placed</p>

                <p className="text-muted-foreground">
                  {new Date(
                    order.created_at,
                  ).toLocaleString("en-CH")}
                </p>
              </div>

              <div>
                <p className="font-medium">Payment verified</p>

                <p className="text-muted-foreground">
                  {order.payment_verified_at
                    ? new Date(
                        order.payment_verified_at,
                      ).toLocaleString("en-CH")
                    : "Not yet"}
                </p>
              </div>

              <div>
                <p className="font-medium">Shipped</p>

                <p className="text-muted-foreground">
                  {order.shipped_at
                    ? new Date(
                        order.shipped_at,
                      ).toLocaleString("en-CH")
                    : "Not yet"}
                </p>
              </div>

              <div>
                <p className="font-medium">Delivered</p>

                <p className="text-muted-foreground">
                  {order.delivered_at
                    ? new Date(
                        order.delivered_at,
                      ).toLocaleString("en-CH")
                    : "Not yet"}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}