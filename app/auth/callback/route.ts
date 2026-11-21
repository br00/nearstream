import { NextResponse } from "next/server";
import { consumeMagicLinkToken, createSession, isEmailAllowed } from "@/lib/auth";
import { findOrCreateUser } from "@/lib/sign-in";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url));
  }

  const email = await consumeMagicLinkToken(token);
  if (!email || !(await isEmailAllowed(email))) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", url));
  }

  // Find-or-create the user. First sign-in lands you on /onboarding so you can
  // pick a handle + display name; subsequent sign-ins go to /studio.
  const user = await findOrCreateUser(email);

  await createSession(user.id, user.email);

  if (!user.handle) {
    return NextResponse.redirect(new URL("/onboarding", url));
  }
  return NextResponse.redirect(new URL("/studio", url));
}
