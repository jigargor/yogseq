import { rateLimitByIp, type RateLimitName } from "@/lib/rate-limit";
import { domainError, domainErrorStatus, isDomainError } from "@/lib/sequences";
import { getRequestUser } from "@/lib/session";

export function jsonResponse(data: unknown, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function errorResponse(status: number, message: string, headers?: HeadersInit): Response {
  return Response.json({ error: message }, { status, headers });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw domainError("invalid", "Request body must be valid JSON");
  }
}

interface AuthedOptions {
  limit?: RateLimitName;
}

/** Wraps a REST handler: session check, optional rate limit, domain error mapping. */
export async function handleAuthed(
  request: Request,
  options: AuthedOptions,
  run: (userId: string) => Promise<Response>,
): Promise<Response> {
  try {
    const user = await getRequestUser(request);
    if (!user) return errorResponse(401, "Authentication required");

    if (options.limit) {
      const result = rateLimitByIp(options.limit, request.headers);
      if (!result.ok)
        return errorResponse(429, "Too many requests", {
          "Retry-After": String(result.retryAfterSeconds),
        });
    }
    return await run(user.id);
  } catch (error) {
    if (isDomainError(error)) return errorResponse(domainErrorStatus(error.code), error.message);
    console.error("[api] unexpected error", error);
    return errorResponse(500, "Internal server error");
  }
}

export interface IdRouteContext {
  params: Promise<{ id: string }>;
}
