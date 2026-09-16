import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import AddToCartButton from "@/components/storefront/add-to-cart-button";
import ProductGallery from "@/components/storefront/product-gallery";
import type { Metadata } from "next";
import Image from "next/image";
import { SHOP_NAME } from "@/app/constants";

type DisplaySettings = {
  price?: boolean;
  size?: boolean;
  description?: boolean;
  stock?: boolean;
  dimensions?: boolean;
  weight?: boolean;
  videos?: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
};

const shown = (
  settings: DisplaySettings | null,
  field: keyof DisplaySettings,
) => settings?.[field] !== false;

export async function generateMetadata({
  params,
}: PageProps<"/products/[id]">): Promise<Metadata> {
  const { id } = await params;

  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select(
      "name, description, images, price, sale_price",
    )
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();

  if (!product) {
    return {
      title: `Product | ${SHOP_NAME}`,
    };
  }

  const images = (product.images ?? []) as string[];

  const image = images[0] ?? null;

  return {
    title: `${product.name} | ${SHOP_NAME}`,

    description:
      product.description ||
      `Discover ${product.name} at ${SHOP_NAME}.`,

    openGraph: {
      title: `${product.name} | ${SHOP_NAME}`,

      description:
        product.description ||
        `Discover ${product.name} at ${SHOP_NAME}.`,

      type: "website",

      images: image
        ? [
            {
              url: image,
              width: 800,
              height: 800,
              alt: product.name,
            },
          ]
        : [],
    },

    twitter: {
      card: "summary_large_image",

      title: `${product.name} | ${SHOP_NAME}`,

      description:
        product.description ||
        `Discover ${product.name} at ${SHOP_NAME}.`,

      images: image ? [image] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[id]">) {
  const { id } = await params;

  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: product },
  ] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from("products")
      .select(
        "id, name, description, size, price, sale_price, stock, weight_grams, height, width, depth, images, video_urls, display_settings, available_for_sale",
      )
      .eq("id", id)
      .eq("active", true)
      .maybeSingle(),
  ]);

  if (!product) {
    notFound();
  }

  const { data: categoryLinks } = await supabase
    .from("product_categories")
    .select("categories(id, name, slug, image_url)")
    .eq("product_id", id);

  const categories = (categoryLinks ?? []).flatMap((link) => {
    const category =
      link.categories as Category | Category[] | null;

    return Array.isArray(category)
      ? category
      : category
        ? [category]
        : [];
  });


  let cartCount = 0;

  if (user) {
    const { data: cart } = await supabase
  .from("carts")
  .select("id")
  .eq("user_id", user.id)
  .maybeSingle();

  

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

  const images = (product.images ?? []) as string[];

  const videos = (product.video_urls ?? []) as string[];

  const settings =
    product.display_settings as DisplaySettings | null;

  const dimensions = [
    ["Height", product.height],
    ["Width", product.width],
    ["Depth", product.depth],
  ].filter(([, value]) => value != null);

  const salePrice =
    product.sale_price == null
      ? null
      : Number(product.sale_price);

  const stock = product.stock ?? 0;
  const availableForSale =
    product.available_for_sale ?? false;

  /*
   * Product availability rules:
   *
   * available_for_sale = true  + stock > 0
   *   → normal product available for immediate purchase
   *
   * available_for_sale = false + stock = 0
   *   → product is available for pre-booking
   *
   * available_for_sale = true  + stock = 0
   *   → out of stock
   *
   * available_for_sale = false + stock > 0
   *   → unavailable / invalid state
   */
  const isPreBooking =
    !availableForSale && stock <= 0;

  return (
    <main
      className="min-h-screen bg-background"
      data-product-id={product.id}
      data-product-name={product.name}
    >
    

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          href="/products"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
          })}
        >
          ← Back to products
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          {/* =======================================================
              LEFT SIDE
              Images + Videos
             ======================================================= */}
          <div>
            <ProductGallery
              productId={product.id}
              productName={product.name}
              images={images}
              videos={
                shown(settings, "videos")
                  ? videos
                  : []
              }
            />
          </div>

          {/* =======================================================
              RIGHT SIDE
              Product information
             ======================================================= */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>

            
{categories.length > 0 && (
  <div className="mt-3 flex flex-wrap gap-2">
    {categories.map((category) => (
      <Link
        key={category.id}
        href={`/products?category=${encodeURIComponent(
          category.slug,
        )}`}
        className="inline-flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-sm text-secondary-foreground hover:bg-secondary/80"
      >
        {category.image_url ? (
          <Image
            src={category.image_url}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : null}

        <span className="pr-1">{category.name}</span>
      </Link>
    ))}
  </div>
)}


            {shown(settings, "price") && (
              <p className="mt-3 text-xl font-medium">
                {salePrice !== null ? (
                  <>
                    <span>
                      CHF {salePrice.toFixed(2)}
                    </span>

                    <span className="ml-3 text-base text-muted-foreground line-through">
                      CHF{" "}
                      {Number(product.price).toFixed(2)}
                    </span>
                  </>
                ) : (
                  `CHF ${Number(product.price).toFixed(2)}`
                )}
              </p>
            )}

            {shown(settings, "description") &&
              product.description && (
                <p className="mt-6 leading-7 text-muted-foreground">
                  {product.description}
                </p>
              )}

            <div className="mt-8 grid gap-3">
              {shown(settings, "size") &&
                product.size && (
                  <Detail
                    label="Size"
                    value={product.size}
                  />
                )}

              {shown(settings, "stock") &&
                product.stock != null && (
                  <Detail
                    label="Availability"
                    value={
                      isPreBooking
                        ? "Available for pre-booking"
                        : stock > 0 && availableForSale
                          ? `${stock} in stock`
                          : "Out of stock"
                    }
                  />
                )}

              {shown(settings, "dimensions") &&
                dimensions.length > 0 && (
                  <Detail
                    label="Dimensions"
                    value={dimensions
                      .map(
                        ([label, value]) =>
                          `${label}: ${value} cm`,
                      )
                      .join(" · ")}
                  />
                )}

              {shown(settings, "weight") &&
                product.weight_grams != null && (
                  <Detail
                    label="Weight"
                    value={`${product.weight_grams} g`}
                  />
                )}
            </div>

            <AddToCartButton
              productId={product.id}
              stock={stock}
              availableForSale={availableForSale}
              cartCount={cartCount}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-1">{value}</p>
    </div>
  );
}