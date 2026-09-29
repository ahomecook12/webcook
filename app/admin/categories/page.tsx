import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AddCategoryForm from "./AddCategoryForm";

export default async function CategoriesPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = await createClient();

  const [
    { data: categories, error },
    { data: siteSettings },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, description, image_url, is_active, sort_order, image_public_id",
      )
      .order("sort_order")
      .order("name"),

    supabase
      .from("site_settings")
      .select("cloudinary_images_enabled")
      .eq("id", true)
      .maybeSingle(),
  ]);

  const cloudinaryImagesEnabled =
    siteSettings?.cloudinary_images_enabled ?? true;

  return (
    <main className="mx-auto w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>

          <p className="mt-2 text-muted-foreground">
            Manage the categories used by your products.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to Admin
        </Link>
      </div>

      <div className="mt-8 rounded-lg border p-4">
        <h2 className="text-lg font-semibold">Add Category</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Create a category for your products.
        </p>

        <div className="mt-4">
          <AddCategoryForm />
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-destructive">
          Unable to load categories: {error.message}
        </p>
      ) : categories?.length ? (
        <div className="mt-8 overflow-hidden rounded-lg border">
          {categories.map((category) => {
            const isCloudinaryImage =
              category.image_url?.includes(
                "res.cloudinary.com",
              ) ?? false;

            const canShowImage =
              Boolean(category.image_url) &&
              (!isCloudinaryImage ||
                cloudinaryImagesEnabled);

            return (
              <div
                key={category.id}
                className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-0"
              >
                <div className="flex items-center gap-4">
                  {canShowImage && category.image_url ? (
                    <Image
                      src={category.image_url}
                      alt={category.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : isCloudinaryImage &&
                    !cloudinaryImagesEnabled ? (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted px-1 text-center text-[10px] text-muted-foreground">
                      Cloudinary
                      <br />
                      hidden
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border text-xs text-muted-foreground">
                      No image
                    </div>
                  )}

                  <div>
                    <p className="font-medium">
                      {category.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {category.slug}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Sort order: {category.sort_order}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      category.is_active
                        ? "text-sm text-green-700"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {category.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>

                  <Link
                    href={`/admin/categories/${category.id}/edit`}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-8 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No categories yet.
        </p>
      )}
    </main>
  );
}