"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SHOP_NAME } from "@/app/constants";

export type HeroMedia = {
  url: string;
  type: "image" | "video";
};

export function HeroCarousel({ media }: { media: HeroMedia[] }) {
  const [active, setActive] = useState(0);

  const hasMultiple = media.length > 1;

  /*
   * Keep the displayed index safe without calling setState
   * inside an effect.
   */
  const safeActive = media.length > 0 ? Math.min(active, media.length - 1) : 0;

  const item = media[safeActive];

  const previous = () =>
    setActive((current) => (current - 1 + media.length) % media.length);

  const next = () => setActive((current) => (current + 1) % media.length);

  /*
   * Images automatically move after 6 seconds.
   * Videos control their own timing and move when they finish.
   */
  useEffect(() => {
    if (
      !hasMultiple ||
      !media[safeActive] ||
      media[safeActive].type === "video"
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActive((current) => (current + 1) % media.length);
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [active, hasMultiple, media, media.length, safeActive]);

  if (!item) return null;

  return (
    <div className="relative aspect-[5/6] overflow-hidden rounded-xl bg-muted shadow-lg">
      {item.type === "video" ? (
        <video
          key={item.url}
          src={item.url}
          autoPlay
          muted
          playsInline
          controls
          onEnded={hasMultiple ? next : undefined}
          className="h-full w-full object-cover"
        />
      ) : (
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
                onClick={() => setActive(index)}
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
