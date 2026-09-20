import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

export async function POST(request: Request) {
 // const url = new URL(request.url);

  /* =========================================================
     REQUIRE ADMIN
     ========================================================= */

  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  /* =========================================================
     READ REQUEST
     ========================================================= */

  let body: {
    order_id?: string;
    start?: string;
    end?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  const orderId = body.order_id;
  const start = body.start;
  const end = body.end;

  if (!orderId) {
    return NextResponse.json(
      {
        error: "Missing order_id.",
      },
      {
        status: 400,
      },
    );
  }

  if (!start || !end) {
    return NextResponse.json(
      {
        error: "Start and end times are required.",
      },
      {
        status: 400,
      },
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return NextResponse.json(
      {
        error: "Invalid start or end time.",
      },
      {
        status: 400,
      },
    );
  }

  if (endDate <= startDate) {
    return NextResponse.json(
      {
        error: "End time must be later than start time.",
      },
      {
        status: 400,
      },
    );
  }

  /* =========================================================
     SERVICE ROLE CLIENT

     Used only on the server.
     ========================================================= */

  const supabase = createServiceRoleClient();

  /* =========================================================
     LOAD SAVED GOOGLE CALENDAR TOKEN
     ========================================================= */

  const { data: calendarToken, error: tokenError } =
    await supabase
      .from("google_calendar_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();

  if (tokenError) {
    console.error(
      "Failed to load Google Calendar token:",
      tokenError,
    );

    return NextResponse.json(
      {
        error: "Failed to access Google Calendar connection.",
      },
      {
        status: 500,
      },
    );
  }

  if (!calendarToken?.refresh_token) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not connected. Please connect it first.",
      },
      {
        status: 400,
      },
    );
  }

  /* =========================================================
     LOAD ORDER
     ========================================================= */

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      `
        id,
        order_number,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_country,
        customer_note,
        payment_method,
        payment_status,
        total,
        created_at
      `,
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    console.error(
      "Failed to load order for Google Calendar:",
      orderError,
    );

    return NextResponse.json(
      {
        error: "Order not found.",
      },
      {
        status: 404,
      },
    );
  }

  /* =========================================================
     LOAD ORDER ITEMS
     ========================================================= */

  const { data: orderItems, error: itemsError } =
    await supabase
      .from("order_items")
      .select(
        "product_name, quantity, unit_price, total_price",
      )
      .eq("order_id", order.id);

  if (itemsError) {
    console.error(
      "Failed to load order items:",
      itemsError,
    );

    return NextResponse.json(
      {
        error: "Failed to load order items.",
      },
      {
        status: 500,
      },
    );
  }

  /* =========================================================
     BUILD EVENT TITLE
     ========================================================= */

  const title = `Order ${order.order_number}`;

  /* =========================================================
     BUILD EVENT DESCRIPTION
     ========================================================= */

  // const itemLines =
  //   orderItems && orderItems.length > 0
  //     ? orderItems.map(
  //         (item) =>
  //           `• ${item.product_name} × ${item.quantity}`,
  //       )
  //     : [];

 const description = [
  "\n",
  `Order ${order.order_number}`,
  "\n",
  "CUSTOMER",
  `Name: ${order.shipping_name}`,
  `Phone: ${order.shipping_phone}`,  "\n",
  "DELIVERY ADDRESS",
  order.shipping_address,
  order.shipping_postal_code && order.shipping_city
    ? `${order.shipping_postal_code} ${order.shipping_city}`
    : order.shipping_city || "",
  order.shipping_country || "",
  "\n",
  "ITEMS",
  ...orderItems.map(
    (item) =>
      `• ${item.product_name} × ${item.quantity}`,
  ),
  "\n",
  "PAYMENT",
  `Method: ${order.payment_method}`,
  `Status: ${order.payment_status}`,
  `Total: CHF ${Number(order.total).toFixed(2)}`,
  "\n",
]
  .filter((line) => line !== "")
  .join("\n");

  /* =========================================================
     CREATE GOOGLE CALENDAR EVENT
     ========================================================= */

  try {
    const event = await createGoogleCalendarEvent({
      refreshToken: calendarToken.refresh_token,
      title,
      description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    //console.log(      "Google Calendar event created:",      event.id,    );

    return NextResponse.json({
      success: true,
      eventId: event.id,
      orderNumber: order.order_number,
    });
  } catch (error) {
    console.error(
      "Google Calendar event creation failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Google Calendar could not create the event. Your connection may need to be reconnected.",
      },
      {
        status: 500,
      },
    );
  }
}