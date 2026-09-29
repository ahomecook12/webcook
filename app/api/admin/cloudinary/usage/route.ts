import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const CLOUDINARY_DISABLE_AT = 95;

type CloudinaryUsageResponse = {
  credits?: {
    usage?: number;
    limit?: number;
    used_percent?: number;
  };
};

export async function GET(request: Request) {
  try {
    // -------------------------------------------------------
    // ADMIN AUTHENTICATION
    // Works with web cookies and mobile Bearer token.
    // -------------------------------------------------------

    const authorization = request.headers.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    const { user, isAdmin } = await requireAdmin(accessToken);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // -------------------------------------------------------
    // GET CURRENT CLOUDINARY USAGE
    // -------------------------------------------------------

    const usage = (await cloudinary.api.usage()) as CloudinaryUsageResponse;

    const usedPercent = Number(usage.credits?.used_percent ?? 0);

    const usagePercent = Number.isFinite(usedPercent) ? usedPercent : 0;

    // -------------------------------------------------------
    // READ CURRENT SETTING
    // -------------------------------------------------------

    const supabase = createServiceRoleClient();

    const { data: currentSettings, error: settingsError } = await supabase
      .from("site_settings")
      .select("cloudinary_images_enabled")
      .eq("id", true)
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    let imagesEnabled = currentSettings?.cloudinary_images_enabled ?? true;

    let automaticallyDisabled = false;

    // -------------------------------------------------------
    // SAFETY RULE
    //
    // >= 95%:
    // Cloudinary images MUST be disabled.
    //
    // < 95%:
    // Do NOT automatically enable them.
    // Admin decides when to turn them back on.
    // -------------------------------------------------------

    if (usagePercent >= CLOUDINARY_DISABLE_AT && imagesEnabled) {
      imagesEnabled = false;
      automaticallyDisabled = true;
    }

    // -------------------------------------------------------
    // STORE LATEST USAGE + STATUS
    // -------------------------------------------------------

    const checkedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("site_settings")
      .update({
        cloudinary_usage_percent: usagePercent,
        cloudinary_usage_checked_at: checkedAt,
        cloudinary_images_enabled: imagesEnabled,
      })
      .eq("id", true);

    if (updateError) {
      throw updateError;
    }

    // -------------------------------------------------------
    // RESPONSE
    // -------------------------------------------------------

    return NextResponse.json({
      usagePercent,
      imagesEnabled,
      automaticallyDisabled,
      canEnable: usagePercent < CLOUDINARY_DISABLE_AT,
      disableAt: CLOUDINARY_DISABLE_AT,
      checkedAt,
    });
  } catch (error) {
    console.error("Cloudinary usage check failed:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),

        details: error,
      },
      { status: 500 },
    );
  }
}
