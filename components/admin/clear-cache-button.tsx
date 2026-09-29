"use client";

import { useState } from "react";

export default function ClearCacheButton() {
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState("");

  async function clearCache() {
    setClearing(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/cache/clear", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to clear cache.");
      }

      setMessage("Cache cleared ✓");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to clear cache.",
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={clearCache}
        disabled={clearing}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50"
      >
        <span>{clearing ? "Clearing..." : "Clear Cache"}</span>
        <span>🧹</span>
      </button>

      {message && (
        <span className="text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}