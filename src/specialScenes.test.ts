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

it("moves the hawk across the screen and gives each crow a continuous independent path", async () => {
  const { getMobbingPose, getCrowPose } = await import("./specialScenes");
  const a = getMobbingPose(0.2);
  const b = getMobbingPose(0.23);
  const crowA = getCrowPose(0.2, 0);
  const crowB = getCrowPose(0.2001, 0);
  expect(Math.abs(crowA.x - crowB.x)).toBeLessThan(0.002);
  expect(Math.abs(crowA.y - crowB.y)).toBeLessThan(0.002);
  expect(getCrowPose(0.2, 1)).not.toEqual(crowA);
  expect(a.x).toBeLessThan(b.x);


});

it("keeps the kite talons while excluding the separately animated mouse", async () => {
  const { default: frames } = await import("./huntingSpriteFrames.json");
  const crop = frames.kite[6];
  const contains = (x: number, y: number) => [...crop.clip.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)].some((m) =>
    x - crop.sx >= Number(m[1]) && x - crop.sx < Number(m[1]) + Number(m[3]) && y - crop.sy === Number(m[2]));
  expect(contains(880, 610)).toBe(true);
  expect(contains(890, 640)).toBe(false);
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
  const grab = getHuntingPose(0.65, 350, 500);
  expect(grab.kiteX).toBeCloseTo(grab.mouseX);
  expect(grab.kiteY).toBe(350);
  expect(grab.carrying).toBe(true);
  expect(getHuntingPose(0.8, 350, 500).kiteY).toBeLessThan(grab.kiteY);
});

it("lets the hunting kite hover before a continuous dive to the mouse", async () => {
  const { getHuntingPose } = await import("./specialScenes");
  const a = getHuntingPose(0.23, 350, 500);
  const b = getHuntingPose(0.32, 350, 500);
  expect(Math.abs(a.kiteX - b.kiteX)).toBeLessThan(0.025);
  expect(Math.abs(a.kiteY - b.kiteY)).toBeLessThan(10);
  for (const boundary of [0.18, 0.4, 0.65]) {
    const before = getHuntingPose(boundary - 0.0001, 350, 500);
    const after = getHuntingPose(boundary + 0.0001, 350, 500);
    expect(Math.abs(before.kiteX - after.kiteX)).toBeLessThan(0.002);
    expect(Math.abs(before.kiteY - after.kiteY)).toBeLessThan(1);
  }
});
