function joinUrl(baseUrl, path) {
  const cleanBase = baseUrl?.replace(/\/$/, "") || "";
  return `${cleanBase}${path}`;
}

async function readResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(body?.error || `Request failed with ${response.status}`);
  }

  return body;
}

export function createCabinApiRepository({ fetchImpl = fetch, baseUrl = "" } = {}) {
  const request = async (path, options = {}) => {
    const response = await fetchImpl(joinUrl(baseUrl, path), {
      method: options.method || "GET",
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    return readResponse(response);
  };

  const withAuth = (payload = {}, auth = {}) => ({
    ...payload,
    ...auth,
  });

  return {
    authenticate(payload) {
      return request("/api/session", {
        method: "POST",
        body: payload,
      });
    },

    ensureRoom(roomCode, people) {
      return request("/api/rooms", {
        method: "POST",
        body: { roomCode, people },
      });
    },

    getTodayData(roomCode, date) {
      const params = new URLSearchParams({ roomCode, date });
      return request(`/api/state?${params.toString()}`);
    },

    addTask(payload, auth) {
      return request("/api/tasks", {
        method: "POST",
        body: withAuth(payload, auth),
      });
    },

    updateTask(taskId, payload, auth) {
      return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: withAuth(payload, auth),
      });
    },

    deleteTask(taskId, auth) {
      return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE",
        body: withAuth({}, auth),
      });
    },

    addTaskSuggestion(payload, auth) {
      return request("/api/task-suggestions", {
        method: "POST",
        body: withAuth(payload, auth),
      });
    },

    addEncouragement(payload, auth) {
      return request("/api/encouragements", {
        method: "POST",
        body: withAuth(payload, auth),
      });
    },

    saveDailySummary(payload, auth) {
      return request("/api/daily-summaries", {
        method: "PUT",
        body: withAuth(payload, auth),
      });
    },

    getMoods(roomCode, month) {
      const params = new URLSearchParams({ roomCode, month });
      return request(`/api/moods?${params.toString()}`);
    },

    saveDailyStatus(payload, auth) {
      return request("/api/daily-statuses", {
        method: "PUT",
        body: withAuth(payload, auth),
      });
    },
  };
}
