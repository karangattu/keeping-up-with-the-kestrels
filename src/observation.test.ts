import { describe, expect, test } from "vitest";
import {
  findObservableEncounter,
  hasFairObservationWindow,
  isObservableAt,
  nextObservationStreak,
  shouldCreditObservation,
  type ObservationEncounter,
} from "./observation";

function encounter(startedAt: number, duration = 10000): ObservationEncounter {
  return {
    key: "bird:1",
    raptorId: "americanKestrel",
    startedAt,
    duration,
  };
}

const ROUND_ENDS_AT = 60000;
const OBSERVABLE_AT = 1000 + 10000 * 0.12;

describe("hasFairObservationWindow", () => {
  test("requires two seconds of observable flight before the round ends", () => {
    expect(hasFairObservationWindow(encounter(48000), ROUND_ENDS_AT)).toBe(true);
    expect(hasFairObservationWindow(encounter(59000), ROUND_ENDS_AT)).toBe(false);
  });

  test("includes an encounter with exactly two seconds left", () => {
    const startedAt = ROUND_ENDS_AT - 2000 - 10000 * 0.12;
    expect(hasFairObservationWindow(encounter(startedAt), ROUND_ENDS_AT)).toBe(true);
  });
});

describe("shouldCreditObservation", () => {
  test("does not credit a bird before it enters the observable part of the sky", () => {
    expect(shouldCreditObservation(encounter(1000), OBSERVABLE_AT - 1, ROUND_ENDS_AT)).toBe(false);
    expect(shouldCreditObservation(encounter(1000), OBSERVABLE_AT, ROUND_ENDS_AT)).toBe(true);
  });

  test("never credits a late encounter, even after the round ends", () => {
    const lateBird = encounter(59000);
    expect(shouldCreditObservation(lateBird, 59950, ROUND_ENDS_AT)).toBe(false);
    expect(shouldCreditObservation(lateBird, 60001, ROUND_ENDS_AT)).toBe(false);
  });
});

describe("isObservableAt", () => {
  test("is only true while the encounter is within its visible window", () => {
    const bird = encounter(1000);
    expect(isObservableAt(bird, OBSERVABLE_AT - 1, ROUND_ENDS_AT)).toBe(false);
    expect(isObservableAt(bird, OBSERVABLE_AT, ROUND_ENDS_AT)).toBe(true);
    expect(isObservableAt(bird, 1000 + 10000 * 0.88, ROUND_ENDS_AT)).toBe(true);
    expect(isObservableAt(bird, 1000 + 10000 * 0.88 + 1, ROUND_ENDS_AT)).toBe(false);
  });
});

describe("findObservableEncounter", () => {
  test("finds a visible, uncredited encounter of the tapped species", () => {
    const kestrel = encounter(1000);
    const hawk: ObservationEncounter = { ...encounter(1000), key: "bird:2", raptorId: "redTailedHawk" };
    const credited = new Set(["other"]);
    expect(findObservableEncounter(
      [hawk, kestrel],
      "americanKestrel",
      OBSERVABLE_AT,
      ROUND_ENDS_AT,
      credited,
    )).toBe(kestrel);
  });

  test("does not reuse an encounter that was already observed", () => {
    const kestrel = encounter(1000);
    expect(findObservableEncounter(
      [kestrel],
      "americanKestrel",
      OBSERVABLE_AT,
      ROUND_ENDS_AT,
      new Set([kestrel.key]),
    )).toBeNull();
  });
});

describe("nextObservationStreak", () => {
  test("advances on a visible bird and resets on a miss", () => {
    expect(nextObservationStreak(3, true)).toBe(4);
    expect(nextObservationStreak(3, false)).toBe(0);
  });
});
