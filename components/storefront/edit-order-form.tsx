"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { createClient } from "@/lib/supabase/client";
import { CURRENCY_SYMBOL, STORE_LOCALE } from "@/app/constants";

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

type PaymentMethodSnapshot = {
  id?: string;
  method_type?: string;
  display_name?: string;
  account_name?: string | null;
  phone_number?: string | null;
  payment_url?: string | null;
  instructions?: string | null;
  qr_code_url?: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type Props = {
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

  porterStatus: string;
  porterDetails: string | null;

  currentPaymentMethodId?: string | null;
  paymentMethodOptions?: PaymentMethodOption[];

  paymentName: string;
  paymentSnapshot: PaymentMethodSnapshot | null;

  catalogMode: boolean;
  orderItems: OrderItem[];
};

const EDITABLE_STATUSES = [
  "pending_payment",
  "processing",
];

const DRAFT_KEY = (orderId: string) =>
  `pending-order-draft:${orderId}`;

const SNAPSHOT_KEY = (orderId: string) =>
  `pending-order-snapshot:${orderId}`;

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");
  const hours = String(
    date.getHours(),
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function Section({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={open}
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
          {open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </section>
  );
}

export default function EditOrderForm({
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
  porterStatus,
  porterDetails,
  currentPaymentMethodId,
  paymentMethodOptions = [],
  paymentName,
  paymentSnapshot,
  catalogMode,
  orderItems,
}: Props) {
  const router = useRouter();

  const canEdit =
    EDITABLE_STATUSES.includes(status);

  const initialDeliveryMode =
    porterStatus === "requested"
      ? "requested"
      : "booked";

  const [editMode, setEditMode] =
    useState(false);

  const [shippingNameState, setShippingNameState] =
    useState(shippingName);

  const [shippingPhoneState, setShippingPhoneState] =
    useState(shippingPhone);

  const [shippingAddressState, setShippingAddressState] =
    useState(shippingAddress);

  const [shippingCityState, setShippingCityState] =
    useState(shippingCity);

  const [
    shippingPostalCodeState,
    setShippingPostalCodeState,
  ] = useState(shippingPostalCode);

  const [
    shippingCountryState,
    setShippingCountryState,
  ] = useState(shippingCountry);

  const [customerNoteState, setCustomerNoteState] =
    useState(customerNote ?? "");

  const [
    preferredFulfillmentState,
    setPreferredFulfillmentState,
  ] = useState(
    toDateTimeLocal(
      preferredFulfillmentAt,
    ),
  );

  const [deliveryMode, setDeliveryMode] =
    useState<"booked" | "requested">(
      initialDeliveryMode,
    );

  const [deliveryDetails, setDeliveryDetails] =
    useState(porterDetails ?? "");

  const [paymentMethodId, setPaymentMethodId] =
    useState(
      currentPaymentMethodId ??
        paymentMethodOptions[0]?.id ??
        "",
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [navigationDialogOpen, setNavigationDialogOpen] =
    useState(false);

  const [pendingNavigation, setPendingNavigation] =
    useState<string | null>(null);

  const [openSections, setOpenSections] =
    useState({
      items: true,
      shipping: true,
      delivery: true,
      payment: true,
      fulfillment: true,
      note: true,
    });

  function toggleSection(
    key: keyof typeof openSections,
  ) {
    setOpenSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  const currentValues = useMemo(
    () => ({
      shipping_name:
        shippingNameState,
      shipping_phone:
        shippingPhoneState,
      shipping_address:
        shippingAddressState,
      shipping_city:
        shippingCityState,
      shipping_postal_code:
        shippingPostalCodeState,
      shipping_country:
        shippingCountryState,
      customer_note:
        customerNoteState,
      preferred_fulfillment_at:
        preferredFulfillmentState
          ? new Date(
              preferredFulfillmentState,
            ).toISOString()
          : null,
      payment_method:
        paymentMethodId || null,
      porter_status:
        deliveryMode === "requested"
          ? "requested"
          : "booked",
      porter_details:deliveryDetails,
    }),
    [
      shippingNameState,
      shippingPhoneState,
      shippingAddressState,
      shippingCityState,
      shippingPostalCodeState,
      shippingCountryState,
      customerNoteState,
      preferredFulfillmentState,
      paymentMethodId,
      deliveryMode,
      deliveryDetails,
    ],
  );

const hasChanges =
  shippingNameState !== shippingName ||
  shippingPhoneState !== shippingPhone ||
  shippingAddressState !== shippingAddress ||
  shippingCityState !== shippingCity ||
  shippingPostalCodeState !== shippingPostalCode ||
  shippingCountryState !== shippingCountry ||
  customerNoteState !== (customerNote ?? "") ||
  preferredFulfillmentState !==
    toDateTimeLocal(preferredFulfillmentAt) ||
  paymentMethodId !==
    (currentPaymentMethodId ??
      paymentMethodOptions[0]?.id ??
      "") ||
  deliveryMode !== initialDeliveryMode ||
  deliveryDetails !== (porterDetails ?? "");
  /*
   * Save the current unsaved form locally.
   *
   * This effect DOES NOT call setState.
   */
  useEffect(() => {
    if (!editMode || !hasChanges) {
      return;
    }

    window.localStorage.setItem(
      DRAFT_KEY(orderId),
      JSON.stringify(currentValues),
    );
  }, [
    editMode,
    hasChanges,
    currentValues,
    orderId,
  ]);

  /*
   * Warn when the browser itself is being closed/refreshed.
   *
   * The browser controls the actual wording here.
   */
  useEffect(() => {
    if (!editMode || !hasChanges) {
      return;
    }

    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [editMode, hasChanges]);

  /*
   * Protect normal internal link navigation.
   *
   * This gives us our own Stay / Leave dialog.
   */
  useEffect(() => {
    if (!editMode || !hasChanges) {
      return;
    }

    const handleDocumentClick = (
      event: MouseEvent,
    ) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;

      const anchor =
        target?.closest("a");

      if (!anchor) {
        return;
      }

      const href =
        anchor.getAttribute("href");

      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      if (
        anchor.target &&
        anchor.target !== "_self"
      ) {
        return;
      }

      let destination: URL;

      try {
        destination = new URL(
          href,
          window.location.href,
        );
      } catch {
        return;
      }

      if (
        destination.origin !==
        window.location.origin
      ) {
        return;
      }

      if (
        destination.pathname ===
          window.location.pathname &&
        destination.search ===
          window.location.search &&
        destination.hash ===
          window.location.hash
      ) {
        return;
      }

      event.preventDefault();

      setPendingNavigation(
        destination.href,
      );

      setNavigationDialogOpen(true);
    };

    document.addEventListener(
      "click",
      handleDocumentClick,
      true,
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick,
        true,
      );
    };
  }, [editMode, hasChanges]);

  function startEditing() {
    if (!canEdit) {
      return;
    }

    setError("");
    setMessage("");
    setEditMode(true);

    setOpenSections({
      items: true,
      shipping: true,
      delivery: true,
      payment: true,
      fulfillment: true,
      note: true,
    });
  }

  function createSnapshot() {
    const snapshot = {
      shipping_name:
        shippingName,
      shipping_phone:
        shippingPhone,
      shipping_address:
        shippingAddress,
      shipping_city:
        shippingCity,
      shipping_postal_code:
        shippingPostalCode,
      shipping_country:
        shippingCountry,
      customer_note:
        customerNote ?? null,
      preferred_fulfillment_at:
        preferredFulfillmentAt,
      payment_method:
        currentPaymentMethodId ?? null,
      porter_status:
        porterStatus,
      porter_details:
        porterDetails ?? null,
    };

    window.localStorage.setItem(
      SNAPSHOT_KEY(orderId),
      JSON.stringify(snapshot),
    );
  }

  async function handleSaveAll() {
    if (!canEdit) {
      return;
    }

      if (!hasChanges) {
    setMessage("No changes were made.");
    setError("");
    return;
  }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (
        !shippingNameState.trim() ||
        !shippingPhoneState.trim() ||
        !shippingAddressState.trim() ||
        !shippingCityState.trim() ||
        !shippingPostalCodeState.trim() ||
        !shippingCountryState.trim()
      ) {
        throw new Error(
          "Please complete your shipping address.",
        );
      }

      if (
        deliveryMode === "booked" &&
        !deliveryDetails.trim()
      ) {
        throw new Error(
          "Please enter the delivery service details, or select \"Request admin to book the delivery service\".",
        );
      }

      const supabase =
        createClient();

      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Your session has expired. Please log in again.",
        );
      }

      createSnapshot();

      const payload = {
        shipping_name:
          shippingNameState.trim(),

        shipping_phone:
          shippingPhoneState.trim(),

        shipping_address:
          shippingAddressState.trim(),

        shipping_city:
          shippingCityState.trim(),

        shipping_postal_code:
          shippingPostalCodeState.trim(),

        shipping_country:
          shippingCountryState.trim(),

        customer_note:
          customerNoteState.trim() ||
          null,

        preferred_fulfillment_at:
          currentValues.preferred_fulfillment_at,

        payment_method:
          paymentMethodId || null,

        porter_status:
          deliveryMode === "requested"
            ? "requested"
            : "booked",

        porter_details:  deliveryDetails.trim()  || null,

        delivery_service_mode:
          deliveryMode,

        notify_admin: true,
        finalize_notification: true,
      };

      const response =
        await fetch(
          `/api/orders/${orderId}/customer-update`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },
            body:
              JSON.stringify(payload),
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ??
            "Unable to update your order.",
        );
      }

      window.localStorage.removeItem(
        DRAFT_KEY(orderId),
      );

      window.localStorage.removeItem(
        SNAPSHOT_KEY(orderId),
      );

      setEditMode(false);

      setMessage(
        result?.message ??
          "Your changes were sent to the admin.",
      );

      router.refresh();
    } catch (saveError) {
      console.error(
        "Failed to save order changes:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update your order.",
      );
    } finally {
      setSaving(false);
    }
  }

  function discardLocalDraft() {
    window.localStorage.removeItem(
      DRAFT_KEY(orderId),
    );

    window.localStorage.removeItem(
      SNAPSHOT_KEY(orderId),
    );

    setShippingNameState(
      shippingName,
    );

    setShippingPhoneState(
      shippingPhone,
    );

    setShippingAddressState(
      shippingAddress,
    );

    setShippingCityState(
      shippingCity,
    );

    setShippingPostalCodeState(
      shippingPostalCode,
    );

    setShippingCountryState(
      shippingCountry,
    );

    setCustomerNoteState(
      customerNote ?? "",
    );

    setPreferredFulfillmentState(
      toDateTimeLocal(
        preferredFulfillmentAt,
      ),
    );

    setPaymentMethodId(
      currentPaymentMethodId ??
        paymentMethodOptions[0]?.id ??
        "",
    );

    setDeliveryMode(
      initialDeliveryMode,
    );

    setDeliveryDetails(
      porterDetails ?? "",
    );

    setEditMode(false);
    setError("");
    setMessage("");
  }

  function leavePage() {
    const destination =
      pendingNavigation;

    window.localStorage.removeItem(
      DRAFT_KEY(orderId),
    );

    window.localStorage.removeItem(
      SNAPSHOT_KEY(orderId),
    );

    setNavigationDialogOpen(false);
    setPendingNavigation(null);

    if (destination) {
      window.location.href =
        destination;
    }
  }

  const paymentMethodsAvailable =
    paymentMethodOptions.length > 0;

  return (
    <>
      <div className="space-y-4">

         {/* =====================================================
            ORDER ITEMS
        ===================================================== */}

        <Section
          title="Order items"
          subtitle="Confirmed from checkout"
          open={
            openSections.items
          }
          onToggle={() =>
            toggleSection("items")
          }
        >
          <div className="space-y-4">
            {orderItems.map(
              (item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">
                      {
                        item.product_name
                      }
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Quantity:{" "}
                      {item.quantity}
                    </p>
                  </div>

                  {!catalogMode && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {item.unit_price.toFixed(
                          2,
                        )}{" "}
                        ×{" "}
                        {
                          item.quantity
                        }
                      </p>

                      <p className="font-medium">
                        {
                          CURRENCY_SYMBOL
                        }{" "}
                        {Number(
                          item.total_price,
                        ).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              ),
            )}

            {catalogMode && (
              <div className="rounded-lg bg-muted/50 p-3 text-center text-sm">
                Prices confirmed directly.
              </div>
            )}
          </div>
        </Section>

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex justify-end">
        

          <div className="flex flex-wrap gap-2">
            {editMode ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    discardLocalDraft
                  }
                  disabled={saving}
                >
                  Cancel changes
                </Button>

                <Button
                  type="button"
                  onClick={
                    handleSaveAll
                  }
                  disabled={
                    saving 
                  }
                >
                  <Save className="mr-2 h-4 w-4" />

                  {saving
                    ? "Saving..."
                    : "Save all changes"}
                </Button>
              </>
            ) : (
              canEdit && (
                <Button
                  type="button"
                  onClick={
                    startEditing
                  }
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit order
                </Button>
              )
            )}
          </div>
        </div>

        {/* =====================================================
            SUCCESS / ERROR
        ===================================================== */}

        {message && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

       

        {/* =====================================================
            SHIPPING
        ===================================================== */}

        <Section
          title="Shipping address"
          subtitle="Your delivery information"
          open={
            openSections.shipping
          }
          onToggle={() =>
            toggleSection(
              "shipping",
            )
          }
        >
          {editMode ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="shipping-name">
                  Name
                </Label>

                <Input
                  id="shipping-name"
                  value={
                    shippingNameState
                  }
                  onChange={(
                    event,
                  ) =>
                    setShippingNameState(
                      event.target
                        .value,
                    )
                  }
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-phone">
                  Phone
                </Label>

                <Input
                  id="shipping-phone"
                  type="tel"
                  value={
                    shippingPhoneState
                  }
                  onChange={(
                    event,
                  ) =>
                    setShippingPhoneState(
                      event.target
                        .value,
                    )
                  }
                  disabled={saving}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-address">
                  Address
                </Label>

                <Input
                  id="shipping-address"
                  value={
                    shippingAddressState
                  }
                  onChange={(
                    event,
                  ) =>
                    setShippingAddressState(
                      event.target
                        .value,
                    )
                  }
                  disabled={saving}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shipping-city">
                    City
                  </Label>

                  <Input
                    id="shipping-city"
                    value={
                      shippingCityState
                    }
                    onChange={(
                      event,
                    ) =>
                      setShippingCityState(
                        event.target
                          .value,
                      )
                    }
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shipping-postal">
                    Postal code
                  </Label>

                  <Input
                    id="shipping-postal"
                    value={
                      shippingPostalCodeState
                    }
                    onChange={(
                      event,
                    ) =>
                      setShippingPostalCodeState(
                        event.target
                          .value,
                      )
                    }
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping-country">
                  Country
                </Label>

                <Input
                  id="shipping-country"
                  value={
                    shippingCountryState
                  }
                  onChange={(
                    event,
                  ) =>
                    setShippingCountryState(
                      event.target
                        .value,
                    )
                  }
                  disabled={saving}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {shippingName}
              </p>

              <p>
                {shippingPhone}
              </p>

              <p>
                {shippingAddress}
              </p>

              <p>
                {shippingPostalCode}{" "}
                {shippingCity}
              </p>

              <p>
                {shippingCountry}
              </p>
            </div>
          )}
        </Section>

        {/* =====================================================
            DELIVERY SERVICE
        ===================================================== */}

        <Section
          title="Delivery service"
          subtitle="Customer request and admin booking"
          open={
            openSections.delivery
          }
          onToggle={() =>
            toggleSection(
              "delivery",
            )
          }
        >
          {editMode ? (
            <div className="space-y-4">
              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                  deliveryMode ===
                  "booked"
                    ? "border-primary bg-muted/50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="delivery-service"
                  checked={
                    deliveryMode ===
                    "booked"
                  }
                  onChange={() =>
                    setDeliveryMode(
                      "booked",
                    )
                  }
                  disabled={saving}
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium">
                    I will book the delivery service myself
                  </span>

                  <span className="text-xs text-muted-foreground">
                    Add the delivery details below.
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 ${
                  deliveryMode ===
                  "requested"
                    ? "border-primary bg-muted/50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="delivery-service"
                  checked={
                    deliveryMode ===
                    "requested"
                  }
                  onChange={() =>
                    setDeliveryMode(
                      "requested",
                    )
                  }
                  disabled={saving}
                  className="mt-1 h-4 w-4"
                />

                <span>
                  <span className="block font-medium">
                    Request admin to book the delivery service
                  </span>

                  <span className="text-xs text-muted-foreground">
                    We will arrange it and extra charges may apply.
                  </span>
                </span>
              </label>

             
                <div className="space-y-2">
                  <Label htmlFor="delivery-details">
                    Delivery details
                  </Label>

                  <Textarea
                    id="delivery-details"
                    value={
                      deliveryDetails
                    }
                    onChange={(
                      event,
                    ) =>
                      setDeliveryDetails(
                        event.target
                          .value,
                      )
                    }
                    disabled={saving || deliveryMode === "requested"}
                    rows={4}
                    placeholder="Add the delivery company, contact details, or notes"
                  />
                </div>
             
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground">
                  Option
                </span>

                <span className="text-right font-medium">
                  {porterStatus ===
                  "requested"
                    ? "Admin books"
                    : "Customer books"}
                </span>
              </div>

              {porterDetails ? (
  <p className="whitespace-pre-line rounded-lg border border-dashed p-3 text-muted-foreground">
    {porterDetails}
  </p>
) : porterStatus === "requested" ? (
                <p className="whitespace-pre-line rounded-lg border border-dashed p-3 text-muted-foreground">
                  {
                    porterDetails
                  }
                </p>
              ) : porterStatus ===
                "requested" ? (
                <p className="text-muted-foreground">
                  Admin will arrange the delivery and extra charges may apply.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Customer books is the default delivery option.
                </p>
              )}
            </div>
          )}
        </Section>

        {/* =====================================================
            PAYMENT
        ===================================================== */}

        <Section
          title="Payment method"
          subtitle="Current payment method"
          open={
            openSections.payment
          }
          onToggle={() =>
            toggleSection(
              "payment",
            )
          }
        >
          {editMode ? (
            paymentMethodsAvailable ? (
              <div className="overflow-x-auto pb-2">
                <div className="flex min-w-max gap-3">
                  {paymentMethodOptions.map(
                    (method) => {
                      const selected =
                        paymentMethodId ===
                        method.id;

                      return (
                        <label
                          key={
                            method.id
                          }
                          className={`w-[280px] cursor-pointer rounded-xl border p-4 transition ${
                            selected
                              ? "border-primary bg-muted/60 shadow-sm"
                              : "border-border bg-background"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment-method"
                              checked={
                                selected
                              }
                              onChange={() =>
                                setPaymentMethodId(
                                  method.id,
                                )
                              }
                              disabled={
                                saving
                              }
                            />

                            <div>
                              <div className="font-medium">
                                {
                                  method.display_name
                                }
                              </div>

                              {method.method_type && (
                                <div className="text-xs text-muted-foreground">
                                  {
                                    method.method_type
                                  }
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                            {method.account_name && (
                              <p>
                                <span className="font-medium text-foreground">
                                  Account:
                                </span>{" "}
                                {
                                  method.account_name
                                }
                              </p>
                            )}

                            {method.phone_number && (
                              <p>
                                <span className="font-medium text-foreground">
                                  Phone:
                                </span>{" "}
                                {
                                  method.phone_number
                                }
                              </p>
                            )}

                            {method.payment_url && (
                              <a
                                href={
                                  method.payment_url
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block font-medium text-primary underline underline-offset-2"
                              >
                                Open payment link
                              </a>
                            )}

                            {method.instructions && (
                              <p className="whitespace-pre-line">
                                {
                                  method.instructions
                                }
                              </p>
                            )}

                            {method.qr_code_url && (
                              <div className="pt-2">
                                <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-white">
                                  <Image
                                    src={
                                      method.qr_code_url
                                    }
                                    alt={`${method.display_name} QR code`}
                                    fill
                                    unoptimized
                                    className="object-contain p-2"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    },
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payment methods are currently available.
              </p>
            )
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3">
                <span className="text-muted-foreground">
                  Method
                </span>

                <span className="text-right font-medium">
                  {paymentName}
                </span>
              </div>

              {paymentSnapshot?.account_name && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    Account
                  </span>

                  <span>
                    {
                      paymentSnapshot.account_name
                    }
                  </span>
                </div>
              )}

              {paymentSnapshot?.phone_number && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">
                    Phone
                  </span>

                  <span>
                    {
                      paymentSnapshot.phone_number
                    }
                  </span>
                </div>
              )}

              {paymentSnapshot?.payment_url && (
                <a
                  href={
                    paymentSnapshot.payment_url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-medium text-primary underline underline-offset-2"
                >
                  Open payment link
                </a>
              )}

              {paymentSnapshot?.instructions && (
                <div className="whitespace-pre-line rounded-lg border border-dashed p-3 text-muted-foreground">
                  {
                    paymentSnapshot.instructions
                  }
                </div>
              )}

              {paymentSnapshot?.qr_code_url && (
                <div className="rounded-lg border bg-white p-3">
                  <div className="relative h-40 w-40 overflow-hidden rounded-md bg-white">
                    <Image
                      src={
                        paymentSnapshot.qr_code_url
                      }
                      alt={`${paymentName} QR code`}
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* =====================================================
            FULFILLMENT
        ===================================================== */}

        <Section
          title="Fulfillment date"
          subtitle="Preferred schedule"
          open={
            openSections.fulfillment
          }
          onToggle={() =>
            toggleSection(
              "fulfillment",
            )
          }
        >
          {editMode ? (
            <div className="space-y-2">
              <Label htmlFor="fulfillment-date">
                Preferred fulfillment date & time
              </Label>

              <Input
                id="fulfillment-date"
                type="datetime-local"
                value={
                  preferredFulfillmentState
                }
                onChange={(
                  event,
                ) =>
                  setPreferredFulfillmentState(
                    event.target
                      .value,
                  )
                }
                disabled={saving}
              />

              <p className="text-xs text-muted-foreground">
                Optional. Choose when you would preferably like your order to be fulfilled.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {preferredFulfillmentAt
                ? new Date(
                    preferredFulfillmentAt,
                  ).toLocaleString(
                    STORE_LOCALE,
                    {
                      dateStyle:
                        "medium",
                      timeStyle:
                        "short",
                    },
                  )
                : "Not set"}
            </p>
          )}
        </Section>

        {/* =====================================================
            CUSTOMER NOTE
        ===================================================== */}

        <Section
          title="Customer note"
          subtitle="Any extra details for us"
          open={
            openSections.note
          }
          onToggle={() =>
            toggleSection(
              "note",
            )
          }
        >
          {editMode ? (
            <div className="space-y-2">
              <Label htmlFor="customer-note">
                Customer note
              </Label>

              <Textarea
                id="customer-note"
                value={
                  customerNoteState
                }
                onChange={(
                  event,
                ) =>
                  setCustomerNoteState(
                    event.target
                      .value,
                  )
                }
                disabled={saving}
                rows={4}
                placeholder="Anything you'd like us to know?"
              />
            </div>
          ) : (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {customerNote ||
                "No customer note yet."}
            </p>
          )}
        </Section>

        {/* =====================================================
            BOTTOM SAVE
        ===================================================== */}

        {editMode && (
          <div className="sticky bottom-4 z-10 flex justify-end">
            <div className="rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur">
              <Button
                type="button"
                onClick={
                  handleSaveAll
                }
                disabled={
                  saving ||
                  !hasChanges
                }
              >
                <Save className="mr-2 h-4 w-4" />

                {saving
                  ? "Saving..."
                  : "Save all changes"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          UNSAVED CHANGES — STAY / LEAVE
      ===================================================== */}

      <Dialog
        open={navigationDialogOpen}
        onOpenChange={
          setNavigationDialogOpen
        }
      >
        <DialogContent className="bg-background opacity-100  sm:max-w-md ">
          <DialogHeader>
            <DialogTitle className="bg-background">
              Unsaved changes
            </DialogTitle>

            <DialogDescription className="bg-background opacity-100 ">
              You have changes that have not
              been saved yet. Do you want to
              stay on this page or leave
              without saving?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-background gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNavigationDialogOpen(
                  false,
                );
                setPendingNavigation(
                  null,
                );
              }}
            >
              Stay
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={leavePage}
            >
              Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}