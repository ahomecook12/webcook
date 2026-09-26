"use client";

import Image from "next/image";
import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { STORE_LOCALE } from "@/app/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PaymentMethodSnapshot = {
  id?: string | null;
  method_type?: string | null;
  display_name?: string | null;
  account_name?: string | null;
  phone_number?: string | null;
  payment_url?: string | null;
  instructions?: string | null;
  qr_code_url?: string | null;
};

type PaymentMethodOption = {
  id: string;
  display_name: string;
  method_type?: string | null;
  account_name?: string | null;
  phone_number?: string | null;
  payment_url?: string | null;
  instructions?: string | null;
  qr_code_url?: string | null;
};

type AdminOrderEditProps = {
  orderId: string;

  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;

  preferredFulfillmentAt: string | null;

  porterStatus: string;
  porterDetails: string | null;

  currentPaymentMethodId: string | null;
  paymentSnapshot: PaymentMethodSnapshot | null;
  paymentMethodOptions: PaymentMethodOption[];

  customerNote: string | null;
};

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

function formatFulfillmentDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleString(STORE_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminOrderEdit({
  orderId,

  shippingName,
  shippingPhone,
  shippingAddress,
  shippingCity,
  shippingPostalCode,
  shippingCountry,

  preferredFulfillmentAt,

  porterStatus,
  porterDetails,

  currentPaymentMethodId,
  paymentSnapshot,
  paymentMethodOptions,

  customerNote,
}: AdminOrderEditProps) {
  const router = useRouter();

  const [editMode, setEditMode] = useState(false);

  const [shippingNameState, setShippingNameState] = useState(shippingName);

  const [shippingPhoneState, setShippingPhoneState] = useState(shippingPhone);

  const [shippingAddressState, setShippingAddressState] =
    useState(shippingAddress);

  const [shippingCityState, setShippingCityState] = useState(shippingCity);

  const [shippingPostalCodeState, setShippingPostalCodeState] =
    useState(shippingPostalCode);

  const [shippingCountryState, setShippingCountryState] =
    useState(shippingCountry);

  const [preferredFulfillmentState, setPreferredFulfillmentState] = useState(
    toDateTimeLocal(preferredFulfillmentAt),
  );

  const [deliveryStatus, setDeliveryStatus] = useState<"booked" | "requested">(
    porterStatus === "requested" ? "requested" : "booked",
  );

  const [deliveryDetails, setDeliveryDetails] = useState(porterDetails ?? "");

  /*
   * IMPORTANT:
   *
   * Prefer the actual order payment_method_id.
   * If that is missing, use the snapshot id if available.
   * If neither exists, use the first active payment method only
   * when entering edit mode.
   */
  const initialPaymentMethod =
    currentPaymentMethodId ??
    paymentSnapshot?.id ??
    paymentMethodOptions[0]?.id ??
    "";

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState(initialPaymentMethod);

  const [customerNoteState, setCustomerNoteState] = useState(
    customerNote ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ---------------------------------------------------------
   * DISPLAY PAYMENT
   * ---------------------------------------------------------
   *
   * The snapshot belongs to THIS order.
   *
   * Therefore, even if the payment method was later disabled,
   * renamed, or payment_method_id is unavailable, the order
   * should still display the payment method that was actually
   * selected when the order was created.
   */
  const selectedPaymentOption = paymentMethodOptions.find(
    (method) => method.id === selectedPaymentMethod,
  );

  const displayedPaymentName =
    paymentSnapshot?.display_name ??
    selectedPaymentOption?.display_name ??
    "Payment method";

  const displayedPaymentType =
    paymentSnapshot?.method_type ?? selectedPaymentOption?.method_type ?? null;

  const displayedAccountName =
    paymentSnapshot?.account_name ??
    selectedPaymentOption?.account_name ??
    null;

  const displayedPhoneNumber =
    paymentSnapshot?.phone_number ??
    selectedPaymentOption?.phone_number ??
    null;

  const displayedPaymentUrl =
    paymentSnapshot?.payment_url ?? selectedPaymentOption?.payment_url ?? null;

  const displayedInstructions =
    paymentSnapshot?.instructions ??
    selectedPaymentOption?.instructions ??
    null;

  const displayedQrCode =
    paymentSnapshot?.qr_code_url ?? selectedPaymentOption?.qr_code_url ?? null;

  function startEditing() {
    setError("");
    setSuccess("");

    setShippingNameState(shippingName);
    setShippingPhoneState(shippingPhone);
    setShippingAddressState(shippingAddress);
    setShippingCityState(shippingCity);
    setShippingPostalCodeState(shippingPostalCode);
    setShippingCountryState(shippingCountry);

    setPreferredFulfillmentState(toDateTimeLocal(preferredFulfillmentAt));

    setDeliveryStatus(porterStatus === "requested" ? "requested" : "booked");

    setDeliveryDetails(porterDetails ?? "");

    setSelectedPaymentMethod(
      currentPaymentMethodId ??
        paymentSnapshot?.id ??
        paymentMethodOptions[0]?.id ??
        "",
    );

    setCustomerNoteState(customerNote ?? "");

    setEditMode(true);
  }

  function cancelEditing() {
    setShippingNameState(shippingName);
    setShippingPhoneState(shippingPhone);
    setShippingAddressState(shippingAddress);
    setShippingCityState(shippingCity);
    setShippingPostalCodeState(shippingPostalCode);
    setShippingCountryState(shippingCountry);

    setPreferredFulfillmentState(toDateTimeLocal(preferredFulfillmentAt));

    setDeliveryStatus(porterStatus === "requested" ? "requested" : "booked");

    setDeliveryDetails(porterDetails ?? "");

    setSelectedPaymentMethod(
      currentPaymentMethodId ??
        paymentSnapshot?.id ??
        paymentMethodOptions[0]?.id ??
        "",
    );

    setCustomerNoteState(customerNote ?? "");

    setError("");
    setSuccess("");
    setEditMode(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (
        !shippingNameState.trim() ||
        !shippingPhoneState.trim() ||
        !shippingAddressState.trim() ||
        !shippingCityState.trim() ||
        !shippingPostalCodeState.trim() ||
        !shippingCountryState.trim()
      ) {
        throw new Error("Please complete the shipping address.");
      }

      if (deliveryStatus === "requested" && !deliveryDetails.trim()) {
        throw new Error(
          "Please enter the delivery details when admin is booking the delivery service.",
        );
      }

      const response = await fetch(
        `/api/admin/orders/${orderId}/customer-update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shipping_name: shippingNameState.trim(),
            shipping_phone: shippingPhoneState.trim(),
            shipping_address: shippingAddressState.trim(),
            shipping_city: shippingCityState.trim(),
            shipping_postal_code: shippingPostalCodeState.trim(),
            shipping_country: shippingCountryState.trim(),

            customer_note: customerNoteState.trim() || null,

            preferred_fulfillment_at: preferredFulfillmentState
              ? new Date(preferredFulfillmentState).toISOString()
              : null,

            /*
             * Keep sending the selected payment method.
             */
            payment_method: selectedPaymentMethod || null,

            porter_status: deliveryStatus,

            porter_details: deliveryDetails.trim() || null,

            delivery_service_mode: deliveryStatus,

            notify_admin: false,
            finalize_notification: false,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to update the order.");
      }

      setSuccess(result?.message ?? "Order updated successfully.");

      setEditMode(false);

      router.refresh();
    } catch (saveError) {
      console.error("Failed to save admin order changes:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update the order.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* =====================================================
          EDIT BUTTON
      ===================================================== */}

      <div className="flex justify-end">
        {!editMode ? (
          <Button type="button" onClick={startEditing}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit order
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={saving}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>

            <Button type="button" onClick={handleSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />

              {saving ? "Saving..." : "Save order"}
            </Button>
          </div>
        )}
      </div>

      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* =====================================================
          SHIPPING ADDRESS
          ONE SECTION — DISPLAY OR EDIT
      ===================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Shipping address</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Customer delivery information
          </p>
        </div>

        <div className="p-5">
          {editMode ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-shipping-name">Name</Label>

                <Input
                  id="admin-shipping-name"
                  value={shippingNameState}
                  onChange={(event) => setShippingNameState(event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-shipping-phone">Phone</Label>

                <Input
                  id="admin-shipping-phone"
                  value={shippingPhoneState}
                  onChange={(event) =>
                    setShippingPhoneState(event.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-shipping-address">Address</Label>

                <Input
                  id="admin-shipping-address"
                  value={shippingAddressState}
                  onChange={(event) =>
                    setShippingAddressState(event.target.value)
                  }
                  disabled={saving}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="admin-shipping-city">City</Label>

                  <Input
                    id="admin-shipping-city"
                    value={shippingCityState}
                    onChange={(event) =>
                      setShippingCityState(event.target.value)
                    }
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-shipping-postal">Postal code</Label>

                  <Input
                    id="admin-shipping-postal"
                    value={shippingPostalCodeState}
                    onChange={(event) =>
                      setShippingPostalCodeState(event.target.value)
                    }
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-shipping-country">Country</Label>

                <Input
                  id="admin-shipping-country"
                  value={shippingCountryState}
                  onChange={(event) =>
                    setShippingCountryState(event.target.value)
                  }
                  disabled={saving}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">{shippingName}</p>

              <p>{shippingPhone}</p>

              <p>{shippingAddress}</p>

              <p>
                {shippingPostalCode} {shippingCity}
              </p>

              <p>{shippingCountry}</p>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          DELIVERY SERVICE
          ONE SECTION — DISPLAY OR EDIT
      ===================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Delivery service</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Who will arrange the delivery?
          </p>
        </div>

        <div className="p-5">
          {editMode ? (
            <div className="space-y-4">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                  deliveryStatus === "booked"
                    ? "border-primary bg-muted/50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="admin-delivery-service"
                  checked={deliveryStatus === "booked"}
                  onChange={() => setDeliveryStatus("booked")}
                  disabled={saving}
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium">
                    Customer will book the delivery service
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Customer arranges the delivery themselves.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                  deliveryStatus === "requested"
                    ? "border-primary bg-muted/50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="admin-delivery-service"
                  checked={deliveryStatus === "requested"}
                  onChange={() => setDeliveryStatus("requested")}
                  disabled={saving}
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium">
                    Admin should book the delivery service
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Admin will arrange the delivery. Extra charges may apply.
                  </span>
                </span>
              </label>

              <div className="space-y-2">
                <Label htmlFor="admin-delivery-details">Delivery details</Label>

                <Textarea
                  id="admin-delivery-details"
                  value={deliveryDetails}
                  onChange={(event) => setDeliveryDetails(event.target.value)}
                  disabled={saving || deliveryStatus === "booked"}
                  rows={4}
                  placeholder="Enter the delivery company, booking details, contact details, price, or other delivery information."
                />

                <p className="text-xs text-muted-foreground">
                  These details remain visible to both the customer and admin.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground">Option</span>

                <span className="font-medium">
                  {porterStatus === "requested"
                    ? "Admin books"
                    : "Customer books"}
                </span>
              </div>

              {porterDetails ? (
                <div className="whitespace-pre-line rounded-lg border border-dashed p-3 text-muted-foreground">
                  {porterDetails}
                </div>
              ) : porterStatus === "requested" ? (
                <p className="text-muted-foreground">
                  Admin will arrange the delivery and extra charges may apply.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Customer will arrange the delivery service.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          FULFILLMENT DATE
          ONE SECTION — DISPLAY OR EDIT
      ===================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Fulfillment date</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Preferred date and time for fulfilling the order
          </p>
        </div>

        <div className="p-5">
          {editMode ? (
            <div className="space-y-2">
              <Label htmlFor="admin-fulfillment-date">
                Preferred fulfillment date & time
              </Label>

              <Input
                id="admin-fulfillment-date"
                type="datetime-local"
                value={preferredFulfillmentState}
                onChange={(event) =>
                  setPreferredFulfillmentState(event.target.value)
                }
                disabled={saving}
              />

              <p className="text-xs text-muted-foreground">Optional.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {formatFulfillmentDate(preferredFulfillmentAt)}
            </p>
          )}
        </div>
      </section>

      {/* =====================================================
          PAYMENT METHOD
          ONE SECTION — DISPLAY OR EDIT
      ===================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Payment method</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Payment method selected for this order
          </p>
        </div>

        <div className="p-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3">
              <span className="text-muted-foreground">Method</span>

              <span className="font-medium">{displayedPaymentName}</span>
            </div>

            {displayedPaymentType && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Type</span>

                <span>{displayedPaymentType}</span>
              </div>
            )}

            {displayedAccountName && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Account</span>

                <span>{displayedAccountName}</span>
              </div>
            )}

            {displayedPhoneNumber && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>

                <span>{displayedPhoneNumber}</span>
              </div>
            )}

            {displayedPaymentUrl && (
              <a
                href={displayedPaymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-block font-medium text-primary underline underline-offset-2"
              >
                Open payment link
              </a>
            )}

            {displayedInstructions && (
              <div className="whitespace-pre-line rounded-lg border border-dashed p-3 text-muted-foreground">
                {displayedInstructions}
              </div>
            )}

            {displayedQrCode && (
              <div className="rounded-lg border bg-white p-3">
                <div className="relative h-40 w-40 overflow-hidden rounded-md bg-white">
                  <Image
                    src={displayedQrCode}
                    alt={`${displayedPaymentName} QR code`}
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================
          CUSTOMER NOTE
          ONE SECTION — DISPLAY OR EDIT
      ===================================================== */}

      <section className="rounded-xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="text-lg font-semibold">Customer note</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Additional information from the customer
          </p>
        </div>

        <div className="p-5">
          {editMode ? (
            <Textarea
              value={customerNoteState}
              onChange={(event) => setCustomerNoteState(event.target.value)}
              disabled={saving}
              rows={4}
              placeholder="Customer note"
            />
          ) : (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {customerNote || "No customer note."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
