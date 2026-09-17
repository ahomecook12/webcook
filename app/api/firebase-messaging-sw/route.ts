import { NextResponse } from "next/server";
import { SHOP_NAME } from "@/app/constants";

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const serviceWorker = `
importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js"
);

firebase.initializeApp(${JSON.stringify(firebaseConfig)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
 

  const title =
    payload.data?.title ??
    ${JSON.stringify(SHOP_NAME)};

  const options = {
    body:
      payload.data?.body ??
      "You have a new notification.",

    icon: "/lcc.svg",

    data: {
      ...(payload.data ?? {}),
      url: "/admin/orders",
    },
  };

  self.registration.showNotification(title, options);
});


/* =========================================================
   TEST NOTIFICATION CLICK
   ========================================================= */

self.addEventListener("notificationclick", (event) => {



  event.notification.close();

  event.waitUntil(
    clients.openWindow(
      "http://localhost:3000/admin/orders"
    )
  );

});


/* =========================================================
   SERVICE WORKER LIFECYCLE
   ========================================================= */

self.addEventListener("install", () => {

});

self.addEventListener("activate", () => {
 
});
`;

  return new NextResponse(serviceWorker, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store",
    },
  });
}