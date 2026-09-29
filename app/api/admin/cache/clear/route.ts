import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const { isAdmin } = await requireAdmin();

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 403 },
      );
    }

    revalidateTag("homepage-settings", "max");
    revalidateTag("homepage-products", "max");
    revalidateTag("products-page", "max");
    revalidateTag("product-detail", "max");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Clear cache error:", error);

    return NextResponse.json(
      { error: "Failed to clear cache." },
      { status: 500 },
    );
  }
}