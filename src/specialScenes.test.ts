import { expect, it } from "vitest";
import { advanceSpecialScenes } from "./specialScenes";
import { makeEmptyCounts } from "./game";

it("counts each special raptor once when its scene starts, even across repeated frames", () => {
  const counts = makeEmptyCounts();
  const started = new Set<string>();
  for (const elapsed of [0, 18, 18.1, 25, 37, 37.1, 59]) {
    advanceSpecialScenes(elapsed, started, counts);
  }
  expect(counts.redTailedHawk).toBe(1);
  expect(counts.whiteTailedKite).toBe(1);
  expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(2);
});

it("keeps the mobbing group flapping as it crosses the screen", async () => {
  const { getMobbingPose } = await import("./specialScenes");
  const a = getMobbingPose(0.2);
  const b = getMobbingPose(0.23);
  expect(a.frame).not.toBe(b.frame);
  expect(a.x).toBeLessThan(b.x);
  expect(getMobbingPose(0.99).frame).toBeLessThan(15);

});

it("keeps the caught mouse below its atlas cell and excludes the neighboring kite", async () => {
  const { default: frames } = await import("./huntingSpriteFrames.json");
  const crop = frames.kite[7];
  const contains = (x: number, y: number) => [...crop.clip.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)].some((m) =>
    x - crop.sx >= Number(m[1]) && x - crop.sx < Number(m[1]) + Number(m[3]) && y - crop.sy === Number(m[2]));
  expect(contains(1180, 630)).toBe(true);
  expect(contains(1160, 720)).toBe(false);
});

it("keeps the running mouse on the ground until the kite reaches it", async () => {
  const { getHuntingPose } = await import("./specialScenes");
  for (const p of [0, 0.1, 0.3, 0.49]) {
    const pose = getHuntingPose(p, 350, 500);
    expect(pose.mouseY).toBe(350);
    expect(pose.carrying).toBe(false);
    expect(pose.kiteY).toBeLessThan(350);
    expect(pose.frame).toBeLessThan(7);
  }
  const grab = getHuntingPose(0.5, 350, 500);
  expect(grab.kiteX).toBeCloseTo(grab.mouseX);
  expect(grab.kiteY).toBe(350);
  expect(grab.carrying).toBe(true);
  expect(getHuntingPose(0.8, 350, 500).kiteY).toBeLessThan(grab.kiteY);
});
