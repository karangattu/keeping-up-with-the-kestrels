// @vitest-environment jsdom
import { Capacitor } from "@capacitor/core";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";
import { App } from "./App";
import { ROUND_SECONDS } from "./game";

vi.mock("./supabaseClient", () => {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    limit: async () => ({ data: null, error: { message: "Failed to fetch" } }),
  };
  return {
    HIGH_SCORES_TABLE: "high_scores",
    supabase: {
      from: () => query,
      channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
      removeChannel: () => undefined,
    },
  };
});

test("an Android player can enter a name offline and see their score after reopening the game", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(Capacitor, "getPlatform").mockReturnValue("android");
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  vi.stubGlobal("Image", class { decode = async () => {}; });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.useFakeTimers();

  const container = document.createElement("div");
  document.body.append(container);
  let root = createRoot(container);

  const click = (label: string) => {
    const button = [...container.querySelectorAll("button")].find(
      (element) => element.textContent?.trim() === label,
    );
    expect(button).toBeDefined();
    act(() => button?.click());
  };
  const finishRound = async () => {
    click("Start round");
    click("Skip promo");
    click("Skip tutorial");
    act(() => vi.advanceTimersByTime(3000));
    await act(async () => {
      vi.advanceTimersByTime((ROUND_SECONDS + 1) * 1000);
    });
    expect(container.textContent).toContain("Round complete");
  };

  try {
    act(() => root.render(<App />));
    await finishRound();
    const name = container.querySelector<HTMLInputElement>('input[placeholder="Your name"]');
    expect(name).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(name, "Owl Watcher");
      name?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    click("Save on this device");
    expect(container.querySelector(".leaderboard-name")?.textContent).toBe("Owl Watcher");
    expect(container.querySelector(".leaderboard-score")?.textContent).toBe("0 pts");

    act(() => root.unmount());
    root = createRoot(container);
    act(() => root.render(<App />));
    await finishRound();
    expect(container.querySelector(".leaderboard-name")?.textContent).toBe("Owl Watcher");
    expect(container.querySelector(".leaderboard-score")?.textContent).toBe("0 pts");
  } finally {
    act(() => root.unmount());
    container.remove();
    window.localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});
