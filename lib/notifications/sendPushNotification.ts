import { getFirebaseMessaging } from "@/lib/firebase-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type SendPushNotificationInput = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function sendPushNotification({
  token,
  title,
  body,
  data = {},
}: SendPushNotificationInput) {
  try {
    const messaging = getFirebaseMessaging();

    const messageId = await messaging.send({
      token,

      data: {
        ...data,
        title,
        body,
      },

      android: {
        priority: "high",
        notification: {
          channelId: "default",
        },
      },
    });

    

    return messageId;
  } catch (error: unknown) {
    const errorCode = (error as { code?: string })?.code;

    /*
     * Firebase permanently invalidated this registration token.
     *
     * Remove only this exact token from our database.
     */
    if (
      errorCode ===
      "messaging/registration-token-not-registered"
    ) {
      console.log(
        "🧹 Removing invalid Firebase web push token from database:",
        token,
      );

      const supabase = createServiceRoleClient();

      const { error: deleteError } = await supabase
        .from("push_tokens")
        .delete()
        .eq("web_push_token", token);

      if (deleteError) {
        console.error(
          "❌ Failed to remove invalid Firebase token:",
          deleteError,
        );
      } 

      /*
       * This token is dead, but this is NOT an order-creation failure.
       * Do not throw the error.
       */
      return null;
    }

    /*
     * Other Firebase errors are still real errors.
     * Keep the existing behaviour for those.
     */
    console.error(
      "❌ Firebase push notification failed:",
      error,
      title,
      body,
    );

    throw error;
  }
}
