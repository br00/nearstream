import { NextResponse } from "next/server";
import {
  consumeMagicLinkToken,
  createSession,
  isEmailAllowed,
  isHostEmail,
} from "@/lib/auth";
import { userStore } from "@/lib/user-store";

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

  // Find-or-create the user. First sign-in lands you on /onboarding so you can
  // pick a handle + display name; subsequent sign-ins go to /studio.
  let user = await userStore.getByEmail(email);
  if (!user) {
    user = await userStore.create({ email });

    // The instance host gets a deterministic handle so existing URLs keep
    // working. Other first-time users go through onboarding to pick their own.
    if (isHostEmail(email)) {
      const hostHandle = process.env.HOST_USER_HANDLE ?? "alessandro";
      const hostName = process.env.HOST_USER_NAME ?? "Alessandro Borelli";
      user = (await userStore.setHandleAndName(user.id, hostHandle, hostName)) ?? user;
    }
  }

  await createSession(user.id, user.email);

  if (!user.handle) {
    return NextResponse.redirect(new URL("/onboarding", url));
  }
  return NextResponse.redirect(new URL("/studio", url));
}
