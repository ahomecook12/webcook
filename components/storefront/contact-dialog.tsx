"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHOP_NAME } from "@/app/constants";

export function ContactDialog() {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      alert("Please fill in your name, email and message.");
      return;
    }

    setSending(true);

    try {
      const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
      const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
      const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey) {
        throw new Error("Email service is not configured.");
      }

      await emailjs.send(
        serviceId,
        templateId,
        {
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim() || `Message from ${SHOP_NAME}`,
          message: message.trim(),
          reply_to: email.trim(),
        },
        {
          publicKey,
        },
      );

      setSent(true);

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Contact form error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Could not send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  function closeDialog() {
    if (sending) return;

    setOpen(false);
    setSent(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setSent(false);
          setOpen(true);
        }}
      >
        Contact us
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={closeDialog}
        >
          <Card
            className="w-full max-w-lg shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Contact {SHOP_NAME}</CardTitle>

                <p className="mt-2 text-sm text-muted-foreground">
                  Having trouble with the website or need help with something?
                  Send us a message and we&apos;ll get back to you.
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={closeDialog}
                disabled={sending}
                aria-label="Close contact form"
              >
                ✕
              </Button>
            </CardHeader>

            <CardContent>
              {sent ? (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
                    ✓
                  </div>

                  <h3 className="mt-4 text-xl font-semibold">
                    Message sent!
                  </h3>

                  <p className="mt-2 text-sm text-muted-foreground">
                    Thank you for contacting us. We&apos;ll get back to you as
                    soon as possible.
                  </p>

                  <Button
                    type="button"
                    className="mt-6"
                    onClick={closeDialog}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-name">Your name</Label>

                    <Input
                      id="contact-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-email">Email</Label>

                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-subject">
                      Subject
                    </Label>

                    <Input
                      id="contact-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="How can we help?"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">
                      Message
                    </Label>

                    <Textarea
                      id="contact-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Tell us what you need help with..."
                      rows={6}
                      disabled={sending}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDialog}
                      disabled={sending}
                    >
                      Cancel
                    </Button>

                    <Button type="submit" disabled={sending}>
                      {sending ? "Sending..." : "Send message"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}