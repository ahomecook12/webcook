import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // Authentication
    // -------------------------------------------------------

    const authorization =
      request.headers.get("authorization");

    const accessToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;

    const { user, isAdmin } =
      await requireAdmin(accessToken);

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
    // Form data
    // -------------------------------------------------------

    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const folder = formData.get("folder");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 },
      );
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      return NextResponse.json(
        {
          error:
            "Only image and video files can be uploaded",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // Validate folder
    // -------------------------------------------------------

    if (
      folder !== null &&
      folder !== "hero" &&
      folder !== "category" &&
      folder !== "products" &&
      folder !== "social"
    ) {
      return NextResponse.json(
        { error: "Invalid upload folder" },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // Upload to Cloudinary
    // -------------------------------------------------------

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder:
              folder === "hero"
                ? "shop/hero"
                : folder === "category"
                  ? "shop/categories"
                  : folder === "social"
                    ? "shop/social"
                    : "shop/products",

            resource_type: file.type.startsWith("video/")
              ? "video"
              : "image",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve({
                secure_url: result.secure_url,
                public_id: result.public_id,
              });
            } else {
              reject(
                new Error("Cloudinary returned no result"),
              );
            }
          },
        )
        .end(buffer);
    });

    // -------------------------------------------------------
    // Return Cloudinary information
    // -------------------------------------------------------

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error(
      "Cloudinary upload error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload failed",
      },
      { status: 500 },
    );
  }
}