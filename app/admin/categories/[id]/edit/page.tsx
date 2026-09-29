import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EditCategoryForm from "./EditCategoryForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const { id } = await params;

  const supabase = await createClient();

  const [
    { data: category, error },
    { data: siteSettings },
  ] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, slug, description, image_url, is_active, sort_order, image_public_id",
      )
      .eq("id", id)
      .single(),

    supabase
      .from("site_settings")
      .select("cloudinary_images_enabled")
      .eq("id", true)
      .maybeSingle(),
  ]);

  if (error || !category) {
    notFound();
  }

  const cloudinaryImagesEnabled =
    siteSettings?.cloudinary_images_enabled ?? true;

  return (
    <main className="mx-auto w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Category</h1>

        <p className="mt-2 text-muted-foreground">
          Update your category details.
        </p>
      </div>

      <EditCategoryForm
        category={category}
        cloudinaryImagesEnabled={cloudinaryImagesEnabled}
      />
    </main>
  );
}