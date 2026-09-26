import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { STORE_LOCALE } from "@/app/constants";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type CustomerUpdateBody = {
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;

  customer_note?: string | null;

  preferred_fulfillment_at?: string | null;

  payment_method?: string | null;

  porter_status?: string | null;
  porter_details?: string | null;

  delivery_service_mode?: string | null;

  notify_admin?: boolean;
  finalize_notification?: boolean;
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

  const result = String(value).trim();

  return result === "" ? null : result;
}

/*
 * Normal string comparison.
 */
function valuesEqual(
  field: string,
  oldValue: unknown,
  newValue: unknown,
) {
  if (field === "preferred_fulfillment_at") {
    if (
      oldValue === null ||
      oldValue === undefined ||
      newValue === null ||
      newValue === undefined
    ) {
      return (
        (oldValue ?? null) ===
        (newValue ?? null)
      );
    }

    const oldTime =
      new Date(String(oldValue)).getTime();

    const newTime =
      new Date(String(newValue)).getTime();

    if (
      !Number.isNaN(oldTime) &&
      !Number.isNaN(newTime)
    ) {
      return oldTime === newTime;
    }
  }

  return (
    (oldValue ?? null) ===
    (newValue ?? null)
  );
}

/*
 * ---------------------------------------------------------
 * FULFILLMENT DATE COMPARISON
 * ---------------------------------------------------------
 *
 * datetime-local only has minute precision.
 *
 * Example:
 *
 * Database:
 * 2026-09-28T15:30:42.123Z
 *
 * Form:
 * 2026-09-28T15:30
 *
 * Form converted back to ISO:
 * 2026-09-28T15:30:00.000Z
 *
 * These represent the same minute from the UI's point of
 * view, so they must NOT be treated as an admin change.
 */
function normalizeFulfillmentForComparison(
  value: unknown,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();

  if (!stringValue) {
    return null;
  }

  const date = new Date(stringValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  /*
   * Ignore seconds and milliseconds because the admin
   * datetime-local field cannot edit them.
   */
  date.setSeconds(0, 0);

  return date.getTime();
}

function fulfillmentValuesEqual(
  oldValue: unknown,
  newValue: unknown,
) {
  return (
    normalizeFulfillmentForComparison(
      oldValue,
    ) ===
    normalizeFulfillmentForComparison(
      newValue,
    )
  );
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
            "You must be an admin to update the order.",
        },
        { status: 403 },
      );
    }

    const { id } = await params;

    /* =====================================================
       READ REQUEST BODY
    ===================================================== */

    const body =
      (await request.json()) as CustomerUpdateBody;

    /* =====================================================
       NORMALIZE VALUES
    ===================================================== */

    const shippingName =
      normalizeValue(body.shipping_name);

    const shippingPhone =
      normalizeValue(body.shipping_phone);

    const shippingAddress =
      normalizeValue(body.shipping_address);

    const shippingCity =
      normalizeValue(body.shipping_city);

    const shippingPostalCode =
      normalizeValue(body.shipping_postal_code);

    const shippingCountry =
      normalizeValue(body.shipping_country);

    const customerNote =
      normalizeValue(body.customer_note);

    const requestedPreferredFulfillmentAt =
      normalizeValue(
        body.preferred_fulfillment_at,
      );

    const paymentMethodId =
      normalizeValue(body.payment_method);

    const porterStatus =
      normalizeValue(body.porter_status) ??
      normalizeValue(body.delivery_service_mode) ??
      "not_requested";

    const porterDetails =
      normalizeValue(body.porter_details);

    /* =====================================================
       VALIDATE SHIPPING INFORMATION
    ===================================================== */

    if (
      !shippingName ||
      !shippingPhone ||
      !shippingAddress ||
      !shippingCity ||
      !shippingPostalCode ||
      !shippingCountry
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete the shipping address.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       VALIDATE DELIVERY STATUS
    ===================================================== */

    if (
      !VALID_DELIVERY_STATUSES.includes(
        porterStatus as
          (typeof VALID_DELIVERY_STATUSES)[number],
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

    if (
      porterStatus === "requested" &&
      !porterDetails
    ) {
      return NextResponse.json(
        {
          error:
            "Please enter the delivery details when admin is booking the delivery service.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       SERVICE ROLE CLIENT
    ===================================================== */

    const supabase =
      createServiceRoleClient();

    /* =====================================================
       LOAD CURRENT ORDER
    ===================================================== */

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          order_number,

          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,

          customer_note,

          payment_method,
          payment_method_id,
          payment_method_snapshot,

          preferred_fulfillment_at,
          porter_status,
          porter_details,

          customer_change_unread,
          customer_change_at,
          customer_change_summary
        `,
      )
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Failed to load order for admin update:",
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
       FULFILLMENT DATE
       ===================================================== */

    /*
     * Validate the submitted date if one was supplied.
     */
    if (requestedPreferredFulfillmentAt) {
      const date = new Date(
        requestedPreferredFulfillmentAt,
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

    /*
     * IMPORTANT:
     *
     * If the existing DB date and submitted date represent
     * the same minute, keep the ORIGINAL database value.
     *
     * This prevents:
     *
     * 15:30:42 -> 15:30:00
     *
     * from being treated as an actual admin change.
     */
    const fulfillmentChanged =
      !fulfillmentValuesEqual(
        order.preferred_fulfillment_at,
        requestedPreferredFulfillmentAt,
      );

    const preferredFulfillmentAt =
      fulfillmentChanged
        ? requestedPreferredFulfillmentAt
        : order.preferred_fulfillment_at;

    /* =====================================================
       PAYMENT METHOD
    ===================================================== */

    let paymentMethodName =
      order.payment_method;

    let paymentMethodSnapshot =
      order.payment_method_snapshot;

    if (paymentMethodId) {
      const {
        data: paymentMethod,
        error: paymentMethodError,
      } = await supabase
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
        .eq("id", paymentMethodId)
        .maybeSingle();

      if (paymentMethodError) {
        console.error(
          "Failed to load selected payment method:",
          paymentMethodError,
        );

        return NextResponse.json(
          {
            error:
              paymentMethodError.message,
          },
          { status: 500 },
        );
      }

      if (!paymentMethod) {
        return NextResponse.json(
          {
            error:
              "The selected payment method could not be found.",
          },
          { status: 400 },
        );
      }

      paymentMethodName =
        paymentMethod.display_name;

      /*
       * Keep a fresh snapshot on the order.
       */
      paymentMethodSnapshot =
        paymentMethod;
    } else {
      paymentMethodName = null;
      paymentMethodSnapshot = null;
    }

    /* =====================================================
       BUILD OLD VALUES
    ===================================================== */

    const oldValues: Record<
      string,
      unknown
    > = {
      shipping_name:
        order.shipping_name,

      shipping_phone:
        order.shipping_phone,

      shipping_address:
        order.shipping_address,

      shipping_city:
        order.shipping_city,

      shipping_postal_code:
        order.shipping_postal_code,

      shipping_country:
        order.shipping_country,

      customer_note:
        order.customer_note,

      payment_method:
        order.payment_method,

      payment_method_id:
        order.payment_method_id,

      preferred_fulfillment_at:
        order.preferred_fulfillment_at,

      porter_status:
        order.porter_status,

      porter_details:
        order.porter_details,
    };

    /* =====================================================
       BUILD NEW VALUES
    ===================================================== */

    const newValues: Record<
      string,
      unknown
    > = {
      shipping_name:
        shippingName,

      shipping_phone:
        shippingPhone,

      shipping_address:
        shippingAddress,

      shipping_city:
        shippingCity,

      shipping_postal_code:
        shippingPostalCode,

      shipping_country:
        shippingCountry,

      customer_note:
        customerNote,

      payment_method:
        paymentMethodName,

      payment_method_id:
        paymentMethodId,

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
      unknown
    > = {};

    const newChangedValues: Record<
      string,
      unknown
    > = {};

    for (const field of Object.keys(newValues)) {
      const oldValue =
        oldValues[field] ?? null;

      const newValue =
        newValues[field] ?? null;

      /*
       * Fulfillment date gets special comparison because
       * datetime-local cannot preserve seconds/milliseconds.
       */
      const changed =
        field ===
        "preferred_fulfillment_at"
          ? !fulfillmentValuesEqual(
              oldValue,
              newValue,
            )
          : !valuesEqual(
              field,
              oldValue,
              newValue,
            );

      if (changed) {
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
    } = await supabase
      .from("orders")
      .update({
        shipping_name:
          shippingName,

        shipping_phone:
          shippingPhone,

        shipping_address:
          shippingAddress,

        shipping_city:
          shippingCity,

        shipping_postal_code:
          shippingPostalCode,

        shipping_country:
          shippingCountry,

        customer_note:
          customerNote,

        payment_method:
          paymentMethodName,

        payment_method_id:
          paymentMethodId,

        payment_method_snapshot:
          paymentMethodSnapshot,

        /*
         * If fulfillment did not really change, this is the
         * original DB timestamp.
         *
         * Therefore an unchanged fulfillment date is not
         * silently rewritten from seconds precision to
         * minute precision.
         */
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
        "Failed to update admin order:",
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
       PAYMENT HISTORY
    ===================================================== */

    if (
      !valuesEqual(
        "payment_method_id",
        order.payment_method_id,
        paymentMethodId,
      )
    ) {
      const {
        error: paymentHistoryError,
      } = await supabase
        .from("order_payment_history")
        .insert({
          order_id: order.id,

          payment_method_id:
            paymentMethodId,

          payment_method_name:
            paymentMethodName ??
            "Not specified",

          payment_details:
            paymentMethodSnapshot ?? {},

          event_type:
            "admin_payment_method_changed",

          changed_by:
            user.id,

          changed_by_type:
            "admin",
        });

      if (paymentHistoryError) {
        console.error(
          "Failed to create payment method history:",
          paymentHistoryError,
        );

        /*
         * The order itself has already been updated.
         * Do not report the main order update as failed.
         */
      }
    }

    /* =====================================================
       DELIVERY SERVICE HISTORY
    ===================================================== */

    if (
      !valuesEqual(
         "porter_status",
        order.porter_status,
        porterStatus,
      ) ||
      !valuesEqual(
         "porter_status",
        order.porter_details,
        porterDetails,
      )
    ) {
      const {
        error: porterHistoryError,
      } = await supabase
        .from("order_porter_history")
        .insert({
          order_id: order.id,

          porter_status:
            porterStatus,

          porter_details:
            porterDetails,

          changed_by:
            user.id,

          changed_by_type:
            "admin",
        });

      if (porterHistoryError) {
        console.error(
          "Failed to create delivery history:",
          porterHistoryError,
        );
      }
    }

    /* =====================================================
       CHANGE DESCRIPTION
    ===================================================== */

    const FIELD_LABELS: Record<
      string,
      string
    > = {
      shipping_name:
        "Shipping name",

      shipping_phone:
        "Shipping phone",

      shipping_address:
        "Shipping address",

      shipping_city:
        "Shipping city",

      shipping_postal_code:
        "Shipping postal code",

      shipping_country:
        "Shipping country",

      customer_note:
        "Customer note",

      payment_method:
        "Payment method",

      payment_method_id:
        "Payment method",

      preferred_fulfillment_at:
        "Preferred fulfillment",

      porter_status:
        "Delivery service status",

      porter_details:
        "Delivery service details",
    };

    const displayFields =
      changedFields.filter(
        (field) =>
          field !== "payment_method_id",
      );

    const changeLines =
      displayFields.map((field) => {
        const label =
          FIELD_LABELS[field] ?? field;

        const oldValue =
          formatValue(
            field,
            oldChangedValues[field] == null
              ? null
              : String(
                  oldChangedValues[field],
                ),
          );

        const newValue =
          formatValue(
            field,
            newChangedValues[field] == null
              ? null
              : String(
                  newChangedValues[field],
                ),
          );

        return `${label}: ${oldValue} → ${newValue}`;
      });

    const changeSummary =
      `Admin updated order ${order.order_number}:\n` +
      changeLines.join("\n");

    /* =====================================================
       SAVE ORDER CHANGE HISTORY
    ===================================================== */

    const {
      error: historyError,
    } = await supabase
      .from("order_change_history")
      .insert({
        order_id:
          order.id,

        change_type:
          "admin_order_update",

        changed_by:
          user.id,

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
        "Failed to create order change history:",
        historyError,
      );
    }

    /* =====================================================
       MARK CUSTOMER CHANGE
    ===================================================== */

    const {
      error: changeMarkerError,
    } = await supabase
      .from("orders")
      .update({
        customer_change_unread:
          true,

        customer_change_at:
          new Date().toISOString(),

        customer_change_summary:
          changeSummary,
      })
      .eq("id", order.id);

    if (changeMarkerError) {
      console.error(
        "Failed to mark customer order change:",
        changeMarkerError,
      );
    }

    /* =====================================================
       CUSTOMER NOTIFICATION
    ===================================================== */

    const {
      error: customerNotificationError,
    } = await supabase
      .from("notifications")
      .insert({
        user_id:
          order.user_id,

        type:
          "order_updated",

        title:
          "Order updated",

        message:
          `Your order ${order.order_number} ` +
          `has been updated by the shop.`,

        order_id:
          order.id,
      });

    if (customerNotificationError) {
      console.error(
        "Failed to create customer order notification:",
        customerNotificationError,
      );
    }

    /* =====================================================
       SUCCESS
    ===================================================== */

    return NextResponse.json({
      success: true,

      changed: true,

      changed_fields:
        changedFields,

      message:
        "Order updated successfully.",
    });
  } catch (error) {
    console.error(
      "Admin customer order update error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update order.",
      },
      { status: 500 },
    );
  }
}