import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STORE_LOCALE } from "@/app/constants";


type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type FulfillmentBody = {
  preferred_fulfillment_at?: string | null;
  porter_status?: string | null;
  porter_details?: string | null;
};

const VALID_DELIVERY_STATUSES = [
  "not_requested",
  "requested",
  "booked",
  "completed",
  "cancelled",
] as const;

function normalizeValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();

  return stringValue === "" ? null : stringValue;
}

function formatValue(
  field: string,
  value: string | null,
) {
  if (!value) {
    return "Not specified";
  }

  if (field === "preferred_fulfillment_at") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(STORE_LOCALE);
    }
  }

  if (field === "porter_status") {
    const labels: Record<string, string> = {
      not_requested: "Not requested",
      requested: "Requested",
      booked: "Booked",
      completed: "Completed",
      cancelled: "Cancelled",
    };

    return labels[value] ?? value;
  }

  return value;
}

export async function PATCH(
  request: Request,
  { params }: RouteProps,
) {
  try {
    /* =====================================================
       ADMIN AUTHENTICATION
       ===================================================== */

    const { isAdmin, user } = await requireAdmin();

    if (!isAdmin || !user) {
      return NextResponse.json(
        {
          error:
            "You must be an admin to update fulfillment.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    /* =====================================================
       READ REQUEST BODY
       ===================================================== */

    const body =
      (await request.json()) as FulfillmentBody;

    const preferredFulfillmentAt =
      normalizeValue(
        body.preferred_fulfillment_at,
      );

    const porterStatus =
      normalizeValue(body.porter_status) ??
      "not_requested";

    const porterDetails =
      normalizeValue(body.porter_details);

    /* =====================================================
       VALIDATE DELIVERY SERVICE STATUS
       ===================================================== */

    if (
      !VALID_DELIVERY_STATUSES.includes(
        porterStatus as (typeof VALID_DELIVERY_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid delivery service status.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       VALIDATE FULFILLMENT DATE
       ===================================================== */

    if (preferredFulfillmentAt) {
      const date = new Date(
        preferredFulfillmentAt,
      );

      if (Number.isNaN(date.getTime())) {
        return NextResponse.json(
          {
            error:
              "Invalid preferred fulfillment date.",
          },
          { status: 400 },
        );
      }
    }

    /* =====================================================
       GET CURRENT ORDER
       ===================================================== */

    const serviceSupabase =
      createServiceRoleClient();

    const {
      data: order,
      error: orderError,
    } = await serviceSupabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          order_number,
          preferred_fulfillment_at,
          porter_status,
          porter_details
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Failed to load order for fulfillment update:",
        orderError,
      );

      return NextResponse.json(
        {
          error: orderError.message,
        },
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found.",
        },
        { status: 404 },
      );
    }

    /* =====================================================
       OLD VALUES
       ===================================================== */

    const oldValues: Record<
      string,
      string | null
    > = {
      preferred_fulfillment_at:
        order.preferred_fulfillment_at,

      porter_status:
        order.porter_status,

      porter_details:
        order.porter_details,
    };

    /* =====================================================
       NEW VALUES
       ===================================================== */

    const newValues: Record<
      string,
      string | null
    > = {
      preferred_fulfillment_at:
        preferredFulfillmentAt,

      porter_status:
        porterStatus,

      porter_details:
        porterDetails,
    };

    /* =====================================================
       FIND CHANGES
       ===================================================== */

    const changedFields: string[] = [];

    const oldChangedValues: Record<
      string,
      string | null
    > = {};

    const newChangedValues: Record<
      string,
      string | null
    > = {};

    for (const field of Object.keys(newValues)) {
      const oldValue =
        oldValues[field] ?? null;

      const newValue =
        newValues[field] ?? null;

      if (oldValue !== newValue) {
        changedFields.push(field);

        oldChangedValues[field] =
          oldValue;

        newChangedValues[field] =
          newValue;
      }
    }

    /* =====================================================
       NOTHING CHANGED
       ===================================================== */

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        changed: false,
        message: "No changes were made.",
      });
    }

    /* =====================================================
       UPDATE ORDER
       ===================================================== */

    const {
      error: updateError,
    } = await serviceSupabase
      .from("orders")
      .update({
        preferred_fulfillment_at:
          preferredFulfillmentAt,

        porter_status:
          porterStatus,

        porter_details:
          porterDetails,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error(
        "Failed to update order fulfillment:",
        updateError,
      );

      return NextResponse.json(
        {
          error: updateError.message,
        },
        { status: 500 },
      );
    }

    /* =====================================================
       CREATE CHANGE DESCRIPTION
       ===================================================== */

    const FIELD_LABELS: Record<
      string,
      string
    > = {
      preferred_fulfillment_at:
        "Preferred fulfillment",

      porter_status:
        "Delivery service status",

      porter_details:
        "Delivery service details",
    };

    const changeLines =
      changedFields.map((field) => {
        const label =
          FIELD_LABELS[field] ?? field;

        const oldValue =
          formatValue(
            field,
            oldChangedValues[field],
          );

        const newValue =
          formatValue(
            field,
            newChangedValues[field],
          );

        return `${label}: ${oldValue} → ${newValue}`;
      });

    const changeSummary =
      `Admin updated order ${order.order_number}:\n` +
      changeLines.join("\n");

    /* =====================================================
       SAVE CHANGE HISTORY
       ===================================================== */

    const {
      error: historyError,
    } = await serviceSupabase
      .from("order_change_history")
      .insert({
        order_id: order.id,

        change_type:
          "admin_fulfillment_update",

        changed_by: user.id,

        changed_by_type:
          "admin",

        description:
          changeSummary,

        old_value:
          oldChangedValues,

        new_value:
          newChangedValues,
      });

    if (historyError) {
      console.error(
        "Failed to create fulfillment change history:",
        historyError,
      );

      return NextResponse.json(
        {
          error:
            "The fulfillment was updated, but the change history could not be recorded.",
        },
        { status: 500 },
      );
    }

    /* =====================================================
       MARK CUSTOMER CHANGE FOR ADMIN/CUSTOMER UI
       ===================================================== */

    const {
      error: changeMarkerError,
    } = await serviceSupabase
      .from("orders")
      .update({
        customer_change_unread: true,
        customer_change_at:
          new Date().toISOString(),
        customer_change_summary:
          changeSummary,
      })
      .eq("id", order.id);

    if (changeMarkerError) {
      console.error(
        "Failed to mark customer change:",
        changeMarkerError,
      );

      return NextResponse.json(
        {
          error:
            "The fulfillment was updated, but the customer update could not be recorded.",
        },
        { status: 500 },
      );
    }

    /* =====================================================
       CUSTOMER DATABASE NOTIFICATION
       ===================================================== */

    const {
      error: customerNotificationError,
    } = await serviceSupabase
      .from("notifications")
      .insert({
        user_id: order.user_id,

        type: "order_updated",

        title: "Order updated",

        message:
          `Your order ${order.order_number} ` +
          `has been updated by the shop.`,

        order_id: order.id,
      });

    if (customerNotificationError) {
      console.error(
        "Failed to create customer fulfillment notification:",
        customerNotificationError,
      );

      /*
       * Do not fail the fulfillment update just because
       * the notification could not be created.
       */
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json({
      success: true,

      changed: true,

      changed_fields: changedFields,

      message:
        "Fulfillment details updated successfully.",
    });
  } catch (error) {
    console.error(
      "Admin fulfillment update error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update fulfillment.",
      },
      { status: 500 },
    );
  }
}
