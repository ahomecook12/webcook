"use client";

import {
  type ReactNode,
  useState,
} from "react";

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STORE_LOCALE } from "@/app/constants";

type HistoryItem = {
  id: string;
  description?: string | null;
  created_at?: string | null;
  change_type?: string | null;
  changed_by_type?: string | null;
};

type OrderDetailSectionProps = {
  title: string;
  subtitle?: string;
  summary: ReactNode;
  historyItems?: HistoryItem[];
};

export default function OrderDetailSection({
  title,
  subtitle,
  summary,
  historyItems = [],
}: OrderDetailSectionProps) {
  const [isExpanded, setIsExpanded] =
    useState(true);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const hasHistory =
    historyItems.length > 0;

  return (
    <>
      <section className="rounded-xl border bg-card shadow-sm">
        <button
          type="button"
          onClick={() =>
            setIsExpanded(
              (current) => !current,
            )
          }
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
          aria-expanded={isExpanded}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {title}
            </h2>

            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          <span className="shrink-0 rounded-full border bg-muted/40 p-1.5 text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        </button>

        {isExpanded && (
          <div className="border-t px-5 pb-5 pt-4">
            {summary}
          </div>
        )}
      </section>

      {hasHistory && (
        <Dialog
          open={historyOpen}
          onOpenChange={
            setHistoryOpen
          }
        >
          <DialogContent className="max-w-3xl border bg-background p-0 shadow-2xl sm:max-w-3xl">
            <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="mb-4">
                <DialogTitle>
                  {title} history
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {historyItems.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-muted/30 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <span>
                          {item.change_type ??
                            "Update"}
                        </span>

                        <span>
                          {item.created_at
                            ? new Date(
                                item.created_at,
                              ).toLocaleString(
                                STORE_LOCALE,
                              )
                            : "Unknown date"}
                        </span>
                      </div>

                      {item.changed_by_type && (
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          Changed by:{" "}
                          {
                            item.changed_by_type
                          }
                        </p>
                      )}

                      <p className="whitespace-pre-line text-sm leading-6 text-foreground">
                        {item.description ??
                          "No details available."}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}