import { describe, expect, test } from "vitest";
import {
  computeAccuracy,
  computeCappedTotalScore,
  computeMaxScore,
  computeScorePerSpecies,
  computeTotalDelta,
  computeTotalScore,
  formatTime,
  getFinalCountdownBeep,
  hash,
  makeEmptyCounts,
  randomBetween,
  RAPTOR_IDS,
  ROUND_SECONDS,
  type Counts,
  type Difficulty,
} from "./game";
import { RAPTORS } from "./App";

const STARTER: Counts = {
  ...makeEmptyCounts(),
  americanKestrel: 3,
  redTailedHawk: 2,
  turkeyVulture: 1,
};

const PERFECT_GUESS: Counts = {
  ...STARTER,
  coopersHawk: 0,
  goldenEagle: 0,
  northernHarrier: 0,
  redShoulderedHawk: 0,
  baldEagle: 0,
  whiteTailedKite: 0,
  osprey: 0,
};

describe("formatTime", () => {
  test("formats whole seconds with two-digit padding", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(5)).toBe("0:05");
  });

  test("carries minutes for values at or above 60", () => {
    expect(formatTime(61)).toBe("1:01");
    expect(formatTime(120)).toBe("2:00");
  });

  test("rounds up partial seconds", () => {
    expect(formatTime(9.1)).toBe("0:10");
    expect(formatTime(0.01)).toBe("0:01");
  });

  test("clamps negative values to zero", () => {
    expect(formatTime(-3)).toBe("0:00");
  });

  test("returns 0:00 for exact zero", () => {
    expect(formatTime(0)).toBe("0:00");
  });
});

describe("getFinalCountdownBeep", () => {
  test("ramps up during the last 10 seconds only", () => {
    expect(getFinalCountdownBeep(11)).toBeNull();
    expect(getFinalCountdownBeep(0)).toBeNull();

    const first = getFinalCountdownBeep(10);
    const last = getFinalCountdownBeep(1);
    expect(first).not.toBeNull();
    expect(last).not.toBeNull();
    expect(last!.frequency).toBeGreaterThan(first!.frequency);
    expect(last!.durationMs).toBeGreaterThan(first!.durationMs);
    expect(last!.peakGain).toBeGreaterThan(first!.peakGain);
  });
});

describe("observation grading", () => {
  test.each([
    [3, 3, 30], [3, 2, 20], [3, 1, 10], [3, 0, 0],
    [3, 4, 20], [3, 5, 10], [3, 6, 0], [3, 7, -10],
    [0, 0, 0], [0, 1, -10], [0, 5, -50], [1, 0, 0], [2, 0, 0],
  ])("%i actual and %i counted earns %i Beginner points", (actual, player, expected) => {
    const actualCounts = { ...makeEmptyCounts(), americanKestrel: actual };
    const playerCounts = { ...makeEmptyCounts(), americanKestrel: player };
    expect(computeScorePerSpecies(actualCounts, playerCounts, "beginner").americanKestrel).toBe(expected);
    expect(computeScorePerSpecies(actualCounts, playerCounts, "expert").americanKestrel).toBe(expected * 2);
  });

  test("a wrong species cancels one correct observation", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, redTailedHawk: 1 };
    expect(computeTotalScore(computeScorePerSpecies(actual, player, "beginner"))).toBe(20);
  });

  test("counting nothing earns zero even when only one or two birds appeared", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 2 };
    expect(computeTotalScore(computeScorePerSpecies(actual, makeEmptyCounts(), "beginner"))).toBe(0);
  });
});

describe("computeTotalScore", () => {
  test("sums species scores", () => {
    const scores: Counts = { ...makeEmptyCounts(), americanKestrel: 10, redTailedHawk: 5 };
    expect(computeTotalScore(scores)).toBe(15);
  });

  test("floors negative totals to 0", () => {
    const scores: Counts = { ...makeEmptyCounts(), americanKestrel: -10, redTailedHawk: -10 };
    expect(computeTotalScore(scores)).toBe(0);
  });
});

describe("computeMaxScore", () => {
  test("is 10 per observation, doubled on expert", () => {
    const actual: Counts = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 2 };
    expect(computeMaxScore(actual, "beginner")).toBe(30);
    expect(computeMaxScore(actual, "expert")).toBe(60);
  });

  test("is 0 when no species appeared", () => {
    expect(computeMaxScore(makeEmptyCounts(), "beginner")).toBe(0);
  });
});

describe("computeCappedTotalScore", () => {
  test("caps to max score", () => {
    expect(computeCappedTotalScore(150, 100)).toBe(100);
  });

  test("leaves the score alone when below the cap", () => {
    expect(computeCappedTotalScore(50, 100)).toBe(50);
  });
});

describe("computeAccuracy", () => {
  test("perfect match is 100%", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3, redTailedHawk: 2 };
    expect(computeAccuracy(actual, actual)).toBe(100);
  });

  test("zero accuracy when nothing was actually present", () => {
    expect(computeAccuracy(makeEmptyCounts(), makeEmptyCounts())).toBe(0);
  });

  test("rounds to nearest integer percent", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 3 };
    const player = { ...actual, americanKestrel: 2 };
    expect(computeAccuracy(actual, player)).toBe(67);
  });

  test("never goes below 0 even with heavy over-counting", () => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 1 };
    const player = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 9 };
    expect(computeAccuracy(actual, player)).toBe(0);
  });
});

describe("computeTotalDelta", () => {
  test("sums absolute differences across all species", () => {
    const actual: Counts = { ...makeEmptyCounts(), americanKestrel: 3, redTailedHawk: 2 };
    const player: Counts = { ...makeEmptyCounts(), americanKestrel: 1, redTailedHawk: 4 };
    expect(computeTotalDelta(actual, player)).toBe(2 + 2);
  });

  test("perfect match has zero delta", () => {
    expect(computeTotalDelta(STARTER, PERFECT_GUESS)).toBe(0);
  });
});

describe("makeEmptyCounts", () => {
  test("produces a record with all raptor ids set to 0", () => {
    const counts = makeEmptyCounts();
    for (const id of RAPTOR_IDS) {
      expect(counts[id]).toBe(0);
    }
  });
});

describe("hash", () => {
  test("returns a deterministic value in [0, 1)", () => {
    const a = hash(1.5);
    const b = hash(1.5);
    const c = hash(1.5001);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(c).not.toBe(a);
  });
});

describe("randomBetween", () => {
  test("returns values in the half-open range [min, max)", () => {
    for (let i = 0; i < 200; i++) {
      const value = randomBetween([5, 10]);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });
});

describe("ROUND_SECONDS", () => {
  test("is 60", () => {
    expect(ROUND_SECONDS).toBe(60);
  });
});

describe("difficulty config sanity", () => {
  test.each<[Difficulty, number]>([
    ["beginner", 1],
    ["expert", 2],
  ])("%s has a stable difficulty multiplier semantics", (_difficulty, _expected) => {
    const actual = { ...makeEmptyCounts(), americanKestrel: 2 };
    const player = { ...actual };
    const beginnerScore = computeScorePerSpecies(actual, player, "beginner").americanKestrel;
    const expertScore = computeScorePerSpecies(actual, player, "expert").americanKestrel;
    expect(expertScore).toBe(beginnerScore * 2);
  });
});

test("the opening spawn pool matches the tutorial species", async () => {
  const { OPENING_SPAWN_RAPTORS, TUTORIAL_SEQUENCE } = await import("./App");
  expect(OPENING_SPAWN_RAPTORS.map((raptor) => raptor.id)).toEqual([...TUTORIAL_SEQUENCE]);
});

describe("RAPTORS config and profile pictures", () => {
  test("every raptor has a profile image path and fact", () => {
    expect(RAPTORS.length).toBeGreaterThan(0);
    RAPTORS.forEach((raptor) => {
      expect(raptor.profile).toBeDefined();
      expect(typeof raptor.profile).toBe("string");
      expect(raptor.profile.length).toBeGreaterThan(0);
      expect(raptor.fact).toBeDefined();
      expect(typeof raptor.fact).toBe("string");
      expect(raptor.fact.length).toBeGreaterThan(0);
    });
  });
});

test("round pacing builds steadily from one bird to a busy finale", async () => {
  const { getRoundPacing } = await import("./game");
  for (const difficulty of ["beginner", "expert"] as const) {
    const stages = [0, 15, 30, 45, 59].map((seconds) => getRoundPacing(seconds, difficulty));
    expect(stages[0].targetBirds).toBe(1);
    expect(stages[0].spawnEvery).toBeGreaterThan(2500);
    expect(stages[4].targetBirds).toBeGreaterThanOrEqual(6);
    expect(stages[4].spawnEvery).toBeLessThan(1200);
    for (let i = 1; i < stages.length; i++) {
      expect(stages[i].targetBirds).toBeGreaterThanOrEqual(stages[i - 1].targetBirds);
      expect(stages[i].spawnEvery).toBeLessThan(stages[i - 1].spawnEvery);
    }
  }
});

test("Beginner has substantially fewer birds and longer gaps than Expert", async () => {
  const { getRoundPacing } = await import("./game");
  for (const seconds of [20, 40, 59]) {
    const beginner = getRoundPacing(seconds, "beginner");
    const expert = getRoundPacing(seconds, "expert");
    expect(beginner.targetBirds).toBeLessThanOrEqual(expert.targetBirds * 0.65);
    expect(beginner.spawnEvery).toBeGreaterThan(expert.spawnEvery * 1.7);
  }
  expect(getRoundPacing(59, "beginner").targetBirds).toBeLessThanOrEqual(8);
});

test("eagles retain their natural size advantage over large hawks", () => {
  const hawk = RAPTORS.find(r => r.id === "redTailedHawk")!;
  for (const id of ["baldEagle", "goldenEagle"]) {
    const eagle = RAPTORS.find(r => r.id === id)!;
    expect(eagle.sizeScale / hawk.sizeScale).toBeGreaterThan(1.5);
    expect(eagle.sizeScale / hawk.sizeScale).toBeLessThanOrEqual(1.8);
  }
});

test("osprey sits between a red-tail and an eagle at the same apparent distance", async () => {
  const { getSpritePixelScale } = await import("./birdSprite");
  const renderedWidth = (id: string) => {
    const raptor = RAPTORS.find(r => r.id === id)!;
    return raptor.frames[0].sw * getSpritePixelScale(raptor.frames[0].sw, 0.25 * raptor.sizeScale);
  };
  const ospreyToHawk = renderedWidth("osprey") / renderedWidth("redTailedHawk");
  expect(ospreyToHawk).toBeGreaterThan(1.25);
  expect(ospreyToHawk).toBeLessThan(1.4);
  expect(renderedWidth("osprey")).toBeLessThan(renderedWidth("baldEagle") * 0.85);
});

test("all raptors keep the published approximate wingspan proportions at equal depth", async () => {
  const { getSpritePixelScale } = await import("./birdSprite");
  const expectedRatios: Record<string, number> = {
    americanKestrel: 0.45, coopersHawk: 0.64, northernHarrier: 0.89,
    redShoulderedHawk: 0.83, redTailedHawk: 1, whiteTailedKite: 0.85,
    osprey: 1.34, turkeyVulture: 1.41, goldenEagle: 1.64, baldEagle: 1.65,
  };
  for (const bird of RAPTORS) {
    const width = bird.frames[0].sw * getSpritePixelScale(bird.frames[0].sw, 0.25 * bird.sizeScale);
    expect(width / 140).toBeCloseTo(expectedRatios[bird.id], 2);
  }
});
