import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

type RequestBody = {
  orderId?: string;
  start?: string;
  end?: string;
};

export async function POST(request: Request) {
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

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
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

  const orderId = body.orderId?.trim();
  const start = body.start?.trim();
  const end = body.end?.trim();

  if (!orderId || !start || !end) {
    return NextResponse.json(
      {
        error: "orderId, start and end are required.",
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
        error: "Invalid start or end date.",
      },
      {
        status: 400,
      },
    );
  }

  if (endDate <= startDate) {
    return NextResponse.json(
      {
        error: "End time must be after start time.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const supabase = createServiceRoleClient();

    /* =========================================================
       GET SAVED GOOGLE CALENDAR TOKEN
       ========================================================= */

    const { data: calendarToken, error: tokenError } =
      await supabase
        .from("google_calendar_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .single();

    if (tokenError || !calendarToken?.refresh_token) {
      console.error(
        "Google Calendar token not found:",
        tokenError,
      );

      return NextResponse.json(
        {
          error:
            "Google Calendar is not connected for this admin.",
        },
        {
          status: 400,
        },
      );
    }

    /* =========================================================
       GET ORDER
       ========================================================= */

    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select(
          `
            id,
            order_number,
            total_amount,
            customer_name,
            customer_email
          `,
        )
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
      console.error(
        "Failed to load order:",
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
       BUILD CALENDAR EVENT
       ========================================================= */

    const title = `LCC Order ${order.order_number}`;

    const description = [
      "New order from Lucky Charm Creation",
      "",
      `Order: ${order.order_number}`,
      `Customer: ${order.customer_name ?? "N/A"}`,
      `Email: ${order.customer_email ?? "N/A"}`,
      `Total: ${order.total_amount ?? "N/A"}`,
      "",
      `Order ID: ${order.id}`,
    ].join("\n");

    /* =========================================================
       CREATE GOOGLE CALENDAR EVENT
       ========================================================= */

    const event = await createGoogleCalendarEvent({
      refreshToken: calendarToken.refresh_token,
      title,
      description,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });

    return NextResponse.json({
      success: true,
      eventId: event.id ?? null,
      eventUrl: event.htmlLink ?? null,
    });
  } catch (error) {
    console.error(
      "Failed to create Google Calendar event:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to create Google Calendar event.",
      },
      {
        status: 500,
      },
    );
  }
}