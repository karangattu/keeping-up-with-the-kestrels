import type { Counts, RaptorId } from "./game";
import { WINGBEAT_MS } from "./flightAnimation";

const smooth = (value: number) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

function hermite(start: number, end: number, startTangent: number, endTangent: number, t: number) {
  const p = Math.max(0, Math.min(1, t));
  return (2 * p ** 3 - 3 * p ** 2 + 1) * start
    + (p ** 3 - 2 * p ** 2 + p) * startTangent
    + (-2 * p ** 3 + 3 * p ** 2) * end
    + (p ** 3 - p ** 2) * endTangent;
}

export function getHuntingPose(progress: number, groundY: number, viewHeight: number) {
  const carrying = progress >= 0.65;
  const dive = Math.max(0, Math.min(1, (progress - 0.4) / 0.25));
  const departure = Math.max(0, Math.min(1, (progress - 0.65) / 0.35));
  const hoverY = Math.min(viewHeight * 0.3, groundY - viewHeight * 0.25);
  const rate = SPECIAL_SCENES.find((scene) => scene.id === "hunting")!.duration * 1000 / WINGBEAT_MS.whiteTailedKite;
  const settlingCycle = Math.ceil(rate * 0.34) + 1;
  let cycle = progress * rate;
  if (progress >= 0.34) {
    cycle = hermite(rate * 0.34, settlingCycle, rate * 0.1, 0, (progress - 0.34) / 0.1);
  }
  if (carrying) {
    // Integrate the wingbeat rate so the first upstroke starts gently from glide.
    const u = Math.min(1, (progress - 0.65) / 0.08);
    cycle = settlingCycle + rate * 0.08 * (u ** 3 - u ** 4 / 2)
      + rate * Math.max(0, progress - 0.73);
  }
  return {
    carrying,
    wingFrame: Math.floor((cycle % 1) * 16 + 1e-8) % 16,
    pitch: 1.2 * smooth((progress - 0.4) / 0.09) * (1 - smooth((progress - 0.55) / 0.1))
      - 0.55 * smooth((progress - 0.65) / 0.13),
    kiteX: carrying ? hermite(0.55, 1.4, 0.14, 1.225, departure)
      : progress < 0.4 ? -0.15 + smooth(progress / 0.18) * 0.65 : hermite(0.5, 0.55, 0, 0.1, dive),
    kiteY: carrying ? hermite(groundY, -viewHeight * 0.1, 0, -viewHeight * 0.7, departure)
      : hoverY + (groundY - hoverY) * smooth(dive),
    mouseX: hermite(0.35, 0.55, 0.2, 0.26, progress / 0.65),
    mouseY: groundY,
  };
}

export const SPECIAL_SCENES: { id: string; species: RaptorId; start: number; duration: number }[] = [
  { id: "mobbing", species: "redTailedHawk", start: 18, duration: 10 },
  { id: "hunting", species: "whiteTailedKite", start: 34, duration: 13 },
];

export function getMobbingPose(progress: number) {
  return { x: -0.2 + progress * 1.4, y: 0.4 + Math.sin(progress * Math.PI * 2) * 0.025 };
}

// Reuse the intermediate downstroke poses for a smooth recovery to level.
export const CROW_FLIGHT_FRAMES = [0, 1, 2, 3, 4, 3, 2, 1, 0, 8, 9, 10, 11, 10, 9, 8];

export function getCrowPose(progress: number, index: number) {
  const t = progress * 10;
  const phase = index * 2.1;
  return {
    x: -0.06 + Math.sin(t * 2.3 + phase) * 0.035,
    y: -0.025 + Math.cos(t * 2.8 + phase) * 0.05,
    rotation: Math.sin(t * 2.3 + phase) * 0.12,
  };
}

export function advanceSpecialScenes(elapsed: number, started: Set<string>, counts: Counts, available: Set<string> = new Set(SPECIAL_SCENES.map((scene) => scene.id))) {
  for (const scene of SPECIAL_SCENES) {
    if (available.has(scene.id) && elapsed >= scene.start && elapsed < scene.start + scene.duration && !started.has(scene.id)) {
      started.add(scene.id);
      counts[scene.species] += 1;
    }
  }
}
