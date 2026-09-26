"use client";

import Image from "next/image";
import { useState } from "react";

export type CheckoutPaymentMethod = {
  id: string;
  method_type: string;
  display_name: string;
  enabled: boolean;
  account_name: string | null;
  phone_number: string | null;
  payment_url: string | null;
  instructions: string | null;
  qr_code_url: string | null;
  sort_order: number;
};

type CheckoutPaymentProps = {
  paymentMethods: CheckoutPaymentMethod[];
};

export default function CheckoutPayment({
  paymentMethods,
}: CheckoutPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState("");

  const enabledPaymentMethods = paymentMethods
    .filter((method) => method.enabled)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Payment method</h2>

      {enabledPaymentMethods.length > 0 ? (
        <div className="mt-4 space-y-3">
          {enabledPaymentMethods.map((method) => {
            const selected = paymentMethod === method.id;

            return (
              <label
                key={method.id}
                className={`block cursor-pointer rounded-lg border p-4 ${
                  selected ? "border-primary bg-muted/50" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment-method-selector"
                    value={method.id}
                    checked={selected}
                    onChange={() => setPaymentMethod(method.id)}
                  />

                  <span className="font-medium">
                    {method.display_name || "Payment"}
                  </span>
                </div>

                {/* PAYMENT DETAILS */}
                <div className="mt-3 space-y-3 pl-7">
                  {method.account_name && (
                    <p className="text-sm text-muted-foreground">
                      Name / account holder:{" "}
                      <span className="font-medium text-foreground">
                        {method.account_name}
                      </span>
                    </p>
                  )}

                  {method.phone_number && (
                    <p className="text-sm text-muted-foreground">
                      Phone number:{" "}
                      <span className="font-medium text-foreground">
                        {method.phone_number}
                      </span>
                    </p>
                  )}

                  {method.payment_url && (
                    <div>
                      <a
                        href={method.payment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium underline"
                      >
                        Make payment
                      </a>
                    </div>
                  )}

                  {method.instructions && (
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {method.instructions}
                    </p>
                  )}

                  {method.qr_code_url && (
                    <div className="pt-2">
                      <p className="mb-2 text-sm font-medium">
                        Scan to pay
                      </p>

                      <div className="relative h-48 w-48 overflow-hidden rounded-lg border bg-white">
                        <Image
                          src={method.qr_code_url}
                          alt={`${method.display_name || "Payment"} QR code`}
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
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          No payment methods are currently available.
        </p>
      )}

      <input
        type="hidden"
        name="payment_method"
        value={paymentMethod}
      />
    </section>
  );
}