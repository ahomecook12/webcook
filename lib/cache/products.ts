import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export const getCachedProductsPageData = unstable_cache(
  async () => {
    const supabase = createPublicClient();

    const [
      { data: products, error: productsError },
      { data: categories, error: categoriesError },
      { data: siteSettings },
    ] = await Promise.all([
      supabase
        .from("products")
        .select(
          `
            id,
            name,
            description,
            keywords,
            sticker,
            price,
            sale_price,
            images,
            product_categories ( category_id ),
            created_at
          `,
        )
        .eq("active", true)
        .order("name"),

      supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),

      supabase
        .from("site_settings")
        .select(
          "catalog_mode, cloudinary_images_enabled",
        )
        .eq("id", true)
        .maybeSingle(),
    ]);

    if (productsError) {
      console.error(
        "Products loading error:",
        productsError,
      );
    }

    if (categoriesError) {
      console.error(
        "Categories loading error:",
        categoriesError,
      );
    }

    return {
      products: products ?? [],
      categories: categories ?? [],
      siteSettings,
    };
  },
  ["products-page"],
  {
    revalidate: 7200,
    tags: ["products-page"],
  },
);