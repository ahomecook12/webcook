import { NextResponse } from "next/server";
import emailjs from "@emailjs/nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        {
          error: "Name, email and message are required.",
        },
        { status: 400 },
      );
    }

    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (
      !serviceId ||
      !templateId ||
      !publicKey ||
      !privateKey
    ) {
      console.error("EmailJS server configuration is missing.");

      return NextResponse.json(
        {
          error: "Email service is not configured.",
        },
        { status: 500 },
      );
    }

    await emailjs.send(
      serviceId,
      templateId,
      {
        name,
        email,
        subject: subject || "Message from Lucky Charm Creation",
        message,
        reply_to: email,
      },
      {
        publicKey,
        privateKey,
      },
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Contact API error:", error);

    return NextResponse.json(
      {
        error: "Could not send your message.",
      },
      { status: 500 },
    );
  }
}