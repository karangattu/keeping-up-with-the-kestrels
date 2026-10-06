import { describe, expect, it } from "vitest";
import frames from "./birdSpriteFrames.json";

// These opaque pixel locations come from the overlapping atlas crops. Foreign
// points are neighboring feathers; retained points are inside the intended bird.
const affectedCrops = [
  { species: "golden-eagle", frame: 1, foreign: [287, 4], own: [226, 91] },
  { species: "golden-eagle", frame: 2, foreign: [0, 117], own: [77, 116] },
  { species: "golden-eagle", frame: 8, foreign: [349, 62], own: [202, 58] },
  { species: "golden-eagle", frame: 9, foreign: [13, 13], own: [185, 62] },
  { species: "golden-eagle", frame: 14, foreign: [309, 58], own: [190, 71] },
  { species: "turkey-vulture", frame: 0, foreign: [359, 2], own: [257, 47] },
  { species: "turkey-vulture", frame: 1, foreign: [22, 76], own: [103, 82] },
  { species: "turkey-vulture", frame: 2, foreign: [2, 122], own: [155, 127] },
  { species: "turkey-vulture", frame: 8, foreign: [341, 87], own: [174, 68] },
  { species: "turkey-vulture", frame: 9, foreign: [1, 6], own: [192, 64] },
] as const;

function contains(clip: string, point: readonly number[]) {
  return [...clip.matchAll(/M(\d+) (\d+)h(\d+)v(\d+)h-\d+z/g)].some((match) => {
    const [x, y, width, height] = match.slice(1).map(Number);
    return point[0] >= x && point[0] < x + width && point[1] >= y && point[1] < y + height;
  });
}

describe("overlapping bird sprite crops", () => {
  for (const crop of affectedCrops) {
    it(`${crop.species} pose ${crop.frame} removes the neighboring bird and retains its own`, () => {
      const clip = frames[crop.species][crop.frame].clip;
      expect(contains(clip, crop.foreign)).toBe(false);
      expect(contains(clip, crop.own)).toBe(true);
    });
  }
});

// Pose 8's forward-reaching wingtip is farther right than the beak. Anchoring
// that feather used to move the whole bird sideways for one frame per cycle.
it("keeps the turkey vulture's beak on the flight path in pose 8", () => {
  const frame = frames["turkey-vulture"][8];
  const sourceBeak = { x: 316, y: 818 };
  expect(sourceBeak.x - frame.sx - frame.anchorX).toBe(0);
  expect(sourceBeak.y - frame.sy - frame.anchorY).toBe(0);
});
