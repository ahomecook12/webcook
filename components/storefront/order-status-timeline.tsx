"use client";

import { STORE_LOCALE } from "@/app/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OrderStatusTimelineProps = {
  status: string;
  createdAt: string;
  paymentStatus: string;
  paymentVerifiedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
};

const steps = [
  {
    key: "placed",
    label: "Order placed",
  },
  {
    key: "payment",
    label: "Payment confirmed",
  },
  {
    key: "processing",
    label: "Processing",
  },
  {
    key: "shipped",
    label: "Shipped",
  },
  {
    key: "delivered",
    label: "Delivered",
  },
];

function formatDate(value: string | null) {
  if (!value) return null;

  return new Date(value).toLocaleString(STORE_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrderStatusTimeline({
  status,
  createdAt,
  paymentStatus,
  paymentVerifiedAt,
  shippedAt,
  deliveredAt,
}: OrderStatusTimelineProps) {
  if (status === "cancelled") {
    return (
      <section className="rounded-xl border p-5">
        <h2 className="text-lg font-semibold">
          Order status
        </h2>

        <div className="mt-5 rounded-lg bg-muted/50 p-4">
          <p className="font-medium">Order cancelled</p>

          <p className="mt-1 text-sm text-muted-foreground">
            This order has been cancelled.
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Order placed: {formatDate(createdAt)}
          </p>
        </div>
      </section>
    );
  }

  const processingReached =
    status === "processing" ||
    status === "shipped" ||
    status === "delivered";

  const shippedReached =
    status === "shipped" ||
    status === "delivered";

  const deliveredReached =
    status === "delivered";

  const paymentReached =
    paymentStatus === "paid" ||
    paymentVerifiedAt !== null;

  const completed = {
    placed: true,
    payment: paymentReached,
    processing: processingReached,
    shipped: shippedReached,
    delivered: deliveredReached,
  };

  const dates = {
    placed: createdAt,
    payment: paymentVerifiedAt,
    processing: paymentVerifiedAt,
    shipped: shippedAt,
    delivered: deliveredAt,
  };

  const currentStep =
    deliveredReached
      ? "delivered"
      : shippedReached
        ? "shipped"
        : processingReached
          ? "processing"
          : paymentReached
            ? "payment"
            : "placed";

  return (
    <section className="rounded-xl border p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            Order progress
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Track the progress of your order.
          </p>
        </div>
      </div>

      <div className="mt-8 overflow-x-auto pb-2">
        <div className="flex min-w-[700px]">
          {steps.map((step, index) => {
            const isCompleted = completed[step.key as keyof typeof completed];
            const isCurrent = currentStep === step.key;

            return (
              <div
                key={step.key}
                className="relative flex-1"
              >
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-1/2 right-0 top-5 h-0.5 ${
                      completed[
                        steps[index + 1].key as keyof typeof completed
                      ]
                        ? "bg-primary"
                        : "bg-border"
                    }`}
                  />
                )}

                <div className="relative flex flex-col items-center text-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </div>

                  <p
                    className={`mt-3 text-sm font-medium ${
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>

                  <p className="mt-1 min-h-10 text-xs text-muted-foreground">
                    {formatDate(
                      dates[step.key as keyof typeof dates],
                    ) ?? "Not yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog>
  <DialogTrigger className="mt-5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
  What do these order statuses mean?
</DialogTrigger>

  <DialogContent className="bg-background  sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>
        Understanding your order status
      </DialogTitle>
    </DialogHeader>

    <div className="mt-4 space-y-4 text-sm">
      <div>
        <p className="font-semibold">Order placed</p>
        <p className="mt-1 text-muted-foreground">
          Your order has been successfully received by us.
        </p>
      </div>

      <div>
        <p className="font-semibold">Payment confirmed</p>
        <p className="mt-1 text-muted-foreground">
          We have received and verified your payment.
        </p>
      </div>

      <div>
        <p className="font-semibold">Processing</p>
        <p className="mt-1 text-muted-foreground">
          Your order is being prepared for shipment.
        </p>
      </div>

      <div>
        <p className="font-semibold">Shipped</p>
        <p className="mt-1 text-muted-foreground">
          Your order has been handed over for delivery.
        </p>
      </div>

      <div>
        <p className="font-semibold">Delivered</p>
        <p className="mt-1 text-muted-foreground">
          Your order has been delivered successfully.
        </p>
      </div>

      <div>
        <p className="font-semibold">Cancelled</p>
        <p className="mt-1 text-muted-foreground">
          This order has been cancelled and will not be
          processed further.
        </p>
      </div>
    </div>
  </DialogContent>
</Dialog>
    </section>
  );
}