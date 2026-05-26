const OWNER_KEYS = new Set(["me", "ta"]);
const TASK_TYPES = new Set(["plan", "sprint", "minimum"]);
const MOODS = new Set(["okay", "tired", "annoyed", "rest"]);

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function badRequest(message) {
  return json({ error: message }, 400);
}

function notFound() {
  return json({ error: "Not found" }, 404);
}

function requireText(value, name) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`${name} is required`);
  }
  return text;
}

function optionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireOwner(value) {
  if (!OWNER_KEYS.has(value)) {
    throw new Error("owner must be me or ta");
  }
  return value;
}

function requireDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    throw new Error("date must be yyyy-mm-dd");
  }
  return value;
}

function requireTaskType(value) {
  return TASK_TYPES.has(value) ? value : "plan";
}

function requireMood(value) {
  if (!MOODS.has(value)) {
    throw new Error("mood is invalid");
  }
  return value;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("JSON body is required");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeTaskRow(row) {
  return row
    ? {
        ...row,
        _id: String(row._id),
        downgradedToday: Boolean(row.downgradedToday),
      }
    : null;
}

function normalizeRows(rows, mapper = (row) => row) {
  return rows.map((row) => ({
    ...mapper(row),
    _id: String(row._id),
  }));
}

async function all(db, sql, ...values) {
  const result = await db.prepare(sql).bind(...values).all();
  return result.results || [];
}

async function first(db, sql, ...values) {
  return db.prepare(sql).bind(...values).first();
}

async function run(db, sql, ...values) {
  return db.prepare(sql).bind(...values).run();
}

async function ensureRoom(db, payload) {
  const roomCode = requireText(payload.roomCode, "roomCode");
  const people = payload.people && typeof payload.people === "object" ? payload.people : {};
  const existing = await first(db, "SELECT CAST(id AS TEXT) AS _id, roomCode, people, createdAt, updatedAt FROM rooms WHERE roomCode = ?", roomCode);

  if (existing) {
    return {
      ...existing,
      people: parsePeople(existing.people),
    };
  }

  const timestamp = nowIso();
  const result = await run(
    db,
    "INSERT INTO rooms (roomCode, people, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
    roomCode,
    JSON.stringify(people),
    timestamp,
    timestamp,
  );

  return {
    _id: String(result.meta?.last_row_id || ""),
    roomCode,
    people,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function parsePeople(value) {
  if (!value) {
    return {};
  }
  if (typeof value === "object") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

async function getState(db, url) {
  const roomCode = requireText(url.searchParams.get("roomCode"), "roomCode");
  const date = requireDate(url.searchParams.get("date"));

  const [tasks, encouragements, summaries, statuses, allSummaries] = await Promise.all([
    all(
      db,
      "SELECT CAST(id AS TEXT) AS _id, roomCode, owner, type, text, status, downgradedToday, date, createdAt, updatedAt FROM tasks WHERE roomCode = ? AND date = ? ORDER BY createdAt ASC",
      roomCode,
      date,
    ),
    all(
      db,
      "SELECT CAST(id AS TEXT) AS _id, roomCode, sender AS \"from\", receiver AS \"to\", text, createdAt FROM encouragements WHERE roomCode = ? ORDER BY createdAt DESC",
      roomCode,
    ),
    all(
      db,
      "SELECT CAST(id AS TEXT) AS _id, roomCode, owner, date, doneToday, annoyingThing, minimumTomorrow, createdAt, updatedAt FROM daily_summaries WHERE roomCode = ? AND date = ?",
      roomCode,
      date,
    ),
    all(
      db,
      "SELECT CAST(id AS TEXT) AS _id, roomCode, owner, date, mood, createdAt, updatedAt FROM daily_statuses WHERE roomCode = ? AND date = ?",
      roomCode,
      date,
    ),
    all(
      db,
      "SELECT CAST(id AS TEXT) AS _id, roomCode, owner, date, doneToday, annoyingThing, minimumTomorrow, createdAt, updatedAt FROM daily_summaries WHERE roomCode = ?",
      roomCode,
    ),
  ]);

  return {
    tasks: normalizeRows(tasks, normalizeTaskRow),
    encouragements: normalizeRows(encouragements),
    summaries: normalizeRows(summaries),
    statuses: normalizeRows(statuses),
    allSummaries: normalizeRows(allSummaries),
  };
}

async function addTask(db, payload) {
  const roomCode = requireText(payload.roomCode, "roomCode");
  const owner = requireOwner(payload.owner);
  const type = requireTaskType(payload.type);
  const text = requireText(payload.text, "text");
  const status = payload.status === "done" ? "done" : "open";
  const downgradedToday = payload.downgradedToday ? 1 : 0;
  const date = requireDate(payload.date);
  const timestamp = payload.createdAt || nowIso();
  const updatedAt = payload.updatedAt || timestamp;

  const result = await run(
    db,
    "INSERT INTO tasks (roomCode, owner, type, text, status, downgradedToday, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    roomCode,
    owner,
    type,
    text,
    status,
    downgradedToday,
    date,
    timestamp,
    updatedAt,
  );

  return {
    _id: String(result.meta?.last_row_id || ""),
    roomCode,
    owner,
    type,
    text,
    status,
    downgradedToday: Boolean(downgradedToday),
    date,
    createdAt: timestamp,
    updatedAt,
  };
}

async function updateTask(db, taskId, payload) {
  const status = payload.status === "done" ? "done" : payload.status === "open" ? "open" : null;
  const downgradedToday =
    typeof payload.downgradedToday === "boolean" ? (payload.downgradedToday ? 1 : 0) : null;
  const updatedAt = payload.updatedAt || nowIso();
  const text = payload.text === undefined ? null : optionalText(payload.text);

  await run(
    db,
    "UPDATE tasks SET status = COALESCE(?, status), downgradedToday = COALESCE(?, downgradedToday), updatedAt = ?, text = COALESCE(?, text) WHERE id = ?",
    status,
    downgradedToday,
    updatedAt,
    text,
    taskId,
  );

  return { ok: true };
}

async function deleteTask(db, taskId) {
  await run(db, "DELETE FROM tasks WHERE id = ?", taskId);
  return { ok: true };
}

async function addEncouragement(db, payload) {
  const roomCode = requireText(payload.roomCode, "roomCode");
  const from = requireOwner(payload.from);
  const to = requireOwner(payload.to);
  const text = requireText(payload.text, "text");
  const createdAt = payload.createdAt || nowIso();

  const result = await run(
    db,
    "INSERT INTO encouragements (roomCode, sender, receiver, text, createdAt) VALUES (?, ?, ?, ?, ?)",
    roomCode,
    from,
    to,
    text,
    createdAt,
  );

  return {
    _id: String(result.meta?.last_row_id || ""),
    roomCode,
    from,
    to,
    text,
    createdAt,
  };
}

async function saveDailySummary(db, payload) {
  const roomCode = requireText(payload.roomCode, "roomCode");
  const owner = requireOwner(payload.owner);
  const date = requireDate(payload.date);
  const doneToday = optionalText(payload.doneToday);
  const annoyingThing = optionalText(payload.annoyingThing);
  const minimumTomorrow = optionalText(payload.minimumTomorrow);
  const createdAt = payload.createdAt || nowIso();
  const updatedAt = payload.updatedAt || createdAt;

  const result = await run(
    db,
    "INSERT INTO daily_summaries (roomCode, owner, date, doneToday, annoyingThing, minimumTomorrow, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(roomCode, owner, date) DO UPDATE SET doneToday = excluded.doneToday, annoyingThing = excluded.annoyingThing, minimumTomorrow = excluded.minimumTomorrow, updatedAt = excluded.updatedAt",
    roomCode,
    owner,
    date,
    doneToday,
    annoyingThing,
    minimumTomorrow,
    createdAt,
    updatedAt,
  );

  return {
    _id: String(result.meta?.last_row_id || ""),
    roomCode,
    owner,
    date,
    doneToday,
    annoyingThing,
    minimumTomorrow,
    createdAt,
    updatedAt,
  };
}

async function saveDailyStatus(db, payload) {
  const roomCode = requireText(payload.roomCode, "roomCode");
  const owner = requireOwner(payload.owner);
  const date = requireDate(payload.date);
  const mood = requireMood(payload.mood);
  const createdAt = payload.createdAt || nowIso();
  const updatedAt = payload.updatedAt || createdAt;

  const result = await run(
    db,
    "INSERT INTO daily_statuses (roomCode, owner, date, mood, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(roomCode, owner, date) DO UPDATE SET mood = excluded.mood, updatedAt = excluded.updatedAt",
    roomCode,
    owner,
    date,
    mood,
    createdAt,
    updatedAt,
  );

  return {
    _id: String(result.meta?.last_row_id || ""),
    roomCode,
    owner,
    date,
    mood,
    createdAt,
    updatedAt,
  };
}

async function route(request, env) {
  if (!env.DB) {
    return json({ error: "Cloudflare D1 binding DB is missing" }, 500);
  }

  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [resource, id] = parts;

  if (request.method === "GET" && resource === "state") {
    return json(await getState(env.DB, url));
  }

  const payload = request.method === "GET" || request.method === "DELETE" ? null : await readJson(request);

  if (request.method === "POST" && resource === "rooms") {
    return json(await ensureRoom(env.DB, payload));
  }

  if (request.method === "POST" && resource === "tasks") {
    return json(await addTask(env.DB, payload));
  }

  if (request.method === "PATCH" && resource === "tasks" && id) {
    return json(await updateTask(env.DB, id, payload));
  }

  if (request.method === "DELETE" && resource === "tasks" && id) {
    return json(await deleteTask(env.DB, id));
  }

  if (request.method === "POST" && resource === "encouragements") {
    return json(await addEncouragement(env.DB, payload));
  }

  if (request.method === "PUT" && resource === "daily-summaries") {
    return json(await saveDailySummary(env.DB, payload));
  }

  if (request.method === "PUT" && resource === "daily-statuses") {
    return json(await saveDailyStatus(env.DB, payload));
  }

  return notFound();
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return json({ ok: true });
  }

  try {
    return await route(context.request, context.env);
  } catch (error) {
    if (/D1_|SQLITE/i.test(error.message || "")) {
      return json({ error: error.message }, 500);
    }

    return badRequest(error.message || "Invalid request");
  }
}
