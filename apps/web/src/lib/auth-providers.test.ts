import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthProviders } from "./auth-providers";

describe("getAuthProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disables magic link when RESEND_API_KEY is unset", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(getAuthProviders().isMagicLinkEnabled).toBe(false);
  });

  it("enables magic link when RESEND_API_KEY is set", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    expect(getAuthProviders().isMagicLinkEnabled).toBe(true);
  });

  it("requires both Google client id and secret", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(getAuthProviders().isGoogleEnabled).toBe(false);

    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    expect(getAuthProviders().isGoogleEnabled).toBe(false);

    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    expect(getAuthProviders().isGoogleEnabled).toBe(true);
  });
});
