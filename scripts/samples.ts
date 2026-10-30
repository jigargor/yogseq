/** Sample sequence builders used by `generate-poses.ts`. */

interface SampleItem {
  id: string;
  kind: "pose" | "section" | "note";
  poseId?: string;
  side?: "left" | "right";
  durationSec?: number;
  breaths?: number;
  note?: string;
  title?: string;
}

interface Sample {
  id: string;
  title: string;
  description: string;
  level: "beginner" | "intermediate" | "advanced";
  style: string;
  targetMinutes: number;
  tags: string[];
  items: SampleItem[];
}

const SECONDS_PER_BREATH = 5;

function createBuilder(prefix: string, slugs: Set<string>) {
  const items: SampleItem[] = [];
  const nextId = (): string => `${prefix}-${String(items.length + 1).padStart(2, "0")}`;

  const section = (title: string): void =>
    void items.push({ id: nextId(), kind: "section", title });
  const note = (text: string): void => void items.push({ id: nextId(), kind: "note", note: text });

  /** Add a pose held for `sec` seconds (or `breaths` breaths for flowing poses). */
  const pose = (
    poseId: string,
    sec: number,
    opts: { side?: "left" | "right"; breaths?: number; note?: string } = {},
  ): void => {
    if (!slugs.has(poseId))
      throw new Error(`sample "${prefix}" references unknown pose "${poseId}"`);
    const item: SampleItem = { id: nextId(), kind: "pose", poseId };
    if (opts.side) item.side = opts.side;
    if (opts.breaths) item.breaths = opts.breaths;
    item.durationSec = opts.breaths ? opts.breaths * SECONDS_PER_BREATH : sec;
    if (opts.note) item.note = opts.note;
    items.push(item);
  };

  /** Add both sides of an asymmetric pose. */
  const bothSides = (
    poseId: string,
    sec: number,
    opts: { breaths?: number; note?: string } = {},
  ): void => {
    pose(poseId, sec, { ...opts, side: "right" });
    pose(poseId, sec, { ...opts, side: "left" });
  };

  /** Pad or trim the final pose so the whole sequence matches the target length. */
  const fitTo = (targetMinutes: number): void => {
    const total = items.reduce((sum, item) => sum + (item.durationSec ?? 0), 0);
    const last = [...items].reverse().find((item) => item.kind === "pose");
    if (!last) return;
    last.durationSec = Math.max(60, (last.durationSec ?? 0) + targetMinutes * 60 - total);
  };

  return { items, section, note, pose, bothSides, fitTo };
}

function beginnerFlow(slugs: Set<string>): Sample {
  const b = createBuilder("beginner-flow-30min", slugs);
  b.section("Arrive");
  b.pose("easy-seat", 120, { note: "Close the eyes and follow the natural breath." });
  b.bothSides("seated-twist", 30);
  b.bothSides("seated-side-bend", 30);

  b.section("Warm up");
  b.pose("tabletop", 30);
  b.pose("cat", 0, { breaths: 6 });
  b.pose("cow", 0, { breaths: 6, note: "Link movement to breath, one breath per movement." });
  b.bothSides("thread-the-needle", 40);
  b.pose("child", 45);
  b.pose("downward-dog", 40, { note: "Pedal the feet and bend the knees freely." });

  b.section("Standing poses");
  b.bothSides("low-lunge", 40);
  b.pose("mountain", 40);
  b.pose("upward-salute", 0, { breaths: 3 });
  b.pose("standing-forward-fold", 40);
  b.pose("half-forward-fold", 15);
  b.pose("chair", 40);
  b.bothSides("warrior-1", 40);
  b.bothSides("warrior-2", 40);
  b.bothSides("triangle", 35);
  b.pose("wide-legged-forward-fold", 45);
  b.bothSides("tree", 35);

  b.section("Floor sequence");
  b.pose("staff", 20);
  b.pose("seated-forward-fold", 60);
  b.pose("bridge", 45);
  b.pose("knees-to-chest", 40);
  b.bothSides("reclined-twist", 50);
  b.pose("happy-baby", 40);

  b.section("Rest");
  b.note("Cover up and let the body feel heavy.");
  b.pose("corpse", 300);
  b.fitTo(30);

  return {
    id: "beginner-flow-30min",
    title: "Beginner Flow — 30 Minutes",
    description:
      "A gentle full-body class for newer practitioners: breath awareness, warm-up, foundational standing poses and a long rest.",
    level: "beginner",
    style: "Hatha",
    targetMinutes: 30,
    tags: ["beginner", "full-body", "foundations", "30-minute"],
    items: b.items,
  };
}

function vinyasaPeakWarrior(slugs: Set<string>): Sample {
  const b = createBuilder("vinyasa-peak-warrior", slugs);
  b.section("Centering");
  b.pose("easy-seat", 120, { note: "Set an intention to build steady strength." });
  b.pose("tabletop", 20);
  b.pose("cat", 0, { breaths: 5 });
  b.pose("cow", 0, { breaths: 5 });
  b.pose("child", 40);

  b.section("Sun Salutation A (repeat 3 times)");
  b.pose("mountain", 0, { breaths: 1 });
  b.pose("upward-salute", 0, { breaths: 1 });
  b.pose("standing-forward-fold", 0, { breaths: 1 });
  b.pose("half-forward-fold", 0, { breaths: 1 });
  b.pose("plank", 0, { breaths: 1 });
  b.pose("chaturanga", 0, { breaths: 1 });
  b.pose("upward-dog", 0, { breaths: 1 });
  b.pose("downward-dog", 0, { breaths: 5 });
  b.note("Step or float forward and rise to mountain to complete each round.");

  b.section("Warrior builders");
  b.bothSides("crescent-lunge", 0, { breaths: 5 });
  b.bothSides("warrior-1", 0, { breaths: 5 });
  b.bothSides("warrior-2", 0, { breaths: 5 });
  b.bothSides("reverse-warrior", 0, { breaths: 3 });
  b.bothSides("extended-side-angle", 0, { breaths: 5 });
  b.pose("downward-dog", 0, {
    breaths: 5,
    note: "Vinyasa between sides: plank, chaturanga, up dog, down dog.",
  });

  b.section("Balance and hips");
  b.bothSides("revolved-side-angle", 0, { breaths: 5 });
  b.bothSides("triangle", 0, { breaths: 5 });
  b.bothSides("pyramid", 0, { breaths: 5 });
  b.bothSides("half-forward-fold", 0, { breaths: 3 });

  b.section("Peak: Warrior III and Half Moon");
  b.note("Keep a micro-bend in the standing knee and use blocks as needed.");
  b.bothSides("warrior-3", 0, { breaths: 6 });
  b.bothSides("half-moon", 0, { breaths: 6 });
  b.bothSides("airplane", 0, { breaths: 5 });

  b.section("Cool down");
  b.pose("standing-forward-fold", 45);
  b.pose("chair", 40);
  b.pose("garland", 45);
  b.pose("bridge", 45);
  b.pose("wheel", 30, { note: "Optional. Take bridge again if the shoulders feel tight." });
  b.bothSides("reclined-pigeon", 60);
  b.pose("reclined-twist", 50, { side: "right" });
  b.pose("reclined-twist", 50, { side: "left" });
  b.pose("happy-baby", 45);

  b.section("Rest");
  b.pose("corpse", 300);
  b.fitTo(60);

  return {
    id: "vinyasa-peak-warrior",
    title: "Vinyasa — Peak Warrior III",
    description:
      "A flowing 60-minute class that builds through sun salutations and warrior variations toward Warrior III and Half Moon.",
    level: "intermediate",
    style: "Vinyasa",
    targetMinutes: 60,
    tags: ["vinyasa", "strength", "balance", "peak-pose", "warrior"],
    items: b.items,
  };
}

function yinHipOpeners(slugs: Set<string>): Sample {
  const b = createBuilder("yin-hip-openers", slugs);
  b.section("Settle in");
  b.pose("corpse", 180, { note: "Let the body arrive and the breath slow down." });
  b.pose("knees-to-chest", 90);
  b.pose("easy-seat", 120);

  b.section("Floor-based hip openers");
  b.pose("bound-angle-fold", 240, { note: "Support the head and let gravity open the hips." });
  b.pose("wide-knee-child", 240);
  b.pose("frog", 180, { note: "Keep the knees well padded. Come out slowly." });
  b.pose("child", 60);
  b.bothSides("sleeping-pigeon", 240, { note: "Fold forward and let the weight sink." });
  b.pose("child", 45);

  b.section("Outer hip and twists");
  b.bothSides("fire-log", 180);
  b.bothSides("bharadvaja-twist", 90);
  b.pose("tabletop", 20);
  b.pose("thread-the-needle", 90, { side: "right" });
  b.pose("thread-the-needle", 90, { side: "left" });

  b.section("Restore");
  b.pose("reclined-bound-angle", 300);
  b.bothSides("reclined-pigeon", 150);
  b.bothSides("reclined-twist", 120);
  b.pose("legs-up-wall", 240);

  b.section("Rest");
  b.pose("corpse", 300);
  b.fitTo(60);

  return {
    id: "yin-hip-openers",
    title: "Yin — Deep Hip Openers",
    description:
      "A slow, floor-based practice with long supported holds to release the hips, groins and lower back.",
    level: "beginner",
    style: "Yin",
    targetMinutes: 60,
    tags: ["yin", "hips", "restorative", "slow", "evening"],
    items: b.items,
  };
}

export function buildSamples(slugs: Set<string>): Sample[] {
  return [beginnerFlow(slugs), vinyasaPeakWarrior(slugs), yinHipOpeners(slugs)];
}
