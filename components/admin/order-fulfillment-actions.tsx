"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OrderFulfillmentActionsProps = {
  orderId: string;
  preferredFulfillmentAt: string | null;
  porterStatus: string;
  porterDetails: string | null;
};

const DELIVERY_OPTIONS = [
  {
    value: "booked",
    label: "Customer will book the delivery service",
    help: "Customer has arranged the delivery themselves.",
  },
  {
    value: "requested",
    label: "Admin should book the delivery service",
    help: "Admin will arrange the delivery and extra charges may apply.",
  },
];

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function OrderFulfillmentActions({
  orderId,
  preferredFulfillmentAt,
  porterStatus,
  porterDetails,
}: OrderFulfillmentActionsProps) {
  const [preferredDateTime, setPreferredDateTime] =
    useState(
      toDateTimeLocal(preferredFulfillmentAt),
    );

  const [deliveryStatus, setDeliveryStatus] =
    useState<"booked" | "requested">(
      porterStatus === "requested" ? "requested" : "booked",
    );

  const [deliveryDetails, setDeliveryDetails] =
    useState(porterDetails ?? "");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/orders/${orderId}/fulfillment`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            preferred_fulfillment_at:
              preferredDateTime
                ? new Date(
                    preferredDateTime,
                  ).toISOString()
                : null,

            porter_status:
              deliveryStatus,

            porter_details:
              deliveryStatus === "booked"
                ? deliveryDetails
                : null,
          }),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Failed to update fulfillment.",
        );
      }

      setSuccess(
        result?.message ??
          "Fulfillment updated successfully.",
      );

      /*
       * Refresh the server-rendered order page
       * so the displayed values stay in sync.
       */
      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update fulfillment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Preferred fulfillment */}
      <div className="space-y-2">
        <Label htmlFor="admin-preferred-fulfillment">
          Preferred fulfillment date & time
        </Label>

        <Input
          id="admin-preferred-fulfillment"
          type="datetime-local"
          value={preferredDateTime}
          onChange={(event) =>
            setPreferredDateTime(
              event.target.value,
            )
          }
          disabled={saving}
        />

        <p className="text-xs text-muted-foreground">
          This can be set or adjusted by the
          admin.
        </p>
      </div>

      <div className="space-y-3">
        {DELIVERY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
          >
            <input
              type="radio"
              name="admin-delivery-option"
              checked={deliveryStatus === option.value}
              onChange={() => setDeliveryStatus(option.value as typeof deliveryStatus)}
              disabled={saving}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.help}</span>
            </span>
          </label>
        ))}
      </div>

      {deliveryStatus === "booked" && (
        <div className="space-y-2">
          <Label htmlFor="admin-delivery-details">
            Delivery details
          </Label>

          <Textarea
            id="admin-delivery-details"
            value={deliveryDetails}
            onChange={(event) =>
              setDeliveryDetails(
                event.target.value,
              )
            }
            placeholder="Delivery company, contact details, or notes"
            rows={4}
            disabled={saving}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Save */}
      <Button
        type="button"
        onClick={handleSave}
        disabled={saving}
      >
        {saving
          ? "Saving..."
          : "Save fulfillment changes"}
      </Button>
    </div>
  );
}