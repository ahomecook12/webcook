"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CheckoutFormProps = {
  children: React.ReactNode;
};

export default function CheckoutForm({
  children,
}: CheckoutFormProps) {
  const router = useRouter();

  const [submitting, setSubmitting] =
    useState(false);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(
      formData.get("full_name") ?? "",
    ).trim();

    const phone = String(
      formData.get("phone") ?? "",
    ).trim();

    const address = String(
      formData.get("address") ?? "",
    ).trim();

    const city = String(
      formData.get("city") ?? "",
    ).trim();

    const postalCode = String(
      formData.get("postal_code") ?? "",
    ).trim();

    const country = String(
      formData.get("country") ?? "",
    ).trim();
const preferredFulfillmentAt = String(
  formData.get("preferred_fulfillment_at") ?? "",
).trim();
    const paymentMethod = String(
      formData.get("payment_method") ?? "",
    ).trim();

    /*
     * Delivery uses the existing order fields:
     *
     * porter_status
     * porter_details
     */
    const porterStatus = String(
      formData.get("porter_status") ?? "",
    ).trim();

    const porterDetails = String(
      formData.get("porter_details") ?? "",
    ).trim();

    /* =====================================================
       Validate shipping address
       ===================================================== */

    if (!fullName) {
      alert("Please enter your full name.");
      return;
    }

    if (!phone) {
      alert("Please enter your phone number.");
      return;
    }

    if (!address) {
      alert("Please enter your address.");
      return;
    }

    if (!city) {
      alert("Please enter your city.");
      return;
    }

    if (!postalCode) {
      alert("Please enter your postal code.");
      return;
    }

    if (!country) {
      alert("Please enter your country.");
      return;
    }

    /* =====================================================
       Validate delivery service
       ===================================================== */

    if (
      porterStatus !== "booked" &&
      porterStatus !== "requested"
    ) {
      alert(
        "Please select how the delivery service should be arranged.",
      );
      return;
    }

    if (
      porterStatus === "booked" &&
      !porterDetails
    ) {
      alert(
        'Please enter the delivery service details, or select "Request admin to book the delivery service".',
      );
      return;
    }

    /* =====================================================
       Validate payment
       ===================================================== */

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    const data = {
      full_name: fullName,
      phone,
      address,
      city,
      postal_code: postalCode,
      country,

      payment_method: paymentMethod,
  preferred_fulfillment_at:
    preferredFulfillmentAt || null,
      /*
       * Existing orders columns.
       */
      porter_status: porterStatus,

      porter_details:
        porterDetails || null,
    };

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/orders",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to place order.",
        );
      }

      router.refresh();

      window.dispatchEvent(
        new CustomEvent(
          "cart-count-change",
          {
            detail: { count: 0 },
          },
        ),
      );

      window.dispatchEvent(
        new Event("order-completed"),
      );

      router.push(
        `/order-success?order=${encodeURIComponent(
          result.order_number,
        )}`,
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to place order.",
      );

      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {children}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting
          ? "Placing order..."
          : "Place order"}
      </button>
    </form>
  );
}
