import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { exchangeGoogleCalendarCode } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/notifications?calendar_error=${encodeURIComponent(error)}`,
        url.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/notifications?calendar_error=missing_code",
        url.origin,
      ),
    );
  }

  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return NextResponse.redirect(
      new URL("/auth/login", url.origin),
    );
  }

  try {
    const tokens = await exchangeGoogleCalendarCode(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL(
          "/notifications?calendar_error=no_refresh_token",
          url.origin,
        ),
      );
    }

    const supabase = createServiceRoleClient();

    const { error: saveError } = await supabase
      .from("google_calendar_tokens")
      .upsert(
        {
          user_id: user.id,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope ?? null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

    if (saveError) {
      console.error(
        "Failed to save Google Calendar token:",
        saveError,
      );

      return NextResponse.redirect(
        new URL(
          "/notifications?calendar_error=save_failed",
          url.origin,
        ),
      );
    }

    return NextResponse.redirect(
      new URL(
        "/notifications?calendar_connected=1",
        url.origin,
      ),
    );
  } catch (error) {
    console.error(
      "Google Calendar OAuth callback failed:",
      error,
    );

    return NextResponse.redirect(
      new URL(
        "/notifications?calendar_error=oauth_failed",
        url.origin,
      ),
    );
  }
}