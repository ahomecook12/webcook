"use client";

import {
  getMessaging,
  getToken,
  isSupported,
   onMessage,
} from "firebase/messaging";

import { firebaseApp } from "@/lib/firebase";
import { createClient } from "@/lib/supabase/client";
import { SHOP_NAME } from "@/app/constants";

export async function registerWebPushNotifications(
  navigateToAdminOrders?: () => void,
) {
  try {
    /*
     * ---------------------------------------------------------
     * Check browser support
     * ---------------------------------------------------------
     */

    const supported = await isSupported();

    if (!supported) {
      

      return null;
    }

    /*
     * ---------------------------------------------------------
     * Request notification permission
     * ---------------------------------------------------------
     */

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      

      return null;
    }

    /*
     * ---------------------------------------------------------
     * Get logged-in Supabase user
     * ---------------------------------------------------------
     */

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "Unable to get current user:",
        userError.message,
      );

      return null;
    }

    if (!user) {
     

      return null;
    }

    /*
     * ---------------------------------------------------------
     * Firebase Messaging
     * ---------------------------------------------------------
     */

    const messaging = getMessaging(firebaseApp);
    /*
 * ---------------------------------------------------------
 * Foreground Firebase messages
 * ---------------------------------------------------------
 */

onMessage(messaging, (payload) => {
  const title =
    payload.notification?.title ??
    SHOP_NAME;

  const body =
    payload.notification?.body ??
    "You have a new notification.";

  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: "/lcc.svg",
      data: payload.data ?? {},
    });

   notification.onclick = () => {
  window.focus();
  navigateToAdminOrders?.();
};
  }
});


    /*
     * IMPORTANT:
     * This VAPID key is the Web Push certificate key
     * generated in Firebase Console.
     */

    const vapidKey =
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!vapidKey) {
      console.error(
        "NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.",
      );

      return null;
    }

    /*
     * ---------------------------------------------------------
     * Get Firebase web push token
     * ---------------------------------------------------------
     */
const serviceWorkerRegistration =
  await navigator.serviceWorker.register(
    "/api/firebase-messaging-sw",
  );
    const token = await getToken(messaging, {
      vapidKey,
       serviceWorkerRegistration,
    });

    if (!token) {
     

      return null;
    }

    

    /*
     * ---------------------------------------------------------
     * Save token in Supabase
     * ---------------------------------------------------------
     */

    const { error: saveError } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id: user.id,
          expo_push_token: null,
          web_push_token: token,
          platform: "web",
          device_name:
            typeof navigator !== "undefined"
              ? navigator.userAgent
              : null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict:
            "user_id,web_push_token",
        },
      );

    if (saveError) {
      console.error(
        "Unable to save web push token:",
        saveError.message,
      );

      return null;
    }

  

    return token;
  } catch (error) {
    console.error(
      "Web push registration error:",
      error,
    );

    return null;
  }
}