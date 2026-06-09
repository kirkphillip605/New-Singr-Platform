import { createAuthClient } from "better-auth/react";
import { magicLinkClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  plugins: [
    magicLinkClient(),
    adminClient()
  ]
});

export const { signIn, signOut, useSession } = authClient;
