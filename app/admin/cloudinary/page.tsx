import Link from "next/link";
import { redirect } from "next/navigation";

import CloudinaryControl from "@/components/admin/cloudinary-control";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function CloudinaryAdminPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("site_settings")
    .select(
      "cloudinary_images_enabled, cloudinary_usage_percent, cloudinary_usage_checked_at",
    )
    .eq("id", true)
    .maybeSingle();

  if (error) {
    console.error("Failed to load Cloudinary settings:", error);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link
        href="/admin"
        className="text-sm text-muted-foreground transition hover:text-foreground"
      >
        ← Back to Admin
      </Link>

      <div className="mt-5">
        <h1 className="text-3xl font-bold">Cloudinary</h1>

        <p className="mt-2 text-muted-foreground">
          Monitor Cloudinary usage and control image delivery for your shop.
        </p>
      </div>

      <div className="mt-8">
        <CloudinaryControl
          initialUsagePercent={Number(
            settings?.cloudinary_usage_percent ?? 0,
          )}
          initialImagesEnabled={
            settings?.cloudinary_images_enabled ?? true
          }
          initialCheckedAt={
            settings?.cloudinary_usage_checked_at ?? null
          }
        />
      </div>
    </main>
  );
}