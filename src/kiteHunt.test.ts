import { expect, it } from "vitest";

it("uses exactly the same registered hover pose at the sheet handoff", async () => {
  const { getKiteAnimationFrame } = await import("./kiteHunt");
  const { getHuntingPose } = await import("./specialScenes");
  const pose = getHuntingPose(0.44, 480, 500);
  expect(pose.wingFrame).toBe(0);
  const hovering = getKiteAnimationFrame(0.44, pose.wingFrame);
  const handoff = getKiteAnimationFrame(0.45, pose.wingFrame);
  expect(handoff).toBe(hovering);
  expect(handoff.sheet).toBe("hover");
  expect(handoff.pixelRatio).toBe(1);
});

it("uses dedicated dive, grasp, and carrying poses after the shared pose", async () => {
  const { getKiteAnimationFrame } = await import("./kiteHunt");
  expect(getKiteAnimationFrame(0.52, 0).sheet).toBe("hunt");
  expect(getKiteAnimationFrame(0.65, 0).index).toBe(7);
  for (const p of [0.67, 0.7, 0.8, 0.9]) {
    const frame = getKiteAnimationFrame(p, 0);
    expect(frame.sheet).toBe("hunt");
    expect(frame.index).toBeGreaterThanOrEqual(8);
    expect(frame.index).toBeLessThanOrEqual(15);
  }
});

it("keeps a constant torso scale across hunting poses, regardless of the wing bounds", async () => {
  const { getKiteAnimationFrame } = await import("./kiteHunt");
  for (let p = 0.46; p < 1; p += 0.007) {
    const frame = getKiteAnimationFrame(p, 0);
    expect(frame.bodyLength * frame.pixelRatio).toBeCloseTo(Math.hypot(237, 12));
    expect(Number.isFinite(frame.gripX)).toBe(true);
    expect(Number.isFinite(frame.gripY)).toBe(true);
  }
});

it("projects the hunting beak and tail onto the approved hover body axis", async () => {
  const { getKiteAnimationFrame } = await import("./kiteHunt");
  const { default: landmarks } = await import("./kiteHuntFrames.json");
  for (const p of [0.49, 0.53, 0.61, 0.64, 0.65, 0.8]) {
    const registered = getKiteAnimationFrame(p, 6);
    const source = landmarks[registered.index];
    for (const [x, y, expectedX, expectedY] of [
      [source.beakX, source.beakY, 59.25, -3],
      [source.tailX, source.tailY, -177.75, 9],
    ]) {
      const dx = (x - registered.frame.sx - registered.frame.anchorX) * registered.pixelRatio;
      const dy = (y - registered.frame.sy - registered.frame.anchorY) * registered.pixelRatio;
      expect(dx * Math.cos(registered.rotation) - dy * Math.sin(registered.rotation)).toBeCloseTo(expectedX);
      expect(dx * Math.sin(registered.rotation) + dy * Math.cos(registered.rotation)).toBeCloseTo(expectedY);
    }
  }
});
