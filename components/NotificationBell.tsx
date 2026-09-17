"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type NotificationBellProps = {
  userId: string;
};

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const supabase = createClient();

    async function loadNotifications() {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, type, title, message, order_id, product_id, read_at, created_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load notifications:", error);
        setLoaded(true);
        return;
      }

      const items = data ?? [];

      setNotifications(items);

      setUnreadCount(
        items.filter((notification) => !notification.read_at).length,
      );

      setLoaded(true);
    }

    void loadNotifications();

    function handleOrderCompleted() {
  void loadNotifications();
}

window.addEventListener(
  "order-completed",
  handleOrderCompleted,
);

    /* =========================================================
     REALTIME — Listen for new notifications
     ========================================================= */

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (cancelled) {
            return;
          }

          const newNotification = payload.new as Notification;

          setNotifications((current) => {
            /* Prevent duplicates */
            if (
              current.some(
                (notification) => notification.id === newNotification.id,
              )
            ) {
              return current;
            }

            return [newNotification, ...current].slice(0, 10);
          });

          setUnreadCount((count) => count + 1);
        },
      )
      .subscribe((status) => {
        console.log("Notification realtime status:", status);
      });

    return () => {
      cancelled = true;
window.removeEventListener(
  "order-completed",
  handleOrderCompleted,
);
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAsRead(notification: Notification) {
    if (notification.read_at) {
      return;
    }

    const readAt = new Date().toISOString();

    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: readAt,
      })
      .eq("id", notification.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? {
              ...item,
              read_at: readAt,
            }
          : item,
      ),
    );

    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllAsRead() {
    const readAt = new Date().toISOString();

    const supabase = createClient();

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: readAt,
      })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("Failed to mark notifications as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        read_at: notification.read_at ?? readAt,
      })),
    );

    setUnreadCount(0);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={`${buttonVariants({
              variant: "ghost",
              size: "sm",
            })} relative`}
            aria-label={
              unreadCount > 0
                ? `${unreadCount} unread notifications`
                : "Notifications"
            }
          >
            <Bell className="h-4 w-4" />

            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        }
      />

      <DropdownMenuContent align="end" className="w-80 bg-background">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <p className="font-semibold">Notifications</p>

            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all as read
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {!loaded ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <Bell className="mx-auto h-5 w-5 text-muted-foreground" />

            <p className="mt-2 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <div className="w-full">
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-sm ${
                      !notification.read_at ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {notification.title}
                  </p>

                  {!notification.read_at && (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {notification.message}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString(
                    "en-CH",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
            );

            if (notification.order_id) {
              const isAdminNotification =
                notification.type.startsWith("admin_");

              const orderHref = isAdminNotification
                ? `/admin/orders/${notification.order_id}`
                : `/orders/${notification.order_id}`;

              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`w-full cursor-pointer p-0 ${
                    !notification.read_at ? "bg-muted/40" : ""
                  }`}
                  render={
                    <Link
                      href={orderHref}
                      onClick={() => markAsRead(notification)}
                    />
                  }
                >
                  <div className="w-full px-3 py-3">{content}</div>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={notification.id}
                className={`w-full cursor-pointer p-0 ${
                  !notification.read_at ? "bg-muted/40" : ""
                }`}
                onClick={() => void markAsRead(notification)}
              >
                <div className="w-full px-3 py-3">{content}</div>
              </DropdownMenuItem>
            );
          })
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />

            <div className="px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Check className="h-3 w-3" />
                Showing latest 10
              </div>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
