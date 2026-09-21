"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCY_SYMBOL } from "@/app/constants";

export type ProductDisplaySettings = {
  price: boolean;
  size: boolean;
  description: boolean;
  stock: boolean;
  dimensions: boolean;
  weight: boolean;
  videos: boolean;
};
const defaultDisplaySettings: ProductDisplaySettings = {
  price: true,
  size: true,
  description: true,
  stock: false,
  dimensions: true,
  weight: true,
  videos: true,
};
const displayFieldLabels: {
  key: keyof ProductDisplaySettings;
  label: string;
  description: string;
}[] = [
  { key: "price", label: "Price", description: "Show the product price" },
  { key: "size", label: "Size", description: "Show the size field" },
  {
    key: "description",
    label: "Description",
    description: "Show the product description",
  },
  { key: "stock", label: "Stock", description: "Show available stock" },
  {
    key: "dimensions",
    label: "Dimensions",
    description: "Show height, width and depth",
  },
  { key: "weight", label: "Weight", description: "Show product weight" },
  { key: "videos", label: "Videos", description: "Show product video links" },
];

export type Product = {
  id: string;
  name: string;
  description: string | null;
  size: string | null;
  price: number;
  sale_price: number | null;
  stock: number | null;
  weight_grams: number | null;
  height: number | null;
  width: number | null;
  depth: number | null;
  images: string[] | null;
  video_urls: string[] | null;
  active: boolean | null;
  display_settings: ProductDisplaySettings | null;
  available_for_sale: boolean;
  keywords: string[] | null;
  sticker: string | null;
};
export type Category = { id: string; name: string };
type ImageItem = { preview: string; url?: string; file?: File };
const asInputValue = (value: number | null | undefined) =>
  value == null ? "" : String(value);

export function ProductForm({
  product,
  categories = [],
  initialCategoryIds = [],
}: {
  product?: Product;
  categories?: Category[];
  initialCategoryIds?: string[];
}) {
  const router = useRouter();
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [keywords, setKeywords] = useState<string[]>(product?.keywords ?? []);
  const [size, setSize] = useState(product?.size ?? "");
  const [price, setPrice] = useState(asInputValue(product?.price));
  const [salePrice, setSalePrice] = useState(asInputValue(product?.sale_price));
  const [stock, setStock] = useState(asInputValue(product?.stock));
  const [height, setHeight] = useState(asInputValue(product?.height));
  const [sticker, setSticker] = useState(product?.sticker ?? "");
  const [width, setWidth] = useState(asInputValue(product?.width));
  const [depth, setDepth] = useState(asInputValue(product?.depth));
  const [weight, setWeight] = useState(asInputValue(product?.weight_grams));
  const [active, setActive] = useState(product?.active ?? true);
  const [availableForSale, setAvailableForSale] = useState(
    product?.available_for_sale ?? true,
  );
  const [displaySettings, setDisplaySettings] =
    useState<ProductDisplaySettings>({
      ...defaultDisplaySettings,
      ...product?.display_settings,
    });
  const [images, setImages] = useState<ImageItem[]>(
    (product?.images ?? []).map((url) => ({ preview: url, url })),
  );
  const [categoryIds, setCategoryIds] = useState(initialCategoryIds);
  const [availableCategories, setAvailableCategories] = useState(categories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoUrls, setVideoUrls] = useState(product?.video_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  function selectImages(event: React.ChangeEvent<HTMLInputElement>) {
    const additions = Array.from(event.target.files ?? []).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...additions]);
    event.target.value = "";
  }
  async function removeImage(index: number) {
    const image = images[index];

    // New image that hasn't been uploaded yet
    if (!image.url) {
      if (image.file) URL.revokeObjectURL(image.preview);

      setImages((current) =>
        current.filter((_, itemIndex) => itemIndex !== index),
      );
      return;
    }

    // Existing Cloudinary image
    if (!window.confirm("Delete this image permanently?")) return;

    try {
      const response = await fetch("/api/admin/cloudinary/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: image.url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete image.");
      }

      setImages((current) =>
        current.filter((_, itemIndex) => itemIndex !== index),
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete image.");
    }
  }
  async function uploadImages() {
    if (!images.some((image) => !image.url && image.file)) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        images.map(async (image) => {
          if (image.url || !image.file) return image;
          const body = new FormData();
          body.append("file", image.file);
          const response = await fetch("/api/upload", { method: "POST", body });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Image upload failed.");
          URL.revokeObjectURL(image.preview);
          return {
            ...image,
            preview: data.url as string,
            url: data.url as string,
          };
        }),
      );
      setImages(uploaded);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "One or more images failed to upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function analyzeProductWithAI() {
    const image = images.find((item) => item.file);

    if (!image?.file) {
      return alert(
        "Please select a product image first. AI can analyze one image at a time.",
      );
    }

    setAiAnalyzing(true);

    try {
      const body = new FormData();
      body.append("image", image.file);

      const response = await fetch("/api/admin/ai/analyze-product", {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed.");
      }

      if (data.name) {
        setName(data.name);
      }

      if (data.description) {
        setDescription(data.description);
      }
      if (Array.isArray(data.keywords)) {
        setKeywords(
          data.keywords
            .filter((keyword: unknown) => typeof keyword === "string")
            .map((keyword: string) => keyword.trim().toLowerCase())
            .filter(Boolean),
        );
      }
      if (data.size) {
        setSize(data.size);
      }

      // Try to match Gemini's suggested category
      // with one of our existing categories.
      if (data.suggestedCategory) {
        const suggested = availableCategories.find(
          (category) =>
            category.name.toLowerCase().trim() ===
            data.suggestedCategory.toLowerCase().trim(),
        );

        if (suggested) {
          setCategoryIds((current) =>
            current.includes(suggested.id)
              ? current
              : [...current, suggested.id],
          );
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "AI analysis failed.");
    } finally {
      setAiAnalyzing(false);
    }
  }
  function addVideoUrl() {
    const url = videoUrl.trim();
    if (!url) return;
    if (videoUrls.includes(url))
      return alert("This video has already been added.");
    setVideoUrls((current) => [...current, url]);
    setVideoUrl("");
  }
  async function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    if (
      availableCategories.some(
        (category) => category.name.toLowerCase() === name.toLowerCase(),
      )
    )
      return alert("A category with this name already exists.");
    setCreatingCategory(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create category.");
      const category = data as Category;
      setAvailableCategories((current) =>
        [...current, category].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCategoryIds((current) => [...current, category.id]);
      setNewCategoryName("");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to create category.",
      );
    } finally {
      setCreatingCategory(false);
    }
  }
  async function saveProduct() {
    if (!name.trim()) return alert("Please enter a product name.");
    if (!price || Number(price) <= 0)
      return alert("Please enter a valid price.");
    if (!images.length) return alert("Please add at least one product image.");
    if (images.some((image) => !image.url))
      return alert("Please upload all product images before saving.");
    setSaving(true);
    try {
      const values = {
        name: name.trim(),
        description: description.trim() || null,
        size: size.trim() || null,
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        stock: stock ? Number(stock) : 0,
        weight_grams: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        width: width ? Number(width) : null,
        depth: depth ? Number(depth) : null,
        images: images.map((image) => image.url!).filter(Boolean),
        video_urls: videoUrls,
        active,
        available_for_sale: availableForSale,
        display_settings: displaySettings,
        keywords,
        sticker: sticker.trim() || null,
      };
      const supabase = createClient();
      const createdProduct = editing
        ? null
        : await supabase.from("products").insert(values).select("id").single();
      if (createdProduct?.error) throw createdProduct.error;
      const productId = editing ? product!.id : createdProduct?.data.id;
      if (editing) {
        const { error } = await supabase
          .from("products")
          .update(values)
          .eq("id", productId);
        if (error) throw error;
      }
      if (!productId) throw new Error("Product could not be saved.");
      const { error: removeCategoriesError } = await supabase
        .from("product_categories")
        .delete()
        .eq("product_id", productId);
      if (removeCategoriesError) throw removeCategoriesError;
      if (categoryIds.length) {
        const { error: addCategoriesError } = await supabase
          .from("product_categories")
          .insert(
            categoryIds.map((category_id) => ({
              product_id: productId,
              category_id,
            })),
          );
        if (addCategoriesError) throw addCategoriesError;
      }
      router.push("/admin");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (
      !product ||
      !window.confirm(`Delete "${product.name}"? This cannot be undone.`)
    )
      return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to delete product.");
      router.replace("/admin");
      router.refresh();
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Failed to delete product.",
      );
    } finally {
      setDeleting(false);
    }
  }
  const dimensions = [
    ["height", "Height (cm)", height, setHeight],
    ["width", "Width (cm)", width, setWidth],
    ["depth", "Depth (cm)", depth, setDepth],
    ["weight", "Weight (g)", weight, setWeight],
  ] as const;
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {editing ? "Edit Product" : "Add Product"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {editing
            ? "Update product details, images and videos."
            : "Add product details, images and videos."}
        </p>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label
                htmlFor="product-images"
                className="inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                📷 Choose images
              </label>

              <input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={selectImages}
                className="hidden"
              />

              <p className="mt-2 text-sm text-muted-foreground">
                Select one or more product images each max 4.5 MB.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                onClick={analyzeProductWithAI}
                disabled={
                  aiAnalyzing ||
                  uploading ||
                  saving ||
                  deleting ||
                  !images.some((image) => image.file)
                }
              >
                {aiAnalyzing ? "Analyzing..." : "✨ Fill with AI"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Uses 1 AI analysis. You choose when to use it.
              </p>
            </div>
            {images.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {images.map((image, index) => (
                    <div
                      key={`${image.preview}-${index}`}
                      className="relative overflow-hidden rounded-lg border"
                    >
                      <Image
                        src={image.preview}
                        alt={`Product image ${index + 1}`}
                        width={300}
                        height={300}
                        unoptimized
                        className="aspect-square w-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 h-7 w-7"
                        aria-label={`Remove product image ${index + 1}`}
                      >
                        ×
                      </Button>
                      {image.url && (
                        <div className="bg-primary px-2 py-1 text-center text-xs text-primary-foreground">
                          Uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={uploadImages}
                  disabled={uploading || images.every((image) => image.url)}
                >
                  {uploading ? "Uploading..." : "Upload Images"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TextField
              id="name"
              label="Product Name"
              value={name}
              onChange={setName}
              placeholder="e.g. Pearl Jhumka Earrings"
            />
            <TextField
              id="sticker"
              label="Sticker"
              value={sticker}
              onChange={setSticker}
              placeholder="e.g. NEW, BESTSELLER, LIMITED"
            />
            <p className="-mt-2 text-xs text-muted-foreground">
              Optional. This sticker will appear on the product card.
            </p>
            <TextField
              id="size"
              label="Size"
              value={size}
              onChange={setSize}
              placeholder="e.g. S, M, L or 20 × 30 cm"
            />
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe the product..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>

              <Input
                id="keywords"
                value={keywords.join(", ")}
                onChange={(event) =>
                  setKeywords(
                    event.target.value
                      .split(",")
                      .map((keyword) => keyword.trim().toLowerCase())
                      .filter(Boolean),
                  )
                }
                placeholder="e.g. yellow, jhumka, jewellery, gift, traditional"
              />

              <p className="text-xs text-muted-foreground">
                Separate keywords with commas. AI can suggest these
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createCategory();
                  }
                }}
                placeholder="New category name"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={createCategory}
                disabled={creatingCategory || !newCategoryName.trim()}
              >
                {creatingCategory ? "Adding..." : "Add category"}
              </Button>
            </div>
            {availableCategories.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={categoryIds.includes(category.id)}
                      onCheckedChange={(checked) =>
                        setCategoryIds((current) =>
                          checked === true
                            ? [...current, category.id]
                            : current.filter((id) => id !== category.id),
                        )
                      }
                    />
                    <Label htmlFor={`category-${category.id}`}>
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Create your first category above.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                id="price"
                label={`Price (${CURRENCY_SYMBOL})`}
                value={price}
                onChange={setPrice}
                required
              />

              <NumberField
                id="salePrice"
                label={`Sale Price (${CURRENCY_SYMBOL})`}
                value={salePrice}
                onChange={setSalePrice}
                placeholder="Optional"
              />
              <NumberField
                id="stock"
                label="Stock"
                value={stock}
                onChange={setStock}
                integer
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Dimensions & Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              {dimensions.map(([id, label, value, onChange]) => (
                <NumberField
                  key={id}
                  id={id}
                  label={label}
                  value={value}
                  onChange={onChange}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Product Videos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="YouTube video URL"
              />
              <Button type="button" onClick={addVideoUrl} variant="secondary">
                Add
              </Button>
            </div>
            {videoUrls.length > 0 && (
              <div className="space-y-2">
                {videoUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="flex-1 break-all text-sm">{url}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setVideoUrls((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Public Product Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayFieldLabels.map(({ key, label, description }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border p-3"
              >
                <div>
                  <Label htmlFor={`show-${key}`}>{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Checkbox
                  id={`show-${key}`}
                  checked={displaySettings[key]}
                  onCheckedChange={(checked) =>
                    setDisplaySettings((current) => ({
                      ...current,
                      [key]: checked === true,
                    }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <Label htmlFor="active">Active Product</Label>
              <p className="text-sm text-muted-foreground">
                Active products are visible in the shop.
              </p>
            </div>
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <Label htmlFor="available-for-sale">Available for sale</Label>

              <p className="text-sm text-muted-foreground">
                Customers can add this product to their cart even when stock is
                0. Useful for prebooking products.
              </p>
            </div>

            <Checkbox
              id="available-for-sale"
              checked={availableForSale}
              onCheckedChange={(checked) =>
                setAvailableForSale(checked === true)
              }
            />
          </CardContent>
        </Card>
        <Separator />
        <div className="flex items-center justify-between gap-3 pb-6">
          {editing ? (
            <Button
              type="button"
              variant="destructive"
              onClick={deleteProduct}
              disabled={deleting || saving || uploading}
            >
              {deleting ? "Deleting..." : "Delete Product"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin")}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveProduct}
              disabled={saving || uploading || deleting}
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Save Product"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder = "0",
  integer = false,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  integer?: boolean;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        step={integer ? "1" : "0.01"}
        min="0"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
