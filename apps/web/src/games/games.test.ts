import { describe, expect, it } from "vitest";
import { createMineBoard } from "./MinesGame";
import { moveMergeBoard } from "./MergeGame";
import { isMuted, setMuted } from "../lib/audio";
import { getBestScore, recordBestScore } from "../lib/scores";
import { createSeededRng, getDailySeed } from "../lib/seededRng";

describe("Fusion 2048", () => {
  it("merges each pair only once", () => {
    const board = [
      2, 2, 2, 2,
      4, 4, 8, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const result = moveMergeBoard(board, "left");

    expect(result.board.slice(0, 8)).toEqual([4, 4, 0, 0, 8, 8, 0, 0]);
    expect(result.gained).toBe(16);
  });

  it("moves columns upward", () => {
    const board = [
      2, 0, 0, 0,
      2, 0, 0, 0,
      4, 0, 0, 0,
      0, 0, 0, 0,
    ];
    expect(moveMergeBoard(board, "up").board.filter(Boolean)).toEqual([4, 4]);
  });
});

describe("Mines de Cristal", () => {
  it("creates ten mines while protecting the first cell and its neighbors", () => {
    const board = createMineBoard(40);
    expect(board.filter((cell) => cell.mine)).toHaveLength(10);
    expect(board[40]?.mine).toBe(false);
    for (const index of [30, 31, 32, 39, 41, 48, 49, 50]) {
      expect(board[index]?.mine).toBe(false);
    }
  });
});

describe("Audio & Best Scores helpers", () => {
  it("handles mute and score queries safely without DOM", () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(getBestScore("neon-snake")).toBeNull();
    expect(recordBestScore("neon-snake", 100, "high")).toBe(false);
  });
});

describe("Daily Challenge RNG", () => {
  it("produces deterministic sequences for the same UTC date and salt", () => {
    const fixedDate = new Date("2026-11-15T12:00:00Z");
    const seedA = getDailySeed("crystal-mines", fixedDate);
    const seedB = getDailySeed("crystal-mines", fixedDate);
    expect(seedA).toBe(seedB);

    const rngA = createSeededRng(seedA);
    const rngB = createSeededRng(seedB);
    expect([rngA(), rngA(), rngA()]).toEqual([rngB(), rngB(), rngB()]);
  });
});
