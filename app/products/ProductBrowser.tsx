"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
  price: number;
  sale_price: number | null;
  images: string[];
  categoryIds: string[];
  sticker: string | null;
  created_at: string;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function ProductBrowser({
  products,
  categories,
  initialCategory,
  catalogMode = false,
}: {
  products: Product[];
  categories: Category[];
  initialCategory?: string;
  catalogMode?: boolean;
}) {
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory || "all",
  );

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [aiSearching, setAiSearching] = useState(false);
  const [aiProductIds, setAiProductIds] = useState<string[] | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  const handleAISearch = async () => {
    const query = search.trim();

    if (!query) {
      setAiProductIds(null);
      return;
    }

    setAiSearching(true);
    setAiUnavailable(false);

    try {
      const response = await fetch("/api/products/ai-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            keywords: product.keywords,
          })),
        }),
      });

      if (!response.ok) {
        setAiUnavailable(true);
        setAiProductIds(null);
        return;
      }

      const data = await response.json();

      setAiProductIds(data.productIds ?? []);
    } catch (error) {
      console.error("AI search request failed:", error);
      setAiUnavailable(true);
      setAiProductIds(null);
    } finally {
      setAiSearching(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    const result = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "all" ||
        product.categoryIds.includes(selectedCategory);

      /*
       * If AI search is active, let AI decide which products match.
       * Do NOT apply normal text matching as well.
       */
      if (aiProductIds !== null) {
        return matchesCategory && aiProductIds.includes(product.id);
      }

      /*
       * Normal search
       */
      const keywordText = (product.keywords ?? []).join(" ");

      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm) ||
        (product.description ?? "").toLowerCase().includes(searchTerm) ||
        keywordText.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });

    /*
     * Sorting
     */
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "most-expensive":
          return (b.sale_price ?? b.price) - (a.sale_price ?? a.price);

        case "least-expensive":
          return (a.sale_price ?? a.price) - (b.sale_price ?? b.price);

        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

        case "newest":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });
  }, [products, selectedCategory, search, sortBy, aiProductIds]);

  return (
    <div className="mt-8">
      {/* Search + Sort */}
      <div className="relative z-20 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full gap-2 sm:max-w-xl">
          <Input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);

              // Return to normal search when the text changes.
              setAiProductIds(null);
              setAiUnavailable(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAISearch();
              }
            }}
          />

          <Button
            type="button"
            onClick={handleAISearch}
            disabled={aiSearching || !search.trim()}
            className="shrink-0 gap-2"
          >
            {aiSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI
              </>
            )}
          </Button>
        </div>

            {!catalogMode && (
        <Select
          value={sortBy}
          onValueChange={(value) => {
            if (value) setSortBy(value);
          }}
        >
          <SelectTrigger className="w-full sm:w-[190px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>

          <SelectContent className="z-50 min-w-[190px] rounded-xl border bg-background p-1 shadow-xl">
            <SelectItem
              value="newest"
              className="cursor-pointer rounded-lg py-2.5"
            >
              Newest
            </SelectItem>

            <SelectItem
              value="most-expensive"
              className="cursor-pointer rounded-lg py-2.5"
            >
              Most expensive
            </SelectItem>

            <SelectItem
              value="least-expensive"
              className="cursor-pointer rounded-lg py-2.5"
            >
              Least expensive
            </SelectItem>

            <SelectItem
              value="oldest"
              className="cursor-pointer rounded-lg py-2.5"
            >
              Oldest
            </SelectItem>
          </SelectContent>
        </Select> 
            )}
      </div>

      {aiUnavailable && (
        <p className="mt-2 text-sm text-muted-foreground">
          AI search is currently unavailable. You can still use normal search.
        </p>
      )}

      {aiProductIds !== null && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            ✨ AI search found {aiProductIds.length}{" "}
            {aiProductIds.length === 1 ? "product" : "products"}.
          </p>

          <button
            type="button"
            onClick={() => {
              setAiProductIds(null);
              setSearch("");
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            × Clear AI search
          </button>
        </div>
      )}

      {/* Categories */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2 pb-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mt-6 text-sm text-muted-foreground">
        {filteredProducts.length}{" "}
        {filteredProducts.length === 1 ? "product" : "products"}
      </p>

      {/* Products */}
      {filteredProducts.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filteredProducts.map((product) => {
            const image = product.images[0] ?? null;

            const isOnSale =
              product.sale_price !== null && product.sale_price < product.price;

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                {/* Image */}
                <div className="relative overflow-hidden bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={product.name}
                      width={600}
                      height={600}
                      unoptimized
                      className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
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

                {/* Product information */}
                <div className="p-4">
                  <h2 className="line-clamp-2 text-base font-semibold leading-6 transition-colors group-hover:text-primary">
                    {product.name}
                  </h2>

                  {!catalogMode &&
                    (isOnSale ? (
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="text-md font-bold">
                          CHF {product.sale_price!.toFixed(2)}
                        </span>

                        <span className="text-md text-muted-foreground line-through">
                          CHF {product.price.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1.5 text-md font-bold">
                        CHF {product.price.toFixed(2)}
                      </p>
                    ))}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed p-10 text-center">
          <p className="font-medium">No products found.</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Try another search or category.
          </p>
        </div>
      )}
    </div>
  );
}
