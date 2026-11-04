CREATE TABLE IF NOT EXISTS records (
  kind TEXT NOT NULL CHECK(kind IN ('food','favorite','target','recipe','meal_plan','weight','autopilot_agenda')),
  id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(kind,id)
);
CREATE INDEX IF NOT EXISTS records_kind_updated ON records(kind,updated_at);
CREATE TABLE IF NOT EXISTS mutations (
  mutation_id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  record_id TEXT NOT NULL,
  result_revision INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
