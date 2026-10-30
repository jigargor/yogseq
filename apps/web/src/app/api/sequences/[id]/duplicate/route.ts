import { errorResponse, handleAuthed, jsonResponse, type IdRouteContext } from "@/lib/http";
import { duplicateSequence } from "@/lib/sequences";

export async function POST(request: Request, { params }: IdRouteContext): Promise<Response> {
  const { id } = await params;
  return handleAuthed(request, { limit: "save" }, async (userId) => {
    const sequence = await duplicateSequence(userId, id);
    return sequence
      ? jsonResponse({ sequence }, { status: 201 })
      : errorResponse(404, "Sequence not found");
  });
}
