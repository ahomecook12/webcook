import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OrderHistoryDialog from "@/components/storefront/order-history-dialog";
import { CURRENCY_SYMBOL, STORE_LOCALE } from "@/app/constants";
import EditOrderForm from "@/components/storefront/edit-order-form";
import OrderStatusTimeline from "@/components/storefront/order-status-timeline";
import { createClient } from "@/lib/supabase/server";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

type PaymentMethodSnapshot = {
  id?: string;
  method_type?: string;
  display_name?: string;
  account_name?: string | null;
  phone_number?: string | null;
  payment_url?: string | null;
  instructions?: string | null;
  qr_code_url?: string | null;
};

type OrderHistoryItem = {
  id: string;
  description?: string | null;
  created_at?: string | null;
  change_type?: string | null;
  changed_by_type?: string | null;
};

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirectTo=/orders/${id}`);
  }

  const [
    { data: order, error: orderError },
    { data: siteSettings },
    { data: paymentMethods },
    { data: orderHistory, error: orderHistoryError },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(
        `
          id,
          order_number,
          status,
          payment_method,
          payment_method_id,
          payment_method_snapshot,
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
          created_at,
          updated_at,
          payment_verified_at,
          shipped_at,
          delivered_at,
          preferred_fulfillment_at,
          customer_change_unread,
          customer_change_at,
          customer_change_summary,
          porter_status,
          porter_details,

          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),

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
          account_name,
          phone_number,
          payment_url,
          instructions,
          qr_code_url
        `,
      )
      .eq("enabled", true)
      .order("display_name", {
        ascending: true,
      }),

    supabase
      .from("order_change_history")
      .select(
        `
          id,
          description,
          created_at,
          change_type,
          changed_by_type
        `,
      )
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (orderError) {
    throw new Error(orderError.message);
  }

  if (!order) {
    notFound();
  }

  const catalogMode = siteSettings?.catalog_mode ?? false;

  const paymentSnapshot =
    order.payment_method_snapshot as PaymentMethodSnapshot | null;

  const selectedPaymentMethod = paymentMethods?.find(
    (method) => method.id === order.payment_method_id,
  );

  const paymentName =
    paymentSnapshot?.display_name ??
    selectedPaymentMethod?.display_name ??
    order.payment_method ??
    "Payment method";

  const currentPaymentMethodId = order.payment_method_id ?? null;

const historyItems = (orderHistory ?? []) as OrderHistoryItem[];



  const paymentMethodOptions = (paymentMethods ?? []).map((method) => ({
    id: method.id,
    display_name: method.display_name,
    method_type: method.method_type,
    account_name: method.account_name,
    phone_number: method.phone_number,
    payment_url: method.payment_url,
    instructions: method.instructions,
    qr_code_url: method.qr_code_url,
  }));

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-8">
          <Link
            href="/orders"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to my orders
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Order {order.order_number}
              </h1>

              <p className="mt-2 text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString(STORE_LOCALE, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {order.status}
              </span>

              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {order.payment_status}
              </span>
            </div>
          </div>
        </div>

        {/* =====================================================
            STATUS + ORDER SUMMARY
        ===================================================== */}

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <OrderStatusTimeline
            status={order.status}
            createdAt={order.created_at}
            paymentStatus={order.payment_status}
            paymentVerifiedAt={order.payment_verified_at}
            shippedAt={order.shipped_at}
            deliveredAt={order.delivered_at}
          />

          <div className="flex h-full flex-col gap-6">
            {/* ORDER SUMMARY */}

            <section className="flex-1 rounded-xl border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Order summary</h2>

              {catalogMode ? (
                <div className="mt-4 rounded-lg bg-muted/60 p-4 text-center text-sm">
                  Prices confirmed directly.
                </div>
              ) : (
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Subtotal</span>

                    <span>
                      {CURRENCY_SYMBOL} {Number(order.subtotal).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Shipping - dont pay if you book porter</span>

                    <span>
                      {Number(order.shipping_cost) === 0
                        ? "Free"
                        : `${CURRENCY_SYMBOL} ${Number(
                            order.shipping_cost,
                          ).toFixed(2)}`}
                    </span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between gap-3 font-semibold">
                      <span>Total</span>

                      <span>
                        {CURRENCY_SYMBOL} {Number(order.total).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* HISTORY LINK */}

            {/* HISTORY */}

            <section className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Order history</h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    View changes made to this order.
                  </p>
                </div>

                <OrderHistoryDialog items={historyItems} />
              </div>
            </section>


          </div>
        </div>

        {/* =====================================================
            ONE COMPLETE ORDER FORM
           
            IMPORTANT:
            Everything editable belongs to this ONE component.
        ===================================================== */}

        <div className="mt-6">
          <EditOrderForm
            orderId={order.id}
            status={order.status}
            shippingName={order.shipping_name ?? ""}
            shippingPhone={order.shipping_phone ?? ""}
            shippingAddress={order.shipping_address ?? ""}
            shippingCity={order.shipping_city ?? ""}
            shippingPostalCode={order.shipping_postal_code ?? ""}
            shippingCountry={order.shipping_country ?? ""}
            customerNote={order.customer_note ?? null}
            preferredFulfillmentAt={order.preferred_fulfillment_at ?? null}
            porterStatus={order.porter_status ?? "booked"}
            porterDetails={order.porter_details ?? null}
            currentPaymentMethodId={currentPaymentMethodId}
            paymentMethodOptions={paymentMethodOptions}
            paymentName={paymentName}
            paymentSnapshot={paymentSnapshot}
            catalogMode={catalogMode}
            orderItems={order.order_items ?? []}
          />
        </div>
      </div>
    </main>
  );
}
