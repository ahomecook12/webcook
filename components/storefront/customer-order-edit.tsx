"use client";

import { useState } from "react";

type CustomerOrderEditProps = {
  orderId: string;
  status: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  customerNote: string | null;
  preferredFulfillmentAt: string | null;
};

const EDITABLE_STATUSES = [
  "pending_payment",
  "processing",
];

function toDateTimeLocalValue(
  value: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function CustomerOrderEdit({
  orderId,
  status,
  shippingName,
  shippingPhone,
  shippingAddress,
  shippingCity,
  shippingPostalCode,
  shippingCountry,
  customerNote,
  preferredFulfillmentAt,
}: CustomerOrderEditProps) {
  const canEdit = EDITABLE_STATUSES.includes(status);

  const [isEditing, setIsEditing] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [form, setForm] = useState({
    shipping_name: shippingName,
    shipping_phone: shippingPhone,
    shipping_address: shippingAddress,
    shipping_city: shippingCity,
    shipping_postal_code:
      shippingPostalCode,
    shipping_country: shippingCountry,
    customer_note: customerNote ?? "",
    preferred_fulfillment_at:
      toDateTimeLocalValue(
        preferredFulfillmentAt,
      ),
  });

  if (!canEdit) {
    return null;
  }

  function updateField(
    field: keyof typeof form,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function cancelEditing() {
    setForm({
      shipping_name: shippingName,
      shipping_phone: shippingPhone,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_postal_code:
        shippingPostalCode,
      shipping_country: shippingCountry,
      customer_note: customerNote ?? "",
      preferred_fulfillment_at:
        toDateTimeLocalValue(
          preferredFulfillmentAt,
        ),
    });

    setError(null);
    setSuccess(null);
    setIsEditing(false);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `/api/orders/${orderId}/customer-update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipping_name:
              form.shipping_name,
            shipping_phone:
              form.shipping_phone,
            shipping_address:
              form.shipping_address,
            shipping_city:
              form.shipping_city,
            shipping_postal_code:
              form.shipping_postal_code,
            shipping_country:
              form.shipping_country,
            customer_note:
              form.customer_note,
            preferred_fulfillment_at:
              form.preferred_fulfillment_at
                ? new Date(
                    form.preferred_fulfillment_at,
                  ).toISOString()
                : null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ??
            "Failed to update your order.",
        );
      }

      setSuccess(
        data?.message ??
          "Your order has been updated successfully.",
      );

      setIsEditing(false);

      // Refresh the server-rendered order page
      // so the latest order information is shown.
      window.location.reload();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update your order.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            Change your order
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            You can still update your delivery
            details and preferences while this
            order is being processed.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSuccess(null);
              setIsEditing(true);
            }}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Edit order
          </button>
        )}
      </div>

      {success && (
        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="shipping_name"
                className="text-sm font-medium"
              >
                Name
              </label>

              <input
                id="shipping_name"
                value={form.shipping_name}
                onChange={(event) =>
                  updateField(
                    "shipping_name",
                    event.target.value,
                  )
                }
                required
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="shipping_phone"
                className="text-sm font-medium"
              >
                Phone
              </label>

              <input
                id="shipping_phone"
                type="tel"
                value={form.shipping_phone}
                onChange={(event) =>
                  updateField(
                    "shipping_phone",
                    event.target.value,
                  )
                }
                required
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="shipping_address"
              className="text-sm font-medium"
            >
              Address
            </label>

            <textarea
              id="shipping_address"
              value={form.shipping_address}
              onChange={(event) =>
                updateField(
                  "shipping_address",
                  event.target.value,
                )
              }
              required
              rows={3}
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="shipping_city"
                className="text-sm font-medium"
              >
                City
              </label>

              <input
                id="shipping_city"
                value={form.shipping_city}
                onChange={(event) =>
                  updateField(
                    "shipping_city",
                    event.target.value,
                  )
                }
                required
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="shipping_postal_code"
                className="text-sm font-medium"
              >
                Postal code
              </label>

              <input
                id="shipping_postal_code"
                value={form.shipping_postal_code}
                onChange={(event) =>
                  updateField(
                    "shipping_postal_code",
                    event.target.value,
                  )
                }
                required
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="shipping_country"
              className="text-sm font-medium"
            >
              Country
            </label>

            <input
              id="shipping_country"
              value={form.shipping_country}
              onChange={(event) =>
                updateField(
                  "shipping_country",
                  event.target.value,
                )
              }
              required
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="preferred_fulfillment_at"
              className="text-sm font-medium"
            >
              Preferred fulfillment date & time
            </label>

            <input
              id="preferred_fulfillment_at"
              type="datetime-local"
              value={
                form.preferred_fulfillment_at
              }
              onChange={(event) =>
                updateField(
                  "preferred_fulfillment_at",
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />

            <p className="mt-1 text-xs text-muted-foreground">
              Optional.
            </p>
          </div>

          <div>
            <label
              htmlFor="customer_note"
              className="text-sm font-medium"
            >
              Note
            </label>

            <textarea
              id="customer_note"
              value={form.customer_note}
              onChange={(event) =>
                updateField(
                  "customer_note",
                  event.target.value,
                )
              }
              rows={4}
              placeholder="Anything you would like us to know?"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={loading}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : "Save changes"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
