import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { user, isAdmin } = await requireAdmin();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Only image and video files can be uploaded" },
        { status: 400 },
      );
    }
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise((resolve, reject) => {
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
            resource_type: file.type.startsWith("video/") ? "video" : "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(buffer);
    });

    const uploadResult = result as {
      secure_url: string;
      public_id: string;
    };

    return NextResponse.json({
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
