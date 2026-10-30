import { errorResponse, handleAuthed, jsonResponse, type IdRouteContext } from "@/lib/http";
import { publishShareLink } from "@/lib/sequences";

export async function POST(request: Request, { params }: IdRouteContext): Promise<Response> {
  const { id } = await params;
  return handleAuthed(request, { limit: "share" }, async (userId) => {
    const sequence = await publishShareLink(userId, id);
    if (!sequence?.shareSlug) return errorResponse(404, "Sequence not found");
    return jsonResponse({ sequence, shareSlug: sequence.shareSlug, path: `/s/${sequence.shareSlug}` });
  });
}
