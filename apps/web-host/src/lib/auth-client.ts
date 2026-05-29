import { createAuthClient } from "better-auth/react";
import { twoFactorClient, phoneNumberClient, magicLinkClient } from "better-auth/client/plugins";
import { stripeClient } from "@better-auth/stripe/client";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
    phoneNumberClient(),
    magicLinkClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});

export const { signIn, signUp, useSession, signOut } = authClient;
