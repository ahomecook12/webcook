"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SHOP_NAME } from "@/app/constants";

export type HeroMedia = {
  url: string;
  type: "image" | "youtube";
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);

    // https://www.youtube.com/watch?v=VIDEO_ID
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }

      // https://www.youtube.com/embed/VIDEO_ID
      if (parsed.pathname.startsWith("/embed/")) {
        const videoId = parsed.pathname.split("/embed/")[1];

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
        }
      }
    }

    // https://youtu.be/VIDEO_ID
    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1);

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }
    }
  } catch {
    // Invalid URL
  }

  return null;
}

function getYouTubeThumbnail(url: string) {
  try {
    const parsed = new URL(url);

    let videoId = "";

    if (parsed.hostname.includes("youtube.com")) {
      videoId = parsed.searchParams.get("v") ?? "";

      if (!videoId && parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1] ?? "";
      }
    }

    if (parsed.hostname === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    }

    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
  } catch {
    // Invalid URL
  }

  return null;
}

export function HeroCarousel({ media }: { media: HeroMedia[] }) {
  const [active, setActive] = useState(0);
  const [youtubePlaying, setYoutubePlaying] = useState(false);

  const hasMultiple = media.length > 1;

  const safeActive = media.length > 0 ? Math.min(active, media.length - 1) : 0;

  const item = media[safeActive];

  /*
   * Change slide.
   *
   * We reset YouTube here instead of inside an effect.
   * This avoids React's cascading-render warning.
   */
  const goToSlide = (index: number) => {
    setYoutubePlaying(false);
    setActive(index);
  };

  const previous = () => {
    if (!media.length) return;

    setYoutubePlaying(false);

    setActive((current) => (current - 1 + media.length) % media.length);
  };

  const next = () => {
    if (!media.length) return;

    setYoutubePlaying(false);

    setActive((current) => (current + 1) % media.length);
  };

  /*
   * Images automatically move after 6 seconds.
   *
   * YouTube does not automatically load or play.
   */
  useEffect(() => {
    if (!hasMultiple || !media[safeActive]) {
      return;
    }

    const timer = window.setTimeout(() => {
      setYoutubePlaying(false);

      setActive((current) => (current + 1) % media.length);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [active, hasMultiple, media, safeActive]);

  if (!item) return null;

  const youtubeEmbedUrl =
    item.type === "youtube" ? getYouTubeEmbedUrl(item.url) : null;

  const youtubeThumbnail =
    item.type === "youtube" ? getYouTubeThumbnail(item.url) : null;

  return (
    <div className="relative aspect-[5/6] overflow-hidden rounded-xl bg-muted shadow-lg">
      {item.type === "image" ? (
        <Image
          key={item.url}
          src={item.url}
          alt={`${SHOP_NAME} feature ${safeActive + 1}`}
          width={1000}
          height={800}
          unoptimized
          className="h-full w-full object-cover"
          priority={safeActive === 0}
        />
      ) : youtubePlaying && youtubeEmbedUrl ? (
        /*
         * The YouTube iframe is created ONLY after the visitor
         * clicks the play button.
         */
        <iframe
          key={youtubeEmbedUrl}
          src={youtubeEmbedUrl}
          title={`${SHOP_NAME} YouTube video`}
          className="h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        /*
         * YouTube holder.
         *
         * No iframe exists here, so YouTube is not loaded merely
         * because the homepage was opened.
         */
        <button
          type="button"
          onClick={() => {
            if (youtubeEmbedUrl) {
              setYoutubePlaying(true);
            }
          }}
          disabled={!youtubeEmbedUrl}
          aria-label="Play YouTube video"
          className="group relative h-full w-full"
        >
          {youtubeThumbnail ? (
            <Image
              src={youtubeThumbnail}
              alt={`${SHOP_NAME} YouTube video`}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-muted" />
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-2xl text-black shadow-lg transition-transform duration-200 group-hover:scale-110">
              ▶
            </span>
          </span>
        </button>
      )}

      {hasMultiple && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={previous}
            aria-label="Previous hero media"
            className="absolute left-3 top-1/2 -translate-y-1/2"
          >
            ←
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={next}
            aria-label="Next hero media"
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            →
          </Button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {media.map((mediaItem, index) => (
              <button
                key={`${mediaItem.url}-${index}`}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Show hero media ${index + 1}`}
                className={`h-2 w-2 rounded-full ${
                  index === safeActive ? "bg-primary" : "bg-background/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
