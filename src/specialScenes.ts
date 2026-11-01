import type { Counts, RaptorId } from "./game";

export function getHuntingPose(progress: number, groundY: number, viewHeight: number) {
  const carrying = progress >= 0.5;
  const approach = Math.min(1, progress * 2);
  const departure = Math.max(0, progress * 2 - 1);
  return {
    carrying,
    frame: carrying ? Math.min(15, 7 + Math.floor(departure * 9)) : Math.min(6, Math.floor(approach * 7)),
    kiteX: carrying ? 0.55 + departure * 0.85 : -0.15 + approach * 0.7,
    kiteY: groundY - (carrying ? departure * viewHeight * 1.1 : (1 - approach) ** 2 * viewHeight * 0.6),
    mouseX: 0.35 + approach * 0.2,
    mouseY: groundY,
  };
}

export const SPECIAL_SCENES: { id: string; species: RaptorId; start: number; duration: number }[] = [
  { id: "mobbing", species: "redTailedHawk", start: 18, duration: 8 },
  { id: "hunting", species: "whiteTailedKite", start: 37, duration: 8 },
];

export function getMobbingPose(progress: number) {
  // The last generated cell omits the crows, so loop the complete group.
  return { frame: Math.floor(progress * 8 * 22) % 15, x: -0.3 + progress * 1.6, y: 0.15 };
}

export function advanceSpecialScenes(elapsed: number, started: Set<string>, counts: Counts, available: Set<string> = new Set(SPECIAL_SCENES.map((scene) => scene.id))) {
  for (const scene of SPECIAL_SCENES) {
    if (available.has(scene.id) && elapsed >= scene.start && elapsed < scene.start + scene.duration && !started.has(scene.id)) {
      started.add(scene.id);
      counts[scene.species] += 1;
    }
  }
}
