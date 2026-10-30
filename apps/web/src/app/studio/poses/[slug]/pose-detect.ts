import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { landmarksToPose, type FigurePose, type Landmark, type WorldLandmark } from "@yogseq/figure";

/** Keep the WASM runtime on the same version as the installed `@mediapipe/tasks-vision`. */
const MEDIAPIPE_VERSION = "1.2.0";
const WASM_BASE_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

async function createLandmarker(): Promise<PoseLandmarker> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);

  const create = (delegate: "GPU" | "CPU") =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "IMAGE",
      numPoses: 1,
    });

  try {
    return await create("GPU");
  } catch {
    return create("CPU");
  }
}

function getLandmarker(): Promise<PoseLandmarker> {
  landmarkerPromise ??= createLandmarker().catch((error: unknown) => {
    landmarkerPromise = null;
    throw error;
  });
  return landmarkerPromise;
}

/** Detect a single person in `image` and convert the landmarks to a figure rig. */
export async function detectPoseFromImage(image: HTMLImageElement): Promise<FigurePose> {
  const landmarker = await getLandmarker();
  const result = landmarker.detect(image);

  const landmarks = result.landmarks[0];
  if (!landmarks) throw new Error("No person detected in the photo. Try a clearer, full-body image.");

  const worldLandmarks = result.worldLandmarks[0];
  return landmarksToPose(
    landmarks as readonly Landmark[],
    worldLandmarks as readonly WorldLandmark[] | undefined,
  );
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
