import { NextResponse } from "next/server";
import { consumeMagicLinkToken, createSession, isEmailAllowed } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url));
  }

  const email = await consumeMagicLinkToken(token);
  if (!email || !isEmailAllowed(email)) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url));
  }

  await createSession(email);
  return NextResponse.redirect(new URL("/studio", url));
}
