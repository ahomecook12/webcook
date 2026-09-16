
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/storefront/site-header";

export default async function SiteHeaderWrapper() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let cartCount = 0;

  if (user) {
    const [{ data: profile }, { data: cart }] = await Promise.all([
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("carts")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    isAdmin = profile?.role === "admin";

    if (cart) {
      const { data: cartItems } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("cart_id", cart.id);

      cartCount = (cartItems ?? []).reduce(
        (total, item) => total + item.quantity,
        0,
      );
    }
  }

  return (
    <SiteHeader
      isLoggedIn={!!user}
      isAdmin={isAdmin}
      cartCount={cartCount}
      userId={user?.id}
    />
  );
}
