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

-- Videos fetched + classified by the extraction cron (/api/cron/extract).
-- The base columns were previously created implicitly; this formalizes them and
-- adds the Chrysalis v1 label/ranking fields. Run migrations/001_video_labels.sql
-- on databases that already have a `videos` table.
CREATE TABLE IF NOT EXISTS videos (
    video_id                TEXT PRIMARY KEY,   -- this is the YouTube video ID
    title                   TEXT,
    description             TEXT,
    channel_id              TEXT,
    channel_title           TEXT,
    topic                   TEXT,
    category_id             TEXT,
    view_count              BIGINT,
    like_count              BIGINT,
    comment_count           BIGINT,
    published_at            TEXT,
    active_engagement_ratio REAL,
    appearance_comparison   REAL,
    opinion_comparison      REAL,
    prosocial               REAL,
    risk                    REAL,
    creator_authenticity    REAL,
    fetched_at              DOUBLE PRECISION,
    classified_at           DOUBLE PRECISION,
    -- Chrysalis label/ranking fields (v1)
    chrysalis_scores        JSONB,
    ranking_reason          TEXT,
    safety_reason           TEXT,
    concern_reason          TEXT,
    label_confidence        REAL,
    scored_at               TIMESTAMPTZ,
    scoring_version         TEXT
);

CREATE INDEX IF NOT EXISTS idx_videos_scoring_version ON videos (scoring_version);
CREATE INDEX IF NOT EXISTS idx_videos_topic           ON videos (topic);
