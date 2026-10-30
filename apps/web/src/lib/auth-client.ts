import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  magicLinkClient,
  organizationClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient(), magicLinkClient(), adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
