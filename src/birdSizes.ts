import type { RaptorId } from "./game";

// Representative wingspans from Cornell's published ranges; see docs/bird-sizes.md.
const WINGSPAN_CM: Record<RaptorId, number> = {
  americanKestrel: 56,
  coopersHawk: 79,
  northernHarrier: 110,
  redShoulderedHawk: 102.5,
  redTailedHawk: 123.5,
  turkeyVulture: 174,
  goldenEagle: 202.5,
  baldEagle: 204,
  whiteTailedKite: 104.5,
  osprey: 165,
};

export function relativeBirdSize(id: RaptorId): number {
  return WINGSPAN_CM[id] / WINGSPAN_CM.redTailedHawk;
}

export function getBirdViewScale(viewWidth: number): number {
  return Math.min(1, viewWidth / 1280);
}
