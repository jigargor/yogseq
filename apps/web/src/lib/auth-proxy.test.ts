import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("auth lazy proxy", () => {
  beforeEach(() => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-at-least-32-chars-long-xxxx");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("answers `in` checks and exposes a callable handler", async () => {
    const { auth } = await import("./auth");

    // better-auth's toNextJsHandler does `"handler" in auth` before using it.
    expect("handler" in auth).toBe(true);
    expect(typeof auth.handler).toBe("function");
    // Cold-importing better-auth and its plugins is slow on first load.
  }, 30_000);
});
