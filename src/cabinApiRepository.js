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

  return {
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

    addTask(payload) {
      return request("/api/tasks", {
        method: "POST",
        body: payload,
      });
    },

    updateTask(taskId, payload) {
      return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        body: payload,
      });
    },

    deleteTask(taskId) {
      return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "DELETE",
      });
    },

    addEncouragement(payload) {
      return request("/api/encouragements", {
        method: "POST",
        body: payload,
      });
    },

    saveDailySummary(payload) {
      return request("/api/daily-summaries", {
        method: "PUT",
        body: payload,
      });
    },

    saveDailyStatus(payload) {
      return request("/api/daily-statuses", {
        method: "PUT",
        body: payload,
      });
    },
  };
}
