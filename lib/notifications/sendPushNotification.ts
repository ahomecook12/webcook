import { getFirebaseMessaging } from "@/lib/firebase-admin";

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

      notification: {
        title,
        body,
      },

      data,

      android: {
        priority: "high",
        notification: {
          channelId: "default",
        },
      },
    });

    console.log(
      "✅ Firebase push notification sent:",
      messageId,
    );

    return messageId;
  } catch (error) {
    console.error(
      "❌ Firebase push notification failed:",
      error,
    );

    throw error;
  }
}