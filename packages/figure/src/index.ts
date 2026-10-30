export {
  BONE_ATTACH_END,
  BONE_IDS,
  BONE_LATERAL_ATTACH,
  BONE_PARENT,
  BONE_REST_ANGLE,
  BONE_SIDE,
  DEFAULT_AVATAR,
  MIRROR_MAP,
  MIRROR_PAIRS,
} from "./bones";
export type { Avatar, AvatarColors, AvatarHull, BoneId, BoneSide } from "./bones";

export {
  FIGURE_PROP_KINDS,
  FIGURE_VIEWS,
  figurePoseSchema,
  parseFigurePose,
  safeParseFigurePose,
} from "./pose-schema";
export type {
  BonePose,
  FigurePose,
  FigureProp,
  FigurePropKind,
  FigureView,
} from "./pose-schema";

export {
  DEFAULT_LAYER_ORDER,
  VIEW_ATTACH_FACTOR,
  VIEW_HULL_FACTOR,
  forwardKinematics,
  resolveLayerOrder,
  segmentsById,
  torsoHullPoints,
} from "./fk";
export type { FkSegment } from "./fk";

export { mirrorPose } from "./mirror";
export { solveTwoBoneIK } from "./ik";
export type { TwoBoneIKResult } from "./ik";

export { LANDMARK_COUNT, LANDMARK_INDEX, landmarksToPose } from "./landmarks";
export type {
  Landmark,
  LandmarksToPoseOptions,
  WorldLandmark,
} from "./landmarks";

export { DEFAULT_POSE, createDefaultPose } from "./default-pose";

export {
  FIGURE_GROUND_Y,
  FIGURE_UNIT,
  FIGURE_VIEWBOX_HEIGHT,
  FIGURE_VIEWBOX_WIDTH,
  Figure,
} from "./Figure";
export type { FigureProps, FigureSide, FigureSkin } from "./Figure";

export {
  angleFromVector,
  clamp,
  directionFromAngle,
  leftLateralFromAngle,
  normalizeAngle,
} from "./math";
export type { Point } from "./math";
