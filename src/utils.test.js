import { describe, expect, it } from "vitest";
import {
  buildEncouragement,
  buildSummaryPayload,
  countGuardedDays,
  buildTaskPayload,
  getTodayKey,
  groupTasksByOwnerAndType,
  summarizeTasks,
} from "./utils";

describe("date helpers", () => {
  it("formats local dates as yyyy-mm-dd", () => {
    expect(getTodayKey(new Date(2026, 4, 23, 23, 59))).toBe("2026-05-23");
  });
});

describe("task payloads", () => {
  it("creates a CloudBase-ready task payload", () => {
    expect(
      buildTaskPayload({
        roomCode: "our-cabin-2026",
        owner: "me",
        type: "minimum",
        text: "背 20 个单词",
        now: new Date("2026-05-23T08:30:00.000Z"),
        date: "2026-05-23",
      }),
    ).toEqual({
      roomCode: "our-cabin-2026",
      owner: "me",
      type: "minimum",
      text: "背 20 个单词",
      status: "open",
      downgradedToday: false,
      date: "2026-05-23",
      createdAt: "2026-05-23T08:30:00.000Z",
      updatedAt: "2026-05-23T08:30:00.000Z",
    });
  });

  it("trims task text and rejects empty values", () => {
    expect(() =>
      buildTaskPayload({
        roomCode: "our-cabin-2026",
        owner: "me",
        type: "plan",
        text: "   ",
      }),
    ).toThrow("Task text is required");
  });
});

describe("task grouping", () => {
  it("keeps both people and all task types available", () => {
    const grouped = groupTasksByOwnerAndType([
      { _id: "1", owner: "me", type: "plan", text: "政治选择题" },
      { _id: "2", owner: "ta", type: "sprint", text: "英语阅读" },
    ]);

    expect(grouped.me.plan).toHaveLength(1);
    expect(grouped.me.sprint).toEqual([]);
    expect(grouped.ta.sprint).toHaveLength(1);
    expect(grouped.ta.minimum).toEqual([]);
  });

  it("summarizes completed, open, and downgraded tasks", () => {
    expect(
      summarizeTasks([
        { status: "done", downgradedToday: false },
        { status: "open", downgradedToday: true },
        { status: "open", downgradedToday: false },
      ]),
    ).toEqual({ total: 3, done: 1, open: 2, downgraded: 1 });
  });
});

describe("encouragement and summary payloads", () => {
  it("creates a trimmed encouragement for the other person", () => {
    expect(
      buildEncouragement({
        roomCode: "our-cabin-2026",
        from: "me",
        to: "ta",
        text: "  慢慢来，我也在  ",
        now: new Date("2026-05-23T12:00:00.000Z"),
      }),
    ).toMatchObject({
      roomCode: "our-cabin-2026",
      from: "me",
      to: "ta",
      text: "慢慢来，我也在",
      createdAt: "2026-05-23T12:00:00.000Z",
    });
  });

  it("creates a per-day summary payload", () => {
    expect(
      buildSummaryPayload({
        roomCode: "our-cabin-2026",
        owner: "ta",
        date: "2026-05-23",
        doneToday: "完成数学错题整理",
        annoyingThing: "有点困",
        minimumTomorrow: "背单词",
        now: new Date("2026-05-23T14:00:00.000Z"),
      }),
    ).toMatchObject({
      roomCode: "our-cabin-2026",
      owner: "ta",
      date: "2026-05-23",
      doneToday: "完成数学错题整理",
      annoyingThing: "有点困",
      minimumTomorrow: "背单词",
      updatedAt: "2026-05-23T14:00:00.000Z",
    });
  });
});

describe("cabin nurturing counters", () => {
  it("counts guarded days once even when both people wrote summaries", () => {
    expect(
      countGuardedDays([
        { owner: "me", date: "2026-05-23", doneToday: "数学", minimumTomorrow: "" },
        { owner: "ta", date: "2026-05-23", doneToday: "英语", minimumTomorrow: "" },
        { owner: "me", date: "2026-05-24", doneToday: "", minimumTomorrow: "单词" },
      ]),
    ).toBe(2);
  });
});
