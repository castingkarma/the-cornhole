CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first TEXT NOT NULL,
  last TEXT NOT NULL,
  nick TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- Holds the drawn bracket (key 'bracket') and failed admin PIN attempts (key 'pin_fails').
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
