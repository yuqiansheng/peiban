CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode TEXT NOT NULL UNIQUE,
  people TEXT NOT NULL DEFAULT '{}',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('me', 'ta')),
  type TEXT NOT NULL CHECK (type IN ('plan', 'sprint', 'minimum')),
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'done')),
  downgradedToday INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS encouragements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('me', 'ta')),
  receiver TEXT NOT NULL CHECK (receiver IN ('me', 'ta')),
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('me', 'ta')),
  date TEXT NOT NULL,
  doneToday TEXT NOT NULL DEFAULT '',
  annoyingThing TEXT NOT NULL DEFAULT '',
  minimumTomorrow TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (roomCode, owner, date)
);

CREATE TABLE IF NOT EXISTS daily_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('me', 'ta')),
  date TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('okay', 'tired', 'annoyed', 'rest')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (roomCode, owner, date)
);

CREATE INDEX IF NOT EXISTS idx_tasks_room_date ON tasks (roomCode, date);
CREATE INDEX IF NOT EXISTS idx_encouragements_room_created ON encouragements (roomCode, createdAt);
CREATE INDEX IF NOT EXISTS idx_summaries_room_date ON daily_summaries (roomCode, date);
CREATE INDEX IF NOT EXISTS idx_statuses_room_date ON daily_statuses (roomCode, date);
