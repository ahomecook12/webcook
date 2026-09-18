import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

const adminCards = [
  {
    title: "Products",
    description: "Add, edit and manage your shop products.",
    href: "/admin/products",
    icon: "🛍️",
  },
  {
    title: "Orders",
    description: "View and manage customer orders and payments.",
    href: "/admin/orders",
    icon: "📦",
  },
  {
    title: "Categories",
    description: "Create and organize your product categories.",
    href: "/admin/categories",
    icon: "🗂️",
  },
  {
    title: "Analytics",
    description: "View visitors, page views and shop activity.",
    href: "/admin/analytics",
    icon: "📊",
  },
];

export default async function AdminPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>

          <p className="mt-2 text-muted-foreground">Manage your shop</p>
        </div>

        <Link
          href="/admin/settings"
          title="Shop Settings"
          aria-label="Shop Settings"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <span>Shop Settings</span>
          <span className="text-base">⚙️</span>
        </Link>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-2xl border bg-background p-6 transition hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                {card.icon}
              </div>

              <span className="text-xl text-muted-foreground transition-transform group-hover:translate-x-1">
                →
              </span>
            </div>

            <h2 className="mt-5 text-xl font-semibold">{card.title}</h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {card.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
