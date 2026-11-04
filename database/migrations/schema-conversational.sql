-- Additive migration. Run once on the existing nutrition D1 database.
CREATE TABLE IF NOT EXISTS nutrition_ai_usage (
 month TEXT PRIMARY KEY,
 spent_usd REAL NOT NULL DEFAULT 0,
 reserved_usd REAL NOT NULL DEFAULT 0,
 requests INTEGER NOT NULL DEFAULT 0
);
