import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink, organization } from "better-auth/plugins";
import * as schema from "@yogseq/db/schema";
import { Resend } from "resend";
import { getDb } from "./db";

const DEFAULT_FROM = "Yogseq <onboarding@resend.dev>";

async function sendMagicLinkEmail(email: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback: no email provider configured, log the link instead.
    console.warn(`[auth] RESEND_API_KEY not set. Magic link for ${email}: ${url}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
    to: email,
    subject: "Sign in to Yogseq",
    text: `Sign in to Yogseq using this link (valid for 5 minutes):\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Sign in to Yogseq using the link below (valid for 5 minutes):</p><p><a href="${url}">Sign in to Yogseq</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });

  if (error) throw new Error(`Failed to send magic link: ${error.message}`);
}

function createAuth() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

  return betterAuth({
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : {},
    plugins: [
      magicLink({
        expiresIn: 60 * 5,
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(email, url);
        },
      }),
      organization(),
      admin(),
      // Must be last: lets server actions set auth cookies.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let cachedAuth: Auth | undefined;

/** Lazily constructs Better Auth so importing never requires env at build time. */
export function getAuth(): Auth {
  cachedAuth ??= createAuth();
  return cachedAuth;
}

/**
 * Lazy proxy to the Better Auth instance. Safe to import at build time;
 * the real instance (and DB connection) is created on first property access.
 */
export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAuth(), prop, receiver);
  },
});
