import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import OrderStatusHelp from "@/components/storefront/order-status-help";
import OrderStatusTimeline from "@/components/storefront/order-status-timeline";

type OrderPageProps = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirectTo=/orders/${id}`);
  }
 
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      ` id, order_number, status, payment_method, payment_status, subtotal, 
      shipping_cost, total, shipping_name, shipping_phone, shipping_address, shipping_city, 
      shipping_postal_code, shipping_country, customer_note, created_at, payment_verified_at,
shipped_at,
delivered_at,
      order_items ( id, product_name, quantity, unit_price, total_price ) `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!order) {
    notFound();
  }
  const paymentLabel =
    order.payment_method === "twint" ? "TWINT" : "Bank Transfer";
 
  return (
    <main className="min-h-screen bg-background">
     
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Link
            href="/orders"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to my orders
          </Link>
          <div className="mt-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Order {order.order_number}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-CH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <OrderStatusTimeline
              status={order.status}
              createdAt={order.created_at}
              paymentStatus={order.payment_status}
              paymentVerifiedAt={order.payment_verified_at}
              shippedAt={order.shipped_at}
              deliveredAt={order.delivered_at}
            />
            <section className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold"> Order items </h2>
              <div className="mt-5 space-y-4">
                {order.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium"> {item.product_name} </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        CHF {Number(item.unit_price).toFixed(2)} ×
                        {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      CHF {Number(item.total_price).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold"> Shipping address </h2>
              <div className="mt-4 space-y-1 text-sm">
                <p className="font-medium"> {order.shipping_name} </p>
                <p>{order.shipping_address}</p>
                <p>
                  {order.shipping_postal_code} {order.shipping_city}
                </p>
                <p>{order.shipping_country}</p>
                <p className="pt-2"> {order.shipping_phone} </p>
              </div>
            </section>
            {order.customer_note ? (
              <section className="rounded-xl border p-5">
                <h2 className="text-lg font-semibold"> Note </h2>
                <p className="mt-4 text-sm text-muted-foreground">
                  {order.customer_note}
                </p>
              </section>
            ) : null}
            <section className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold"> Payment </h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"> Method </span>
                  <span className="font-medium"> {paymentLabel} </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"> Status </span>
                  <span className="font-medium">{order.payment_status}</span>
                </div>
              </div>
            </section>
          </div>
          <aside className="h-fit rounded-xl border p-5">
            <h2 className="text-lg font-semibold"> Order summary </h2>
            <div className="mt-5 flex justify-between text-sm">
              <span className="text-muted-foreground"> Subtotal </span>
              <span> CHF {Number(order.subtotal).toFixed(2)} </span>
            </div>
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-muted-foreground"> Shipping </span>
              <span>
                {Number(order.shipping_cost) === 0
                  ? "Free"
                  : `CHF ${Number(order.shipping_cost).toFixed(2)}`}
              </span>
            </div>
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span> CHF {Number(order.total).toFixed(2)} </span>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-muted/50 p-3 text-center text-sm">
              <p className="text-muted-foreground"> Order status </p>
              <p className="mt-1 font-medium"> {order.status} </p>
              <OrderStatusHelp />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
