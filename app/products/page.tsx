import { createClient } from "@/lib/supabase/server";
import ProductBrowser from "./ProductBrowser";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;
  const categorySlug = params.category;

  const supabase = await createClient();

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
      .select("catalog_mode")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (productsError) {
    console.error("Products loading error:", productsError);
  }

  if (categoriesError) {
    console.error("Categories loading error:", categoriesError);
  }

  const formattedProducts = (products ?? []).map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    keywords: product.keywords ?? [],
    sticker: product.sticker ?? null,
    created_at: product.created_at,
    price: Number(product.price),
    sale_price: product.sale_price == null ? null : Number(product.sale_price),
    images: (product.images ?? []) as string[],
    categoryIds: (product.product_categories ?? []).map(
      (category) => category.category_id,
    ),
  }));

  const selectedCategory = (categories ?? []).find(
    (category) => category.slug === categorySlug,
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Products</h1>

        <p className="mt-2 text-muted-foreground">
          Browse our collection &rarr;
        </p>

        <ProductBrowser
          products={formattedProducts}
          categories={categories ?? []}
          initialCategory={selectedCategory?.id}
          catalogMode={siteSettings?.catalog_mode ?? false}
        />
      </div>
    </main>
  );
}
