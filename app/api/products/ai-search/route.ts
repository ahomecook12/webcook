import { SHOP_NAME } from "@/app/constants";
import { NextResponse } from "next/server";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const MODEL = "openrouter/free";

type ProductForSearch = {
  id: string;
  name: string;
  description: string | null;
  keywords: string[] | null;
};

export async function POST(request: Request) {
  try {
    const { query, products } = (await request.json()) as {
      query?: string;
      products?: ProductForSearch[];
    };

    // -------------------------------------------------------
    // VALIDATE SEARCH QUERY
    // -------------------------------------------------------

    if (!query?.trim()) {
      return NextResponse.json({
        productIds: [],
      });
    }

    // -------------------------------------------------------
    // VALIDATE PRODUCTS
    // -------------------------------------------------------

    if (!Array.isArray(products)) {
      return NextResponse.json(
        {
          error: "Invalid products data.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // OPENROUTER CONFIGURATION
    // -------------------------------------------------------

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "AI search is currently unavailable.",
        },
        { status: 503 },
      );
    }

    // -------------------------------------------------------
    // PREPARE PRODUCT CATALOGUE
    // -------------------------------------------------------

    const productList = products.map(
      (product) => ({
        id: product.id,
        name: product.name,
        description:
          product.description ?? "",
        keywords:
          product.keywords ?? [],
      }),
    );

    // -------------------------------------------------------
    // AI SEARCH PROMPT
    // -------------------------------------------------------

    const prompt = `
You are a product search assistant for an Indian online shop.

The customer searched for:

"${query.trim()}"

Here is the available product catalogue:

${JSON.stringify(productList)}

Your task is to find products that are relevant to the
customer's search.

Understand natural language, synonyms, intent, occasion,
product type, color, style, audience, and use.

Examples:

- "something for a wedding" can match jewellery, sarees,
  dresses, decorations, etc.

- "gold earrings" can match products described as gold
  or earrings.

- "something spicy" can match spicy food products.

- "gift for my mother" should return products that could
  reasonably be suitable gifts.

- "puja" should return relevant religious or puja products.

Only return products that are reasonably relevant to the
customer's search.

Return ONLY a JSON object in exactly this format:

{
  "productIds": ["id1", "id2"]
}

IMPORTANT:

- Only use product IDs that actually exist in the catalogue.
- Never invent product IDs.
- Do not modify product IDs.
- If nothing is relevant, return:
  {
    "productIds": []
  }
- Do not return explanations.
- Do not return markdown.
- Do not return code fences.
- Do not return safety messages.
- The entire response must be valid JSON.
`;

    // -------------------------------------------------------
    // OPENROUTER REQUEST
    // -------------------------------------------------------

    const openRouterResponse = await fetch(
      OPENROUTER_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000",
          "X-Title":
            `${SHOP_NAME} AI Search`,
        },
        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",
              content:
                "You are a product search assistant. You MUST return only valid JSON. Never return safety messages, explanations, markdown, or code fences.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          response_format: {
            type: "json_object",
          },
        }),
      },
    );

    // -------------------------------------------------------
    // READ OPENROUTER RESPONSE
    // -------------------------------------------------------

    const responseData =
      await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      console.error(
        "OpenRouter AI search error:",
        responseData,
      );

      const providerMessage =
        responseData?.error?.message ||
        "OpenRouter request failed.";

      throw new Error(providerMessage);
    }

    const text =
      responseData?.choices?.[0]?.message?.content
        ?.trim();

    // -------------------------------------------------------
    // EMPTY RESPONSE
    // -------------------------------------------------------

    if (!text) {
      console.warn(
        "OpenRouter AI search returned an empty response.",
      );

      return NextResponse.json({
        productIds: [],
      });
    }

    // -------------------------------------------------------
    // HANDLE NON-JSON SAFETY RESPONSE
    // -------------------------------------------------------

    if (
      text.toLowerCase().includes("user safety:")
    ) {
      console.warn(
        "OpenRouter AI search returned a safety response:",
        text,
      );

      return NextResponse.json({
        productIds: [],
      });
    }

    // -------------------------------------------------------
    // CLEAN POSSIBLE MARKDOWN
    // -------------------------------------------------------

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // -------------------------------------------------------
    // PARSE JSON
    // -------------------------------------------------------

    let parsed: {
      productIds?: unknown;
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error(
        "Invalid AI search JSON response:",
        text,
        parseError,
      );

      return NextResponse.json({
        productIds: [],
      });
    }

    // -------------------------------------------------------
    // VALIDATE PRODUCT IDS
    // -------------------------------------------------------

    const validIds = new Set(
      products.map(
        (product) => product.id,
      ),
    );

    const productIds =
      Array.isArray(parsed.productIds)
        ? parsed.productIds.filter(
            (
              id: unknown,
            ): id is string =>
              typeof id === "string" &&
              validIds.has(id),
          )
        : [];

    // -------------------------------------------------------
    // RETURN RESULTS
    // -------------------------------------------------------

    return NextResponse.json({
      productIds,
    });
  } catch (error) {
    console.error(
      "AI search error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : "";

    // -------------------------------------------------------
    // RATE LIMIT / QUOTA
    // -------------------------------------------------------

    if (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("temporarily rate-limited") ||
      message.includes("429")
    ) {
      return NextResponse.json(
        {
          error:
            "AI search is temporarily unavailable because the AI usage limit has been reached.",
        },
        { status: 429 },
      );
    }

    // -------------------------------------------------------
    // GENERAL ERROR
    // -------------------------------------------------------

    return NextResponse.json(
      {
        error:
          "AI search is currently unavailable.",
      },
      { status: 503 },
    );
  }
}
