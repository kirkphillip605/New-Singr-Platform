import { createAuthClient } from "better-auth/react";
import { twoFactorClient, phoneNumberClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [
    twoFactorClient({
      twoFactorPage: "/two-factor",
    }),
    phoneNumberClient(),
  ],
});

export const { signIn, signUp, useSession, signOut } = authClient;
