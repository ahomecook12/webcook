import { redirect } from "next/navigation";
import Link from "next/link";

import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_SYMBOL } from "@/app/constants";

export default async function AdminOrdersPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  const { data: orders, error } = await supabase
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
        shipping_city,
        created_at
      `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Orders
          </h1>

          <p className="mt-2 text-muted-foreground">
            Manage customer orders and payments.
          </p>
        </div>
      </div>

      {orders && orders.length > 0 ? (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="block rounded-xl border p-5 hover:bg-muted/50"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">
                    {order.order_number}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.shipping_name}
                    {order.shipping_city
                      ? ` · ${order.shipping_city}`
                      : ""}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(
                      order.created_at,
                    ).toLocaleDateString("en-CH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted px-3 py-1">
                    {order.status}
                  </span>

                  <span className="rounded-full bg-muted px-3 py-1">
                    {order.payment_method === "twint"
                      ? "TWINT"
                      : "Bank Transfer"}
                  </span>

                  <span className="rounded-full bg-muted px-3 py-1">
                    {order.payment_status}
                  </span>
                </div>

                <div className="text-left lg:text-right">
                  <p className="font-semibold">
                    {CURRENCY_SYMBOL} {Number(order.total).toFixed(2)}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    View order →
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
          <h2 className="font-semibold">No orders yet</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Customer orders will appear here.
          </p>
        </div>
      )}
    </main>
  );
}