import { unstable_cache } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

export const getCachedHomepageSettings = unstable_cache(
  async () => {
    const supabase = createPublicClient();

    const [
      { data: savedSettings },
      { data: socialSettings },
    ] = await Promise.all([
      supabase
        .from("site_settings")
        .select(
          "theme, hero_title, hero_description, hero_media, homepage_category_ids, customer_review_images, catalog_mode, cloudinary_images_enabled",
        )
        .eq("id", true)
        .maybeSingle(),

      supabase
        .from("storefront_settings")
        .select(
          `
            social_enabled,
            social_links
          `,
        )
        .maybeSingle(),
    ]);

    return {
      savedSettings,
      socialSettings,
    };
  },
  ["homepage-settings"],
  {
    revalidate: 7200,
    tags: ["homepage-settings"],
  },
);

export const getCachedHomepageProducts = unstable_cache(
  async (categoryIds: string[], loadAllProducts: boolean) => {
    const supabase = createPublicClient();

    const [
      { data: categories },
      { data: allProductsData, error: allProductsError },
      { data: categoryLinks, error: categoryLinksError },
    ] = await Promise.all([
      categoryIds.length
        ? supabase
            .from("categories")
            .select("id, name, slug")
            .in("id", categoryIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [] }),

      loadAllProducts
        ? supabase
            .from("products")
            .select(
              `
                id,
                name,
                price,
                sale_price,
                images,
                display_settings,
                active,
                sticker
              `,
            )
            .eq("active", true)
            .order("created_at", { ascending: false })
        : Promise.resolve({
            data: [],
            error: null,
          }),

      categoryIds.length
        ? supabase
            .from("product_categories")
            .select(
              `
                category_id,
                product:products(
                  id,
                  name,
                  price,
                  sale_price,
                  images,
                  display_settings,
                  active,
                  sticker
                )
              `,
            )
            .in("category_id", categoryIds)
        : Promise.resolve({
            data: [],
            error: null,
          }),
    ]);

    if (allProductsError) {
      console.error(
        "Homepage all products loading error:",
        allProductsError,
      );
    }

    if (categoryLinksError) {
      console.error(
        "Homepage category products loading error:",
        categoryLinksError,
      );
    }

    return {
      categories: categories ?? [],
      allProductsData: allProductsData ?? [],
      categoryLinks: categoryLinks ?? [],
    };
  },
  ["homepage-products"],
  {
    revalidate: 7200,
    tags: ["homepage-products"],
  },
);