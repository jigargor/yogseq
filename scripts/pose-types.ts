import type {
  LevelId,
  PoseTypeId,
  PositionId,
  PropId,
  SidednessId,
} from "../packages/content/src/taxonomy";
import type { RigSpec } from "./pose-dsl";

export interface PoseDef {
  slug: string;
  nameEn: string;
  nameSanskrit: string;
  nameSanskritDiacritics: string;
  aliases: string[];
  position: PositionId;
  types: PoseTypeId[];
  level: LevelId;
  sidedness: SidednessId;
  props: PropId[];
  cues: string[];
  benefits: string[];
  cautions: string[];
  rig: RigSpec;
  related: { prep: string[]; counter: string[]; variations: string[] };
}

export type Related = [prep: string[], counter: string[], variations: string[]];

/** Compact positional constructor so the data files stay readable. */
export function P(
  slug: string,
  nameEn: string,
  nameSanskrit: string,
  nameSanskritDiacritics: string,
  aliases: string[],
  position: PositionId,
  types: PoseTypeId[],
  level: LevelId,
  sidedness: SidednessId,
  props: PropId[],
  cues: string[],
  benefits: string[],
  cautions: string[],
  rig: RigSpec,
  rel: Related = [[], [], []],
): PoseDef {
  return {
    slug,
    nameEn,
    nameSanskrit,
    nameSanskritDiacritics,
    aliases,
    position,
    types,
    level,
    sidedness,
    props,
    cues,
    benefits,
    cautions,
    rig,
    related: { prep: rel[0], counter: rel[1], variations: rel[2] },
  };
}
