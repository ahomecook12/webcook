import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return NextResponse.redirect(
      new URL("/auth/login", url.origin),
    );
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.redirect(
      new URL(
        "/notifications?calendar_error=missing_config",
        url.origin,
      ),
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope:
      "https://www.googleapis.com/auth/calendar.events.owned",
  });

  const googleUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(googleUrl);
}