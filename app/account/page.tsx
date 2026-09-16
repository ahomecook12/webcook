import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "@/components/storefront/account-form";
import  Link  from "next/link";
import { SHOP_NAME } from "../constants";

export default async function AccountPage() {
const supabase = await createClient();

const {
data: { user },
} = await supabase.auth.getUser();

if (!user) {
redirect("/auth/login?redirectTo=/account");
}

const { data: profile, error } = await supabase
.from("profiles")
.select(
"full_name, phone, address_line1, address_line2, city, postal_code, country",
)
.eq("id", user.id)
.maybeSingle();

if (error) {
throw new Error(error.message);
}

return (
<main className="min-h-screen bg-background">
<header className="border-b">
<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
<Link href="/" className="text-lg font-semibold tracking-tight" >
{SHOP_NAME}
</Link>

      <nav className="flex items-center gap-2">
        <Link
          href="/products"
          className="text-sm font-medium text-primary hover:underline"
        >
          Products
        </Link>

        <Link
          href="/cart"
          className="text-sm font-medium text-primary hover:underline"
        >
          Cart
        </Link>
      </nav>
    </div>
  </header>

  <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
    <div className="mb-8">
      <h1 className="text-3xl font-semibold tracking-tight">
        My account
      </h1>

      <p className="mt-2 text-muted-foreground">
        Keep your contact and delivery details up to date.
      </p>
    </div>

    <AccountForm
      email={user.email ?? ""}
      profile={profile}
    />
  </div>
</main>

);
}