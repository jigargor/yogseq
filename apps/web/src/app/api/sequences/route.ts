import { handleAuthed, jsonResponse, readJson } from "@/lib/http";
import { createSequence, listSequences, parseSequenceInput } from "@/lib/sequences";

export async function GET(request: Request): Promise<Response> {
  return handleAuthed(request, {}, async (userId) =>
    jsonResponse({ sequences: await listSequences(userId) }),
  );
}

export async function POST(request: Request): Promise<Response> {
  return handleAuthed(request, { limit: "save" }, async (userId) => {
    const input = parseSequenceInput(await readJson(request));
    const sequence = await createSequence(userId, input);
    return jsonResponse({ sequence }, { status: 201 });
  });
}
