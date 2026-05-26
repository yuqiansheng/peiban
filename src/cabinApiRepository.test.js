import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCabinApiRepository } from "./cabinApiRepository";

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { "content-type": "application/json" },
  });
}

describe("createCabinApiRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads today state through the Cloudflare API", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        tasks: [{ _id: "task-1", text: "math" }],
        encouragements: [],
        summaries: [],
        statuses: [],
        allSummaries: [],
      }),
    );
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });

    await expect(repository.getTodayData("our-cabin-2026", "2026-05-26")).resolves.toMatchObject({
      tasks: [{ _id: "task-1" }],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/state?roomCode=our-cabin-2026&date=2026-05-26",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("authenticates a person with the cabin API", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ roomCode: "our-cabin-2026", owner: "me", displayName: "小涵涵" }),
    );
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });

    await expect(
      repository.authenticate({ roomCode: "our-cabin-2026", owner: "me", pin: "1314" }),
    ).resolves.toEqual({ roomCode: "our-cabin-2026", owner: "me", displayName: "小涵涵" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/session",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ roomCode: "our-cabin-2026", owner: "me", pin: "1314" }),
      }),
    );
  });

  it("posts task payloads and returns the created row", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ _id: "task-1", text: "math" }));
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });
    const payload = {
      roomCode: "our-cabin-2026",
      owner: "me",
      type: "plan",
      text: "math",
      status: "open",
      downgradedToday: false,
      date: "2026-05-26",
      createdAt: "2026-05-26T00:00:00.000Z",
      updatedAt: "2026-05-26T00:00:00.000Z",
    };

    await expect(repository.addTask(payload, { actorOwner: "me", pin: "1314" })).resolves.toEqual({
      _id: "task-1",
      text: "math",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ...payload, actorOwner: "me", pin: "1314" }),
      }),
    );
  });

  it("maps task updates and deletes to item endpoints", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });

    await repository.updateTask("task-1", { status: "done" }, { actorOwner: "me", pin: "1314" });
    await repository.deleteTask("task-1", { actorOwner: "me", pin: "1314" });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "/api/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "done", actorOwner: "me", pin: "1314" }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "/api/tasks/task-1",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ actorOwner: "me", pin: "1314" }),
      }),
    );
  });

  it("posts task suggestions for the other person", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ _id: "suggestion-1", text: "早点休息" }));
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });

    await expect(
      repository.addTaskSuggestion(
        { roomCode: "our-cabin-2026", from: "me", to: "ta", text: "早点休息" },
        { actorOwner: "me", pin: "1314" },
      ),
    ).resolves.toEqual({ _id: "suggestion-1", text: "早点休息" });

    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/task-suggestions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          roomCode: "our-cabin-2026",
          from: "me",
          to: "ta",
          text: "早点休息",
          actorOwner: "me",
          pin: "1314",
        }),
      }),
    );
  });

  it("throws useful errors for failed API responses", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: "roomCode is required" }, { status: 400 }));
    const repository = createCabinApiRepository({ fetchImpl, baseUrl: "" });

    await expect(repository.getTodayData("", "2026-05-26")).rejects.toThrow("roomCode is required");
  });
});
