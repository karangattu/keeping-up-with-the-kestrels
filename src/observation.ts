import type { RaptorId } from "./game";

export const OBSERVATION_ENTRY_PROGRESS = 0.12;
export const OBSERVATION_EXIT_PROGRESS = 0.88;
export const MIN_FAIR_OBSERVATION_MS = 2000;

export type ObservationEncounter = {
  key: string;
  raptorId: RaptorId;
  startedAt: number;
  duration: number;
};

export function getObservationEntryTime(encounter: ObservationEncounter): number {
  return encounter.startedAt + encounter.duration * OBSERVATION_ENTRY_PROGRESS;
}

export function hasFairObservationWindow(
  encounter: ObservationEncounter,
  roundEndsAt: number,
): boolean {
  return getObservationEntryTime(encounter) + MIN_FAIR_OBSERVATION_MS <= roundEndsAt;
}

export function shouldCreditObservation(
  encounter: ObservationEncounter,
  timestamp: number,
  roundEndsAt: number,
): boolean {
  return hasFairObservationWindow(encounter, roundEndsAt)
    && timestamp >= getObservationEntryTime(encounter);
}

export function isObservableAt(
  encounter: ObservationEncounter,
  timestamp: number,
  roundEndsAt: number,
): boolean {
  if (!hasFairObservationWindow(encounter, roundEndsAt)) return false;
  const progress = (timestamp - encounter.startedAt) / encounter.duration;
  return progress >= OBSERVATION_ENTRY_PROGRESS && progress <= OBSERVATION_EXIT_PROGRESS;
}

export function findObservableEncounter<T extends ObservationEncounter>(
  encounters: readonly T[],
  raptorId: RaptorId,
  timestamp: number,
  roundEndsAt: number,
  creditedKeys: ReadonlySet<string>,
): T | null {
  return encounters.find((encounter) => (
    encounter.raptorId === raptorId
    && !creditedKeys.has(encounter.key)
    && isObservableAt(encounter, timestamp, roundEndsAt)
  )) ?? null;
}

export function nextObservationStreak(currentStreak: number, observed: boolean): number {
  return observed ? currentStreak + 1 : 0;
}
