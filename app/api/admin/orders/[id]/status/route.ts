import { NextResponse } from "next/server";


import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const allowedStatuses = [
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type AllowedStatus = (typeof allowedStatuses)[number];

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

  const newStatus = body.status as string;

  if (
    !allowedStatuses.includes(
      newStatus as AllowedStatus,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  /* =====================================================
     Get order
     ===================================================== */

  const {
    data: order,
    error: orderError,
  } = await supabase
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

  /* =====================================================
     Prevent unnecessary update
     ===================================================== */

  if (newStatus === order.status) {
    return NextResponse.json({
      success: true,
      status: order.status,
    });
  }

  /* =====================================================
     Payment validation
     ===================================================== */

  if (
    newStatus !== "cancelled" &&
    order.payment_status !== "paid"
  ) {
    return NextResponse.json(
      {
        error:
          "Payment must be verified before the order can be processed.",
      },
      { status: 400 },
    );
  }

  /* =====================================================
     Prepare status timestamps
     ===================================================== */

  const now = new Date().toISOString();

  const updateData: {
    status: AllowedStatus;
    shipped_at: string | null;
    delivered_at: string | null;
  } = {
    status: newStatus as AllowedStatus,
    shipped_at: null,
    delivered_at: null,
  };

  if (newStatus === "shipped") {
    updateData.shipped_at = now;
  }

  if (newStatus === "delivered") {
    updateData.shipped_at = now;
    updateData.delivered_at = now;
  }

  if (newStatus === "cancelled") {
    updateData.shipped_at = null;
    updateData.delivered_at = null;
  }

  /* =====================================================
     Update order
     ===================================================== */

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  /* =====================================================
     Customer notification
     ===================================================== */

  const notificationContent: Record<
    AllowedStatus,
    {
      type: string;
      title: string;
      message: string;
    }
  > = {
    processing: {
      type: "order_processing",
      title: "Order is being processed",
      message:
        `Your order ${order.order_number} ` +
        `is now being processed.`,
    },

    shipped: {
      type: "order_shipped",
      title: "Order shipped",
      message:
        `Your order ${order.order_number} ` +
        `has been shipped.`,
    },

    delivered: {
      type: "order_delivered",
      title: "Order delivered",
      message:
        `Your order ${order.order_number} ` +
        `has been delivered.`,
    },

    cancelled: {
      type: "order_cancelled",
      title: "Order cancelled",
      message:
        `Your order ${order.order_number} ` +
        `has been cancelled.`,
    },
  };

  const customerNotification =
    notificationContent[
      newStatus as AllowedStatus
    ];

  const serviceSupabase =
    createServiceRoleClient();

  const {
    error: notificationError,
  } = await serviceSupabase
    .from("notifications")
    .insert({
      user_id: order.user_id,

      type: customerNotification.type,

      title: customerNotification.title,

      message: customerNotification.message,

      order_id: order.id,
    });

  if (notificationError) {
    console.error(
      "Failed to create customer order notification:",
      notificationError,
    );
  }

  

  /* =====================================================
     Success
     ===================================================== */

  return NextResponse.json({
    success: true,
    status: newStatus,
  });
}
