import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteProps,
) {
  const { id } = await params;

  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = await request.json();

  const paymentStatus = body.payment_status;

  if (
    paymentStatus !== "pending" &&
    paymentStatus !== "paid"
  ) {
    return NextResponse.json(
      { error: "Invalid payment status." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, user_id, order_number, status, payment_status",
    )
    .eq("id", id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { error: orderError.message },
      { status: 500 },
    );
  }

  if (!order) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 },
    );
  }

  const paymentChanged =
    paymentStatus !== order.payment_status;

  const updateData: {
    payment_status: string;
    payment_verified_at: string | null;
    status?: string;
  } = {
    payment_status: paymentStatus,
    payment_verified_at:
      paymentStatus === "paid"
        ? new Date().toISOString()
        : null,
  };

  if (
    paymentStatus === "paid" &&
    order.status === "pending_payment"
  ) {
    updateData.status = "processing";
  }

  if (
    paymentStatus === "pending" &&
    order.status === "processing"
  ) {
    updateData.status = "pending_payment";
  }

  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  /*
   * Notifications are secondary.
   * A notification failure must never undo
   * a successful order update.
   */

  if (paymentChanged) {
    const serviceSupabase =
      createServiceRoleClient();

    /* =======================================================
       CUSTOMER DATABASE NOTIFICATION
       ======================================================= */

    if (paymentStatus === "paid") {
      const {
        error: customerNotificationError,
      } = await serviceSupabase
        .from("notifications")
        .insert({
          user_id: order.user_id,

          type: "payment_confirmed",

          title: "Payment confirmed",

          message:
            `Your payment for order ` +
            `${order.order_number} has been confirmed.`,

          order_id: order.id,
        });

      if (customerNotificationError) {
        console.error(
          "Failed to create customer payment notification:",
          customerNotificationError,
        );
      }
    }

    /* =======================================================
       FIND ALL ADMINS
       ======================================================= */

    const {
      data: admins,
      error: adminsError,
    } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminsError) {
      console.error(
        "Failed to find admins for payment notification:",
        adminsError,
      );
    } else if (admins && admins.length > 0) {
      /* =====================================================
         ADMIN DATABASE NOTIFICATION
         ===================================================== */

      const adminNotifications = admins.map(
        (admin) => ({
          user_id: admin.id,

          type: "admin_order_updated",

          title: "Order payment updated",

          message:
            paymentStatus === "paid"
              ? `Payment for order ${order.order_number} has been marked as paid.`
              : `Payment for order ${order.order_number} has been marked as pending.`,

          order_id: order.id,
        }),
      );

      const {
        error: adminNotificationError,
      } = await serviceSupabase
        .from("notifications")
        .insert(adminNotifications);

      if (adminNotificationError) {
        console.error(
          "Failed to create admin payment notification:",
          adminNotificationError,
        );
      }
    }
  }

  return NextResponse.json({
    success: true,

    payment_status: paymentStatus,

    order_status:
      updateData.status ?? order.status,
  });
}
