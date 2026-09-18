import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, stock, active")
    .order("name");

  return (
    <main className="mx-auto w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>       
      </div>

      <p className="mt-2 text-muted-foreground">Manage your shop</p>

      <div className="mt-8 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="flex gap-3">
          <Link
            href="/admin/categories"
            className="inline-block rounded-lg border px-5 py-3"
          >
            Categories
          </Link>
          <Link
            href="/admin/settings"
            className="inline-block rounded-lg border px-5 py-3"
          >
            HomePage settings
          </Link>
          <Link
            href="/admin/products/new"
            className="inline-block rounded-lg bg-black px-5 py-3 text-white"
          >
            +New Prod
          </Link>
          <Link
            href="/admin/orders"
            className="inline-block rounded-lg border px-5 py-3"
          >
            Orders
          </Link>{" "}
          <Link
            href="/admin/analytics"
            className="inline-block rounded-lg border px-5 py-3"
          >
            Analytics
          </Link>
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">
          Unable to load products: {error.message}
        </p>
      ) : products?.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-muted/40 px-4 py-3 text-sm font-medium sm:grid-cols-[1fr_7rem_6rem_5rem]">
            <span>Product</span>
            <span className="hidden sm:block">Price</span>
            <span className="hidden sm:block">Stock</span>
            <span>Status</span>
          </div>
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}/edit`}
              className="grid grid-cols-[1fr_auto] gap-4 border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/50 sm:grid-cols-[1fr_7rem_6rem_5rem]"
            >
              <span className="font-medium">{product.name}</span>
              <span className="hidden sm:block">
                CHF {Number(product.price).toFixed(2)}
              </span>
              <span className="hidden sm:block">{product.stock ?? 0}</span>
              <span
                className={
                  product.active ? "text-green-700" : "text-muted-foreground"
                }
              >
                {product.active ? "Active" : "Draft"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No products yet. Add your first product to start selling.
        </p>
      )}
    </main>
  );
}
