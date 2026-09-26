import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import AdminOrderEdit from "@/components/admin/admin-order-edit";
import OrderPaymentActions from "@/components/admin/order-payment-actions";
import OrderStatusActions from "@/components/admin/order-status-actions";
import OrderDetailSection from "@/components/storefront/order-detail-section";
import OrderStatusTimeline from "@/components/storefront/order-status-timeline";
import OrderHistoryDialog from "@/components/storefront/order-history-dialog";
import { CURRENCY_SYMBOL, STORE_LOCALE } from "@/app/constants";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminOrderPageProps = {
  params: Promise<{ id: string }>;
};

type PaymentMethodSnapshot = {
  id?: string | null;
  method_type?: string | null;
  display_name?: string | null;
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

/* function formatShortDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleString(STORE_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
} */

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { id } = await params;

  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  const [
    { data: order, error },
    { data: orderHistory },
    { data: paymentMethods },
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
          payment_verified_at,
          shipped_at,
          delivered_at,
          created_at,
          updated_at,
          preferred_fulfillment_at,
          porter_status,
          porter_details,
          customer_change_unread,
          customer_change_at,
          customer_change_summary,

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
      .maybeSingle(),

    supabase
      .from("order_change_history")
      .select("id, description, created_at, change_type, changed_by_type")
      .eq("order_id", id)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("payment_methods")
      .select(
        `
          id,
          display_name,
          method_type,
          account_name,
          phone_number,
          payment_url,
          instructions,
          qr_code_url
        `,
      )
      .eq("active", true)
      .order("display_name"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (!order) {
    notFound();
  }

  const paymentSnapshot =
    order.payment_method_snapshot as PaymentMethodSnapshot | null;

  const historyItems = (orderHistory ?? []) as OrderHistoryItem[];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="mb-8">
        <Link
          href="/admin/orders"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to orders
        </Link>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order {order.order_number}</h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Placed on{" "}
              {new Date(order.created_at).toLocaleDateString(STORE_LOCALE, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {order.status}
            </span>

            <span className="rounded-full bg-muted px-3 py-1 text-sm">
              {order.payment_status}
            </span>

            {order.customer_change_unread && (
              <span className="rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                Customer update
              </span>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          CUSTOMER UPDATE
      ===================================================== */}

      {order.customer_change_summary ? (
        <section className="mb-6 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Customer order update</h2>

              {order.customer_change_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(order.customer_change_at).toLocaleString(STORE_LOCALE)}
                </p>
              )}
            </div>

            {order.customer_change_unread && (
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                New
              </span>
            )}
          </div>

          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
            {order.customer_change_summary}
          </p>
        </section>
      ) : null}

      {/* =====================================================
    ORDER PROGRESS + SUMMARY / HISTORY
===================================================== */}

      <div className="mt-6 grid gap-4 lg:grid-cols-[3.5fr_1.5fr] lg:items-stretch bg-background">
        {/* =====================================================
      ORDER PROGRESS
  ===================================================== */}

        <section className="h-full rounded-xl border  p-5 shadow-sm bg-background">
          <h2 className="text-lg font-semibold">Order progress</h2>

          <div className="mt-5">
            <OrderStatusTimeline
              status={order.status}
              createdAt={order.created_at}
              paymentStatus={order.payment_status}
              paymentVerifiedAt={order.payment_verified_at}
              shippedAt={order.shipped_at}
              deliveredAt={order.delivered_at}
            />
          </div>
        </section>

        {/* =========== ORDER SUMMARY + ORDER HISTORY==================== */}

        <div className="flex h-full flex-col gap-6">
          {/* =====================================================
              ORDER SUMMARY
           ===================================================== */}

          <section className="rounded-xl border  p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Order summary</h2>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Subtotal</span>

                <span>
                  {CURRENCY_SYMBOL} {Number(order.subtotal).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">Shipping- will not be paid if customer books himself</span>

                <span>
                  {Number(order.shipping_cost) === 0
                    ? "Free"
                    : `${CURRENCY_SYMBOL}${Number(order.shipping_cost).toFixed(2)}`}
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
          </section>

          {/* =====================================================
              ORDER HISTORY
              ===================================================== */}

          {historyItems.length > 0 && (
            <section className="rounded-xl border  p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Order history</h2>

              <div className="mt-4">
                <OrderHistoryDialog items={historyItems} />
              </div>
            </section>
          )}
        </div>
      </div>

<div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr] lg:items-stretch">
      {/* =====================================================
          ORDER PROGRESS ADMIN CONTROLS
          
          This is NOT duplicated order information.
          These are admin actions.
      ===================================================== */}

      <div className="mt-6">
        <OrderDetailSection
          title="Order progress"
          subtitle="Admin-only order controls"
          summary={
            <div className="space-y-5">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">Status</span>

                  <span className="font-medium capitalize">{order.status}</span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
                  <span className="text-muted-foreground">Payment</span>

                  <span className="font-medium capitalize">
                    {order.payment_status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-medium">Payment</h3>

                <OrderPaymentActions
                  orderId={order.id}
                  paymentStatus={order.payment_status}
                />
              </div>

              <div>
                <h3 className="font-medium">Order status</h3>

                <OrderStatusActions
                  orderId={order.id}
                  status={order.status}
                  paymentStatus={order.payment_status}
                />
              </div>
            </div>
          }
        />
      </div>

      {/* =====================================================
          ORDER ITEMS
      ===================================================== */}

      <div className="mt-6">
        <OrderDetailSection
          title="Order items"
          subtitle="Confirmed from checkout"
          summary={
            <div className="space-y-4">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.product_name}</p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {CURRENCY_SYMBOL} {Number(item.unit_price).toFixed(2)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>

                    <p className="font-medium">
                      {CURRENCY_SYMBOL} {Number(item.total_price).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {item.weight_grams != null && (
                      <span>Weight: {Number(item.weight_grams)} g</span>
                    )}

                    {item.size && <span>Size: {item.size}</span>}

                    {item.height != null &&
                      item.width != null &&
                      item.depth != null && (
                        <span>
                          Dimensions: {Number(item.height)} ×{" "}
                          {Number(item.width)} × {Number(item.depth)}
                        </span>
                      )}
                  </div>
                </div>
              ))}
            </div>
          }
        />
      </div>
</div>
      {/* =====================================================
          ONE EDITABLE ORDER INFORMATION AREA
          
          Shipping
          Delivery
          Fulfillment
          Payment method
          Customer note
          
          ALL LIVE IN THIS ONE COMPONENT.
      ===================================================== */}

      <AdminOrderEdit
        orderId={order.id}
        shippingName={order.shipping_name}
        shippingPhone={order.shipping_phone}
        shippingAddress={order.shipping_address}
        shippingCity={order.shipping_city}
        shippingPostalCode={order.shipping_postal_code}
        shippingCountry={order.shipping_country}
        customerNote={order.customer_note}
        preferredFulfillmentAt={order.preferred_fulfillment_at}
        porterStatus={order.porter_status}
        porterDetails={order.porter_details}
        currentPaymentMethodId={order.payment_method_id}
        paymentSnapshot={paymentSnapshot}
        paymentMethodOptions={paymentMethods ?? []}
      />
    </main>
  );
}
