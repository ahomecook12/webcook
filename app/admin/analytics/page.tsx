import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import CleanupAnalyticsButton from "@/components/analytics/CleanupAnalyticsButton";
import Link from "next/link";
import { STORE_LOCALE } from "@/app/constants";


type VisitorSession = {
  id: string;
  visitor_id: string;
  user_id: string | null;
  city: string | null;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  first_seen: string;
  last_seen: string;
  created_at: string;
};

type PageView = {
  page_path: string;
  product_id: string | null;
};

type MonthlyStats = {
  id: string;
  month: string;
  visitors: number;
  unique_visitors: number;
  returning_visitors: number;
  logged_in_visitors: number;
  anonymous_visitors: number;
  mobile_visitors: number;
  desktop_visitors: number;
  tablet_visitors: number;
  top_cities: unknown;
  top_products: unknown;
  total_page_views: number;
};

function formatDate(date: string) {
  return new Date(date).toLocaleString(STORE_LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMonth(month: string) {
  return new Date(`${month}T00:00:00`).toLocaleDateString(
    STORE_LOCALE,
    {
      month: "long",
      year: "numeric",
    }
  );
}

export default async function AnalyticsPage() {
  const { isAdmin } = await requireAdmin();

  if (!isAdmin) {
    redirect("/auth/login");
  }

  const supabase = createServiceRoleClient();

  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const fiveMinutesAgo = new Date(
    now.getTime() - 5 * 60 * 1000
  );

  const [
    todaySessionsResult,
    activeResult,
    previousSessionsResult,
    recentSessionsResult,
    todayPageViewsResult,
    monthlyStatsResult,
  ] = await Promise.all([
    supabase
      .from("visitor_sessions")
      .select("visitor_id, user_id, device_type")
      .gte("created_at", startOfDay.toISOString()),

    supabase
      .from("visitor_sessions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .gte(
        "last_seen",
        fiveMinutesAgo.toISOString()
      ),

    supabase
      .from("visitor_sessions")
      .select("visitor_id")
      .lt(
        "created_at",
        startOfDay.toISOString()
      ),

    supabase
      .from("visitor_sessions")
      .select(
        `
          id,
          visitor_id,
          user_id,
          city,
          country,
          device_type,
          browser,
          first_seen,
          last_seen,
          created_at
        `
      )
      .order("last_seen", {
        ascending: false,
      })
      .limit(50),

    supabase
      .from("visitor_page_views")
      .select("page_path, product_id")
      .gte(
        "viewed_at",
        startOfDay.toISOString()
      ),

    supabase
      .from("visitor_monthly_stats")
      .select(
        `
          id,
          month,
          visitors,
          unique_visitors,
          returning_visitors,
          logged_in_visitors,
          anonymous_visitors,
          mobile_visitors,
          desktop_visitors,
          tablet_visitors,
          top_cities,
          top_products,
          total_page_views
        `
      )
      .order("month", {
        ascending: false,
      }),
  ]);

  if (todaySessionsResult.error) {
    console.error(
      "[analytics] Failed to load today's sessions:",
      todaySessionsResult.error
    );
  }

  if (activeResult.error) {
    console.error(
      "[analytics] Failed to load active visitors:",
      activeResult.error
    );
  }

  if (previousSessionsResult.error) {
    console.error(
      "[analytics] Failed to load previous sessions:",
      previousSessionsResult.error
    );
  }

  if (recentSessionsResult.error) {
    console.error(
      "[analytics] Failed to load recent sessions:",
      recentSessionsResult.error
    );
  }

  if (todayPageViewsResult.error) {
    console.error(
      "[analytics] Failed to load today's page views:",
      todayPageViewsResult.error
    );
  }

  if (monthlyStatsResult.error) {
    console.error(
      "[analytics] Failed to load monthly stats:",
      monthlyStatsResult.error
    );
  }

  const sessions =
    todaySessionsResult.data ?? [];

  const recentSessions =
    (recentSessionsResult.data as VisitorSession[] | null) ??
    [];

  const pageViews =
    (todayPageViewsResult.data as PageView[] | null) ??
    [];

  const monthlyStats =
    (monthlyStatsResult.data as MonthlyStats[] | null) ??
    [];

  const previousVisitorIds = new Set(
    (previousSessionsResult.data ?? []).map(
      (session) => session.visitor_id
    )
  );

  const uniqueVisitors = new Set(
    sessions.map(
      (session) => session.visitor_id
    )
  ).size;

  const loggedInVisitors = new Set(
    sessions
      .filter((session) => session.user_id)
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const anonymousVisitors = new Set(
    sessions
      .filter((session) => !session.user_id)
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const returningVisitors = new Set(
    sessions
      .filter((session) =>
        previousVisitorIds.has(
          session.visitor_id
        )
      )
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const mobileVisitors = new Set(
    sessions
      .filter(
        (session) =>
          session.device_type === "mobile"
      )
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const desktopVisitors = new Set(
    sessions
      .filter(
        (session) =>
          session.device_type === "desktop"
      )
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const tabletVisitors = new Set(
    sessions
      .filter(
        (session) =>
          session.device_type === "tablet"
      )
      .map(
        (session) => session.visitor_id
      )
  ).size;

  const productIds = Array.from(
    new Set(
      pageViews
        .map(
          (pageView) =>
            pageView.product_id
        )
        .filter(
          (id): id is string =>
            Boolean(id)
        )
    )
  );

  const productNames = new Map<
    string,
    string
  >();

  if (productIds.length > 0) {
    const { data: products } =
      await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

    for (const product of products ?? []) {
      productNames.set(
        product.id,
        product.name
      );
    }
  }

  const pageCounts = new Map<
    string,
    {
      page: string;
      productId: string | null;
      views: number;
    }
  >();

  for (const pageView of pageViews) {
    const key = `${pageView.page_path}|${
      pageView.product_id ?? ""
    }`;

    const existing =
      pageCounts.get(key);

    if (existing) {
      existing.views += 1;
    } else {
      pageCounts.set(key, {
        page: pageView.page_path,
        productId:
          pageView.product_id,
        views: 1,
      });
    }
  }

  const mostVisitedPages =
    Array.from(pageCounts.values())
      .map((item) => ({
        page: item.page,
        product: item.productId
          ? (
              productNames.get(
                item.productId
              ) ??
              "Unknown product"
            )
          : "—",
        views: item.views,
      }))
      .sort(
        (a, b) => b.views - a.views
      )
      .slice(0, 10);

  const productCounts = new Map<
    string,
    number
  >();

  for (const pageView of pageViews) {
    if (!pageView.product_id) {
      continue;
    }

    productCounts.set(
      pageView.product_id,
      (productCounts.get(
        pageView.product_id
      ) ?? 0) + 1
    );
  }

  const mostViewedProducts =
    Array.from(
      productCounts.entries()
    )
      .map(
        ([productId, views]) => ({
          productId,
          name:
            productNames.get(
              productId
            ) ?? "Unknown product",
          views,
        })
      )
      .sort(
        (a, b) => b.views - a.views
      )
      .slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
         <Link
            href="/admin"
            className="inline-block rounded-lg underline px-5 py-3"
          >
            Back to Admin Dashboard
          </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Visitor Analytics
        </h1>

        <p className="mt-2 text-muted-foreground">
          Today&apos;s visitor activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Visitors
          </p>
          <p className="mt-2 text-3xl font-bold">
            {sessions.length}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Unique Visitors
          </p>
          <p className="mt-2 text-3xl font-bold">
            {uniqueVisitors}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Currently Active
          </p>
          <p className="mt-2 text-3xl font-bold">
            {activeResult.count ?? 0}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Returning
          </p>
          <p className="mt-2 text-3xl font-bold">
            {returningVisitors}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Logged In
          </p>
          <p className="mt-2 text-3xl font-bold">
            {loggedInVisitors}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Anonymous
          </p>
          <p className="mt-2 text-3xl font-bold">
            {anonymousVisitors}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            Page Views Today
          </p>
          <p className="mt-2 text-3xl font-bold">
            {pageViews.length}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">
            Devices
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Mobile</span>
              <span className="font-medium">
                {mobileVisitors}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Desktop</span>
              <span className="font-medium">
                {desktopVisitors}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Tablet</span>
              <span className="font-medium">
                {tabletVisitors}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">
            Location
          </h2>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between">
              <span>Country data</span>
              <span className="font-medium">
                Available on Vercel
              </span>
            </div>

            <div className="flex justify-between">
              <span>City data</span>
              <span className="font-medium">
                Available on Vercel
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            Most Visited Pages Today
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Pages receiving the most views today
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-6 py-4 font-medium">
                  #
                </th>

                <th className="px-6 py-4 font-medium">
                  Page
                </th>

                <th className="px-6 py-4 font-medium">
                  Product
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Views
                </th>
              </tr>
            </thead>

            <tbody>
              {mostVisitedPages.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No page views yet today.
                  </td>
                </tr>
              ) : (
                mostVisitedPages.map(
                  (item, index) => (
                    <tr
                      key={`${item.page}-${item.product}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4 text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {item.page}
                      </td>

                      <td className="px-6 py-4">
                        {item.product}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {item.views}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            Most Viewed Products Today
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Products receiving the most page views today
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-6 py-4 font-medium">
                  #
                </th>

                <th className="px-6 py-4 font-medium">
                  Product
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Views
                </th>
              </tr>
            </thead>

            <tbody>
              {mostViewedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No product views yet today.
                  </td>
                </tr>
              ) : (
                mostViewedProducts.map(
                  (item, index) => (
                    <tr
                      key={item.productId}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4 text-muted-foreground">
                        {index + 1}
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {item.name}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {item.views}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            Permanent Monthly History
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            These statistics remain even after detailed
            visitor data is cleaned up.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Month
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Visitors
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Unique
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Returning
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Logged In
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Anonymous
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Page Views
                </th>
              </tr>
            </thead>

            <tbody>
              {monthlyStats.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No monthly statistics yet.
                  </td>
                </tr>
              ) : (
                monthlyStats.map(
                  (month) => (
                    <tr
                      key={month.id}
                      className="border-b last:border-0"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium">
                        {formatMonth(
                          month.month
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {month.visitors}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {month.unique_visitors}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {month.returning_visitors}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {month.logged_in_visitors}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {month.anonymous_visitors}
                      </td>

                      <td className="px-6 py-4 text-right font-semibold">
                        {month.total_page_views}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <CleanupAnalyticsButton />
      </section>

      <section className="mt-8 rounded-xl border bg-card">
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">
            Recent Visitors
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Latest 50 visitor sessions
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Last Activity
                </th>

                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Location
                </th>

                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Device
                </th>

                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Browser
                </th>

                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Visitor
                </th>

                <th className="whitespace-nowrap px-6 py-4 font-medium">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {recentSessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No visitor sessions yet.
                  </td>
                </tr>
              ) : (
                recentSessions.map(
                  (session) => {
                    const isActive =
                      new Date(
                        session.last_seen
                      ).getTime() >
                      fiveMinutesAgo.getTime();

                    return (
                      <tr
                        key={session.id}
                        className="border-b last:border-0"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          {formatDate(
                            session.last_seen
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {session.city ||
                          session.country
                            ? [
                                session.city,
                                session.country,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(", ")
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 capitalize">
                          {session.device_type ||
                            "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {session.browser ||
                            "—"}
                        </td>

                        <td className="max-w-[180px] truncate px-6 py-4 font-mono text-xs">
                          {session.visitor_id}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {session.user_id ? (
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium">
                              Logged in
                            </span>
                          ) : (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                              Anonymous
                            </span>
                          )}

                          {isActive && (
                            <span className="ml-2 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Active
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}