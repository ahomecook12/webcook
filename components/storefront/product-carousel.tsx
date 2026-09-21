"use client";

import { CURRENCY_SYMBOL } from "@/app/constants";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";

type DisplaySettings = {
  price?: boolean;
};

export type CarouselProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  images: string[] | null;
  display_settings: DisplaySettings | null;
  active: boolean;
  sticker?: string | null;
};

function ProductCard({
  product,
  catalogMode = false,
}: {
  product: CarouselProduct;
  catalogMode?: boolean;
}) {
  const showPrice = !catalogMode && product.display_settings?.price !== false;
  const image = product.images?.[0];

  return (
    <Link
      href={`/products/${product.id}`}
      draggable={false}
      className="group block w-[220px] shrink-0 select-none sm:w-[250px] lg:w-[270px]"
      onClick={(event) => {
        if (window.getSelection()?.toString()) {
          event.preventDefault();
        }
      }}
    >
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm transition-transform duration-300 group-hover:scale-[1.04] group-hover:shadow-lg">
        <div className="relative">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              width={640}
              height={640}
              unoptimized
              draggable={false}
              className="aspect-square w-full object-cover"
            />
          ) : (
            <div className="flex aspect-square items-center justify-center bg-muted text-sm text-muted-foreground">
              No image
            </div>
          )}

          {/* Custom sticker */}
          {product.sticker && (
            <div className="absolute left-3 top-3">
              <span
                className="
                  inline-flex items-center rounded-full
                  bg-red-600 px-3 py-1.5
                  text-xs font-bold tracking-wide text-white
                  shadow-[3px_3px_0px_white,-3px_-3px_0px_red]
                  transition-transform duration-300
                  group-hover:scale-105
                  animate-sticker-shadow
                "
              >
                ✦ {product.sticker}
              </span>
            </div>
          )}
        </div>

        <div className="p-4">
          <h4 className="truncate font-medium" title={product.name}>
            {product.name}
          </h4>

          {showPrice && (
            <div className="mt-1 text-sm">
              {product.sale_price != null ? (
                <>
                  <span>{CURRENCY_SYMBOL} {Number(product.sale_price).toFixed(2)}</span>

                  <span className="ml-2 text-muted-foreground line-through">
                    {CURRENCY_SYMBOL} {Number(product.price).toFixed(2)}
                  </span>
                </>
              ) : (
                `${CURRENCY_SYMBOL} ${Number(product.price).toFixed(2)}`
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCarousel({
  products,
  catalogMode = false,
}: {
  products: CarouselProduct[];
  catalogMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const animationFrame = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);

  const mouseDown = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  /*
   * Duplicate the products.
   *
   * When we reach the second copy, we jump back
   * by exactly half of the total scroll width.
   * Because both copies are identical, this jump
   * is visually invisible.
   */
  const items = [...products, ...products];

  /*
   * Automatic scrolling.
   */
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const speed = 35; // pixels per second

    const animate = (time: number) => {
      if (lastTime.current === null) {
        lastTime.current = time;
      }

      const delta = time - lastTime.current;
      lastTime.current = time;

      if (!paused && !dragging && !mouseDown.current) {
        container.scrollLeft += (speed * delta) / 1000;

        const halfWidth = container.scrollWidth / 2;

        if (container.scrollLeft >= halfWidth) {
          container.scrollLeft -= halfWidth;
        }
      }

      animationFrame.current = requestAnimationFrame(animate);
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current !== null) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [paused, dragging]);

  /*
   * Mouse drag — desktop.
   */
  function handleMouseDown(event: MouseEvent<HTMLDivElement>) {
    const container = containerRef.current;

    if (!container) return;

    mouseDown.current = true;
    setDragging(true);
    setPaused(true);

    startX.current = event.clientX;
    startScrollLeft.current = container.scrollLeft;
  }

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const container = containerRef.current;

    if (!container || !mouseDown.current) return;

    const distance = event.clientX - startX.current;

    container.scrollLeft = startScrollLeft.current - distance;

    /*
     * Keep manual dragging seamless.
     */
    const halfWidth = container.scrollWidth / 2;

    if (container.scrollLeft >= halfWidth) {
      container.scrollLeft -= halfWidth;
      startScrollLeft.current -= halfWidth;
      startX.current = event.clientX;
    }

    if (container.scrollLeft < 0) {
      container.scrollLeft += halfWidth;
      startScrollLeft.current += halfWidth;
      startX.current = event.clientX;
    }
  }

  function stopDragging() {
    mouseDown.current = false;
    setDragging(false);
    setPaused(false);
  }

  if (!products.length) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No products in this category yet.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-x-auto overflow-y-hidden scrollbar-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onMouseEnter={() => {
        if (!dragging) {
          setPaused(true);
        }
      }}
      onMouseLeave={() => {
        stopDragging();
        setPaused(false);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      style={{
        touchAction: "pan-x",
        overscrollBehaviorX: "contain",
      }}
    >
      <div className="flex w-max gap-5 pb-2">
        {items.map((product, index) => (
          <ProductCard
            key={`${product.id}-${index}`}
            product={product}
            catalogMode={catalogMode}
          />
        ))}
      </div>
    </div>
  );
}
