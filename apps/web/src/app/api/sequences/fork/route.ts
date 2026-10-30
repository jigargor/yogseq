import { errorResponse, handleAuthed, jsonResponse, readJson } from "@/lib/http";
import { domainError, forkSequence } from "@/lib/sequences";

/** POST { "shareSlug": "abc123" } copies a shared sequence into the caller's library. */
export async function POST(request: Request): Promise<Response> {
  return handleAuthed(request, { limit: "share" }, async (userId) => {
    const body = await readJson(request);
    const shareSlug =
      typeof body === "object" && body !== null && "shareSlug" in body
        ? (body as { shareSlug: unknown }).shareSlug
        : undefined;
    if (typeof shareSlug !== "string" || shareSlug.length === 0)
      throw domainError("invalid", "shareSlug is required");

    const sequence = await forkSequence(userId, shareSlug);
    return sequence
      ? jsonResponse({ sequence }, { status: 201 })
      : errorResponse(404, "Shared sequence not found");
  });
}
