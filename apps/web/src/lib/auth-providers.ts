export interface AuthProviders {
  isMagicLinkEnabled: boolean;
  isGoogleEnabled: boolean;
}

/**
 * Env-only provider detection. Never constructs Better Auth, so it is safe to
 * call at build time and from server components. Server-only: reads secrets
 * from process.env, so do not import it from client components.
 */
export function getAuthProviders(): AuthProviders {
  return {
    isMagicLinkEnabled: Boolean(process.env.RESEND_API_KEY),
    isGoogleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  };
}
