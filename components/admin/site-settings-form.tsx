"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createClient } from "@/lib/supabase/client";
import type { HeroMedia } from "@/components/storefront/hero-carousel";

export type SiteSettings = {
  theme: "golden" | "light" | "dark";
  hero_title: string;
  hero_description: string;
  hero_media: HeroMedia[] | null;
  homepage_category_ids: string[] | null;
  customer_review_images: string[] | null;
};
export type SocialLink = {
  id: string;
  name: string;
  url: string;
  icon_url: string;
};

export type StorefrontSettings = {
  id: string;

   // Social
  social_enabled: boolean;
  social_links: SocialLink[];

  // Payment
  twint_enabled: boolean;
  twint_phone: string | null;

  bank_transfer_enabled: boolean;
  bank_account_name: string | null;
  bank_iban: string | null;

  // Shipping
  shipping_enabled: boolean;
  shipping_method: string | null;
  shipping_price: number;
  free_shipping: boolean;

  // Store
  store_name: string | null;
  store_address: string | null;
  store_city: string | null;
  store_postal_code: string | null;
  store_country: string | null;
};

const defaults: SiteSettings = {
  theme: "golden",
  hero_title: "Something beautiful, just for you.",
  hero_description:
    "Discover jewellery, traditional treasures and delicious favourites, thoughtfully brought together for you.",
  hero_media: [],
  homepage_category_ids: [],
  customer_review_images: [],
};

export type HomepageCategory = {
  id: string;
  name: string;
};

const ALL_PRODUCTS_ID = "__all__";
const PREBOOKING_ID = "__prebooking__";

export function SiteSettingsForm({
  settings,
  categories = [],
  storefrontSettings,
}: {
  settings: SiteSettings | null;
  categories?: HomepageCategory[];
  storefrontSettings: StorefrontSettings | null;
}) {
  const router = useRouter();

  /*
   * ---------------------------------------------------------
   * SOCIAL MEDIA
   * ---------------------------------------------------------
   */

  const [socialEnabled, setSocialEnabled] = useState(
    storefrontSettings?.social_enabled ?? true,
  );

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    storefrontSettings?.social_links ?? [],
  );

  /*
   * ---------------------------------------------------------
   * SITE / HERO
   * ---------------------------------------------------------
   */

  const initial = {
    ...defaults,
    ...settings,
  };

  const [theme, setTheme] = useState<SiteSettings["theme"]>(
    initial.theme,
  );

  const [title, setTitle] = useState(initial.hero_title);

  const [description, setDescription] = useState(
    initial.hero_description,
  );

  const [media, setMedia] = useState<HeroMedia[]>(
    initial.hero_media ?? [],
  );
const [customerReviewImages, setCustomerReviewImages] =
  useState<string[]>(
    initial.customer_review_images ?? [],
  );
  const [homepageCategoryIds, setHomepageCategoryIds] =
    useState<string[]>(
      settings?.homepage_category_ids ?? [],
    );

  /*
   * ---------------------------------------------------------
   * PAYMENT
   * ---------------------------------------------------------
   */

  const [twintEnabled, setTwintEnabled] = useState(
    storefrontSettings?.twint_enabled ?? false,
  );

  const [twintPhone, setTwintPhone] = useState(
    storefrontSettings?.twint_phone ?? "",
  );

  const [bankTransferEnabled, setBankTransferEnabled] =
    useState(
      storefrontSettings?.bank_transfer_enabled ?? false,
    );

  const [bankAccountName, setBankAccountName] = useState(
    storefrontSettings?.bank_account_name ?? "",
  );

  const [bankIban, setBankIban] = useState(
    storefrontSettings?.bank_iban ?? "",
  );

  /*
   * ---------------------------------------------------------
   * SHIPPING
   * ---------------------------------------------------------
   */

  const [shippingEnabled, setShippingEnabled] = useState(
    storefrontSettings?.shipping_enabled ?? true,
  );

  const [shippingMethod, setShippingMethod] = useState(
    storefrontSettings?.shipping_method ?? "",
  );

  const [shippingPrice, setShippingPrice] = useState(
    storefrontSettings?.shipping_price?.toString() ?? "0",
  );

  const [freeShipping, setFreeShipping] = useState(
    storefrontSettings?.free_shipping ?? false,
  );

  /*
   * ---------------------------------------------------------
   * STORE ADDRESS
   * ---------------------------------------------------------
   */

  const [storeName, setStoreName] = useState(
    storefrontSettings?.store_name ?? "",
  );

  const [storeAddress, setStoreAddress] = useState(
    storefrontSettings?.store_address ?? "",
  );

  const [storeCity, setStoreCity] = useState(
    storefrontSettings?.store_city ?? "",
  );

  const [storePostalCode, setStorePostalCode] = useState(
    storefrontSettings?.store_postal_code ?? "",
  );

  const [storeCountry, setStoreCountry] = useState(
    storefrontSettings?.store_country ?? "Switzerland",
  );

  /*
   * ---------------------------------------------------------
   * UI STATE
   * ---------------------------------------------------------
   */

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

    function addSocialLink() {
    setSocialLinks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        url: "",
        icon_url: "",
      },
    ]);
  }

  function updateSocialLink(
    id: string,
    field: keyof SocialLink,
    value: string,
  ) {
    setSocialLinks((current) =>
      current.map((link) =>
        link.id === id
          ? { ...link, [field]: value }
          : link,
      ),
    );
  }

  function removeSocialLink(id: string) {
    setSocialLinks((current) =>
      current.filter((link) => link.id !== id),
    );
  }

  async function uploadSocialIcon(
    event: React.ChangeEvent<HTMLInputElement>,
    id: string,
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setUploading(true);

    try {
      const body = new FormData();

      body.append("file", file);
      body.append("folder", "social");

      const response = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Icon upload failed.",
        );
      }

      updateSocialLink(
        id,
        "icon_url",
        data.url as string,
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Icon upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

    /*
   * ---------------------------------------------------------
   * REMOVE HERO MEDIA
   * ---------------------------------------------------------
   */

  async function removeHeroMedia(index: number) {
    const item = media[index];

    if (!item) return;

    const confirmed = window.confirm(
      "Are you sure you want to remove this hero image?",
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        "/api/admin/cloudinary/delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: item.url,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to remove hero image.",
        );
      }

      setMedia((current) =>
        current.filter((_, itemIndex) => itemIndex !== index),
      );
    } catch (error) {
      console.error("Hero image removal error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to remove hero image.",
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * HERO MEDIA UPLOAD
   * ---------------------------------------------------------
   */

  async function uploadHeroMedia(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (!files.length) return;

    setUploading(true);

    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const body = new FormData();

          body.append("file", file);
          body.append("folder", "hero");

          const response = await fetch("/api/upload", {
            method: "POST",
            body,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || "Media upload failed.",
            );
          }

          return {
            url: data.url as string,
            type: file.type.startsWith("video/")
              ? ("video" as const)
              : ("image" as const),
          };
        }),
      );

      setMedia((current) => [...current, ...uploaded]);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Media upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }
async function uploadCustomerReviewImages(
  event: React.ChangeEvent<HTMLInputElement>,
) {
  const files = Array.from(event.target.files ?? []);

  event.target.value = "";

  if (!files.length) return;

  setUploading(true);

  try {
    const uploaded = await Promise.all(
      files.map(async (file) => {
        const body = new FormData();

        body.append("file", file);
        body.append("folder", "reviews");

        const response = await fetch("/api/upload", {
          method: "POST",
          body,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Review image upload failed.",
          );
        }

        return data.url as string;
      }),
    );

    setCustomerReviewImages((current) => [
      ...current,
      ...uploaded,
    ]);
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Review image upload failed.",
    );
  } finally {
    setUploading(false);
  }
}
async function removeCustomerReviewImage(index: number) {
  const url = customerReviewImages[index];

  if (!url) return;

  const confirmed = window.confirm(
    "Are you sure you want to remove this customer review image?",
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      "/api/admin/cloudinary/delete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to remove customer review image.",
      );
    }

    setCustomerReviewImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index),
    );
  } catch (error) {
    console.error(
      "Customer review image removal error:",
      error,
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to remove customer review image.",
    );
  }
}
  /*
   * ---------------------------------------------------------
   * SAVE EVERYTHING
   * ---------------------------------------------------------
   */

  async function saveSettings() {
    if (!title.trim() || !description.trim()) {
      alert(
        "Please provide a hero title and description.",
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      /*
       * -----------------------------------------------------
       * SAVE SITE SETTINGS
       * -----------------------------------------------------
       */

      const { error: siteSettingsError } =
        await supabase
          .from("site_settings")
          .upsert(
            {
              id: true,
              theme,
              hero_title: title.trim(),
              hero_description: description.trim(),
              hero_media: media,
              homepage_category_ids: homepageCategoryIds,
              customer_review_images: customerReviewImages,
            },
            {
              onConflict: "id",
            },
          );

      if (siteSettingsError) {
        throw siteSettingsError;
      }

      /*
       * -----------------------------------------------------
       * SAVE STOREFRONT SETTINGS
       * -----------------------------------------------------
       */

      const storefrontData = {
        /*
         * Social
         */
        social_enabled: socialEnabled,

        
        social_links: socialLinks,

        /*
         * Payment
         */
        twint_enabled: twintEnabled,

        twint_phone:
          twintPhone.trim() || null,

        bank_transfer_enabled:
          bankTransferEnabled,

        bank_account_name:
          bankAccountName.trim() || null,

        bank_iban:
          bankIban.trim() || null,

        /*
         * Shipping
         */
        shipping_enabled: shippingEnabled,

        shipping_method:
          shippingMethod.trim() || null,

        shipping_price: freeShipping
          ? 0
          : Number(shippingPrice) || 0,

        free_shipping: freeShipping,

        /*
         * Store
         */
        store_name:
          storeName.trim() || null,

        store_address:
          storeAddress.trim() || null,

        store_city:
          storeCity.trim() || null,

        store_postal_code:
          storePostalCode.trim() || null,

        store_country:
          storeCountry.trim() || "Switzerland",
      };

      /*
       * We already have one storefront_settings row.
       *
       * Use its UUID when available.
       */
      const payload = storefrontSettings?.id
        ? {
            id: storefrontSettings.id,
            ...storefrontData,
          }
        : storefrontData;

      const { error: storefrontError } =
        await supabase
          .from("storefront_settings")
          .upsert(payload, {
            onConflict: "id",
          });

      if (storefrontError) {
        throw storefrontError;
      }

      /*
       * -----------------------------------------------------
       * SUCCESS
       * -----------------------------------------------------
       */

      alert(
        "Storefront settings saved successfully.",
      );

      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error(
        "Storefront settings save error:",
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save storefront settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * PAGE
   * ---------------------------------------------------------
   */

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Storefront settings
        </h1>

        <p className="mt-2 text-muted-foreground">
          Choose your site palette and edit the homepage
          hero.
        </p>
      </div>

      <div className="space-y-4">

        {/* =====================================================
            COLOUR PALETTE
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>Colour palette</CardTitle>
          </CardHeader>

          <CardContent>
            <Label htmlFor="theme">
              Site mode
            </Label>

            <select
              id="theme"
              value={theme}
              onChange={(event) =>
                setTheme(
                  event.target.value as SiteSettings["theme"],
                )
              }
              className="mt-2 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="golden">
                Golden — warm and elegant
              </option>

              <option value="light">
                Light — clean and airy
              </option>

              <option value="dark">
                Dark — rich and modern
              </option>
            </select>
          </CardContent>
        </Card>

        {/* =====================================================
            HERO
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Homepage hero carousel
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="hero-title">
                Title
              </Label>

              <Input
                id="hero-title"
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-description">
                Description
              </Label>

              <Textarea
                id="hero-description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-upload">
                Upload images or videos (Max 4.5 MB each)
              </Label>

              <Input
                id="hero-upload"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={uploadHeroMedia}
                disabled={uploading}
              />

              <p className="text-sm text-muted-foreground">
                {uploading
                  ? "Uploading to Cloudinary..."
                  : "Files are uploaded to Cloudinary; only their URLs and media type are saved in Supabase."}
              </p>
            </div>

            {media.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {media.map((item, index) => (
                  <div
                    key={`${item.url}-${index}`}
                    className="relative overflow-hidden rounded-lg border"
                  >
                    {item.type === "video" ? (
                      <video
                        src={item.url}
                        controls
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={item.url}
                        alt={`Hero media ${index + 1}`}
                        width={300}
                        height={300}
                        unoptimized
                        className="aspect-square w-full object-cover"
                      />
                    )}

                                       <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeHeroMedia(index)}
                      className="absolute right-2 top-2"
                    >
                      Remove
                    </Button>

                    <p className="px-2 py-1 text-xs text-muted-foreground">
                      {item.type}
                    </p>
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        </Card>

        {/* =====================================================
            HOMEPAGE PRODUCT STRIPS
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Homepage Product Strips
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Choose which product strips appear on the
              homepage and arrange them in the order you
              want.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">

            {homepageCategoryIds.length > 0 && (
              <div className="space-y-2">
                <Label>
                  Homepage order
                </Label>

                <div className="space-y-2">
                  {homepageCategoryIds.map(
                    (id, index) => {
                      const isAll =
                        id === ALL_PRODUCTS_ID;

                      const isPrebooking =
                        id === PREBOOKING_ID;

                      const category =
                        categories.find(
                          (item) => item.id === id,
                        );

                      const label = isAll
                        ? "ALL PRODUCTS"
                        : isPrebooking
                          ? "PREBOOKING"
                          : (category?.name ??
                            "Unknown category");

                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </span>

                            <span className="font-medium">
                              {label}
                            </span>
                          </div>

                          <div className="flex gap-1">

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={index === 0}
                              onClick={() => {
                                setHomepageCategoryIds(
                                  (current) => {
                                    const next = [
                                      ...current,
                                    ];

                                    [
                                      next[index - 1],
                                      next[index],
                                    ] = [
                                      next[index],
                                      next[index - 1],
                                    ];

                                    return next;
                                  },
                                );
                              }}
                            >
                              ↑
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={
                                index ===
                                homepageCategoryIds.length -
                                  1
                              }
                              onClick={() => {
                                setHomepageCategoryIds(
                                  (current) => {
                                    const next = [
                                      ...current,
                                    ];

                                    [
                                      next[index],
                                      next[index + 1],
                                    ] = [
                                      next[index + 1],
                                      next[index],
                                    ];

                                    return next;
                                  },
                                );
                              }}
                            >
                              ↓
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHomepageCategoryIds(
                                  (current) =>
                                    current.filter(
                                      (item) =>
                                        item !== id,
                                    ),
                                );
                              }}
                            >
                              Remove
                            </Button>

                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Add product strip
              </Label>

              <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-lg border p-2">

                {/* ALL PRODUCTS */}

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={homepageCategoryIds.includes(
                      ALL_PRODUCTS_ID,
                    )}
                    onChange={(event) => {
                      setHomepageCategoryIds(
                        (current) =>
                          event.target.checked
                            ? [
                                ...current,
                                ALL_PRODUCTS_ID,
                              ]
                            : current.filter(
                                (id) =>
                                  id !==
                                  ALL_PRODUCTS_ID,
                              ),
                      );
                    }}
                  />

                  <span className="font-medium">
                    ALL PRODUCTS
                  </span>
                </label>

                {/* PREBOOKING */}

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={homepageCategoryIds.includes(
                      PREBOOKING_ID,
                    )}
                    onChange={(event) => {
                      setHomepageCategoryIds(
                        (current) =>
                          event.target.checked
                            ? [
                                ...current,
                                PREBOOKING_ID,
                              ]
                            : current.filter(
                                (id) =>
                                  id !==
                                  PREBOOKING_ID,
                              ),
                      );
                    }}
                  />

                  <span className="font-medium">
                    PREBOOKING
                  </span>
                </label>

                {/* CATEGORIES */}

                {categories.map((category) => {
                  const checked =
                    homepageCategoryIds.includes(
                      category.id,
                    );

                  return (
                    <label
                      key={category.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setHomepageCategoryIds(
                            (current) =>
                              event.target.checked
                                ? [
                                    ...current,
                                    category.id,
                                  ]
                                : current.filter(
                                    (id) =>
                                      id !==
                                      category.id,
                                  ),
                          );
                        }}
                      />

                      <span className="font-medium">
                        {category.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground">
                Scroll to see more categories. The box
                shows about 5 items at a time.
              </p>
            </div>

          </CardContent>
        </Card>

  {/* =====================================================
    CUSTOMER REVIEWS
====================================================== */}

<Card>
  <CardHeader>
    <CardTitle>
      Customer Review Images
    </CardTitle>

    <p className="text-sm text-muted-foreground">
      Upload screenshots or images of customer reviews.
      These will appear in a sliding gallery on the
      homepage.
    </p>
  </CardHeader>

  <CardContent className="space-y-4">

    <div className="space-y-2">
      <Label htmlFor="customer-review-upload">
        Upload review images
      </Label>

      <Input
        id="customer-review-upload"
        type="file"
        accept="image/*"
        multiple
        onChange={uploadCustomerReviewImages}
        disabled={uploading}
      />

      <p className="text-xs text-muted-foreground">
        {uploading
          ? "Uploading to Cloudinary..."
          : "You can upload multiple customer review images."}
      </p>
    </div>

    {customerReviewImages.length > 0 && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {customerReviewImages.map((url, index) => (
          <div
            key={`${url}-${index}`}
            className="relative overflow-hidden rounded-lg border"
          >
            <Image
              src={url}
              alt={`Customer review ${index + 1}`}
              width={300}
              height={300}
              unoptimized
              className="aspect-square w-full object-cover"
            />

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() =>
                removeCustomerReviewImage(index)
              }
              className="absolute right-2 top-2"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
    )}

    {customerReviewImages.length === 0 && (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        No customer review images uploaded yet.
      </p>
    )}

  </CardContent>
</Card>
        {/* =====================================================
            SOCIAL MEDIA
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>

            <p className="text-sm text-muted-foreground">
              Add as many social media links as you like.
              Each link can have its own name, URL and icon.
            </p>
          </CardHeader>

          <CardContent className="space-y-5">

            {/* ENABLE / DISABLE */}

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={socialEnabled}
                onChange={(event) =>
                  setSocialEnabled(event.target.checked)
                }
              />

              <span className="font-medium">
                Show social media on homepage
              </span>
            </label>

            {socialEnabled && (
              <div className="space-y-4">

                {/* SOCIAL LINKS */}

                {socialLinks.map((link, index) => (
                  <div
                    key={link.id}
                    className="rounded-xl border p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Social link {index + 1}
                      </span>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeSocialLink(link.id)
                        }
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="space-y-4">

                      {/* NAME */}

                      <div className="space-y-2">
                        <Label
                          htmlFor={`social-name-${link.id}`}
                        >
                          Name
                        </Label>

                        <Input
                          id={`social-name-${link.id}`}
                          value={link.name}
                          onChange={(event) =>
                            updateSocialLink(
                              link.id,
                              "name",
                              event.target.value,
                            )
                          }
                          placeholder="Instagram"
                        />
                      </div>

                      {/* URL */}

                      <div className="space-y-2">
                        <Label
                          htmlFor={`social-url-${link.id}`}
                        >
                          Link
                        </Label>

                        <Input
                          id={`social-url-${link.id}`}
                          type="url"
                          value={link.url}
                          onChange={(event) =>
                            updateSocialLink(
                              link.id,
                              "url",
                              event.target.value,
                            )
                          }
                          placeholder="https://..."
                        />
                      </div>

                      {/* ICON */}

                      <div className="space-y-2">
                        <Label>
                          Icon
                        </Label>

                        <div className="flex items-center gap-4">

                          {/* CURRENT ICON */}

                          {link.icon_url ? (
                            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border">
                              <Image
                                src={link.icon_url}
                                alt={
                                  link.name ||
                                  "Social icon"
                                }
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground">
                              No icon
                            </div>
                          )}

                          {/* UPLOAD */}

                          <div className="space-y-1">
                            <Input
                              id={`social-icon-${link.id}`}
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                uploadSocialIcon(
                                  event,
                                  link.id,
                                )
                              }
                              disabled={uploading}
                            />

                            <p className="text-xs text-muted-foreground">
                              {uploading
                                ? "Uploading..."
                                : "Upload an icon image."}
                            </p>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                {/* ADD BUTTON */}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addSocialLink}
                  className="w-full"
                >
                  + Add social link
                </Button>

                {socialLinks.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground">
                    No social links added yet.
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  You can add unlimited social links. The
                  name you enter here will appear below the
                  circular icon on the homepage.
                </p>

              </div>
            )}

          </CardContent>
        </Card>



        {/* =====================================================
            PAYMENT
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Payment Methods
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Choose which manual payment methods
              customers can use.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* TWINT */}

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={twintEnabled}
                  onChange={(event) =>
                    setTwintEnabled(
                      event.target.checked,
                    )
                  }
                />

                <span className="font-medium">
                  Enable TWINT
                </span>
              </label>

              {twintEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="twint-phone">
                    TWINT phone number
                  </Label>

                  <Input
                    id="twint-phone"
                    value={twintPhone}
                    onChange={(event) =>
                      setTwintPhone(
                        event.target.value,
                      )
                    }
                    placeholder="+41 ..."
                  />
                </div>
              )}
            </div>

            {/* BANK TRANSFER */}

            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={bankTransferEnabled}
                  onChange={(event) =>
                    setBankTransferEnabled(
                      event.target.checked,
                    )
                  }
                />

                <span className="font-medium">
                  Enable Bank Transfer
                </span>
              </label>

              {bankTransferEnabled && (
                <div className="space-y-4">

                  <div className="space-y-2">
                    <Label htmlFor="bank-account-name">
                      Account name
                    </Label>

                    <Input
                      id="bank-account-name"
                      value={bankAccountName}
                      onChange={(event) =>
                        setBankAccountName(
                          event.target.value,
                        )
                      }
                      placeholder="Account holder name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank-iban">
                      IBAN
                    </Label>

                    <Input
                      id="bank-iban"
                      value={bankIban}
                      onChange={(event) =>
                        setBankIban(
                          event.target.value,
                        )
                      }
                      placeholder="CH..."
                    />
                  </div>

                </div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* =====================================================
            SHIPPING
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Shipping
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              Configure the shipping method and price
              shown during checkout.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={shippingEnabled}
                onChange={(event) =>
                  setShippingEnabled(
                    event.target.checked,
                  )
                }
              />

              <span className="font-medium">
                Enable shipping
              </span>
            </label>

            {shippingEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="shipping-method">
                    Shipping service
                  </Label>

                  <Input
                    id="shipping-method"
                    value={shippingMethod}
                    onChange={(event) =>
                      setShippingMethod(
                        event.target.value,
                      )
                    }
                    placeholder="Swiss Post"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping-price">
                    Shipping price (CHF)
                  </Label>

                  <Input
                    id="shipping-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingPrice}
                    onChange={(event) =>
                      setShippingPrice(
                        event.target.value,
                      )
                    }
                    disabled={freeShipping}
                  />
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={freeShipping}
                    onChange={(event) =>
                      setFreeShipping(
                        event.target.checked,
                      )
                    }
                  />

                  <span className="font-medium">
                    Free shipping
                  </span>
                </label>
              </>
            )}

          </CardContent>
        </Card>

        {/* =====================================================
            STORE ADDRESS
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>
              Store / Admin Address
            </CardTitle>

            <p className="text-sm text-muted-foreground">
              This address can later be used for shipping
              and returns.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="store-name">
                Store name
              </Label>

              <Input
                id="store-name"
                value={storeName}
                onChange={(event) =>
                  setStoreName(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="store-address">
                Address
              </Label>

              <Input
                id="store-address"
                value={storeAddress}
                onChange={(event) =>
                  setStoreAddress(
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              <div className="space-y-2">
                <Label htmlFor="store-postal-code">
                  Postal code
                </Label>

                <Input
                  id="store-postal-code"
                  value={storePostalCode}
                  onChange={(event) =>
                    setStorePostalCode(
                      event.target.value,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store-city">
                  City
                </Label>

                <Input
                  id="store-city"
                  value={storeCity}
                  onChange={(event) =>
                    setStoreCity(
                      event.target.value,
                    )
                  }
                />
              </div>

            </div>

            <div className="space-y-2">
              <Label htmlFor="store-country">
                Country
              </Label>

              <Input
                id="store-country"
                value={storeCountry}
                onChange={(event) =>
                  setStoreCountry(
                    event.target.value,
                  )
                }
              />
            </div>

          </CardContent>
        </Card>

        {/* =====================================================
            BUTTONS
        ====================================================== */}

        <div className="flex justify-end gap-3">

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              router.push("/admin")
            }
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={saveSettings}
            disabled={saving || uploading}
          >
            {saving
              ? "Saving..."
              : "Save storefront"}
          </Button>

        </div>

      </div>
    </main>
  );
}