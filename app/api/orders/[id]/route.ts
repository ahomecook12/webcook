import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendAdminOrderNotification } from "@/lib/notifications/sendAdminOrderNotification";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

type PaymentMethodSnapshot = {
  id: string;
  method_type: string;
  display_name: string;
  account_name: string | null;
  phone_number: string | null;
  payment_url: string | null;
  instructions: string | null;
  qr_code_url: string | null;
};

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(
  request: Request,
  { params }: RouteProps,
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get("authorization");

    const accessToken =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    const supabase = await createClient(accessToken);

    /* =====================================================
       REQUIRE LOGGED-IN CUSTOMER
       ===================================================== */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in.",
        },
        { status: 401 },
      );
    }

    /* =====================================================
       READ REQUEST
       ===================================================== */

    const body = await request.json();

    const {
      full_name,
      phone,
      address,
      city,
      postal_code,
      country,
      customer_note,
      payment_method,
    } = body;

    /* =====================================================
       GET EXISTING ORDER
       ===================================================== */

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabase
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
          payment_status,
          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_city,
          shipping_postal_code,
          shipping_country,
          customer_note,
          customer_change_unread,
          customer_change_at,
          customer_change_summary
        `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingOrderError) {
      throw existingOrderError;
    }

    if (!existingOrder) {
      return NextResponse.json(
        {
          error: "Order not found.",
        },
        { status: 404 },
      );
    }

    /* =====================================================
       VALIDATE DELIVERY DETAILS
       ===================================================== */

    const newName = normalize(full_name);
    const newPhone = normalize(phone);
    const newAddress = normalize(address);
    const newCity = normalize(city);
    const newPostalCode = normalize(postal_code);
    const newCountry = normalize(country);

    if (
      !newName ||
      !newPhone ||
      !newAddress ||
      !newCity ||
      !newPostalCode ||
      !newCountry
    ) {
      return NextResponse.json(
        {
          error: "Please complete your delivery details.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       CUSTOMER CHANGE SUMMARY
       ===================================================== */

    const changes: string[] = [];

    const oldShippingName =
      existingOrder.shipping_name ?? "";

    const oldShippingPhone =
      existingOrder.shipping_phone ?? "";

    const oldShippingAddress =
      existingOrder.shipping_address ?? "";

    const oldShippingCity =
      existingOrder.shipping_city ?? "";

    const oldShippingPostalCode =
      existingOrder.shipping_postal_code ?? "";

    const oldShippingCountry =
      existingOrder.shipping_country ?? "";

    const oldCustomerNote =
      existingOrder.customer_note ?? "";

    if (oldShippingName !== newName) {
      changes.push(
        `Name changed:\nOld: ${oldShippingName || "(empty)"}\nNew: ${newName}`,
      );
    }

    if (oldShippingPhone !== newPhone) {
      changes.push(
        `Phone changed:\nOld: ${oldShippingPhone || "(empty)"}\nNew: ${newPhone}`,
      );
    }

    if (oldShippingAddress !== newAddress) {
      changes.push(
        `Delivery address changed:\nOld: ${oldShippingAddress || "(empty)"}\nNew: ${newAddress}`,
      );
    }

    if (oldShippingCity !== newCity) {
      changes.push(
        `City changed:\nOld: ${oldShippingCity || "(empty)"}\nNew: ${newCity}`,
      );
    }

    if (oldShippingPostalCode !== newPostalCode) {
      changes.push(
        `Postal code changed:\nOld: ${oldShippingPostalCode || "(empty)"}\nNew: ${newPostalCode}`,
      );
    }

    if (oldShippingCountry !== newCountry) {
      changes.push(
        `Country changed:\nOld: ${oldShippingCountry || "(empty)"}\nNew: ${newCountry}`,
      );
    }

    const newCustomerNote =
      customer_note === undefined
        ? oldCustomerNote
        : normalize(customer_note);

    if (oldCustomerNote !== newCustomerNote) {
      changes.push(
        `Customer note changed:\nOld: ${oldCustomerNote || "(empty)"}\nNew: ${newCustomerNote || "(empty)"}`,
      );
    }

    /* =====================================================
       PAYMENT METHOD CHANGE
       ===================================================== */

    let selectedPaymentMethod:
      | PaymentMethodSnapshot
      | null = null;

    let paymentMethodChanged = false;

    if (
      payment_method !== undefined &&
      payment_method !== null &&
      normalize(payment_method)
    ) {
      const newPaymentMethodId =
        normalize(payment_method);

      if (
        newPaymentMethodId !==
        existingOrder.payment_method_id
      ) {
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
              enabled,
              account_name,
              phone_number,
              payment_url,
              instructions,
              qr_code_url
            `,
          )
          .eq("id", newPaymentMethodId)
          .eq("enabled", true)
          .maybeSingle();

        if (paymentMethodError) {
          throw paymentMethodError;
        }

        if (!paymentMethod) {
          return NextResponse.json(
            {
              error:
                "The selected payment method is currently unavailable.",
            },
            { status: 400 },
          );
        }

        selectedPaymentMethod = {
          id: paymentMethod.id,
          method_type: paymentMethod.method_type,
          display_name: paymentMethod.display_name,
          account_name: paymentMethod.account_name,
          phone_number: paymentMethod.phone_number,
          payment_url: paymentMethod.payment_url,
          instructions: paymentMethod.instructions,
          qr_code_url: paymentMethod.qr_code_url,
        };

        const oldSnapshot =
          existingOrder.payment_method_snapshot as
            | {
                display_name?: string;
              }
            | null;

        const oldPaymentName =
          oldSnapshot?.display_name ??
          existingOrder.payment_method ??
          "Previous payment method";

        changes.push(
          `Payment method changed:\nOld: ${oldPaymentName}\nNew: ${selectedPaymentMethod.display_name}`,
        );

        paymentMethodChanged = true;
      }
    }

    /* =====================================================
       NOTHING CHANGED
       ===================================================== */

    if (changes.length === 0) {
      return NextResponse.json({
        success: true,
        changed: false,
        message: "No changes were made.",
      });
    }

    /* =====================================================
       BUILD ORDER UPDATE
       ===================================================== */

    const updateData: Record<string, unknown> = {
      shipping_name: newName,
      shipping_phone: newPhone,
      shipping_address: newAddress,
      shipping_city: newCity,
      shipping_postal_code: newPostalCode,
      shipping_country: newCountry,
      customer_note: newCustomerNote,
      customer_change_unread: true,
      customer_change_at: new Date().toISOString(),
      customer_change_summary: changes.join("\n\n"),
      updated_at: new Date().toISOString(),
    };

    if (paymentMethodChanged && selectedPaymentMethod) {
      updateData.payment_method =
        selectedPaymentMethod.id;

      updateData.payment_method_id =
        selectedPaymentMethod.id;

      updateData.payment_method_snapshot =
        selectedPaymentMethod;
    }

    /* =====================================================
       UPDATE ORDER
       ===================================================== */

    const {
      error: updateError,
    } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) {
      throw updateError;
    }

    /* =====================================================
       SERVICE ROLE FOR HISTORY + ADMIN NOTIFICATIONS
       ===================================================== */

    const serviceSupabase =
      createServiceRoleClient();

    /* =====================================================
       ORDER CHANGE HISTORY
       ===================================================== */

    const { error: changeHistoryError } =
      await serviceSupabase
        .from("order_change_history")
        .insert({
          order_id: existingOrder.id,
          change_type: paymentMethodChanged
            ? "payment_and_delivery_details"
            : "delivery_details",
          changed_by: user.id,
          changed_by_type: "customer",
          description:
            changes.join("\n\n"),
          old_value: {
            shipping_name:
              existingOrder.shipping_name,
            shipping_phone:
              existingOrder.shipping_phone,
            shipping_address:
              existingOrder.shipping_address,
            shipping_city:
              existingOrder.shipping_city,
            shipping_postal_code:
              existingOrder.shipping_postal_code,
            shipping_country:
              existingOrder.shipping_country,
            customer_note:
              existingOrder.customer_note,
            payment_method:
              existingOrder.payment_method,
            payment_method_id:
              existingOrder.payment_method_id,
          },
          new_value: {
            shipping_name: newName,
            shipping_phone: newPhone,
            shipping_address: newAddress,
            shipping_city: newCity,
            shipping_postal_code:
              newPostalCode,
            shipping_country:
              newCountry,
            customer_note:
              newCustomerNote,
            payment_method:
              paymentMethodChanged
                ? selectedPaymentMethod?.id
                : existingOrder.payment_method,
            payment_method_id:
              paymentMethodChanged
                ? selectedPaymentMethod?.id
                : existingOrder.payment_method_id,
          },
        });

    if (changeHistoryError) {
      console.error(
        "Failed to create order change history:",
        changeHistoryError,
      );
    }

    /* =====================================================
       PAYMENT HISTORY
       ===================================================== */

    if (
      paymentMethodChanged &&
      selectedPaymentMethod
    ) {
      const {
        error: paymentHistoryError,
      } = await serviceSupabase
        .from("order_payment_history")
        .insert({
          order_id: existingOrder.id,
          payment_method_id:
            selectedPaymentMethod.id,
          payment_method_name:
            selectedPaymentMethod.display_name,
          payment_details:
            selectedPaymentMethod,
          event_type:
            "payment_method_changed",
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

    /* =====================================================
       ADMIN DATABASE NOTIFICATIONS
       ===================================================== */

    const {
      data: admins,
      error: adminsError,
    } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminsError) {
      console.error(
        "Failed to find admins:",
        adminsError,
      );
    } else if (admins?.length) {
      const adminNotifications =
        admins.map((admin) => ({
          user_id: admin.id,
          type: "customer_order_changed",
          title: "Customer changed an order",
          message:
            `Order ${existingOrder.order_number} was changed by the customer.\n\n` +
            changes.join("\n\n"),
          order_id: existingOrder.id,
        }));

      const {
        error: notificationError,
      } = await serviceSupabase
        .from("notifications")
        .insert(adminNotifications);

      if (notificationError) {
        console.error(
          "Failed to create admin notifications:",
          notificationError,
        );
      }
    }

    /* =====================================================
       ADMIN PUSH NOTIFICATION
       ===================================================== */

    await sendAdminOrderNotification({
      orderId: existingOrder.id,

      title: "Customer changed an order",

      body:
        `Order ${existingOrder.order_number} was changed by the customer.\n\n` +
        changes.join("\n\n"),
    });

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json({
      success: true,
      changed: true,
      order_id: existingOrder.id,
      order_number: existingOrder.order_number,
      changes,
    });
  } catch (error) {
    console.error(
      "Customer order update error:",
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