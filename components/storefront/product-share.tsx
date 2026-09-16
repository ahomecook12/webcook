"use client";

import { useState } from "react";
import {
  Check,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Share2,
  X,
} from "lucide-react";
import { SHOP_NAME } from "@/app/constants";

type ProductShareProps = {
  productId: string;
  productName: string;
  imageUrl?: string;
  videoUrl?: string;
};

export default function ProductShare({
  productId,
  productName,
  imageUrl,
  videoUrl,
}: ProductShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  /*
   * IMPORTANT:
   *
   * We intentionally do NOT use NEXT_PUBLIC_SITE_URL.
   *
   * window.location.origin automatically gives:
   *
   * localhost:
   * http://localhost:3000
   *
   * Production:
   * https://your-production-site.vercel.app
   *
   * Therefore every shared product link points to the
   * website the customer is actually using.
   */
  const siteUrl = window.location.origin;

  const productUrl = `${siteUrl}/products/${productId}`;

  const isVideo = Boolean(videoUrl);

  const shareText = isVideo
    ? `Check out this video of ${productName} at ${SHOP_NAME} 🛍️`
    : `Check out ${productName} at ${SHOP_NAME} 🛍️`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      alert("Could not copy the product link.");
    }
  }

  async function nativeShare() {
    setSharing(true);

    try {
      /*
       * IMAGE SHARING
       *
       * Try to share the actual image file.
       *
       * The product URL is also included so that the
       * customer can come back to the product page.
       */
      if (imageUrl && navigator.share) {
        try {
          const response = await fetch(imageUrl);

          if (response.ok) {
            const blob = await response.blob();

            const extension =
              blob.type === "image/png"
                ? "png"
                : blob.type === "image/webp"
                  ? "webp"
                  : "jpg";

            const safeName = productName
              .replace(/[^a-z0-9]/gi, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "");

            const file = new File(
              [blob],
              `${safeName || "product"}.${extension}`,
              {
                type: blob.type || "image/jpeg",
              },
            );

            if (
              navigator.canShare &&
              navigator.canShare({
                files: [file],
              })
            ) {
              await navigator.share({
                title: productName,
                text: `${shareText}\n\n${productUrl}`,
                files: [file],
              });

              setOpen(false);
              return;
            }
          }
        } catch (error) {
          /*
           * If the image file cannot be shared,
           * continue to normal link sharing.
           */
          console.log(
            "[share] Could not share image file, falling back:",
            error,
          );
        }
      }

      /*
       * VIDEO / NORMAL SHARE
       *
       * For videos we share:
       *
       * 1. YouTube video URL
       * 2. Product page URL
       */
      if (navigator.share) {
        const text = videoUrl
          ? `${shareText}\n\nWatch the video:\n${videoUrl}\n\nView the product:\n${productUrl}`
          : `${shareText}\n\n${productUrl}`;

        await navigator.share({
          title: productName,
          text,
          url: productUrl,
        });

        setOpen(false);
        return;
      }

      /*
       * Browser does not support native sharing.
       */
      await copyLink();

      alert(
        "The product link has been copied. You can now paste it into WhatsApp, Instagram, Facebook, Messages, or another app.",
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error("[share] Share failed:", error);

      try {
        await copyLink();

        alert(
          "The product link has been copied. You can now paste it into your preferred app.",
        );
      } catch {
        alert("Unable to share this product.");
      }
    } finally {
      setSharing(false);
    }
  }

  async function shareWhatsApp() {
    const text = videoUrl
      ? `${shareText}\n\nWatch the video:\n${videoUrl}\n\nView the product:\n${productUrl}`
      : `${shareText}\n\nView the product:\n${productUrl}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );

    setOpen(false);
  }

  async function shareEmail() {
    const subject = `Check out ${productName}`;

    const body = videoUrl
      ? `${shareText}\n\nWatch the video:\n${videoUrl}\n\nView the product:\n${productUrl}`
      : `${shareText}\n\nView the product:\n${productUrl}`;

    window.location.href =
      `mailto:?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;

    setOpen(false);
  }

  return (
    <>
      {/* Small share button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={sharing}
        className="flex h-9 items-center gap-2 rounded-full bg-background/95 px-3 text-sm font-medium text-foreground shadow-md backdrop-blur transition hover:bg-background disabled:opacity-60"
        aria-label={
          isVideo
            ? "Share this video"
            : "Share this image"
        }
        title={
          isVideo
            ? "Share this video"
            : "Share this image"
        }
      >
        <Share2 className="h-4 w-4" />

        <span className="hidden sm:inline">
          {sharing
            ? "Sharing..."
            : isVideo
              ? "Share video"
              : "Share"}
        </span>
      </button>

      {/* Share dialog */}
      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Heading */}
            <div className="pr-8">
              <h2 className="text-xl font-semibold">
                {isVideo
                  ? "Share this video"
                  : "Share this image"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {productName}
              </p>
            </div>

            {/* Native share */}
            <button
              type="button"
              onClick={nativeShare}
              disabled={sharing}
              className="mt-6 flex h-12 w-full items-center rounded-lg bg-primary px-4 text-left text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Share2 className="mr-3 h-5 w-5" />

              {sharing
                ? "Sharing..."
                : "More sharing options"}
            </button>

            {/* Direct options */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {/* WhatsApp */}
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={shareEmail}
                className="flex h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                <Mail className="mr-2 h-5 w-5" />
                Email
              </button>

              {/* Copy product URL */}
              <button
                type="button"
                onClick={copyLink}
                className="col-span-2 flex h-11 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
              >
                {copied ? (
                  <Check className="mr-2 h-5 w-5" />
                ) : (
                  <LinkIcon className="mr-2 h-5 w-5" />
                )}

                {copied
                  ? "Product link copied!"
                  : "Copy product link"}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              The shared link always points to this product page.
            </p>
          </div>
        </div>
      )}
    </>
  );
}