"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { SHOP_NAME } from "@/app/constants";

export default function SignupPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Account created! Please check your email to confirm your account."
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf8f4] px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <h1 className="font-serif text-4xl text-[#292722]">
            Create account
          </h1>

          <p className="mt-3 text-sm text-[#756f65]">
            Join {SHOP_NAME} and start shopping today!
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm">Name</label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-[#d8d1c5] bg-white px-4 py-3 outline-none focus:border-[#b89b5e]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Email</label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[#d8d1c5] bg-white px-4 py-3 outline-none focus:border-[#b89b5e]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Password</label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[#d8d1c5] bg-white px-4 py-3 outline-none focus:border-[#b89b5e]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-[#d8d1c5] bg-white px-4 py-3 outline-none focus:border-[#b89b5e]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {message && (
            <p className="text-sm text-green-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#292722] px-6 py-3 text-xs uppercase tracking-[0.2em] text-white disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#756f65]">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[#b89b5e] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
