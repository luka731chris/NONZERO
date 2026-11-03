-- Run once in the EXISTING nutrition D1 database; additive, no changes to records or mutations.
CREATE TABLE IF NOT EXISTS food_catalog (id TEXT PRIMARY KEY,name TEXT NOT NULL,brand TEXT NOT NULL DEFAULT '',normalized TEXT NOT NULL,payload TEXT NOT NULL,uses INTEGER NOT NULL DEFAULT 0,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_food_catalog_normalized ON food_catalog(normalized);
CREATE TABLE IF NOT EXISTS food_search_cache (cache_key TEXT PRIMARY KEY,payload TEXT NOT NULL,expires_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_food_search_cache_expiry ON food_search_cache(expires_at);
