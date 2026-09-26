import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendAdminOrderNotification } from "@/lib/notifications/sendAdminOrderNotification";
import { STORE_LOCALE } from "@/app/constants";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

const EDITABLE_STATUSES = ["pending_payment", "processing"] as const;

const FIELD_LABELS: Record<string, string> = {
  shipping_name: "Name",
  shipping_phone: "Phone",
  shipping_address: "Address",
  shipping_city: "City",
  shipping_postal_code: "Postal code",
  shipping_country: "Country",
  customer_note: "Customer note",
  payment_method: "Payment method",
  preferred_fulfillment_at: "Preferred fulfillment time",
  porter_status: "Delivery service",
  porter_details: "Delivery service details",
};

function normalizeValue(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const stringValue = String(value).trim();

  return stringValue === "" ? null : stringValue;
}

function formatValue(field: string, value: string | null): string {
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
    switch (value) {
      case "not_requested":
        return "Not requested";

      case "requested":
        return "Admin will book";

      case "booked":
        return "Customer will book";

      case "completed":
        return "Completed";

      case "cancelled":
        return "Cancelled";

      default:
        return value;
    }
  }

  return value;
}

function valuesAreEqual(
  field: string,
  oldValue: string | null,
  newValue: string | null,
): boolean {
  if (oldValue === newValue) {
    return true;
  }

  if (field === "preferred_fulfillment_at") {
    if (!oldValue || !newValue) {
      return oldValue === newValue;
    }

    const oldTime = new Date(oldValue).getTime();
    const newTime = new Date(newValue).getTime();

    if (!Number.isNaN(oldTime) && !Number.isNaN(newTime)) {
      return oldTime === newTime;
    }
  }

  return false;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");

    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    const supabase = await createClient(accessToken);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in to update this order.",
        },
        { status: 401 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(
        `
          id,
          user_id,
          order_number,
          status,
          payment_method,
          payment_method_id,
          payment_method_snapshot,
          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,
          customer_note,
          preferred_fulfillment_at,
          customer_change_unread,
          customer_change_at,
          customer_change_summary,
          porter_status,
          porter_details
        `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (
      !EDITABLE_STATUSES.includes(
        order.status as (typeof EDITABLE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          error: "This order can no longer be changed.",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const serviceSupabase = createServiceRoleClient();

    /*
     * Save All sends:
     *
     * {
     *   ...pendingDraft,
     *   finalize_notification: true,
     *   pending_draft: pendingDraft
     * }
     *
     * Therefore pending_draft is the authoritative payload.
     */
    const draftPayload =
      body.pending_draft && typeof body.pending_draft === "object"
        ? body.pending_draft
        : body;

    /*
     * =========================================================
     * DISCARD
     * =========================================================
     */

    if (body.discard_pending_changes === true) {
      const snapshot = body.revert_to_snapshot;

      if (!snapshot || typeof snapshot !== "object") {
        return NextResponse.json(
          {
            error: "No pending order snapshot is available to discard.",
          },
          { status: 400 },
        );
      }

      const revertData: Record<string, unknown> = {
        shipping_name: snapshot.shipping_name ?? null,
        shipping_phone: snapshot.shipping_phone ?? null,
        shipping_address: snapshot.shipping_address ?? null,
        shipping_city: snapshot.shipping_city ?? null,
        shipping_postal_code: snapshot.shipping_postal_code ?? null,
        shipping_country: snapshot.shipping_country ?? null,
        customer_note: snapshot.customer_note ?? null,
        preferred_fulfillment_at: snapshot.preferred_fulfillment_at ?? null,
        payment_method: snapshot.payment_method ?? null,
        payment_method_id: snapshot.payment_method ?? null,
        payment_method_snapshot: snapshot.payment_method_snapshot ?? null,
        porter_status: snapshot.porter_status ?? null,
        porter_details: snapshot.porter_details ?? null,
        updated_at: new Date().toISOString(),
      };

      const { error: revertError } = await supabase
        .from("orders")
        .update(revertData)
        .eq("id", order.id)
        .eq("user_id", user.id);

      if (revertError) {
        return NextResponse.json(
          { error: revertError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        discarded: true,
        message: "Your pending changes were discarded.",
      });
    }

    /*
     * =========================================================
     * DETECT UPDATES
     * =========================================================
     */

    const notifyAdmin =
      body.notify_admin === true || body.finalize_notification === true;

    const hasShippingUpdate = [
      "shipping_name",
      "shipping_phone",
      "shipping_address",
      "shipping_city",
      "shipping_postal_code",
      "shipping_country",
    ].some((field) =>
      Object.prototype.hasOwnProperty.call(draftPayload, field),
    );

    const hasDeliveryUpdate = [
      "delivery_service_mode",
      "delivery_service_requested",
      "delivery_service_details",
      "porter_status",
      "porter_details",
    ].some((field) =>
      Object.prototype.hasOwnProperty.call(draftPayload, field),
    );

    const hasPaymentUpdate = Object.prototype.hasOwnProperty.call(
      draftPayload,
      "payment_method",
    );

    const hasFulfillmentUpdate = Object.prototype.hasOwnProperty.call(
      draftPayload,
      "preferred_fulfillment_at",
    );

    const hasNoteUpdate = Object.prototype.hasOwnProperty.call(
      draftPayload,
      "customer_note",
    );

    /*
     * =========================================================
     * DELIVERY
     *
     * delivery_service_mode is now authoritative.
     * =========================================================
     */

    let newPorterStatus = order.porter_status;

    let newPorterDetails = order.porter_details;

    if (hasDeliveryUpdate) {
      let mode: "booked" | "requested" | null = null;

      if (draftPayload.delivery_service_mode === "requested") {
        mode = "requested";
      } else if (draftPayload.delivery_service_mode === "booked") {
        mode = "booked";
      } else if (draftPayload.porter_status === "requested") {
        mode = "requested";
      } else if (draftPayload.porter_status === "booked") {
        mode = "booked";
      }

      if (mode === "requested") {
        /*
         * Admin will book the delivery.
         *
         * No customer delivery details are required.
         */
        newPorterStatus = "requested";
        newPorterDetails = null;
      } else if (mode === "booked") {
        /*
         * Customer books the delivery.
         *
         * Details are required.
         */
        const details = normalizeValue(
          draftPayload.delivery_service_details ?? draftPayload.porter_details,
        );

        if (!details) {
          return NextResponse.json(
            {
              error:
                "Please enter the delivery details for the delivery service you will book.",
            },
            { status: 400 },
          );
        }

        newPorterStatus = "booked";
        newPorterDetails = details;
      }
    }

    /*
     * =========================================================
     * PAYMENT
     * =========================================================
     */

    const currentPaymentMethodId =
      order.payment_method_id ?? order.payment_method ?? null;

    const selectedPaymentMethodId = hasPaymentUpdate
      ? normalizeValue(draftPayload.payment_method)
      : currentPaymentMethodId;

    /*
     * =========================================================
     * NEW VALUES
     * =========================================================
     */

    const newValues = {
      shipping_name: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_name)
        : order.shipping_name,

      shipping_phone: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_phone)
        : order.shipping_phone,

      shipping_address: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_address)
        : order.shipping_address,

      shipping_city: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_city)
        : order.shipping_city,

      shipping_postal_code: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_postal_code)
        : order.shipping_postal_code,

      shipping_country: hasShippingUpdate
        ? normalizeValue(draftPayload.shipping_country)
        : order.shipping_country,

      customer_note: hasNoteUpdate
        ? normalizeValue(draftPayload.customer_note)
        : order.customer_note,

      payment_method: selectedPaymentMethodId,

      preferred_fulfillment_at: hasFulfillmentUpdate
        ? normalizeValue(draftPayload.preferred_fulfillment_at)
        : order.preferred_fulfillment_at,

      porter_status: newPorterStatus,

      porter_details: newPorterDetails,
    };

    /*
     * =========================================================
     * SHIPPING VALIDATION
     *
     * Only validate shipping if shipping was actually edited.
     * =========================================================
     */

    if (
      hasShippingUpdate &&
      (!newValues.shipping_name ||
        !newValues.shipping_phone ||
        !newValues.shipping_address ||
        !newValues.shipping_city ||
        !newValues.shipping_postal_code ||
        !newValues.shipping_country)
    ) {
      return NextResponse.json(
        {
          error: "Please complete all shipping address fields.",
        },
        { status: 400 },
      );
    }

    /*
     * =========================================================
     * PAYMENT SNAPSHOT
     * =========================================================
     */

    let paymentMethodSnapshot: {
      id: string;
      method_type: string | null;
      display_name: string;
      account_name: string | null;
      phone_number: string | null;
      payment_url: string | null;
      instructions: string | null;
      qr_code_url: string | null;
    } | null = null;

    const paymentMethodChanged =
      hasPaymentUpdate &&
      selectedPaymentMethodId !== null &&
      selectedPaymentMethodId !== currentPaymentMethodId;

    if (paymentMethodChanged) {
      const { data: selectedMethod, error: selectedMethodError } =
        await serviceSupabase
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
          .eq("id", selectedPaymentMethodId)
          .eq("enabled", true)
          .maybeSingle();

      if (selectedMethodError) {
        throw selectedMethodError;
      }

      if (!selectedMethod) {
        return NextResponse.json(
          {
            error: "The selected payment method is currently unavailable.",
          },
          { status: 400 },
        );
      }

      paymentMethodSnapshot = {
        id: selectedMethod.id,
        method_type: selectedMethod.method_type ?? null,
        display_name: selectedMethod.display_name,
        account_name: selectedMethod.account_name ?? null,
        phone_number: selectedMethod.phone_number ?? null,
        payment_url: selectedMethod.payment_url ?? null,
        instructions: selectedMethod.instructions ?? null,
        qr_code_url: selectedMethod.qr_code_url ?? null,
      };
    }

    /*
     * =========================================================
     * OLD VALUES
     * =========================================================
     */

    const oldValues: Record<string, string | null> = {
      shipping_name: order.shipping_name,
      shipping_phone: order.shipping_phone,
      shipping_address: order.shipping_address,
      shipping_city: order.shipping_city,
      shipping_postal_code: order.shipping_postal_code,
      shipping_country: order.shipping_country,
      customer_note: order.customer_note,
      payment_method: currentPaymentMethodId,
      preferred_fulfillment_at: order.preferred_fulfillment_at,
      porter_status: order.porter_status,
      porter_details: order.porter_details,
    };

    const changedFields: string[] = [];

    const oldChangedValues: Record<string, string | null> = {};

    const newChangedValues: Record<string, string | null> = {};

    for (const field of Object.keys(newValues)) {
      const oldValue = oldValues[field] ?? null;

      const newValue = newValues[field as keyof typeof newValues] ?? null;

      if (field === "payment_method") {
        const nextValue = paymentMethodChanged
          ? (paymentMethodSnapshot?.id ?? null)
          : currentPaymentMethodId;

        if (oldValue !== nextValue) {
          changedFields.push(field);
          oldChangedValues[field] = oldValue;
          newChangedValues[field] = nextValue;
        }

        continue;
      }

      if (!valuesAreEqual(field, oldValue, newValue)) {
        changedFields.push(field);
        oldChangedValues[field] = oldValue;
        newChangedValues[field] = newValue;
      }
    }

    /*
     * =========================================================
     * NOTHING CHANGED
     * =========================================================
     */

    if (changedFields.length === 0) {
      return NextResponse.json({
        success: true,
        changed: false,
        message: "No changes were made.",
      });
    }

    /*
     * =========================================================
     * UPDATE ORDER
     * =========================================================
     */

    const updateData: Record<string, unknown> = {
      shipping_name: newValues.shipping_name,

      shipping_phone: newValues.shipping_phone,

      shipping_address: newValues.shipping_address,

      shipping_city: newValues.shipping_city,

      shipping_postal_code: newValues.shipping_postal_code,

      shipping_country: newValues.shipping_country,

      customer_note: newValues.customer_note,

      preferred_fulfillment_at: newValues.preferred_fulfillment_at,

      porter_status: newValues.porter_status,

      porter_details: newValues.porter_details,

      updated_at: new Date().toISOString(),
    };

    if (paymentMethodChanged && paymentMethodSnapshot) {
      updateData.payment_method = paymentMethodSnapshot.id;

      updateData.payment_method_id = paymentMethodSnapshot.id;

      updateData.payment_method_snapshot = paymentMethodSnapshot;
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    /*
     * =========================================================
     * CHANGE SUMMARY
     * =========================================================
     */

    const changeLines = changedFields.map((field) => {
      const label = FIELD_LABELS[field] ?? field;

      if (field === "payment_method") {
        const oldPaymentLabel =
          oldChangedValues.payment_method &&
          oldChangedValues.payment_method !== ""
            ? (order.payment_method_snapshot?.display_name ??
              order.payment_method ??
              oldChangedValues.payment_method)
            : "Not specified";

        const newPaymentLabel =
          newChangedValues.payment_method &&
          newChangedValues.payment_method !== ""
            ? (paymentMethodSnapshot?.display_name ??
              newChangedValues.payment_method)
            : "Not specified";

        return `${label}: ${oldPaymentLabel} → ${newPaymentLabel}`;
      }

      const oldValue = formatValue(field, oldChangedValues[field]);

      const newValue = formatValue(field, newChangedValues[field]);

      return `${label}: ${oldValue} → ${newValue}`;
    });

    const changeSummary =
      `Customer updated order ${order.order_number}:\n` +
      changeLines.join("\n");

    /*
     * =========================================================
     * FINAL SAVE / NOTIFICATION
     * =========================================================
     */

    if (notifyAdmin) {
      /*
       * History
       */
      const { error: historyError } = await serviceSupabase
        .from("order_change_history")
        .insert({
          order_id: order.id,
          change_type: paymentMethodChanged
            ? "payment_and_delivery_details"
            : "customer_order_update",
          changed_by: user.id,
          changed_by_type: "customer",
          description: changeSummary,
          old_value: oldChangedValues,
          new_value: newChangedValues,
        });

      if (historyError) {
        console.error("Failed to create order change history:", historyError);
      }

      /*
       * Payment history
       */
      if (paymentMethodChanged && paymentMethodSnapshot) {
        const { error: paymentHistoryError } = await serviceSupabase
          .from("order_payment_history")
          .insert({
            order_id: order.id,
            payment_method_id: paymentMethodSnapshot.id,
            payment_method_name: paymentMethodSnapshot.display_name,
            payment_details: paymentMethodSnapshot,
            event_type: "payment_method_changed",
            changed_by: user.id,
            changed_by_type: "customer",
          });

        if (paymentHistoryError) {
          console.error(
            "Failed to create payment history:",
            paymentHistoryError,
          );
        }
      }

      /*
       * Mark order as having a customer change
       */
      const { error: changeMarkerError } = await serviceSupabase
        .from("orders")
        .update({
          customer_change_unread: true,
          customer_change_at: new Date().toISOString(),
          customer_change_summary: changeSummary,
        })
        .eq("id", order.id);

      if (changeMarkerError) {
        console.error("Failed to mark customer change:", changeMarkerError);

        return NextResponse.json(
          {
            error:
              "The order was changed, but we could not record the customer update for the admin.",
          },
          { status: 500 },
        );
      }

      /*
       * Customer notification
       */
      const { error: customerNotificationError } = await serviceSupabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "order_updated",
          title: "Order updated",
          message: `Your order ${order.order_number} has been updated successfully.`,
          order_id: order.id,
        });

      if (customerNotificationError) {
        console.error(
          "Failed to create customer update notification:",
          customerNotificationError,
        );
      }

      /*
       * Admin profiles
       */
      const { data: admins, error: adminsError } = await serviceSupabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

      if (adminsError) {
        console.error("Failed to find admin profiles:", adminsError);
      }

      /*
       * Admin Supabase notifications
       */
      if (admins && admins.length > 0) {
        const adminNotifications = admins.map((admin) => ({
          user_id: admin.id,
          type: "admin_customer_order_changed",
          title: `Customer updated order ${order.order_number}`,
          message: changeSummary,
          order_id: order.id,
        }));

        const { error: adminNotificationError } = await serviceSupabase
          .from("notifications")
          .insert(adminNotifications);

        if (adminNotificationError) {
          console.error(
            "Failed to create admin notification rows:",
            adminNotificationError,
          );
        } else {
          console.log(
            `Created ${adminNotifications.length} admin Supabase notification(s).`,
          );
        }
      }

      /*
       * Firebase / push notification
       *
       * Do not let a push-notification problem undo the
       * successful database update.
       */
      try {
        await sendAdminOrderNotification({
          orderId: order.id,
          title: `Customer updated order ${order.order_number}`,
          body: changeSummary,
        });

        console.log("Admin push notification sent successfully.");
      } catch (notificationError) {
        console.error("Admin push notification failed:", notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      changed: true,
      changed_fields: changedFields,
      message: "Your order has been updated successfully.",
    });
  } catch (error) {
    console.error("Customer order update error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update order.",
      },
      { status: 500 },
    );
  }
}
