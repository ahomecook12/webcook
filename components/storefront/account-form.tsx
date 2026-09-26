"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  full_name: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
};

export default function AccountForm({
  email,
  profile,
}: {
  email: string;
  profile: Profile | null;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [addressLine1, setAddressLine1] = useState(
    profile?.address_line1 ?? "",
  );
  const [addressLine2, setAddressLine2] = useState(
    profile?.address_line2 ?? "",
  );
  const [city, setCity] = useState(profile?.city ?? "");
  const [postalCode, setPostalCode] = useState(
    profile?.postal_code ?? "",
  );
  const [country, setCountry] = useState(
    profile?.country ?? "India",
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_line1: addressLine1.trim(),
          address_line2: addressLine2.trim(),
          city: city.trim(),
          postal_code: postalCode.trim(),
          country: country.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save your details.");
      }

      setSuccess("Your details have been saved.");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save your details.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border p-5">
        <p className="text-sm font-medium">Email</p>
        <p className="mt-1 text-sm text-muted-foreground">{email}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Your login email cannot be changed here.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+41 ..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_line1">Address</Label>
          <Input
            id="address_line1"
            value={addressLine1}
            onChange={(event) => setAddressLine1(event.target.value)}
            placeholder="Street and house number"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_line2">
            Address line 2{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="address_line2"
            value={addressLine2}
            onChange={(event) => setAddressLine2(event.target.value)}
            placeholder="Apartment, floor, etc."
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal code</Label>
            <Input
              id="postal_code"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              placeholder="5000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Aarau"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder=""
            required
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-600">
            {success}
          </p>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save details"}
        </Button>
      </form>
    </div>
  );
}