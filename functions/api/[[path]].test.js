import { describe, expect, it } from "vitest";
import { onRequest } from "./[[path]].js";

function createJsonRequest(url, method = "GET", body) {
  return new Request(`https://example.com${url}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createMemoryDb(seed = {}) {
  const tables = {
    rooms: seed.rooms ? [...seed.rooms] : [],
    tasks: seed.tasks ? [...seed.tasks] : [],
    encouragements: seed.encouragements ? [...seed.encouragements] : [],
    daily_summaries: seed.daily_summaries ? [...seed.daily_summaries] : [],
    daily_statuses: seed.daily_statuses ? [...seed.daily_statuses] : [],
  };
  const counters = {
    rooms: tables.rooms.length,
    tasks: tables.tasks.length,
    encouragements: tables.encouragements.length,
    daily_summaries: tables.daily_summaries.length,
    daily_statuses: tables.daily_statuses.length,
  };

  return {
    tables,
    prepare(sql) {
      const statement = {
        values: [],
        bind(...values) {
          statement.values = values;
          return statement;
        },
        async all() {
          const rows = executeAll(tables, sql, statement.values);
          return { results: rows };
        },
        async first() {
          return executeAll(tables, sql, statement.values)[0] || null;
        },
        async run() {
          return executeRun(tables, counters, sql, statement.values);
        },
      };
      return statement;
    },
  };
}

function executeAll(tables, sql, values) {
  if (sql.includes("FROM rooms")) {
    return tables.rooms.filter((row) => row.roomCode === values[0]);
  }
  if (sql.includes("FROM tasks") && sql.includes("WHERE id = ?")) {
    return tables.tasks.filter((row) => row._id === String(values[0])).map((row) => ({ owner: row.owner }));
  }
  if (sql.includes("FROM tasks")) {
    return tables.tasks.filter((row) => row.roomCode === values[0] && row.date === values[1]);
  }
  if (sql.includes("FROM encouragements")) {
    return tables.encouragements.filter((row) => row.roomCode === values[0]);
  }
  if (sql.includes("FROM daily_summaries") && sql.includes("date = ?")) {
    return tables.daily_summaries.filter((row) => row.roomCode === values[0] && row.date === values[1]);
  }
  if (sql.includes("FROM daily_summaries")) {
    return tables.daily_summaries.filter((row) => row.roomCode === values[0]);
  }
  if (sql.includes("FROM daily_statuses")) {
    return tables.daily_statuses.filter((row) => row.roomCode === values[0] && row.date === values[1]);
  }
  throw new Error(`Unhandled all SQL: ${sql}`);
}

function executeRun(tables, counters, sql, values) {
  if (sql.startsWith("INSERT INTO rooms")) {
    counters.rooms += 1;
    tables.rooms.push({
      _id: String(counters.rooms),
      roomCode: values[0],
      people: values[1],
      createdAt: values[2],
      updatedAt: values[3],
    });
    return { meta: { last_row_id: counters.rooms } };
  }
  if (sql.startsWith("INSERT INTO tasks")) {
    counters.tasks += 1;
    tables.tasks.push({
      _id: String(counters.tasks),
      roomCode: values[0],
      owner: values[1],
      type: values[2],
      text: values[3],
      status: values[4],
      downgradedToday: values[5],
      date: values[6],
      createdAt: values[7],
      updatedAt: values[8],
    });
    return { meta: { last_row_id: counters.tasks } };
  }
  if (sql.startsWith("UPDATE tasks")) {
    const task = tables.tasks.find((row) => row._id === String(values[4]));
    Object.assign(task, {
      status: values[0],
      downgradedToday: values[1],
      updatedAt: values[2],
      text: values[3],
    });
    return { meta: { changes: task ? 1 : 0 } };
  }
  if (sql.startsWith("DELETE FROM tasks")) {
    const index = tables.tasks.findIndex((row) => row._id === String(values[0]));
    if (index >= 0) tables.tasks.splice(index, 1);
    return { meta: { changes: index >= 0 ? 1 : 0 } };
  }
  if (sql.startsWith("INSERT INTO encouragements")) {
    counters.encouragements += 1;
    tables.encouragements.push({
      _id: String(counters.encouragements),
      roomCode: values[0],
      from: values[1],
      to: values[2],
      text: values[3],
      createdAt: values[4],
    });
    return { meta: { last_row_id: counters.encouragements } };
  }
  if (sql.startsWith("INSERT INTO daily_summaries")) {
    const existing = tables.daily_summaries.find(
      (row) => row.roomCode === values[0] && row.owner === values[1] && row.date === values[2],
    );
    if (existing) {
      Object.assign(existing, {
        doneToday: values[3],
        annoyingThing: values[4],
        minimumTomorrow: values[5],
        updatedAt: values[7],
      });
      return { meta: { changes: 1 } };
    }
    counters.daily_summaries += 1;
    tables.daily_summaries.push({
      _id: String(counters.daily_summaries),
      roomCode: values[0],
      owner: values[1],
      date: values[2],
      doneToday: values[3],
      annoyingThing: values[4],
      minimumTomorrow: values[5],
      createdAt: values[6],
      updatedAt: values[7],
    });
    return { meta: { last_row_id: counters.daily_summaries } };
  }
  if (sql.startsWith("INSERT INTO daily_statuses")) {
    const existing = tables.daily_statuses.find(
      (row) => row.roomCode === values[0] && row.owner === values[1] && row.date === values[2],
    );
    if (existing) {
      Object.assign(existing, { mood: values[3], updatedAt: values[5] });
      return { meta: { changes: 1 } };
    }
    counters.daily_statuses += 1;
    tables.daily_statuses.push({
      _id: String(counters.daily_statuses),
      roomCode: values[0],
      owner: values[1],
      date: values[2],
      mood: values[3],
      createdAt: values[4],
      updatedAt: values[5],
    });
    return { meta: { last_row_id: counters.daily_statuses } };
  }
  throw new Error(`Unhandled run SQL: ${sql}`);
}

async function callApi(db, request) {
  return onRequest({
    request,
    env: { DB: db, CABIN_ME_PIN: "1314", CABIN_TA_PIN: "5200" },
  });
}

async function readJson(response) {
  return response.json();
}

describe("Cloudflare cabin API", () => {
  it("returns the full room state for a day", async () => {
    const db = createMemoryDb({
      tasks: [{ _id: "1", roomCode: "our-cabin-2026", owner: "me", date: "2026-05-26", text: "math" }],
      encouragements: [{ _id: "1", roomCode: "our-cabin-2026", from: "me", to: "ta", text: "keep going" }],
    });

    const response = await callApi(db, createJsonRequest("/api/state?roomCode=our-cabin-2026&date=2026-05-26"));

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toMatchObject({
      tasks: [{ _id: "1", text: "math" }],
      encouragements: [{ _id: "1", text: "keep going" }],
      summaries: [],
      statuses: [],
      allSummaries: [],
    });
  });

  it("creates and mutates tasks", async () => {
    const db = createMemoryDb();
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
      actorOwner: "me",
      pin: "1314",
    };

    const created = await callApi(db, createJsonRequest("/api/tasks", "POST", payload));
    expect(created.status).toBe(200);
    await expect(readJson(created)).resolves.toMatchObject({ _id: "1", text: "math" });

    const updated = await callApi(
      db,
      createJsonRequest("/api/tasks/1", "PATCH", { status: "done", actorOwner: "me", pin: "1314" }),
    );
    expect(updated.status).toBe(200);
    expect(db.tables.tasks[0].status).toBe("done");

    const deleted = await callApi(
      db,
      createJsonRequest("/api/tasks/1", "DELETE", { actorOwner: "me", pin: "1314" }),
    );
    expect(deleted.status).toBe(200);
    expect(db.tables.tasks).toEqual([]);
  });

  it("upserts daily summaries and statuses", async () => {
    const db = createMemoryDb();

    await callApi(
      db,
      createJsonRequest("/api/daily-summaries", "PUT", {
        roomCode: "our-cabin-2026",
        owner: "ta",
        date: "2026-05-26",
        doneToday: "reading",
        annoyingThing: "",
        minimumTomorrow: "words",
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
        actorOwner: "ta",
        pin: "5200",
      }),
    );
    await callApi(
      db,
      createJsonRequest("/api/daily-statuses", "PUT", {
        roomCode: "our-cabin-2026",
        owner: "ta",
        date: "2026-05-26",
        mood: "tired",
        createdAt: "2026-05-26T00:00:00.000Z",
        updatedAt: "2026-05-26T00:00:00.000Z",
        actorOwner: "ta",
        pin: "5200",
      }),
    );

    expect(db.tables.daily_summaries).toHaveLength(1);
    expect(db.tables.daily_statuses).toHaveLength(1);
    expect(db.tables.daily_statuses[0].mood).toBe("tired");
  });

  it("rejects invalid requests with a 400 response", async () => {
    const db = createMemoryDb();

    const response = await callApi(db, createJsonRequest("/api/tasks", "POST", { roomCode: "" }));

    expect(response.status).toBe(400);
    await expect(readJson(response)).resolves.toEqual({ error: "roomCode is required" });
  });
});
