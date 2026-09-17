"use client";

import Image from "next/image";
import { useState } from "react";
import { X, Maximize2 } from "lucide-react";
import ProductShare from "@/components/storefront/product-share";

type ProductGalleryProps = {
  productId: string;
  productName: string;
  images: string[];
  videos: string[];
};

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // youtube.com/watch?v=VIDEO_ID
    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      // youtube.com/shorts/VIDEO_ID
      if (parsed.pathname.startsWith("/shorts/")) {
        const videoId = parsed.pathname
          .split("/shorts/")[1]
          ?.split("/")[0];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      // youtube.com/embed/VIDEO_ID
      if (parsed.pathname.startsWith("/embed/")) {
        return url;
      }
    }

    // youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1).split("/")[0];

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeWatchUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com"
    ) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }

      if (parsed.pathname.startsWith("/shorts/")) {
        const videoId = parsed.pathname
          .split("/shorts/")[1]
          ?.split("/")[0];

        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }

      if (parsed.pathname.startsWith("/embed/")) {
        const videoId = parsed.pathname
          .split("/embed/")[1]
          ?.split("/")[0];

        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    }

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1).split("/")[0];

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
    }

    return url;
  } catch {
    return url;
  }
}

export default function ProductGallery({
  productId,
  productName,
  images,
  videos,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <>
      <div className="space-y-5">
        {/* Product Images */}
        {images.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="group relative overflow-hidden rounded-xl border bg-muted"
              >
                {/* Image */}
                <button
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className="relative block aspect-square w-full cursor-zoom-in"
                  aria-label={`View ${productName} image ${index + 1}`}
                >
                  <Image
                    src={image}
                    alt={`${productName} ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </button>

                {/* Image controls */}
                <div className="absolute right-2 top-2 flex gap-2">
                  {/* Enlarge */}
                  <button
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-md backdrop-blur hover:bg-background"
                    aria-label="Enlarge image"
                    title="View larger"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>

                  {/* Share */}
                  <ProductShare
                    productId={productId}
                    productName={productName}
                    imageUrl={image}
                  />
                </div>

                {/* Image number */}
                <div className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium shadow backdrop-blur">
                  {index + 1} / {images.length}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-xl bg-muted text-muted-foreground">
            No image available
          </div>
        )}

        {/* YouTube Videos */}
        {videos.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Product videos</h2>

            <div className="space-y-4">
              {videos.map((url, index) => {
                const embedUrl = getYouTubeEmbedUrl(url);
                const watchUrl = getYouTubeWatchUrl(url);

                return (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-xl border bg-muted"
                  >
                    {embedUrl ? (
                      <>
                        {/* Embedded YouTube video */}
                        <div className="aspect-video">
                          <iframe
                            src={embedUrl}
                            title={`${productName} video ${index + 1}`}
                            className="h-full w-full"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>

                        {/* Video footer */}
                        <div className="flex items-center justify-between gap-3 border-t bg-background px-3 py-2">
                          <p className="text-sm font-medium">
                            Product video {index + 1}
                          </p>

                          <ProductShare
                            productId={productId}
                            productName={productName}
                            videoUrl={watchUrl}
                          />
                        </div>
                      </>
                    ) : (
                      /* YouTube fallback */
                      <div className="p-4">
                        <p className="text-sm font-medium">
                          Product video {index + 1}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          This video could not be embedded here.
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-primary underline underline-offset-4"
                          >
                            Watch on YouTube
                          </a>

                          <ProductShare
                            productId={productId}
                            productName={productName}
                            videoUrl={url}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Large Image Dialog */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative h-[90vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={selectedImage}
              alt={productName}
              fill
              sizes="90vw"
              unoptimized
              className="object-contain"
              priority
            />

            {/* Close */}
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg hover:bg-background"
              aria-label="Close image preview"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Share from enlarged image */}
            <div className="absolute bottom-3 right-3">
              <ProductShare
                productId={productId}
                productName={productName}
                imageUrl={selectedImage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}