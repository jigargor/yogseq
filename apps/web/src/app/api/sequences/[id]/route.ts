import {
  errorResponse,
  handleAuthed,
  jsonResponse,
  readJson,
  type IdRouteContext,
} from "@/lib/http";
import {
  getSequence,
  parseSequenceUpdate,
  softDeleteSequence,
  updateSequence,
} from "@/lib/sequences";

export async function GET(request: Request, { params }: IdRouteContext): Promise<Response> {
  const { id } = await params;
  return handleAuthed(request, {}, async (userId) => {
    const sequence = await getSequence(id, userId);
    return sequence ? jsonResponse({ sequence }) : errorResponse(404, "Sequence not found");
  });
}

async function update(request: Request, { params }: IdRouteContext): Promise<Response> {
  const { id } = await params;
  return handleAuthed(request, { limit: "save" }, async (userId) => {
    const data = parseSequenceUpdate(await readJson(request));
    const sequence = await updateSequence(userId, id, data);
    return sequence ? jsonResponse({ sequence }) : errorResponse(404, "Sequence not found");
  });
}

export const PUT = update;
export const PATCH = update;

export async function DELETE(request: Request, { params }: IdRouteContext): Promise<Response> {
  const { id } = await params;
  return handleAuthed(request, {}, async (userId) => {
    const deleted = await softDeleteSequence(userId, id);
    return deleted ? jsonResponse({ ok: true }) : errorResponse(404, "Sequence not found");
  });
}
