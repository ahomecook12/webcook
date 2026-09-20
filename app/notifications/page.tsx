import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";

import AddToCalendarDialog from "@/components/notifications/add-to-calendar-dialog";
import { createClient } from "@/lib/supabase/server";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  order_id: string | null;
  product_id: string | null;
  read_at: string | null;
  created_at: string;
};

type OrderInfo = {
  id: string;
  order_number: string;
  created_at: string;
};

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  /* =========================================================
     LOAD NOTIFICATIONS
     ========================================================= */

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      "id, type, title, message, order_id, product_id, read_at, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "Failed to load notifications:",
      error,
    );
  }

  const items = (notifications ?? []) as Notification[];

  /* =========================================================
     CHECK ACTUAL ADMIN ROLE
     ========================================================= */

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

  if (profileError) {
    console.error(
      "Failed to load user profile:",
      profileError,
    );
  }

  const isAdmin = profile?.role === "admin";

  /* =========================================================
     LOAD ORDER CREATION TIMES

     Only needed for admin new-order notifications.
     ========================================================= */

  const calendarOrderIds = isAdmin
    ? Array.from(
        new Set(
          items
            .filter(
              (notification) =>
                notification.type === "admin_order_placed" &&
                notification.order_id,
            )
            .map(
              (notification) =>
                notification.order_id as string,
            ),
        ),
      )
    : [];

  let ordersById = new Map<string, OrderInfo>();

  if (calendarOrderIds.length > 0) {
    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select("id, order_number, created_at")
        .in("id", calendarOrderIds);

    if (ordersError) {
      console.error(
        "Failed to load order creation times:",
        ordersError,
      );
    } else {
      ordersById = new Map(
        (orders ?? []).map((order) => [
          order.id,
          order as OrderInfo,
        ]),
      );
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-24">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />

          <h1 className="text-2xl font-semibold">
            Notifications
          </h1>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          View all your notifications.
        </p>
      </div>

      {/* =====================================================
          EMPTY STATE
          ===================================================== */}

      {items.length === 0 ? (
        <div className="rounded-lg border bg-background px-6 py-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />

          <p className="mt-3 text-sm text-muted-foreground">
            No notifications yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notification) => {
            const isAdminNotification =
              notification.type.startsWith("admin_");

            const orderHref = notification.order_id
              ? isAdminNotification
                ? `/admin/orders/${notification.order_id}`
                : `/orders/${notification.order_id}`
              : null;

            const isNewOrderNotification =
              notification.type === "admin_order_placed";

            const calendarOrder = notification.order_id
              ? ordersById.get(notification.order_id)
              : undefined;

            return (
              <div
                key={notification.id}
                className={`rounded-lg border bg-background p-4 ${
                  !notification.read_at
                    ? "border-primary/30 bg-muted/30"
                    : ""
                }`}
              >
                {/* =================================================
                    NOTIFICATION CONTENT
                    ================================================= */}

                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* TITLE */}

                    <div className="flex items-start justify-between gap-3">
                      <h2
                        className={`text-sm ${
                          !notification.read_at
                            ? "font-semibold"
                            : "font-medium"
                        }`}
                      >
                        {notification.title}
                      </h2>

                      {!notification.read_at && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* MESSAGE */}

                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    {/* DATE */}

                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(
                        notification.created_at,
                      ).toLocaleString("en-CH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>

                    {/* =================================================
                        ORDER LINK
                        ================================================= */}

                    {orderHref && (
                      <div className="mt-3">
                        <Link
                          href={orderHref}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          View order
                        </Link>
                      </div>
                    )}

                    {/* =================================================
                        GOOGLE CALENDAR
                        ================================================= */}

                    {isAdmin &&
                      isNewOrderNotification &&
                      notification.order_id &&
                      calendarOrder && (
                        <div className="mt-4 border-t pt-4">
                          <AddToCalendarDialog
                            orderId={notification.order_id}
                            orderNumber={
                              calendarOrder.order_number
                            }
                            orderCreatedAt={
                              calendarOrder.created_at
                            }
                          />

                          <p className="mt-1 text-xs text-muted-foreground">
                            The order creation time is suggested
                            automatically. You can change the date
                            or time before adding it.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================
          BACK TO HOME
          ===================================================== */}

      <div className="mt-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Back to shop
        </Link>
      </div>
    </main>
  );
}