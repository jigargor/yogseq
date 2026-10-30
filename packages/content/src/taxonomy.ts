export const POSITIONS = {
  standing: "Standing",
  seated: "Seated",
  kneeling: "Kneeling",
  supine: "Supine",
  prone: "Prone",
  inversion: "Inversion",
  armBalance: "Arm Balance",
} as const;

export const POSE_TYPES = {
  forwardFold: "Forward Fold",
  backbend: "Backbend",
  twist: "Twist",
  lateralBend: "Lateral Bend",
  hipOpener: "Hip Opener",
  balance: "Balance",
  core: "Core",
  chestOpener: "Chest Opener",
  shoulderOpener: "Shoulder Opener",
  hamstring: "Hamstring",
  restorative: "Restorative",
} as const;

export const LEVELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
} as const;

export const SIDEDNESS = {
  symmetric: "Symmetric",
  asymmetric: "Asymmetric",
} as const;

export const PROPS = {
  block: "Block",
  bolster: "Bolster",
  strap: "Strap",
  chair: "Chair",
  wall: "Wall",
  blanket: "Blanket",
} as const;

export type PositionId = keyof typeof POSITIONS;
export type PoseTypeId = keyof typeof POSE_TYPES;
export type LevelId = keyof typeof LEVELS;
export type SidednessId = keyof typeof SIDEDNESS;
export type PropId = keyof typeof PROPS;

export const POSITION_IDS = Object.keys(POSITIONS) as [PositionId, ...PositionId[]];
export const POSE_TYPE_IDS = Object.keys(POSE_TYPES) as [PoseTypeId, ...PoseTypeId[]];
export const LEVEL_IDS = Object.keys(LEVELS) as [LevelId, ...LevelId[]];
export const SIDEDNESS_IDS = Object.keys(SIDEDNESS) as [SidednessId, ...SidednessId[]];
export const PROP_IDS = Object.keys(PROPS) as [PropId, ...PropId[]];
