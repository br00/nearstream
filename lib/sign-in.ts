// What happens once an email has proved itself — shared by the web's
// magic-link callback (app/auth/callback) and the app's code exchange
// (app/api/v1/auth/token). Kept out of lib/auth.ts so the proxy, which
// imports the cookie name from there, doesn't pull in the user store.

import { isHostEmail } from "@/lib/auth";
import { userStore } from "@/lib/user-store";
import type { User } from "@/schemas/user";

/** Find-or-create the user. A first sign-in creates a handle-less user who
 *  goes through onboarding — except the instance host, who gets a fixed
 *  handle so existing URLs keep working. */
export async function findOrCreateUser(email: string): Promise<User> {
  let user = await userStore.getByEmail(email);
  if (!user) {
    user = await userStore.create({ email });
    if (isHostEmail(email)) {
      const hostHandle = process.env.HOST_USER_HANDLE ?? "alessandro";
      const hostName = process.env.HOST_USER_NAME ?? "Alessandro Borelli";
      user = (await userStore.setHandleAndName(user.id, hostHandle, hostName)) ?? user;
    }
  }
  return user;
}
