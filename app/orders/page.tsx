import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/orders");
  }

  const [{ data: orders, error }, { data: siteSettings }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, status, payment_method, payment_status, subtotal, shipping_cost, total, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("site_settings")
        .select("catalog_mode")
        .eq("id", true)
        .maybeSingle(),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const catalogMode = siteSettings?.catalog_mode ?? false;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            My Orders
          </h1>

          <p className="mt-2 text-muted-foreground">
            View your order history and order details.
          </p>
        </div>

        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {order.order_number}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
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

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-3 py-1">
                      {order.status}
                    </span>

                    {!catalogMode && (
                      <>
                        <span className="rounded-full bg-muted px-3 py-1">
                          {order.payment_method === "twint"
                            ? "TWINT"
                            : "Bank Transfer"}
                        </span>

                        <span className="rounded-full bg-muted px-3 py-1">
                          {order.payment_status}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      {catalogMode ? "Price" : "Total"}
                    </span>

                    <span className="ml-2 font-semibold">
                      {catalogMode
                        ? "Confirmed directly"
                        : `CHF ${Number(order.total).toFixed(2)}`}
                    </span>
                  </div>

                  <Link
                    href={`/orders/${order.id}`}
                    className="rounded-lg border px-4 py-2 text-center text-sm font-medium hover:bg-muted"
                  >
                    View order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border p-10 text-center">
            <h2 className="text-lg font-semibold">
              No orders yet
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              You havent placed any orders yet.
            </p>

            <Link
              href="/products"
              className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start shopping
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}