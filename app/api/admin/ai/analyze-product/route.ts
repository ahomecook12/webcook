import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MODEL = "gemini-3.5-flash-lite";

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
        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 },
        );
      }

      const supabase = createServiceRoleClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        console.error(
          "Mobile AI authentication failed:",
          userError,
        );

        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 },
        );
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error(
          "Admin profile lookup failed:",
          profileError,
        );

        return NextResponse.json(
          { error: "Unauthorized." },
          { status: 401 },
        );
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
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    // -------------------------------------------------------
    // GEMINI CONFIGURATION
    // -------------------------------------------------------

    const apiKey = process.env.GEMINI_API_KEY;

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

    const { data: allowed, error: usageError } =
      await supabase.rpc("consume_ai_analysis");

    if (usageError) {
      console.error(
        "AI usage check failed:",
        usageError,
      );

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

    const contentType =
      request.headers.get("content-type") ?? "";

    let base64Image = "";
    let mimeType = "image/jpeg";

    if (contentType.includes("application/json")) {
      // -----------------------------------------------------
      // MOBILE
      // -----------------------------------------------------

      const body = await request.json();

      if (
        !body?.imageBase64 ||
        typeof body.imageBase64 !== "string"
      ) {
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
            error:
              "Image is too large. Please use an image under 10 MB.",
          },
          { status: 400 },
        );
      }

      mimeType = file.type;

      const bytes = await file.arrayBuffer();

      base64Image = Buffer.from(bytes).toString(
        "base64",
      );
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
    // GEMINI
    // -------------------------------------------------------

    const ai = new GoogleGenAI({
      apiKey,
    });

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            {
              text: `
Analyze this product image for an Indian products online shop.

Return ONLY valid JSON with these fields:

{
  "name": "short product name",
  "description": "useful customer-facing product description",
  "suggestedCategory": "best category for this product",
  "size": "size if clearly visible or inferable, otherwise empty string",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Rules:
- Do not invent exact materials, measurements, brands, ingredients,
  certifications, or other facts that cannot reasonably be determined
  from the image.
- If something is uncertain, use a cautious description.
- Keep the product name concise.
- Write the description in clear, attractive English suitable for an
  online shop.
- suggestedCategory should be a simple category name such as Jewelry,
  Dresses, Puja Items, Decorations, Food, etc.
- If size cannot be determined, return an empty string.
- Return 5 to 10 useful search keywords.
- Keywords should describe visible or reasonably inferable characteristics
  such as color, product type, style, occasion, use, pattern, or audience.
- Include useful shopping terms such as "gift" only when they are
  reasonably appropriate for the product.
- Keep keywords short, normally one or two words each.
- Do not use hashtags.
- Do not invent specific materials, brands, measurements, or claims.
`,
            },
          ],
        },
      ],
    });

    // -------------------------------------------------------
    // PARSE GEMINI RESPONSE
    // -------------------------------------------------------

    const text = response.text?.trim();

    if (!text) {
      throw new Error(
        "AI returned an empty response.",
      );
    }

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result: {
      name?: string;
      description?: string;
      suggestedCategory?: string;
      size?: string;
      keywords?: string[];
    };

    try {
      result = JSON.parse(cleaned);
    } catch {
      throw new Error(
        "AI returned an invalid response.",
      );
    }

    // -------------------------------------------------------
    // RETURN RESULT
    // -------------------------------------------------------

    return NextResponse.json({
      name:
        typeof result.name === "string"
          ? result.name
          : "",

      description:
        typeof result.description === "string"
          ? result.description
          : "",

      suggestedCategory:
        typeof result.suggestedCategory === "string"
          ? result.suggestedCategory
          : "",

      size:
        typeof result.size === "string"
          ? result.size
          : "",

      keywords: Array.isArray(result.keywords)
        ? result.keywords
            .filter(
              (keyword: unknown): keyword is string =>
                typeof keyword === "string",
            )
            .map((keyword: string) =>
              keyword.trim().toLowerCase(),
            )
            .filter((keyword: string) =>
              Boolean(keyword),
            )
            .slice(0, 10)
        : [],
    });
  } catch (error) {
    console.error(
      "Product AI analysis error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message.toLowerCase()
        : "";

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
        error:
          error instanceof Error
            ? error.message
            : "AI analysis failed.",
        code: "AI_ERROR",
      },
      { status: 500 },
    );
  }
}