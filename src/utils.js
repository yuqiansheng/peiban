export const OWNER_KEYS = ["me", "ta"];

export const TASK_TYPES = [
  {
    key: "plan",
    label: "计划任务",
    softLabel: "今天的小安排",
    hint: "正常状态下慢慢完成",
  },
  {
    key: "sprint",
    label: "冲刺任务",
    softLabel: "状态好就多走一步",
    hint: "做到了是礼物，没做也不扣分",
  },
  {
    key: "minimum",
    label: "保底任务",
    softLabel: "今天守住它就够了",
    hint: "累的时候完成它就很好",
  },
];

const TASK_TYPE_KEYS = new Set(TASK_TYPES.map((type) => type.key));

export function getTodayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getOtherOwner(owner) {
  return owner === "me" ? "ta" : "me";
}

export function getOwnerLabel(owner, people) {
  return people?.[owner]?.trim() || (owner === "me" ? "我" : "TA");
}

export function normalizeTaskType(type) {
  return TASK_TYPE_KEYS.has(type) ? type : "plan";
}

export function createEmptyTaskGroups() {
  return OWNER_KEYS.reduce((ownerMap, owner) => {
    ownerMap[owner] = TASK_TYPES.reduce((typeMap, type) => {
      typeMap[type.key] = [];
      return typeMap;
    }, {});
    return ownerMap;
  }, {});
}

export function groupTasksByOwnerAndType(tasks = []) {
  const grouped = createEmptyTaskGroups();

  tasks.forEach((task) => {
    const owner = OWNER_KEYS.includes(task.owner) ? task.owner : "me";
    const type = normalizeTaskType(task.type);
    grouped[owner][type].push(task);
  });

  return grouped;
}

export function summarizeTasks(tasks = []) {
  return tasks.reduce(
    (summary, task) => {
      summary.total += 1;
      if (task.status === "done") {
        summary.done += 1;
      } else {
        summary.open += 1;
      }

      if (task.downgradedToday) {
        summary.downgraded += 1;
      }

      return summary;
    },
    { total: 0, done: 0, open: 0, downgraded: 0 },
  );
}

export function byNewestCreatedAt(items = []) {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

export function buildTaskPayload({
  roomCode,
  owner,
  type,
  text,
  date = getTodayKey(),
  now = new Date(),
}) {
  const trimmedText = text?.trim();

  if (!trimmedText) {
    throw new Error("Task text is required");
  }

  const timestamp = now.toISOString();

  return {
    roomCode,
    owner,
    type: normalizeTaskType(type),
    text: trimmedText,
    status: "open",
    downgradedToday: false,
    date,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function buildEncouragement({ roomCode, from, to, text, now = new Date() }) {
  const trimmedText = text?.trim();

  if (!trimmedText) {
    throw new Error("Encouragement text is required");
  }

  return {
    roomCode,
    from,
    to,
    text: trimmedText,
    createdAt: now.toISOString(),
  };
}

export function buildSummaryPayload({
  roomCode,
  owner,
  date = getTodayKey(),
  doneToday,
  annoyingThing,
  minimumTomorrow,
  now = new Date(),
}) {
  const timestamp = now.toISOString();

  return {
    roomCode,
    owner,
    date,
    doneToday: doneToday?.trim() || "",
    annoyingThing: annoyingThing?.trim() || "",
    minimumTomorrow: minimumTomorrow?.trim() || "",
    updatedAt: timestamp,
    createdAt: timestamp,
  };
}

export function countGuardedDays(summaries = []) {
  const days = new Set(
    summaries
      .filter((summary) => summary.doneToday || summary.minimumTomorrow)
      .map((summary) => summary.date),
  );
  return days.size;
}
