"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { STORE_LOCALE } from "@/app/constants";

type OrderHistoryItem = {
  id: string;
  description?: string | null;
  created_at?: string | null;
  change_type?: string | null;
  changed_by_type?: string | null;
};

type Props = {
  items: OrderHistoryItem[];
};

export default function OrderHistoryDialog({
  items,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <History className="mr-2 h-4 w-4" />
        View history
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto bg-background opacity-100 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order history</DialogTitle>

            <DialogDescription>
              Changes made to this order by you or the admin.
            </DialogDescription>
          </DialogHeader>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No changes have been recorded for this order yet.
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item) => {
                const changedBy =
                  item.changed_by_type === "admin"
                    ? "Admin"
                    : "Customer";

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border bg-background p-4 shadow-sm"
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.created_at
                        ? new Date(
                            item.created_at,
                          ).toLocaleString(STORE_LOCALE, {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Unknown date"}
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {changedBy}
                    </p>

                    {item.description && (
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}