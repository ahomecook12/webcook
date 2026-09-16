"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import emailjs from "@emailjs/browser";
import Image from "next/image";

type SocialLink = {
  id: string;
  name: string;
  url: string;
  icon_url: string;
};

type SocialSettings = {
  social_enabled: boolean;
  social_links: SocialLink[];
};

type SocialFloatProps = {
  settings: SocialSettings;
};

export function SocialFloat({ settings }: SocialFloatProps) {
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);

  if (!settings.social_enabled) {
    return null;
  }

  const availableLinks = (settings.social_links ?? []).filter((link) =>
    link.url?.trim(),
  );

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  

    if (!serviceId || !templateId || !publicKey) {
      console.error("EmailJS environment variables are missing.");

      alert(
        "Email service is not configured correctly. Please try again later.",
      );

      return;
    }

    setSending(true);

    try {
      const form = event.currentTarget;

     

      const response = await emailjs.sendForm(serviceId, templateId, form, {
        publicKey,
      });

      

      alert("Your message has been sent successfully. Thank you! ❤️");

      setName("");
      setEmail("");
      setMessage("");

      setContactOpen(false);
      setOpen(false);
    } catch (error) {
      console.error("EmailJS error:", error);

      alert("Sorry, your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* =====================================================
          MAIN FLOATING BUTTON
      ====================================================== */}

      <div className="fixed right-4 top-1/2 z-50 -translate-y-1/2">
        <div className="group relative animate-[float_3s_ease-in-out_infinite]">
          {/* Rainbow glow */}
          <div
            className="
              pointer-events-none
              absolute
              -inset-2
              rounded-full
              bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
              opacity-70
              blur-md
              animate-spin
            "
            style={{
              animationDuration: "4s",
            }}
          />

          {/* Rotating rainbow outer ring */}
          <div
            className="
              relative
              rounded-full
              bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
              p-[3px]
              shadow-[0_0_18px_rgba(255,255,255,0.55)]
              transition-transform
              duration-300
              group-hover:scale-110
              group-hover:shadow-[0_0_28px_rgba(255,255,255,0.8)]
              animate-spin
            "
            style={{
              animationDuration: "5s",
            }}
          >
            {/* Inner button stays still */}
            <Button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open social media"
              className="
                relative
                h-12
                w-12
                rounded-full
                border-0
                bg-background
                text-foreground
                shadow-xl
                hover:bg-background
              "
            >
              <span className="relative z-10 text-xl">📞</span>

              {/* Shimmer */}
              <span className="pointer-events-none absolute inset-1 overflow-hidden rounded-full">
                <span
                  className="
                    absolute
                    -left-8
                    top-0
                    h-full
                    w-4
                    rotate-12
                    bg-white/60
                    blur-sm
                    animate-[shine_2.5s_ease-in-out_infinite]
                  "
                />
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* =====================================================
          SOCIAL PANEL
      ====================================================== */}

      {open && (
        <div
          className="
            fixed
            inset-0
            z-50
            bg-transparent
          "
          onClick={() => setOpen(false)}
        >
          <aside
            className="
              absolute
              right-0
              top-0
              flex
              h-full
              w-[min(150px,100vw)]
              flex-col
              overflow-hidden
              border-l
              border-border/40
              bg-background/1
              shadow-2xl
              backdrop-blur-md
            "
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex shrink-0 items-start justify-center gap-4 p-5 sm:p-6">
              

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close social media"
                className="
                  shrink-0
                  rounded-full
                  bg-background/70
                  shadow-md
                  backdrop-blur
                  font-bold
                "
              >
                ✕
              </Button>
            </div>

           

            {/* SCROLLABLE CIRCLES */}

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
                px-5
                py-6
                sm:px-6
              "
            >
              <div className="flex flex-col items-center gap-7">
                {availableLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      group
                      flex
                      w-full
                      shrink-0
                      flex-col
                      items-center
                      rounded-2xl
                      py-2
                      transition-transform
                      duration-300
                      hover:scale-105
                    "
                  >
                    {/* Rainbow circle */}

                    <div className="relative">
                      {/* Glow */}
                      <div
                        className="
                          absolute
                          -inset-2
                          rounded-full
                          bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
                          opacity-60
                          blur-md
                          animate-spin
                        "
                        style={{
                          animationDuration: "5s",
                        }}
                      />

                      {/* Ring */}
                      <div
                        className="
                          relative
                          rounded-full
                          bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
                          p-[3px]
                          shadow-[0_0_18px_rgba(255,255,255,0.55)]
                          transition-transform
                          duration-300
                          group-hover:scale-110
                          animate-spin
                        "
                        style={{
                          animationDuration: "6s",
                        }}
                      >
                        <div
                          className="
                            flex
                            h-16
                            w-16
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-full
                            bg-background
                            shadow-xl
                          "
                        >
                          {link.icon_url ? (
                            <Image
                              src={link.icon_url}
                              alt={link.name || "Social"}
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl font-bold">✦</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span
                      className="
                        mt-2
                        max-w-[220px]
                        text-center
                        text-sm
                        font-medium
                        text-foreground
                      "
                    >
                      {link.name || "Social"}
                    </span>
                  </a>
                ))}

                {/* CONTACT US */}

                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="
                    group
                    flex
                    w-full
                    shrink-0
                    flex-col
                    items-center
                    rounded-2xl
                    py-2
                    text-center
                    transition-transform
                    duration-300
                    hover:scale-105
                  "
                >
                  <div className="relative">
                    {/* Glow */}
                    <div
                      className="
                        absolute
                        -inset-2
                        rounded-full
                        bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
                        opacity-60
                        blur-md
                        animate-spin
                      "
                      style={{
                        animationDuration: "5s",
                      }}
                    />

                    {/* Ring */}
                    <div
                      className="
                        relative
                        rounded-full
                        bg-[conic-gradient(from_0deg,#ff0080,#ff8a00,#ffe600,#00e676,#00c8ff,#7c4dff,#ff0080)]
                        p-[3px]
                        shadow-[0_0_18px_rgba(255,255,255,0.55)]
                        transition-transform
                        duration-300
                        group-hover:scale-110
                        animate-spin
                      "
                      style={{
                        animationDuration: "6s",
                      }}
                    >
                      <div
                        className="
                          flex
                          h-16
                          w-16
                          items-center
                          justify-center
                          rounded-full
                          bg-background
                          text-2xl
                          shadow-xl
                        "
                      >
                        ✉
                      </div>
                    </div>
                  </div>

                  <span className="mt-2 text-sm font-medium">Contact Us</span>
                </button>
              </div>
            </div>

            
          </aside>
        </div>
      )}

      {/* =====================================================
          CONTACT DIALOG
      ====================================================== */}

      {contactOpen && (
        <div
          className="
            fixed
            inset-0
            z-[60]
            flex
            items-center
            justify-center
            bg-black/50
            p-4
          "
          onClick={() => setContactOpen(false)}
        >
          <div
            className="
              max-h-[90dvh]
              w-full
              max-w-md
              overflow-y-auto
              rounded-2xl
              bg-background
              p-6
              shadow-2xl
            "
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-primary">GET IN TOUCH</p>

                <h2 className="mt-1 text-2xl font-semibold">Contact Us</h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setContactOpen(false)}
                aria-label="Close contact form"
              >
                ✕
              </Button>
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Having trouble with WhatsApp, phone, or anything else? Send us a
              message and we&apos;ll get back to you.
            </p>

            <form onSubmit={sendMessage} className="mt-6 space-y-4">
              {/* NAME */}

              <div className="space-y-2">
                <label htmlFor="contact-name" className="text-sm font-medium">
                  Name
                </label>

                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="
                    flex
                    h-10
                    w-full
                    rounded-md
                    border
                    border-input
                    bg-background
                    px-3
                    py-2
                    text-sm
                    outline-none
                    focus:ring-2
                    focus:ring-ring
                  "
                />
              </div>

              {/* EMAIL */}

              <div className="space-y-2">
                <label htmlFor="contact-email" className="text-sm font-medium">
                  Email
                </label>

                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="
                    flex
                    h-10
                    w-full
                    rounded-md
                    border
                    border-input
                    bg-background
                    px-3
                    py-2
                    text-sm
                    outline-none
                    focus:ring-2
                    focus:ring-ring
                  "
                />
              </div>

              {/* MESSAGE */}

              <div className="space-y-2">
                <label
                  htmlFor="contact-message"
                  className="text-sm font-medium"
                >
                  Message
                </label>

                <textarea
                  id="contact-message"
                  name="message"
                  placeholder="How can we help?"
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="
                    flex
                    min-h-[120px]
                    w-full
                    rounded-md
                    border
                    border-input
                    bg-background
                    px-3
                    py-2
                    text-sm
                    outline-none
                    focus:ring-2
                    focus:ring-ring
                  "
                />
              </div>

              {/* BUTTONS */}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContactOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={sending}>
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
