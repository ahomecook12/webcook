import { redirect } from "next/navigation";

import {
  SiteSettingsForm,
  type SiteSettings,
  type PaymentMethod,
} from "@/components/admin/site-settings-form";

import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SiteSettingsPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) redirect("/auth/login");

  const supabase = await createClient();

  const [
    { data: settings },
    { data: categories },
    { data: storefrontSettings },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase
      .from("site_settings")
      .select(
        "theme, hero_title, hero_description, hero_media, homepage_category_ids, customer_review_images, catalog_mode",
      )
      .eq("id", true)
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),

    supabase
      .from("storefront_settings")
      .select("*")
      .maybeSingle(),

    supabase
      .from("payment_methods")
      .select(
        "id, method_type, display_name, enabled, account_name, phone_number, payment_url, instructions, qr_code_url, sort_order",
      )
      .order("sort_order")
      .order("created_at"),
  ]);

  return (
    <SiteSettingsForm
      settings={settings as SiteSettings | null}
      categories={categories ?? []}
      storefrontSettings={storefrontSettings}
      paymentMethods={(paymentMethods ?? []) as PaymentMethod[]}
    />
  );
}