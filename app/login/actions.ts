"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createMagicLinkToken,
  isEmailAllowed,
  normalizeEmail,
} from "@/lib/auth";
import { sendMagicLink } from "@/lib/email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(formData: FormData): Promise<void> {
  const raw = formData.get("email");
  if (typeof raw !== "string" || !EMAIL_PATTERN.test(raw)) {
    redirect("/login?error=invalid_email");
  }

  const email = normalizeEmail(raw);

  if (isEmailAllowed(email)) {
    const token = await createMagicLinkToken(email);
    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") ?? "http";
    if (!host) throw new Error("Cannot determine request host");
    const url = `${proto}://${host}/auth/callback?token=${encodeURIComponent(token)}`;
    await sendMagicLink(email, url);
  }

  redirect("/login?sent=1");
}
