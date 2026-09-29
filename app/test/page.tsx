"use client";

import { useState } from "react";
import Image from "next/image";

export default function TestUploadPage() {
  // =========================================================
  // Cloudinary upload test
  // =========================================================

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpload() {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUrl(data.url);
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // YouTube Community post test
  // =========================================================

  const [youtubePostUrl, setYoutubePostUrl] = useState(
    "https://youtube.com/post/UgkxLGsRptbBYBZk1Md0mKBbKPuPTty48-M7?si=Dd9cOw8fH7FAO92c",
  );

  const [youtubeTestUrl, setYoutubeTestUrl] = useState("");

  function handleYoutubeTest() {
    const value = youtubePostUrl.trim();

    if (!value) {
      return;
    }

    setYoutubeTestUrl(value);
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-10">
      {/* =====================================================
          CLOUDINARY TEST
         ===================================================== */}

      <section className="rounded-xl border p-6">
        <h1 className="mb-2 text-2xl font-bold">
          Cloudinary Upload Test
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Existing Cloudinary upload test.
        </p>

        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setFile(e.target.files?.[0] ?? null)
            }
          />

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="ml-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>

        {url && (
          <div className="mt-8">
            <p className="mb-2 font-semibold">
              Uploaded successfully:
            </p>

            <Image
              src={url}
              alt="Uploaded product"
              width={256}
              height={256}
              className="w-64 rounded-lg object-contain"
            />

            <p className="mt-2 break-all text-sm">
              {url}
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          YOUTUBE COMMUNITY POST TEST
         ===================================================== */}

      <section className="rounded-xl border p-6">
        <h2 className="mb-2 text-2xl font-bold">
          YouTube Community Post Test
        </h2>

        <p className="mb-6 text-sm text-gray-600">
          This test does not download, copy, or upload the
          YouTube image. It only tries to display the original
          YouTube post.
        </p>

        <label
          htmlFor="youtube-post-url"
          className="mb-2 block font-medium"
        >
          YouTube Community Post URL
        </label>

        <div className="flex gap-3">
          <input
            id="youtube-post-url"
            type="url"
            value={youtubePostUrl}
            onChange={(e) =>
              setYoutubePostUrl(e.target.value)
            }
            placeholder="https://youtube.com/post/..."
            className="min-w-0 flex-1 rounded border px-3 py-2"
          />

          <button
            type="button"
            onClick={handleYoutubeTest}
            disabled={!youtubePostUrl.trim()}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            Test Preview
          </button>
        </div>

        {youtubeTestUrl && (
          <div className="mt-8 space-y-4">
            <div>
              <p className="mb-2 font-semibold">
                Direct YouTube post:
              </p>

              <a
                href={youtubeTestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-blue-600 underline"
              >
                {youtubeTestUrl}
              </a>
            </div>

            <div>
              <p className="mb-2 font-semibold">
                Embedded preview test:
              </p>

              <div className="overflow-hidden rounded-xl border bg-gray-50">
                <iframe
                  src={youtubeTestUrl}
                  title="YouTube Community Post Preview"
                  className="h-[600px] w-full"
                />
              </div>
            </div>

            <p className="text-sm text-gray-600">
              If YouTube refuses to display inside the box,
              that means YouTube blocks Community posts from
              being directly embedded with an iframe. The
              original post link above should still work.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}