import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { getGoogleCalendarAuthorizationUrl } from "@/lib/google-calendar";

export async function GET() {
  const { user, isAdmin } = await requireAdmin();

  if (!user || !isAdmin) {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const authorizationUrl =
    getGoogleCalendarAuthorizationUrl();

  return NextResponse.redirect(authorizationUrl);
}