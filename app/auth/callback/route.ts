import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  const next =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/";

  if (code) {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error(
        "[auth/callback] exchangeCodeForSession failed:",
        error
      );
    } else {
      //console.log("[auth/callback] Google session created successfully");
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else {
    console.error("[auth/callback] No OAuth code received");
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}