import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function getCloudinaryPublicId(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const uploadIndex = parts.indexOf("upload");

    if (uploadIndex === -1) return null;

    let publicId = parts.slice(uploadIndex + 1).join("/");

    // Remove Cloudinary version, e.g. /v1234567890/
    publicId = publicId.replace(/^v\d+\//, "");

    // Remove file extension
    publicId = publicId.replace(/\.[^/.]+$/, "");

    return publicId;
  } catch {
    return null;
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/admin/products/[id]">,
) {
  const { user, isAdmin } = await requireAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const supabase = await createClient();

  // Get product images before deleting the product
  const { data: product, error: productFetchError } = await supabase
    .from("products")
    .select("id, images")
    .eq("id", id)
    .maybeSingle();

  if (productFetchError) {
    return NextResponse.json(
      { error: productFetchError.message },
      { status: 500 },
    );
  }

  if (!product) {
    return NextResponse.json(
      { error: "Product not found" },
      { status: 404 },
    );
  }

  const imageUrls = Array.isArray(product.images)
    ? product.images.filter(
        (image): image is string => typeof image === "string",
      )
    : [];

  // Delete product images from Cloudinary
  for (const url of imageUrls) {
    const publicId = getCloudinaryPublicId(url);

    if (!publicId) continue;

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });

    //  console.log(        `Cloudinary delete ${publicId}:`,        result.result,      );
    } catch (error) {
      // Do not prevent product deletion if Cloudinary cleanup fails
      console.error(
        `Failed to delete Cloudinary image ${publicId}:`,
        error,
      );
    }
  }

  // Remove category relationships
  const { error: relationsError } = await supabase
    .from("product_categories")
    .delete()
    .eq("product_id", id);

  if (relationsError) {
    return NextResponse.json(
      { error: relationsError.message },
      { status: 500 },
    );
  }

  // Delete product
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}