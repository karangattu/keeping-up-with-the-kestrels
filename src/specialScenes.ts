import type { Counts, RaptorId } from "./game";

const smooth = (value: number) => {
  const p = Math.max(0, Math.min(1, value));
  return p * p * (3 - 2 * p);
};

export function getHuntingPose(progress: number, groundY: number, viewHeight: number) {
  const carrying = progress >= 0.65;
  const approach = smooth(progress / 0.18);
  const dive = smooth((progress - 0.4) / 0.25);
  const departure = smooth((progress - 0.65) / 0.35);
  const hoverY = Math.min(viewHeight * 0.3, groundY - viewHeight * 0.25);
  return {
    carrying,
    frame: Math.min(6, 3 + Math.floor(dive * 3)),
    diveBlend: smooth((progress - 0.4) / 0.05) * (1 - smooth((progress - 0.6) / 0.05)),
    kiteX: carrying ? 0.55 + departure * 0.8 : -0.15 + approach * 0.65 + dive * 0.05,
    kiteY: carrying ? groundY - departure * viewHeight : hoverY + (groundY - hoverY) * dive,
    mouseX: 0.35 + Math.min(1, progress / 0.65) * 0.2,
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
