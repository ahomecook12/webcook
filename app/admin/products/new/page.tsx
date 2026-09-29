import { ProductForm, type Category } from "@/components/admin/product-form";

import { createClient } from "@/lib/supabase/server";

export default async function NewProductPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: siteSettings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),

    supabase
      .from("site_settings")
      .select("cloudinary_images_enabled")
      .eq("id", true)
      .maybeSingle(),
  ]);

  return (
    <ProductForm
      categories={(categories ?? []) as Category[]}
      cloudinaryImagesEnabled={siteSettings?.cloudinary_images_enabled ?? true}
    />
  );
}
