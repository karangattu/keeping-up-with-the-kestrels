import type { RaptorId } from "./game";

export const FLIGHT_FRAME_COUNT = 16;
export const FLIGHT_SHEET_COLUMNS = 4;
// Logical cell size preserves the existing birds' size regardless of export resolution.
export const FLIGHT_CELL_SIZE = 560;

const WINGBEAT_MS: Record<RaptorId, number> = {
  americanKestrel: 320,
  coopersHawk: 480,
  goldenEagle: 900,
  northernHarrier: 620,
  redShoulderedHawk: 580,
  redTailedHawk: 720,
  turkeyVulture: 960,
  baldEagle: 880,
  whiteTailedKite: 380,
  osprey: 660,
};

type Flight = {
  raptorId: RaptorId;
  flightStyle: "glide" | "hover" | "teeter" | "flapGlide";
  duration: number;
  phase: number;
  flapCenters: number[];
};

/** Complete cycles begin and end at the same glide pose, timed in real milliseconds. */
export function getFlightFrameIndex(bird: Flight, progress: number): number {
  const elapsed = Math.max(0, progress * bird.duration);
  const period = WINGBEAT_MS[bird.raptorId];
  let cycle: number | undefined;

  if (bird.flightStyle === "hover") {
    cycle = elapsed / period + bird.phase / (Math.PI * 2);
  } else {
    for (const center of bird.flapCenters) {
      const start = center * bird.duration - period;
      const local = elapsed - start;
      if (local >= 0 && local < period * 2) {
        cycle = local / period;
        break;
      }
    }
  }

  // Banking and bobbing already animate gliding birds; keep the wings extended.
  if (cycle === undefined) return 0;
  return Math.floor((cycle % 1) * FLIGHT_FRAME_COUNT + 1e-9) % FLIGHT_FRAME_COUNT;
}
