import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushNotification } from "@/lib/notifications/sendPushNotification";

/* =========================================================
   EXPO PUSH NOTIFICATION
   ========================================================= */

async function sendExpoPushNotification({
  token,
  title,
  body,
  data = {},
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title,
          body,
          data,
          channelId: "default",
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "❌ Expo push notification failed:",
        result,
      );

      return null;
    }

    return result;
  } catch (error) {
    console.error(
      "❌ Expo push notification error:",
      error,
    );

    return null;
  }
}

/* =========================================================
   SEND NOTIFICATION TO ALL ADMIN DEVICES
   ========================================================= */

export async function sendAdminOrderNotification({
  orderId,
  title,
  body,
}: {
  orderId: string;
  title: string;
  body: string;
}) {
  try {
    const serviceSupabase =
      createServiceRoleClient();

    /* =====================================================
       Find all admins
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
        "Failed to find admins for push notification:",
        adminsError,
      );

      return;
    }

    if (!admins || admins.length === 0) {
      return;
    }

    const adminIds = admins.map(
      (admin) => admin.id,
    );

    /* =====================================================
       Get all admin push tokens
       ===================================================== */

    const {
      data: pushTokens,
      error: pushTokensError,
    } = await serviceSupabase
      .from("push_tokens")
      .select(
        `
          user_id,
          expo_push_token,
          web_push_token,
          platform
        `,
      )
      .in("user_id", adminIds);

    if (pushTokensError) {
      console.error(
        "Failed to find admin push tokens:",
        pushTokensError,
      );

      return;
    }

    if (!pushTokens || pushTokens.length === 0) {
      return;
    }

    /* =====================================================
       Push data
       ===================================================== */

    const pushData = {
      type: "admin_order_update",
      order_id: orderId,
    };

    /* =====================================================
       Send to every admin device
       ===================================================== */

    const pushPromises = pushTokens.map(
      async (pushToken) => {
        /* ===============================================
           Android / Expo
           =============================================== */

        if (pushToken.expo_push_token) {
          await sendExpoPushNotification({
            token:
              pushToken.expo_push_token,

            title,

            body,

            data: pushData,
          });
        }

        /* ===============================================
           Web / Firebase
           =============================================== */

        if (pushToken.web_push_token) {
          await sendPushNotification({
            token:
              pushToken.web_push_token,

            title,

            body,

            data: pushData,
          });
        }
      },
    );

    const results =
      await Promise.allSettled(
        pushPromises,
      );

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error(
          "Admin push notification failed:",
          result.reason,
        );
      }
    });
  } catch (error) {
    /*
     * Push notifications are secondary.
     * Never make an order update fail because
     * a push notification failed.
     */
    console.error(
      "Admin order push notification error:",
      error,
    );
  }
}
