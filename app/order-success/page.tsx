import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CURRENCY_SYMBOL } from "../constants";

type OrderSuccessPageProps = {
  searchParams: Promise<{
    order?: string;
  }>;
};

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const { order } = await searchParams;

  if (!order) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [{ data: orderData, error }, { data: siteSettings }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "order_number, status, payment_method, payment_status, subtotal, shipping_cost, total",
        )
        .eq("order_number", order)
        .eq("user_id", user.id)
        .maybeSingle(),

      supabase
        .from("site_settings")
        .select("catalog_mode")
        .eq("id", true)
        .maybeSingle(),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  if (!orderData) {
    redirect("/");
  }

  const catalogMode = siteSettings?.catalog_mode ?? false;

  const paymentLabel =
    orderData.payment_method === "twint"
      ? "TWINT"
      : "Bank Transfer";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-2xl">
            ✓
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            Thank you for your order!
          </h1>

          <p className="mt-3 text-muted-foreground">
            Your order has been placed successfully.
          </p>

          <div className="mt-8 rounded-xl bg-muted/50 p-5 text-left">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Order number
              </span>

              <span className="font-medium">
                {orderData.order_number}
              </span>
            </div>

            {catalogMode ? (
              <div className="mt-4 border-t pt-4">
                <p className="font-medium">
                  We will contact you with the price details.
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Your order has been received. An admin will
                  contact you with the final price and payment
                  details.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3 flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Payment method
                  </span>

                  <span className="font-medium">
                    {paymentLabel}
                  </span>
                </div>

                <div className="mt-3 flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    Payment status
                  </span>

                  <span className="font-medium">
                    Awaiting verification
                  </span>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>

                    <span>
                      {CURRENCY_SYMBOL} {Number(orderData.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {!catalogMode &&
            (orderData.payment_method === "twint" ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Please complete your TWINT payment using the
                payment details shown during checkout. Your
                order will be confirmed after payment is
                verified.
              </p>
            ) : (
              <p className="mt-6 text-sm text-muted-foreground">
                Please complete your bank transfer using the
                bank details shown during checkout. Your
                order will be confirmed after payment is
                verified.
              </p>
            ))}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/products"
              className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted"
            >
              Continue shopping
            </Link>

            <Link
              href="/orders"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              View my orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}