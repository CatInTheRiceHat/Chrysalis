-- Run this once in Supabase SQL Editor to set up the Chrysalis schema.

CREATE TABLE IF NOT EXISTS migration_drops (
    id           BIGSERIAL PRIMARY KEY,
    drop_date    TEXT    NOT NULL,
    mode         TEXT    NOT NULL CHECK (mode IN ('morning', 'evening')),
    scheduled_at TEXT    NOT NULL,
    feed_json    TEXT    NOT NULL,
    item_count   INTEGER NOT NULL,
    UNIQUE (drop_date, mode)
);

CREATE INDEX IF NOT EXISTS idx_migration_drops_date
    ON migration_drops (drop_date);

CREATE TABLE IF NOT EXISTS cocoon_profiles (
    user_id       TEXT    PRIMARY KEY,
    start_minutes INTEGER NOT NULL,
    current_week  INTEGER NOT NULL DEFAULT 0,
    start_date    TEXT    NOT NULL,
    graduated     INTEGER NOT NULL DEFAULT 0
);
