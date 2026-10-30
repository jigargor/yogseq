import { poseSourceSchema, slugSchema } from "@yogseq/content";
import { errorResponse, jsonResponse } from "@/lib/http";
import { rateLimitByIp } from "@/lib/rate-limit";
import { isStudioWriteAllowed, loadPoseForStudio, writePoseFile } from "@/lib/studio";

interface SlugRouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: SlugRouteContext): Promise<Response> {
  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return errorResponse(400, "Invalid slug");

  const pose = await loadPoseForStudio(slug);
  return pose ? jsonResponse(pose) : errorResponse(404, "Pose not found");
}

async function save(request: Request, { params }: SlugRouteContext): Promise<Response> {
  if (!isStudioWriteAllowed())
    return errorResponse(403, "Pose Studio writes are disabled (set NODE_ENV=development or ALLOW_STUDIO_WRITE=1)");

  const rate = rateLimitByIp("save", request.headers);
  if (!rate.ok)
    return errorResponse(429, "Too many requests", { "Retry-After": String(rate.retryAfterSeconds) });

  const { slug } = await params;
  if (!slugSchema.safeParse(slug).success) return errorResponse(400, "Invalid slug");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON");
  }

  const candidate =
    typeof body === "object" && body !== null && "pose" in body
      ? (body as { pose: unknown }).pose
      : body;

  const parsed = poseSourceSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(400, `Invalid pose: ${issue?.path.join(".") ?? ""} ${issue?.message ?? ""}`.trim());
  }
  if (parsed.data.slug !== slug) return errorResponse(400, "Pose slug does not match the URL");

  const pose = {
    ...parsed.data,
    id: parsed.data.id ?? slug,
    status: parsed.data.status ?? "draft",
    version: parsed.data.version ?? 1,
  };

  await writePoseFile(slug, pose);
  return jsonResponse({ ok: true, path: `content/poses/${slug}.json` });
}

export const PUT = save;
export const POST = save;
