import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CLOUDINARY_DISABLE_AT = 95;

export async function PATCH(request: Request) {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // Supports web cookie auth and mobile Bearer auth.
    // -------------------------------------------------------

    const authorization = request.headers.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    const { user, isAdmin } = await requireAdmin(accessToken);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    // -------------------------------------------------------
    // REQUEST
    // -------------------------------------------------------

    const body = await request.json();

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be true or false." },
        { status: 400 },
      );
    }

    const requestedEnabled = body.enabled;

    const supabase = createServiceRoleClient();

    // -------------------------------------------------------
    // READ LATEST STORED CLOUDINARY USAGE
    // -------------------------------------------------------

    const { data: settings, error: readError } = await supabase
      .from("site_settings")
      .select(
        "cloudinary_usage_percent, cloudinary_usage_checked_at, cloudinary_images_enabled",
      )
      .eq("id", true)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (!settings) {
      return NextResponse.json(
        { error: "Site settings were not found." },
        { status: 404 },
      );
    }

    const usagePercent = Number(
      settings.cloudinary_usage_percent ?? 0,
    );

    // -------------------------------------------------------
    // SAFETY RULE
    //
    // Admin may always manually DISABLE images.
    //
    // Admin may ENABLE only while usage is below 95%.
    // -------------------------------------------------------

    if (
      requestedEnabled &&
      usagePercent >= CLOUDINARY_DISABLE_AT
    ) {
      return NextResponse.json(
        {
          error: `Cloudinary images cannot be enabled while usage is ${CLOUDINARY_DISABLE_AT}% or higher.`,
          usagePercent,
          imagesEnabled: false,
          canEnable: false,
        },
        { status: 409 },
      );
    }

    // -------------------------------------------------------
    // SAVE STATUS
    // -------------------------------------------------------

    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        cloudinary_images_enabled: requestedEnabled,
      })
      .eq("id", true);

    if (updateError) {
      throw updateError;
    }

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------

    return NextResponse.json({
      imagesEnabled: requestedEnabled,
      usagePercent,
      checkedAt:
        settings.cloudinary_usage_checked_at ?? null,
      canEnable: usagePercent < CLOUDINARY_DISABLE_AT,
    });
  } catch (error) {
    console.error(
      "Cloudinary image status update failed:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to change Cloudinary image status.",
      },
      { status: 500 },
    );
  }
}