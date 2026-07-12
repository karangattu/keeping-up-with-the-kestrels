export const ROUND_SECONDS = 60;

export const RAPTOR_IDS = [
  "americanKestrel",
  "coopersHawk",
  "goldenEagle",
  "northernHarrier",
  "redShoulderedHawk",
  "redTailedHawk",
  "turkeyVulture",
  "baldEagle",
  "whiteTailedKite",
  "osprey",
] as const;

export type RaptorId = (typeof RAPTOR_IDS)[number];

export type Difficulty = "beginner" | "expert";

export type Counts = Record<RaptorId, number>;

export function makeEmptyCounts(): Counts {
  return RAPTOR_IDS.reduce((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {} as Counts);
}

export function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function getMultiplier(streak: number): number {
  if (streak >= 4) return 5;
  if (streak >= 3) return 3;
  if (streak >= 2) return 2;
  return 1;
}

export const COMBO_BASE = 5;

export function getComboReward(comboStreak: number): number {
  const multiplier = getMultiplier(comboStreak);
  return multiplier > 1 ? (multiplier - 1) * COMBO_BASE : 0;
}

export function getFinalCountdownBeep(
  secondsLeft: number,
): { frequency: number; durationMs: number; peakGain: number } | null {
  if (secondsLeft < 1 || secondsLeft > 10) return null;
  const urgency = 11 - secondsLeft;
  return {
    frequency: 520 + urgency * 70,
    durationMs: 80 + urgency * 18,
    peakGain: 0.08 + urgency * 0.012,
  };
}

export function scoreForSpecies(
  actual: number,
  player: number,
  difficulty: Difficulty,
): number {
  const multiplier = difficulty === "expert" ? 2 : 1;
  const delta = Math.abs(player - actual);
  if (actual > 0) {
    const base = delta === 0 ? 10 : delta === 1 ? 5 : delta === 2 ? 2 : 0;
    return base * multiplier;
  }
  const base = delta === 0 ? 0 : delta === 1 ? -5 : delta === 2 ? -8 : -10;
  return base * multiplier;
}

export function computeScorePerSpecies(
  actualCounts: Counts,
  playerCounts: Counts,
  difficulty: Difficulty,
): Counts {
  return RAPTOR_IDS.reduce((acc, id) => {
    acc[id] = scoreForSpecies(actualCounts[id], playerCounts[id], difficulty);
    return acc;
  }, {} as Counts);
}

export function computeTotalScore(scorePerSpecies: Counts): number {
  const sum = RAPTOR_IDS.reduce((total, id) => total + scorePerSpecies[id], 0);
  return Math.max(0, sum);
}

export function computeMaxScore(actualCounts: Counts, difficulty: Difficulty): number {
  const multiplier = difficulty === "expert" ? 2 : 1;
  const speciesWithBirds = RAPTOR_IDS.filter((id) => actualCounts[id] > 0).length;
  return speciesWithBirds * 10 * multiplier;
}

export function computeCappedTotalScore(
  totalScore: number,
  maxScore: number,
): number {
  return Math.min(totalScore, maxScore);
}

export function computeAccuracy(actualCounts: Counts, playerCounts: Counts): number {
  const totalActual = RAPTOR_IDS.reduce((sum, id) => sum + actualCounts[id], 0);
  const totalDelta = RAPTOR_IDS.reduce(
    (sum, id) => sum + Math.abs(playerCounts[id] - actualCounts[id]),
    0,
  );
  if (totalActual === 0) return 0;
  return Math.max(0, Math.round(((totalActual - totalDelta) / totalActual) * 100));
}

export function computeTotalDelta(
  actualCounts: Counts,
  playerCounts: Counts,
): number {
  return RAPTOR_IDS.reduce(
    (sum, id) => sum + Math.abs(playerCounts[id] - actualCounts[id]),
    0,
  );
}

export function hash(x: number): number {
  const s = Math.sin(x * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function randomBetween([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}
