
"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronRight, X, Sparkles } from "lucide-react";

export default function CustomerReviewDrawer({
  images,
}: {
  images: string[];
}) {
  const [open, setOpen] = useState(false);

  if (!images.length) {
    return null;
  }

  return (
    <>
 {/* Sparkling rainbow floating button */}
{!open && (
  <div className="fixed left-0 top-28 z-40">
    <div className="group relative animate-[float_3s_ease-in-out_infinite]">

      {/* Rainbow glow */}
      <div
        className="
          pointer-events-none
          absolute
          -inset-2
          rounded-r-full
          bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
          opacity-80
          blur-md
          
        "
        style={{
          animationDuration: "4s",
        }}
      />

      {/* Rainbow outer ring */}
      <div
        className="
          relative
          rounded-r-full
          bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
          p-[3px]
          shadow-[0_0_20px_rgba(255,255,255,0.7)]
          transition-all
          duration-300
          group-hover:scale-110
          group-hover:shadow-[0_0_30px_rgba(255,255,255,0.95)]
          
        "
        style={{
          animationDuration: "5s",
        }}
      >

        {/* Button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="View customer reviews"
          className="
            relative
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-r-full
            border-0
            bg-background
            text-primary
            shadow-xl
          "
        >
          <ChevronRight className="relative z-10 h-6 w-6" />

          {/* Bright sparkle */}
          <Sparkles
            className="
              absolute
              -right-2
              -top-3
              z-20
              h-5
              w-5
              text-yellow-300
              drop-shadow-[0_0_5px_rgba(255,255,255,1)]
              drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]
              animate-pulse
            "
          />

          {/* Tiny second sparkle */}
          <Sparkles
            className="
              absolute
              right-0
              -bottom-2
              z-20
              h-3
              w-3
              text-pink-400
              drop-shadow-[0_0_6px_rgba(255,255,255,1)]
              animate-pulse
            "
            style={{
              animationDelay: "400ms",
            }}
          />

          {/* Shimmer */}
          <span className="pointer-events-none absolute inset-1 overflow-hidden rounded-r-full">
            <span
              className="
                absolute
                -left-8
                top-0
                h-full
                w-4
                rotate-12
                bg-white/70
                blur-sm
                animate-[shine_2.5s_ease-in-out_infinite]
              "
            />
          </span>
        </button>
      </div>
    </div>
  </div>
)}

      {/* Overlay */}
      {open && (
        <button
          type="button"
          aria-label="Close customer reviews"
          onClick={() => setOpen(false)}
          className="
            fixed
            inset-0
            z-40
            cursor-default
            bg-black/30
            backdrop-blur-[2px]
          "
        />
      )}

      {/* Sliding panel */}
      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          w-[min(88vw,420px)]
          flex-col
          border-r
          bg-background
          shadow-2xl
          transition-transform
          duration-500
          ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-primary">
              FROM OUR CUSTOMERS
            </p>

            <h2 className="mt-1 text-xl font-semibold">
              Customer reviews
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close customer reviews"
            className="
              rounded-full
              p-2
              text-muted-foreground
              transition
              hover:bg-muted
              hover:text-foreground
            "
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Vertical image gallery */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {images.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="
                  overflow-hidden
                  rounded-xl
                  border
                  bg-muted/20
                  shadow-sm
                "
              >
                <Image
                  src={image}
                  alt={`Customer review ${index + 1}`}
                  width={800}
                  height={1000}
                  unoptimized
                  className="h-auto w-full object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
