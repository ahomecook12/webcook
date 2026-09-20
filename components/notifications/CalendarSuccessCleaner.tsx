"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CalendarSuccessCleaner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const calendarAdded = searchParams.get("calendar_added");

    if (calendarAdded !== "1") {
      return;
    }

    /*
     * Remove the success query parameters from the URL.
     *
     * replace() changes the browser URL without creating
     * another history entry.
     */
    router.replace(pathname);
  }, [router, pathname, searchParams]);

  return null;
}