"use client";

import { useState } from "react";
import { CalendarPlus, Loader2, X } from "lucide-react";

type AddToCalendarDialogProps = {
  orderId: string;
  orderNumber: string;
};

export default function AddToCalendarDialog({
  orderId,
  orderNumber,
}: AddToCalendarDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function openDialog() {
    setError("");
    setSuccess(false);

    /*
     * Default to today's date.
     */
    const today = new Date();

    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    setDate(`${yyyy}-${mm}-${dd}`);

    setOpen(true);
  }

  function closeDialog() {
    if (loading) {
      return;
    }

    setOpen(false);
    setError("");
    setSuccess(false);
  }

  async function handleAddToCalendar() {
    setError("");

    if (!date) {
      setError("Please select a date.");
      return;
    }

    if (!startTime) {
      setError("Please select a start time.");
      return;
    }

    if (!endTime) {
      setError("Please select an end time.");
      return;
    }

    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Please enter a valid date and time.");
      return;
    }

    if (end <= start) {
      setError("End time must be later than start time.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/auth/google-calendar/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: orderId,
            start: start.toISOString(),
            end: end.toISOString(),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to add the order to Google Calendar.",
        );
      }

      setSuccess(true);
    } catch (error) {
      console.error("Calendar event creation failed:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to add the order to Google Calendar.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* =====================================================
          OPEN BUTTON
          ===================================================== */}

      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      >
        <CalendarPlus className="h-4 w-4" />

        Add to Google Calendar
      </button>

      {/* =====================================================
          MODAL
          ===================================================== */}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDialog();
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-dialog-title"
          >
            {/* =================================================
                HEADER
                ================================================= */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5" />

                  <h2
                    id="calendar-dialog-title"
                    className="text-lg font-semibold"
                  >
                    Add to Google Calendar
                  </h2>
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  Order {orderNumber}
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={loading}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* =================================================
                SUCCESS
                ================================================= */}

            {success ? (
              <div className="mt-6 rounded-lg border border-primary/30 bg-muted/30 p-4">
                <p className="font-medium">
                  ✓ Added to Google Calendar
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Order {orderNumber} has been added to your
                  Google Calendar.
                </p>

                <button
                  type="button"
                  onClick={closeDialog}
                  className="mt-4 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* =============================================
                    FORM
                    ============================================= */}

                <div className="mt-6 space-y-4">
                  {/* DATE */}

                  <div>
                    <label
                      htmlFor={`calendar-date-${orderId}`}
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Date
                    </label>

                    <input
                      id={`calendar-date-${orderId}`}
                      type="date"
                      value={date}
                      onChange={(event) =>
                        setDate(event.target.value)
                      }
                      disabled={loading}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* TIMES */}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor={`calendar-start-${orderId}`}
                        className="mb-1.5 block text-sm font-medium"
                      >
                        Start time
                      </label>

                      <input
                        id={`calendar-start-${orderId}`}
                        type="time"
                        value={startTime}
                        onChange={(event) =>
                          setStartTime(event.target.value)
                        }
                        disabled={loading}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`calendar-end-${orderId}`}
                        className="mb-1.5 block text-sm font-medium"
                      >
                        End time
                      </label>

                      <input
                        id={`calendar-end-${orderId}`}
                        type="time"
                        value={endTime}
                        onChange={(event) =>
                          setEndTime(event.target.value)
                        }
                        disabled={loading}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* ERROR */}

                  {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* BUTTONS */}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={closeDialog}
                      disabled={loading}
                      className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {loading && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}

                      {loading
                        ? "Adding..."
                        : "Add to Google Calendar"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}