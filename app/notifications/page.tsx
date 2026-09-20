import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, CalendarPlus } from "lucide-react";
import AddToCalendarDialog from "@/components/notifications/add-to-calendar-dialog";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

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
    console.error("Failed to load notifications:", error);
  }

  const items = (notifications ?? []) as Notification[];

  /* =========================================================
     CHECK ACTUAL ADMIN ROLE
     ========================================================= */

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("Failed to load user profile:", profileError);
  }

  const isAdmin = profile?.role === "admin";

  /* =========================================================
     CHECK GOOGLE CALENDAR CONNECTION
     
     google_calendar_tokens has RLS that intentionally prevents
     normal users from reading the refresh token.

     Therefore we use the service-role client on the server
     only to check whether a token row exists for this user.
     We NEVER send the refresh token to the browser.
     ========================================================= */

  let calendarConnected = false;

  if (isAdmin) {
    const serviceSupabase = createServiceRoleClient();

    const { data: calendarToken, error: calendarError } = await serviceSupabase
      .from("google_calendar_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (calendarError) {
      console.error(
        "Failed to check Google Calendar connection:",
        calendarError,
      );
    } else {
      calendarConnected = !!calendarToken;
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

          <h1 className="text-2xl font-semibold">Notifications</h1>
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
            const isAdminNotification = notification.type.startsWith("admin_");

            const orderHref = notification.order_id
              ? isAdminNotification
                ? `/admin/orders/${notification.order_id}`
                : `/orders/${notification.order_id}`
              : null;

            const isNewOrderNotification =
              notification.type === "admin_order_placed";

            return (
              <div
                key={notification.id}
                className={`rounded-lg border bg-background p-4 ${
                  !notification.read_at ? "border-primary/30 bg-muted/30" : ""
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
                    {/* =================================================
                        TITLE
                        ================================================= */}

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

                    {/* =================================================
                        MESSAGE
                        ================================================= */}

                    <p className="mt-1 text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    {/* =================================================
                        DATE
                        ================================================= */}

                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString(
                        "en-CH",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>

                    {/* =================================================
                        ORDER LINK

                        ONLY THIS LINK OPENS THE ORDER.
                        The notification card itself is NOT clickable.
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

                        Only admin + new-order notifications get
                        calendar functionality.
                        ================================================= */}

                    {isAdmin &&
                      isNewOrderNotification &&
                      notification.order_id && (
                        <div className="mt-4 border-t pt-4">
                          <AddToCalendarDialog
                            orderId={notification.order_id}
                            orderNumber={
                              notification.message.match(
                                /order ([A-Za-z0-9-]+)/,
                              )?.[1] ?? "Unknown"
                            }
                          />

                          <p className="mt-1 text-xs text-muted-foreground">
                            Choose when you want this order added to your Google
                            Calendar.
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
