"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import Image from "next/image";
import { Menu, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotificationBell from "@/components/NotificationBell";
import { SHOP_NAME } from "@/app/constants";
import { registerWebPushNotifications } from "@/lib/firebase-messaging";

type SiteHeaderProps = {
  isLoggedIn: boolean;
  isAdmin: boolean;
  cartCount: number;
  userId?: string;
};

export default function SiteHeader({
  isLoggedIn,
  isAdmin,
  cartCount,
  userId,
}: SiteHeaderProps) {
  const [displayCartCount, setDisplayCartCount] = useState(cartCount);

  useEffect(() => {
    function handleCartCountChange(event: Event) {
      const customEvent = event as CustomEvent<{ count: number }>;
      setDisplayCartCount(customEvent.detail.count);
    }

    function handleOrderCompleted() {
      setDisplayCartCount(0);
    }

    window.addEventListener("cart-count-change", handleCartCountChange);
    window.addEventListener("order-completed", handleOrderCompleted);

    return () => {
      window.removeEventListener("cart-count-change", handleCartCountChange);
      window.removeEventListener("order-completed", handleOrderCompleted);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !userId) {
      return;
    }

    void registerWebPushNotifications();
  }, [isAdmin, userId]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-background">
      <div className="mx-auto flex h-16 max-w-full items-center justify-between pr-4">
        {/* LOGO */}
        <Link href="/" className="shrink-0">
          <Image
            src="/lcc.svg"
            alt={SHOP_NAME}
            width={103}
            height={64}
            priority
            className="h-auto w-[103px]"
          />
        </Link>
        <div className="flex items-center gap-2">
          {userId && <NotificationBell userId={userId} />}
          {/* ========================================================= */}
          {/* DESKTOP NAVIGATION */}
          {/* ========================================================= */}
          <nav className="hidden items-center gap-2 sm:flex">
            <Link
              href="/"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Home
            </Link>

            <Link
              href="/products"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Products
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  href="/cart"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  🛒 Cart
                  {displayCartCount > 0 ? ` (${displayCartCount})` : ""}
                </Link>

                <Link
                  href="/orders"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Orders
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Admin
                  </Link>
                )}

                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="w-full rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Sign in
                </Link>

                <Link
                  href="/auth/signup"
                  className={buttonVariants({ size: "sm" })}
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
          {/* ========================================================= */}
          {/* MOBILE NAVIGATION */}
          {/* ========================================================= */}
          <div className="sm:hidden">
            <DropdownMenu>
              {/* MENU BUTTON */}
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    className={
                      buttonVariants({
                        variant: "ghost",
                        size: "sm",
                      }) + " hover:bg-muted"
                    }
                  >
                    <Menu className="h-4 w-4" />
                    <span>Menu</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                }
              />

              {/* DROPDOWN */}
              <DropdownMenuContent align="end" className="w-48 bg-background">
                {/* HOME */}
                <DropdownMenuItem
                  className="w-full p-0"
                  render={<Link href="/" />}
                >
                  <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                    Home
                  </span>
                </DropdownMenuItem>

                {/* PRODUCTS */}
                <DropdownMenuItem
                  className="w-full p-0"
                  render={<Link href="/products" />}
                >
                  <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                    Products
                  </span>
                </DropdownMenuItem>

                {isLoggedIn ? (
                  <>
                    {/* CART */}
                    <DropdownMenuItem
                      className="w-full p-0"
                      render={<Link href="/cart" />}
                    >
                      <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                        🛒 Cart
                        {displayCartCount > 0 ? ` (${displayCartCount})` : ""}
                      </span>
                    </DropdownMenuItem>

                    {/* ORDERS */}
                    <DropdownMenuItem
                      className="w-full p-0"
                      render={<Link href="/orders" />}
                    >
                      <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                        Orders
                      </span>
                    </DropdownMenuItem>

                    {/* ADMIN */}
                    {isAdmin && (
                      <DropdownMenuItem
                        className="w-full p-0"
                        render={<Link href="/admin" />}
                      >
                        <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                          Admin
                        </span>
                      </DropdownMenuItem>
                    )}

                    {/* SIGN OUT */}
                    <div className="mt-1 border-t p-1">
                      <form
                        action="/auth/signout"
                        method="POST"
                        className="w-full"
                      >
                        <button
                          type="submit"
                          className="w-full rounded-sm px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-muted"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <>
                    {/* SIGN IN */}
                    <DropdownMenuItem
                      className="w-full p-0"
                      render={<Link href="/auth/login" />}
                    >
                      <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                        Sign in
                      </span>
                    </DropdownMenuItem>

                    {/* CREATE ACCOUNT */}
                    <DropdownMenuItem
                      className="w-full p-0"
                      render={<Link href="/auth/signup" />}
                    >
                      <span className="flex w-full items-center px-3 py-2 hover:bg-muted">
                        <span className="font-medium text-primary">
                          Create account
                        </span>
                      </span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
