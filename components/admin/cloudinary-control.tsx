"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CLOUDINARY_DISABLE_AT = 95;

type Props = {
  initialUsagePercent: number;
  initialImagesEnabled: boolean;
  initialCheckedAt: string | null;
};

type UsageResponse = {
  usagePercent: number;
  imagesEnabled: boolean;
  automaticallyDisabled: boolean;
  canEnable: boolean;
  disableAt: number;
  checkedAt: string;
  error?: string;
};

export default function CloudinaryControl({
  initialUsagePercent,
  initialImagesEnabled,
  initialCheckedAt,
}: Props) {
  const [usagePercent, setUsagePercent] = useState(
    initialUsagePercent,
  );

  const [imagesEnabled, setImagesEnabled] = useState(
    initialImagesEnabled,
  );

  const [checkedAt, setCheckedAt] = useState<string | null>(
    initialCheckedAt,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const atSafetyLimit =
    usagePercent >= CLOUDINARY_DISABLE_AT;

  // -------------------------------------------------------
  // REFRESH CLOUDINARY USAGE
  // -------------------------------------------------------

  async function refreshUsage() {
    setRefreshing(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/cloudinary/usage",
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = (await response.json()) as UsageResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to refresh Cloudinary usage.",
        );
      }

      setUsagePercent(Number(data.usagePercent ?? 0));
      setImagesEnabled(data.imagesEnabled);
      setCheckedAt(data.checkedAt);

      if (data.automaticallyDisabled) {
        setMessage(
          `Cloudinary image delivery was automatically disabled because usage reached ${data.usagePercent.toFixed(
            2,
          )}%.`,
        );
      } else {
        setMessage("Cloudinary usage refreshed.");
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Failed to refresh Cloudinary usage.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  // -------------------------------------------------------
  // MANUAL IMAGE DELIVERY SWITCH
  // -------------------------------------------------------

  async function changeImageStatus(enabled: boolean) {
    if (enabled && atSafetyLimit) {
      setError(
        `Cloudinary images cannot be enabled while usage is ${CLOUDINARY_DISABLE_AT}% or higher.`,
      );
      return;
    }

    setChangingStatus(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/cloudinary/status",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            enabled,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to change Cloudinary image status.",
        );
      }

      setImagesEnabled(data.imagesEnabled);

      if (data.usagePercent != null) {
        setUsagePercent(Number(data.usagePercent));
      }

      if (data.checkedAt) {
        setCheckedAt(data.checkedAt);
      }

      setMessage(
        data.imagesEnabled
          ? "Cloudinary image delivery is now enabled."
          : "Cloudinary image delivery is now disabled.",
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Failed to change Cloudinary image status.",
      );
    } finally {
      setChangingStatus(false);
    }
  }

  // -------------------------------------------------------
  // DATE
  // -------------------------------------------------------

  function formatCheckedAt(value: string | null) {
    if (!value) {
      return "Not checked yet";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // -------------------------------------------------------
  // PROGRESS BAR
  // -------------------------------------------------------

  const progressWidth = Math.min(
    Math.max(usagePercent, 0),
    100,
  );

  return (
    <div className="space-y-6">
      {/* ===================================================
          USAGE
         =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>Cloudinary Usage</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Current usage
              </p>

              <p className="mt-1 text-4xl font-bold">
                {usagePercent.toFixed(2)}%
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={refreshUsage}
              disabled={refreshing || changingStatus}
            >
              {refreshing ? "Checking..." : "Refresh Usage"}
            </Button>
          </div>

          <div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${progressWidth}%`,
                }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>
                Automatic shutdown at {CLOUDINARY_DISABLE_AT}%
              </span>
              <span>100%</span>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">
                Last checked:
              </span>{" "}
              {formatCheckedAt(checkedAt)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===================================================
          IMAGE DELIVERY
         =================================================== */}

      <Card>
        <CardHeader>
          <CardTitle>Image Delivery</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div
            className={`rounded-xl border p-4 ${
              imagesEnabled
                ? "bg-green-50 dark:bg-green-950/20"
                : atSafetyLimit
                  ? "bg-red-50 dark:bg-red-950/20"
                  : "bg-muted/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl">
                {imagesEnabled
                  ? "🟢"
                  : atSafetyLimit
                    ? "🔴"
                    : "⚪"}
              </span>

              <div>
                <p className="font-semibold">
                  {imagesEnabled
                    ? "Cloudinary images are enabled"
                    : atSafetyLimit
                      ? "Cloudinary images are automatically disabled"
                      : "Cloudinary images are disabled"}
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  {imagesEnabled
                    ? "Customers can currently load Cloudinary images."
                    : atSafetyLimit
                      ? `Usage is ${usagePercent.toFixed(
                          2,
                        )}%. Images cannot be enabled until usage falls below ${CLOUDINARY_DISABLE_AT}%.`
                      : "Cloudinary images will not be requested by the storefront once storefront protection is connected."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium">
              Automatic protection
            </p>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              When Cloudinary reports usage at{" "}
              <strong>{CLOUDINARY_DISABLE_AT}% or higher</strong>,
              image delivery is automatically switched off. It will
              not automatically switch back on when usage falls.
              You decide when to enable it again.
            </p>
          </div>

          {imagesEnabled ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => changeImageStatus(false)}
              disabled={changingStatus || refreshing}
            >
              {changingStatus
                ? "Disabling..."
                : "Disable Cloudinary Images"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => changeImageStatus(true)}
              disabled={
                changingStatus ||
                refreshing ||
                atSafetyLimit
              }
            >
              {changingStatus
                ? "Enabling..."
                : atSafetyLimit
                  ? `Cannot Enable at ${CLOUDINARY_DISABLE_AT}%+`
                  : "Enable Cloudinary Images"}
            </Button>
          )}

          {message && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}