// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import {
  PENDING_SCORES_KEY,
  loadPendingHighScores,
  pushPendingHighScore,
  removePendingHighScore,
  type PendingHighScore,
} from "./offlineQueue";

const SAMPLE: PendingHighScore = {
  payload: { player_name: "KestrelFan", score: 120, level: "beginner" },
  mode: "insert",
};

afterEach(() => {
  window.localStorage.clear();
});

describe("pending high score queue", () => {
  test("starts empty", () => {
    expect(loadPendingHighScores()).toEqual([]);
  });

  test("appends entries and persists them", () => {
    pushPendingHighScore(SAMPLE);
    pushPendingHighScore({ ...SAMPLE, mode: "update", targetId: 7 });

    const stored = loadPendingHighScores();
    expect(stored).toHaveLength(2);
    expect(stored[0].payload.player_name).toBe("KestrelFan");
    expect(stored[1].mode).toBe("update");
    expect(stored[1].targetId).toBe(7);

    // Persisted under the expected key.
    expect(window.localStorage.getItem(PENDING_SCORES_KEY)).not.toBeNull();
  });

  test("removes a single entry by index without disturbing the rest", () => {
    pushPendingHighScore(SAMPLE);
    pushPendingHighScore({ ...SAMPLE, payload: { ...SAMPLE.payload, score: 200 } });
    pushPendingHighScore(SAMPLE);

    removePendingHighScore(1);

    const stored = loadPendingHighScores();
    expect(stored).toHaveLength(2);
    expect(stored[0].payload.score).toBe(120);
    expect(stored[1].payload.score).toBe(120);
  });

  test("is resilient to corrupt stored data", () => {
    window.localStorage.setItem(PENDING_SCORES_KEY, "not-json");
    expect(loadPendingHighScores()).toEqual([]);
  });
});
