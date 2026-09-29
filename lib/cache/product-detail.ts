import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export const getCachedProductDetail = unstable_cache(
  async (id: string) => {
    const supabase = createPublicClient();

    const [
      { data: product },
      { data: siteSettings },
      { data: categoryLinks },
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, name, description, size, price, sale_price, stock, weight_grams, height, width, depth, images, video_urls, youtube_post_urls, display_settings, available_for_sale",
        )
        .eq("id", id)
        .eq("active", true)
        .maybeSingle(),

      supabase
        .from("site_settings")
        .select(
          "catalog_mode, cloudinary_images_enabled",
        )
        .eq("id", true)
        .maybeSingle(),

      supabase
        .from("product_categories")
        .select(
          "categories(id, name, slug, image_url)",
        )
        .eq("product_id", id),
    ]);

    return {
      product,
      siteSettings,
      categoryLinks: categoryLinks ?? [],
    };
  },
  ["product-detail"],
  {
    revalidate: 7200,
    tags: ["product-detail"],
  },
);