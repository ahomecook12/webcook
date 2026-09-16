
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendPushNotification } from "@/lib/notifications/sendPushNotification";

/* =========================================================
   EXPO PUSH NOTIFICATION
   ========================================================= */

async function sendExpoPushNotification({
  token,
  title,
  body,
  data = {},
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const response = await fetch(
      "https://exp.host/--/api/v2/push/send",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: token,
          sound: "default",
          title,
          body,
          data,
          channelId: "default",
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "❌ Expo push notification failed:",
        result,
      );

      return null;
    }

    console.log(
      "✅ Expo push notification sent:",
      result,
    );

    return result;
  } catch (error) {
    console.error(
      "❌ Expo push notification error:",
      error,
    );

    return null;
  }
}

/* =========================================================
   POST — Create order
   ========================================================= */

export async function POST(request: Request) {
 
  try {
    const authHeader = request.headers.get("authorization");

    const accessToken =
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : undefined;

    const supabase = await createClient(accessToken);

    /* =====================================================
       Require logged-in user
       ===================================================== */

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be logged in to place an order.",
        },
        { status: 401 },
      );
    }

    /* =====================================================
       Read request body
       ===================================================== */

    const body = await request.json();

    const {
      full_name,
      phone,
      address,
      city,
      postal_code,
      country,
      payment_method,
    } = body;

    /* =====================================================
       Shipping validation
       ===================================================== */

    if (
      !full_name?.trim() ||
      !phone?.trim() ||
      !address?.trim() ||
      !city?.trim() ||
      !postal_code?.trim() ||
      !country?.trim()
    ) {
      return NextResponse.json(
        {
          error: "Please complete your shipping address.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       Payment method validation
       ===================================================== */

    if (
      !["twint", "bank_transfer"].includes(
        payment_method,
      )
    ) {
      return NextResponse.json(
        {
          error: "Please select a valid payment method.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       Find user's cart
       ===================================================== */

    const { data: cart, error: cartError } =
      await supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (cartError) {
      throw cartError;
    }

    if (!cart) {
      return NextResponse.json(
        {
          error: "Your cart is empty.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       Get cart items + products
       ===================================================== */

    const {
      data: cartItems,
      error: itemsError,
    } = await supabase
      .from("cart_items")
      .select(
        `
          id,
          quantity,
          product:products!cart_items_product_id_fkey(
            id,
            name,
            price,
            sale_price,
            stock,
            active,
            available_for_sale,
            weight_grams,
            size,
            height,
            width,
            depth
          )
        `,
      )
      .eq("cart_id", cart.id)
      .order("created_at");

    if (itemsError) {
      throw itemsError;
    }

    /* =====================================================
       Normalize product relationship
       ===================================================== */

    const items = (cartItems ?? []).map((item) => ({
      ...item,
      product: Array.isArray(item.product)
        ? (item.product[0] ?? null)
        : item.product,
    }));

    if (items.length === 0) {
      return NextResponse.json(
        {
          error: "Your cart is empty.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       Validate every cart item
       ===================================================== */

    for (const item of items) {
      if (!item.product) {
        return NextResponse.json(
          {
            error:
              "One of the products in your cart is no longer available.",
          },
          { status: 400 },
        );
      }

      const product = item.product;

      if (!product.active) {
        return NextResponse.json(
          {
            error: `${product.name} is no longer available.`,
          },
          { status: 400 },
        );
      }

      const stock = product.stock ?? 0;

      const availableForSale =
        product.available_for_sale ?? false;

      const isPreBooking =
        !availableForSale && stock <= 0;

      const isNormalSale =
        availableForSale && stock > 0;

      const canOrder =
        isNormalSale || isPreBooking;

      if (!canOrder) {
        return NextResponse.json(
          {
            error: `${product.name} is currently unavailable.`,
          },
          { status: 400 },
        );
      }

      if (
        !isPreBooking &&
        item.quantity > stock
      ) {
        return NextResponse.json(
          {
            error: `Not enough stock available for ${product.name}.`,
          },
          { status: 400 },
        );
      }
    }

    /* =====================================================
       Calculate subtotal
       ===================================================== */

    const subtotal = items.reduce(
      (total, item) => {
        if (!item.product) {
          return total;
        }

        const price =
          item.product.sale_price ??
          item.product.price;

        return (
          total +
          Number(price) * item.quantity
        );
      },
      0,
    );

    /* =====================================================
       Get storefront settings
       ===================================================== */

    const {
      data: storefrontSettings,
      error: settingsError,
    } = await supabase
      .from("storefront_settings")
      .select(
        `
          shipping_enabled,
          shipping_method,
          shipping_price,
          free_shipping,
          twint_enabled,
          bank_transfer_enabled
        `,
      )
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    /* =====================================================
       Validate payment method availability
       ===================================================== */

    if (
      payment_method === "twint" &&
      !storefrontSettings?.twint_enabled
    ) {
      return NextResponse.json(
        {
          error: "TWINT is currently unavailable.",
        },
        { status: 400 },
      );
    }

    if (
      payment_method === "bank_transfer" &&
      !storefrontSettings?.bank_transfer_enabled
    ) {
      return NextResponse.json(
        {
          error:
            "Bank transfer is currently unavailable.",
        },
        { status: 400 },
      );
    }

    /* =====================================================
       Calculate shipping
       ===================================================== */

    const shippingCost =
      storefrontSettings?.shipping_enabled
        ? storefrontSettings.free_shipping
          ? 0
          : Number(
              storefrontSettings.shipping_price ?? 0,
            )
        : 0;

    /* =====================================================
       Calculate final total
       ===================================================== */

    const total = subtotal + shippingCost;

    /* =====================================================
       Create order
       ===================================================== */

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,

        status: "pending_payment",

        payment_method,

        payment_status: "pending",

        subtotal,

        shipping_cost: shippingCost,

        total,

        shipping_name: full_name.trim(),

        shipping_phone: phone.trim(),

        shipping_address: address.trim(),

        shipping_city: city.trim(),

        shipping_postal_code:
          postal_code.trim(),

        shipping_country: country.trim(),
      })
      .select("id, order_number")
      .single();

    if (orderError) {
      throw orderError;
    }

    /* =====================================================
       Create order items
       ===================================================== */

    const orderItems = items.map((item) => {
      const product = item.product!;

      const unitPrice =
        product.sale_price ??
        product.price;

      return {
        order_id: order.id,

        product_id: product.id,

        product_name: product.name,

        quantity: item.quantity,

        unit_price: Number(unitPrice),

        total_price:
          Number(unitPrice) *
          item.quantity,

        weight_grams:
          product.weight_grams,

        size: product.size,

        height: product.height,

        width: product.width,

        depth: product.depth,
      };
    });

    const {
      error: orderItemsError,
    } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (orderItemsError) {
      throw orderItemsError;
    }

    /* =====================================================
       Update user's profile
       ===================================================== */

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          full_name: full_name.trim(),

          phone: phone.trim(),

          address: address.trim(),

          city: city.trim(),

          postal_code: postal_code.trim(),

          country: country.trim(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", user.id);

    if (profileError) {
      throw profileError;
    }

    /* =====================================================
       Clear cart
       ===================================================== */

    const {
      error: clearCartError,
    } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cart.id);

    if (clearCartError) {
      throw clearCartError;
    }

    /* =========================================================
       NOTIFICATIONS
       ========================================================= */

    const serviceSupabase =
      createServiceRoleClient();

    /* =========================================================
       1. CUSTOMER DATABASE NOTIFICATION
       ========================================================= */

    const {
      error: customerNotificationError,
    } = await serviceSupabase
      .from("notifications")
      .insert({
        user_id: user.id,

        type: "order_placed",

        title: "Order placed",

        message:
          `Your order ${order.order_number} ` +
          `has been placed successfully.`,

        order_id: order.id,
      });

    if (customerNotificationError) {
      console.error(
        "Failed to create customer order notification:",
        customerNotificationError,
      );
    }

    /* =========================================================
       2. FIND ALL ADMINS
       ========================================================= */

    const {
      data: admins,
      error: adminsError,
    } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (adminsError) {
      console.error(
        "Failed to find admins for notification:",
        adminsError,
      );
    } else if (
      admins &&
      admins.length > 0
    ) {
      /* =======================================================
         Create admin database notifications
         ======================================================= */

      const adminNotifications =
        admins.map((admin) => ({
          user_id: admin.id,

          type: "admin_order_placed",

          title: "New order received",

          message:
            `A new order ${order.order_number} ` +
            `has been placed.`,

          order_id: order.id,
        }));

      const {
        error: adminNotificationError,
      } = await serviceSupabase
        .from("notifications")
        .insert(
          adminNotifications,
        );

      if (adminNotificationError) {
        console.error(
          "Failed to create admin order notification:",
          adminNotificationError,
        );
      }

      /* =======================================================
         3. PUSH NOTIFICATIONS

         Send to every admin device:

         - Android app → Expo push token
         - Web browser → Firebase web push token
         ======================================================= */

      const adminIds =
        admins.map(
          (admin) => admin.id,
        );

      const {
        data: pushTokens,
        error: pushTokensError,
      } = await serviceSupabase
        .from("push_tokens")
        .select(
          `
            user_id,
            expo_push_token,
            web_push_token,
            platform
          `,
        )
        .in("user_id", adminIds);

       

      if (pushTokensError) {
        console.error(
          "Failed to find admin push tokens:",
          pushTokensError,
        );
      } else if (
        pushTokens &&
        pushTokens.length > 0
      ) {
        /* =====================================================
           Send push notification to every registered device
           ===================================================== */

        const pushPromises =
          pushTokens.map(async (pushToken) => {
            const pushData = {
              type: "order",
              order_id: order.id,
            };

            /* =================================================
               ANDROID / EXPO
               ================================================= */

            if (
              pushToken.expo_push_token
            ) {
              await sendExpoPushNotification({
                token:
                  pushToken.expo_push_token,

                title:
                  "New order received",

                body:
                  `Order ${order.order_number} ` +
                  `has been placed.`,

                data: pushData,
              });
            }

            /* =================================================
               WEB / FIREBASE
               ================================================= */

            if (
              pushToken.web_push_token
            ) {
              await sendPushNotification({
                token:
                  pushToken.web_push_token,

                title:
                  "New order received",

                body:
                  `Order ${order.order_number} ` +
                  `has been placed.`,

                data: pushData,
              });
            }
          });

        /*
         * Push notifications are secondary.
         *
         * We deliberately do NOT let a push failure
         * make the order creation fail.
         */

        const pushResults =
          await Promise.allSettled(
            pushPromises,
          );

        pushResults.forEach(
          (result) => {
            if (
              result.status ===
              "rejected"
            ) {
              console.error(
                "Push notification failed:",
                result.reason,
              );
            }
          },
        );
      }
    }

    /* =====================================================
       SUCCESS
       ===================================================== */

    return NextResponse.json({
      success: true,

      order_id: order.id,

      order_number:
        order.order_number,
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create order.",
      },
      { status: 500 },
    );
  }
}
