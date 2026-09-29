"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  image_public_id: string | null;
};

export default function EditCategoryForm({
  category,
  cloudinaryImagesEnabled = true,
}: {
  category: Category;
  cloudinaryImagesEnabled?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category.sort_order));
  const [isActive, setIsActive] = useState(category.is_active);

  const [imageUrl, setImageUrl] = useState(category.image_url);
  const [imagePublicId, setImagePublicId] = useState(category.image_public_id);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(category.image_url);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function deleteCategory() {
    const confirmed = window.confirm(
      `Delete "${category.name}"?\n\nThis cannot be undone.`,
    );

    if (!confirmed) return;

    setDeleting(true);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete category.");
      }

      router.replace("/admin/categories");
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete category.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleImageSelect(event: React.ChangeEvent<HTMLInputElement>) {
    if (!cloudinaryImagesEnabled) {
      event.target.value = "";

      alert(
        "Cloudinary images are currently disabled. Category image uploads are unavailable.",
      );

      return;
    }

    const file = event.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    event.target.value = "";
  }

  async function uploadImage() {
  if (!cloudinaryImagesEnabled) {
    alert(
      "Cloudinary images are currently disabled. Category image uploads are unavailable.",
    );

    return;
  }

  if (!imageFile) return;

  setUploading(true);

  try {
    const formData = new FormData();

    formData.append("file", imageFile);
    formData.append("folder", "category");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Image upload failed.");
    }

    setImageUrl(data.url);
    setImagePublicId(data.public_id);
    setImageFile(null);
    setImagePreview(data.url);
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Image upload failed.",
    );
  } finally {
    setUploading(false);
  }
}

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert("Please enter a category name.");
      return;
    }

    if (!slug.trim()) {
      alert("Please enter a slug.");
      return;
    }

    if (imageFile && !imageUrl) {
      alert("Please upload the selected image before saving.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          sort_order: Number(sortOrder) || 0,
          is_active: isActive,
          image_url: imageUrl,
          image_public_id: imagePublicId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update category.");
      }

      router.push("/admin/categories");
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to update category.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>

            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Jewellery"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>

            <Input
              id="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="e.g. jewellery"
            />

            <p className="text-sm text-muted-foreground">
              Used in the category URL.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>

            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe this category..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sortOrder">Sort Order</Label>

            <Input
              id="sortOrder"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />

            <p className="text-sm text-muted-foreground">
              Lower numbers appear first.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="active">Active Category</Label>

              <p className="text-sm text-muted-foreground">
                Inactive categories wont be shown in the shop.
              </p>
            </div>

            <Checkbox
              id="active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
          </div>
        </CardContent>
      </Card>

    <Card>
  <CardHeader>
    <CardTitle>Category Image</CardTitle>
  </CardHeader>

  <CardContent className="space-y-4">
    {imagePreview ? (
      imagePreview.includes("res.cloudinary.com") &&
      !cloudinaryImagesEnabled ? (
        <div className="flex min-h-48 w-full max-w-sm items-center justify-center rounded-lg border border-dashed bg-muted p-8 text-center text-sm text-muted-foreground">
          Cloudinary image hidden
        </div>
      ) : (
        <div className="relative w-full max-w-sm overflow-hidden rounded-lg border">
          <Image
            src={imagePreview}
            alt={name || "Category image"}
            width={600}
            height={400}
            unoptimized
            className="h-auto w-full object-cover"
          />
        </div>
      )
    ) : (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No category image yet.
      </div>
    )}

    <Input
      type="file"
      accept="image/*"
      onChange={handleImageSelect}
      disabled={
        !cloudinaryImagesEnabled ||
        uploading ||
        saving
      }
    />

    {!cloudinaryImagesEnabled && (
      <p className="text-sm text-amber-600">
        Cloudinary images are currently disabled. Existing Cloudinary images
        are preserved, but previews and new uploads are unavailable.
      </p>
    )}

    {imageFile && cloudinaryImagesEnabled && (
      <Button
        type="button"
        onClick={uploadImage}
        disabled={uploading || saving}
      >
        {uploading ? "Uploading..." : "Upload Image"}
      </Button>
    )}

    {imageUrl &&
      !imageFile &&
      cloudinaryImagesEnabled && (
        <p className="text-sm text-muted-foreground">
          Image uploaded successfully ✓
        </p>
      )}

    {imageUrl &&
      imageUrl.includes("res.cloudinary.com") &&
      !cloudinaryImagesEnabled && (
        <p className="text-sm text-muted-foreground">
          Existing category image preserved.
        </p>
      )}
  </CardContent>
</Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="destructive"
          onClick={deleteCategory}
          disabled={saving || uploading || deleting}
        >
          {deleting ? "Deleting..." : "Delete Category"}
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/categories")}
            disabled={saving || uploading || deleting}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={saving || uploading || deleting}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
