import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MODEL = "openrouter/free";

export async function POST(request: Request) {
  try {
    // -------------------------------------------------------
    // AUTHENTICATION
    //
    // Web shop:
    //   Uses the normal Supabase cookie session.
    //
    // Mobile app:
    //   Uses Authorization: Bearer <access_token>.
    // -------------------------------------------------------

    const authorization = request.headers.get("authorization");

    let isAdmin = false;

    if (authorization?.startsWith("Bearer ")) {
      // -----------------------------------------------------
      // MOBILE AUTH
      // -----------------------------------------------------

      const accessToken = authorization.slice("Bearer ".length).trim();

      if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const supabase = createServiceRoleClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        console.error("Mobile AI authentication failed:", userError);

        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Admin profile lookup failed:", profileError);

        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }

      isAdmin = profile?.role === "admin";
    } else {
      // -----------------------------------------------------
      // WEB SHOP AUTH
      // -----------------------------------------------------

      const adminCheck = await requireAdmin();

      isAdmin = adminCheck.isAdmin;
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // -------------------------------------------------------
    // OPENROUTER CONFIGURATION
    // -------------------------------------------------------

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "AI is not configured.",
          code: "AI_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    // -------------------------------------------------------
    // DAILY AI ALLOWANCE
    // -------------------------------------------------------

    const supabase = createServiceRoleClient();

    const { data: allowed, error: usageError } = await supabase.rpc(
      "consume_ai_analysis",
    );

    if (usageError) {
      console.error("AI usage check failed:", usageError);

      return NextResponse.json(
        {
          error: "AI is temporarily unavailable.",
          code: "AI_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Today's AI analysis limit has been reached. AI analysis will be available again tomorrow.",
          code: "AI_LIMIT_REACHED",
        },
        { status: 429 },
      );
    }

    // -------------------------------------------------------
    // READ IMAGE
    //
    // Web sends FormData.
    // Mobile sends JSON with base64 image.
    // -------------------------------------------------------

    const contentType = request.headers.get("content-type") ?? "";

    let base64Image = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("application/json")) {
      // -----------------------------------------------------
      // MOBILE
      // -----------------------------------------------------

      const body = await request.json();

      if (!body?.imageBase64 || typeof body.imageBase64 !== "string") {
        return NextResponse.json(
          {
            error: "Please provide one product image.",
          },
          { status: 400 },
        );
      }

      base64Image = body.imageBase64;

      if (
        typeof body.mimeType === "string" &&
        body.mimeType.startsWith("image/")
      ) {
        mimeType = body.mimeType;
      }
    } else {
      // -----------------------------------------------------
      // WEB SHOP
      // -----------------------------------------------------

      const formData = await request.formData();
      const file = formData.get("image");

      if (!(file instanceof File)) {
        return NextResponse.json(
          {
            error: "Please provide one product image.",
          },
          { status: 400 },
        );
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          {
            error: "The selected file must be an image.",
          },
          { status: 400 },
        );
      }

      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: "Image is too large. Please use an image under 10 MB.",
          },
          { status: 400 },
        );
      }

      mimeType = file.type;

      const bytes = await file.arrayBuffer();

      base64Image = Buffer.from(bytes).toString("base64");
    }

    // -------------------------------------------------------
    // SAFETY CHECK
    // -------------------------------------------------------

    if (!base64Image) {
      return NextResponse.json(
        {
          error: "Could not read the product image.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------
    // PRODUCT AI PROMPT
    // -------------------------------------------------------

    const prompt = `
Analyze this product image for an Indian products online shop.

Return ONLY valid JSON in exactly this structure:

{
  "name": "short product name",
  "description": "useful customer-facing product description",
  "suggestedCategory": "best category for this product",
  "size": "size if clearly visible or inferable, otherwise empty string",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- Do not invent exact materials, measurements, brands, ingredients, certifications, or other facts that cannot reasonably be determined from the image.
- If something is uncertain, use a cautious description.
- Keep the product name concise.
- Write the description in clear, attractive English suitable for an online shop.
- suggestedCategory should be a simple category name such as Jewelry, Dresses, Puja Items, Decorations, Food, etc.
- If size cannot be determined, return an empty string.
- Return 5 to 10 useful search keywords.
- Keywords should describe visible or reasonably inferable characteristics such as color, product type, style, occasion, use, pattern, or audience.
- Include useful shopping terms such as "gift" only when they are reasonably appropriate for the product.
- Keep keywords short, normally one or two words each.
- Do not use hashtags.
- Do not invent specific materials, brands, measurements, or claims.
`;

    // -------------------------------------------------------
    // OPENROUTER REQUEST
    // -------------------------------------------------------

    const openRouterResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer":
            process.env.NEXT_PUBLIC_WEB_API_URL ?? "http://localhost:3000",
          "X-Title": "A Home Cook",
        },
        body: JSON.stringify({
          model: MODEL,

          messages: [
            {
              role: "system",
              content:
                "You are a product catalog assistant. Your response MUST be a single valid JSON object. Never output safety messages, explanations, markdown, code fences, or any text before or after the JSON.",
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],

          response_format: {
            type: "json_object",
          },
        }),
      },
    );

    const responseData = await openRouterResponse.json();

    // -------------------------------------------------------
    // OPENROUTER ERROR
    // -------------------------------------------------------

    if (!openRouterResponse.ok) {
      console.error("OpenRouter product AI error:", responseData);

      const providerMessage =
        responseData?.error?.message || "OpenRouter request failed.";

      const providerCode = responseData?.error?.code;

      if (openRouterResponse.status === 429 || providerCode === 429) {
        return NextResponse.json(
          {
            error: "AI is temporarily busy. Please try again in a moment.",
            code: "AI_LIMIT_REACHED",
          },
          { status: 429 },
        );
      }

      throw new Error(providerMessage);
    }

    // -------------------------------------------------------
    // GET AI RESPONSE
    // -------------------------------------------------------

    let text = responseData?.choices?.[0]?.message?.content;

    // Some OpenRouter responses can return content
    // as an array instead of a plain string.
    if (Array.isArray(text)) {
      text = text
        .map((item: unknown) => {
          if (typeof item === "object" && item !== null && "text" in item) {
            return String((item as { text?: unknown }).text ?? "");
          }

          return "";
        })
        .join("");
    }

    if (typeof text !== "string") {
      throw new Error("AI returned an empty response.");
    }

    text = text.trim();

    // -------------------------------------------------------
    // CLEAN JSON
    //
    // Free models sometimes add text before/after JSON.
    // Extract the JSON object if necessary.
    // -------------------------------------------------------

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    // -------------------------------------------------------
    // PARSE JSON
    // -------------------------------------------------------

    let result: {
      name?: string;
      description?: string;
      suggestedCategory?: string;
      size?: string;
      keywords?: string[];
    };

    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error("Invalid AI JSON response:", text, parseError);

      throw new Error("AI returned an invalid response.");
    }

    // -------------------------------------------------------
    // RETURN RESULT
    // -------------------------------------------------------

    return NextResponse.json({
      name: typeof result.name === "string" ? result.name : "",

      description:
        typeof result.description === "string" ? result.description : "",

      suggestedCategory:
        typeof result.suggestedCategory === "string"
          ? result.suggestedCategory
          : "",

      size: typeof result.size === "string" ? result.size : "",

      keywords: Array.isArray(result.keywords)
        ? result.keywords
            .filter(
              (keyword: unknown): keyword is string =>
                typeof keyword === "string",
            )
            .map((keyword: string) => keyword.trim().toLowerCase())
            .filter((keyword: string) => Boolean(keyword))
            .slice(0, 10)
        : [],
    });
  } catch (error) {
    console.error("Product AI analysis error:", error);

    const message = error instanceof Error ? error.message.toLowerCase() : "";

    if (
      message.includes("quota") ||
      message.includes("rate limit") ||
      message.includes("resource exhausted") ||
      message.includes("429")
    ) {
      return NextResponse.json(
        {
          error:
            "AI is temporarily unavailable because the AI usage limit has been reached.",
          code: "AI_LIMIT_REACHED",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI analysis failed.",
        code: "AI_ERROR",
      },
      { status: 500 },
    );
  }
}
