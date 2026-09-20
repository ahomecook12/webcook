import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // Authentication
    // -------------------------------------------------------

    const authorization = request.headers.get("authorization");

    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

    const { user, isAdmin } = await requireAdmin(accessToken);

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

    // -------------------------------------------------------
    // Request body
    // -------------------------------------------------------

    const body = await request.json();

    const url = body?.url;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // Extract Cloudinary public_id from URL
    //
    // Example:
    // https://res.cloudinary.com/xxx/image/upload/
    // v1234567890/shop/products/my-image.jpg
    //
    // public_id:
    // shop/products/my-image
    // -------------------------------------------------------

    const parsedUrl = new URL(url);

    const pathname = parsedUrl.pathname;

    const uploadMarker = "/upload/";

    const uploadIndex = pathname.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      return NextResponse.json(
        { error: "Invalid Cloudinary URL" },
        { status: 400 },
      );
    }

    let publicId = pathname.slice(
      uploadIndex + uploadMarker.length,
    );

    // Remove Cloudinary version, e.g. v1234567890/
    publicId = publicId.replace(/^v\d+\//, "");

    // Remove file extension
    publicId = publicId.replace(/\.[^/.]+$/, "");

    if (!publicId) {
      return NextResponse.json(
        { error: "Could not determine Cloudinary public ID" },
        { status: 400 },
      );
    }

    //console.log("Deleting Cloudinary image:", publicId);

    // -------------------------------------------------------
    // Delete from Cloudinary
    // -------------------------------------------------------

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    //console.log("Cloudinary delete result:", result);

    if (
      result.result !== "ok" &&
      result.result !== "not found"
    ) {
      return NextResponse.json(
        {
          error: "Cloudinary could not delete the image",
          result: result.result,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      public_id: publicId,
      result: result.result,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete image",
      },
      { status: 500 },
    );
  }
}