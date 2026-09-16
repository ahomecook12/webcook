import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  HeroCarousel,
  type HeroMedia,
} from "@/components/storefront/hero-carousel";
import { createClient } from "@/lib/supabase/server";
import {
  ProductCarousel,
  type CarouselProduct,
} from "@/components/storefront/product-carousel";
import { SocialFloat } from "@/components/storefront/social-float";
import SiteHeader from "@/components/storefront/site-header";
import { SHOP_NAME } from "./constants";

type DisplaySettings = {
  price?: boolean;
};

type StoreProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[] | null;
  display_settings: DisplaySettings | null;
  active: boolean;
  sticker: string | null;
};

type SiteSettings = {
  theme: "golden" | "light" | "dark";
  hero_title: string;
  hero_description: string;
  hero_media: HeroMedia[] | null;
  homepage_category_ids: string[] | null;
};

type HomepageStrip = {
  id: string;
  name: string;
  slug: string | null;
  products: StoreProduct[];
  type: "category" | "all" | "prebooking";
};

const ALL_PRODUCTS_ID = "__all__";
const PREBOOKING_ID = "__prebooking__";

const defaultSettings: SiteSettings = {
  theme: "golden",
  hero_title: "Something beautiful, just for you.",
  hero_description:
    "Discover jewellery, traditional treasures and delicious favourites, thoughtfully brought together for you.",
  hero_media: [],
  homepage_category_ids: [],
};

export default async function Home() {
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: savedSettings },
    { data: socialSettings },
  ] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from("site_settings")
      .select(
        "theme, hero_title, hero_description, hero_media, homepage_category_ids",
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

  let isAdmin = false;
  let cartCount = 0;

  if (user) {
    const [{ data: profile }, { data: cart }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),

      supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle(),
    ]);

    isAdmin = profile?.role === "admin";

    if (cart) {
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("cart_id", cart.id);

      cartCount = (cartItems ?? []).reduce(
        (total, item) => total + item.quantity,
        0,
      );
    }
  }

  const settings = {
    ...defaultSettings,
    ...(savedSettings as Partial<SiteSettings> | null),
  };

  const homepageStripIds =
    (savedSettings?.homepage_category_ids as string[] | null) ?? [];

  /*
   * We separate the special strips from real category IDs.
   */
  const categoryIds = homepageStripIds.filter(
    (id) => id !== ALL_PRODUCTS_ID && id !== PREBOOKING_ID,
  );

  /*
   * Load the real categories.
   */
  const { data: categories } = categoryIds.length
    ? await supabase
        .from("categories")
        .select("id, name, slug")
        .in("id", categoryIds)
        .eq("is_active", true)
    : { data: [] };

  /*
   * Load ALL active products.
   *
   * This is also used by the ALL PRODUCTS strip.
   */
  const { data: allProductsData, error: allProductsError } =
    homepageStripIds.includes(ALL_PRODUCTS_ID)
      ? await supabase
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
      : { data: [], error: null };

  if (allProductsError) {
    console.error("Homepage all products loading error:", allProductsError);
  }

  const allProducts = (allProductsData ?? []) as StoreProduct[];

  /*
   * Load products belonging to selected categories.
   */
  const { data: categoryLinks, error: productsError } = categoryIds.length
    ? await supabase
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
    : { data: [], error: null };

  if (productsError) {
    console.error("Homepage category products loading error:", productsError);
  }

  const productsByCategory = new Map<string, StoreProduct[]>();

  for (const link of categoryLinks ?? []) {
    const product = link.product as StoreProduct | StoreProduct[] | null;

    if (!product) continue;

    const item = Array.isArray(product) ? product[0] : product;

    if (!item || !item.active) continue;

    const existing = productsByCategory.get(link.category_id) ?? [];

    if (!existing.some((p) => p.id === item.id)) {
      existing.push(item);
    }

    productsByCategory.set(link.category_id, existing);
  }
  // Keep product order deterministic so server and client
  // render the same products in the same positions.
  allProducts.sort((a, b) => a.name.localeCompare(b.name));

  for (const products of productsByCategory.values()) {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }
  /*
   * Build the homepage strips IN THE EXACT ORDER
   * chosen by the admin.
   *
   * Important:
   * Supabase .in() does not guarantee the order of IDs,
   * so we deliberately map over homepageStripIds here.
   */
  const homepageStrips: HomepageStrip[] = [];

  for (const stripId of homepageStripIds) {
    /*
     * ALL PRODUCTS
     */
    if (stripId === ALL_PRODUCTS_ID) {
      homepageStrips.push({
        id: ALL_PRODUCTS_ID,
        name: "All Products",
        slug: null,
        products: allProducts,
        type: "all",
      });

      continue;
    }

    /*
     * PREBOOKING
     *
     * For now PREBOOKING uses the products marked with
     * "prebooking" in display_settings.
     *
     * If your product table later gets a dedicated
     * prebooking column, we can switch this very easily.
     */
    if (stripId === PREBOOKING_ID) {
      const prebookingProducts = allProducts.filter(
        (product) =>
          product.display_settings &&
          (
            product.display_settings as DisplaySettings & {
              prebooking?: boolean;
            }
          ).prebooking === true,
      );

      homepageStrips.push({
        id: PREBOOKING_ID,
        name: "Prebooking",
        slug: null,
        products: prebookingProducts,
        type: "prebooking",
      });

      continue;
    }

    /*
     * NORMAL CATEGORY
     */
    const category = (categories ?? []).find((item) => item.id === stripId);

    if (!category) continue;

    homepageStrips.push({
      id: category.id,
      name: category.name,
      slug: category.slug,
      products: productsByCategory.get(category.id) ?? [],
      type: "category",
    });
  }

  return (
    <main
      className={`site-theme-${settings.theme} min-h-screen bg-background text-foreground`}
    >
      <SiteHeader
        isLoggedIn={!!user}
        isAdmin={isAdmin}
        cartCount={cartCount}
        userId={user?.id}
      />

      <SocialFloat
  settings={
    socialSettings ?? {
      social_enabled: false,
      social_links: [],
    }
  }
/>

      {/* HERO */}
      <section className="relative  bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="max-w-2xl self-center">
            <p className="mb-4 text-sm font-medium tracking-[0.16em] text-primary">
              CURATED WITH LOVE
            </p>

            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {settings.hero_title}
            </h1>

            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              {settings.hero_description}
            </p>

            <Link
              href="/products"
              className={`${buttonVariants({ size: "lg" })} mt-8`}
            >
              Explore our amazing collection &rarr;
            </Link>
          </div>

          {settings.hero_media?.length ? (
            <div className="relative isolate">
              {/* Soft decorative glow behind the carousel */}
              <div
                className="
        pointer-events-none
        absolute -inset-6
        rounded-[2rem]
        bg-primary/50
        blur-3xl
        animate-pulse
      "
              />

              <div className="relative">
                <HeroCarousel media={settings.hero_media} />
              </div>
            </div>
          ) : (
            <Card className="justify-center border-primary/20 bg-primary text-primary-foreground">
              <CardContent className="p-8 text-center">
                <p className="text-sm font-medium tracking-[0.2em]">
                {SHOP_NAME}
                </p>

                <p className="mt-3 text-2xl font-semibold">
                  Beauty, tradition & taste
                </p>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Decorative hero-to-products transition */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-1/2">
          <div className="mx-auto h-3 max-w-5xl rounded-full bg-primary/20 blur-xl" />
          <div className="mx-auto -mt-2 h-px max-w-4xl bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        </div>
      </section>

      {/* HERO → PRODUCTS TRANSITION */}
      <div className="relative h-16 overflow-hidden bg-background">
        {/* Soft golden glow */}
        <div
          className="
      pointer-events-none
      absolute left-1/2 top-1/2
      h-12 w-[70%]
      -translate-x-1/2 -translate-y-1/2
      rounded-full
      bg-primary/25
      blur-2xl
      animate-glow-drift
    "
        />

        {/* Elegant moving line */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-primary/15">
          <div
            className="
        absolute inset-y-0
        w-1/4
        bg-gradient-to-r
        from-transparent
        via-primary/70
        to-transparent
        animate-line-sweep
      "
          />
        </div>

        {/* Small central diamond */}
        <div
          className="
      absolute left-1/2 top-1/2
      h-2.5 w-2.5
      -translate-x-1/2 -translate-y-1/2
      rotate-45
      border border-primary/50
      bg-background
      shadow-[0_0_14px_rgba(234,179,8,0.45)]
      animate-soft-pulse
    "
        />
      </div>

      {/* PRODUCT STRIPS */}
      <section id="products" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">DISCOVER</p>

          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            Our collection
          </h2>
        </div>

        {homepageStrips.length > 0 ? (
          <div className="space-y-12">
            {homepageStrips.map((strip) => (
              <div key={strip.id}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-semibold">{strip.name}</h3>
                  </div>

                  {strip.type === "category" && strip.slug ? (
                    <Link
                      href={`/products?category=${strip.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View all →
                    </Link>
                  ) : strip.type === "all" ? (
                    <Link
                      href="/products"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      View all →
                    </Link>
                  ) : null}
                </div>

                {strip.products.length > 0 ? (
                  <ProductCarousel
                    products={strip.products as CarouselProduct[]}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    No products in this strip yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No homepage product strips have been selected yet.
            </CardContent>
          </Card>
        )}
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {SHOP_NAME}. All rights reserved.
      </footer>
    </main>
  );
}
