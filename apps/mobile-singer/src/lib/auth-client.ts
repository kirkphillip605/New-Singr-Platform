/// <reference types="vite/client" />

import { createAuthClient } from "better-auth/react";
import { anonymousClient, magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  plugins: [
    anonymousClient(),
    magicLinkClient()
  ]
});

export const { signIn, signUp, signOut, useSession } = authClient;
