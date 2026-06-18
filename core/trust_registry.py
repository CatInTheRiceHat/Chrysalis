"""Trust-source registry for YouTube feed ingestion (Parts A/B/C).

Three human-curated tables back a single workflow:

    discovered channel → candidate queue → human review
                       → approved / rejected → ingestion uses ONLY approved

  * ``trusted_youtube_channels``  — approved/candidate/rejected/... channels.
    Only ``status = 'approved'`` rows are eligible for the trusted ingestion
    lane (see integrations/youtube_ingest.fetch_trusted_channel_candidates).
  * ``blocked_youtube_channels``  — hard denylist; these channels are never
    ingested or served, even if a video passes every other filter.
  * ``youtube_channel_candidates`` — a *review queue only*. Nothing here feeds
    ingestion; a human promotes a candidate into trusted_youtube_channels.

AI never auto-promotes a candidate. Promotion is a human writing status='approved'.

This module is sqlite-first for the local demo DB; the Postgres/Supabase shape
lives in migrations/011_trusted_sources.sql with the same columns. Loaders treat
a missing table as "no trust registry configured" and return empties so the feed
keeps working with the search + mostPopular lanes (Part G — backward compat).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import sqlite3

# ── Recommended controlled vocabularies ──────────────────────────────────────
TRUSTED_SOURCE_GROUPS: tuple[str, ...] = (
    "trusted/news",
    "trusted/science",
    "trusted/education",
    "trusted/mental_health",
    "trusted/positivity",
    "trusted/productivity",
    "trusted/lifestyle",
    "trusted/culture",
)
TRUST_TIERS: tuple[str, ...] = (
    "institutional",
    "established_creator",
    "candidate",
    "experimental",
)
TRUSTED_STATUSES: tuple[str, ...] = (
    "candidate",
    "approved",
    "rejected",
    "needs_review",
    "disabled",
)
BLOCKED_REASONS: tuple[str, ...] = (
    "foreign_language_leak",
    "ragebait",
    "misinformation",
    "gossip_drama",
    "explicit_or_unsafe",
    "spam_or_repost",
    "low_quality",
    "manual_block",
)
CANDIDATE_REVIEW_STATUSES: tuple[str, ...] = (
    "new",
    "needs_review",
    "approved",
    "rejected",
    "stale",
)

# The single status that makes a trusted-channel row eligible for ingestion.
TRUSTED_STATUS_APPROVED = "approved"


@dataclass(frozen=True)
class TrustedChannel:
    channel_id: str
    channel_title: str
    source_group: str
    trust_tier: str
    status: str
    channel_handle: str | None = None
    channel_url: str | None = None
    notes: str | None = None
    risk_notes: str | None = None


# ── DDL (sqlite) ──────────────────────────────────────────────────────────────
_CREATE_TRUSTED_SQLITE = """
CREATE TABLE IF NOT EXISTS trusted_youtube_channels (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id      TEXT NOT NULL UNIQUE,
    channel_title   TEXT,
    channel_handle  TEXT,
    channel_url     TEXT,
    source_group    TEXT,
    trust_tier      TEXT,
    status          TEXT NOT NULL DEFAULT 'candidate',
    notes           TEXT,
    risk_notes      TEXT,
    approved_by     TEXT,
    approved_at     TEXT,
    last_checked_at TEXT,
    created_at      TEXT,
    updated_at      TEXT
)
"""
_CREATE_BLOCKED_SQLITE = """
CREATE TABLE IF NOT EXISTS blocked_youtube_channels (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id    TEXT NOT NULL UNIQUE,
    channel_title TEXT,
    reason        TEXT,
    blocked_by    TEXT,
    blocked_at    TEXT,
    created_at    TEXT,
    updated_at    TEXT
)
"""
_CREATE_CANDIDATES_SQLITE = """
CREATE TABLE IF NOT EXISTS youtube_channel_candidates (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id            TEXT NOT NULL UNIQUE,
    channel_title         TEXT,
    channel_handle        TEXT,
    channel_url           TEXT,
    suggested_source_group TEXT,
    discovery_source      TEXT,
    why_suggested         TEXT,
    possible_risks        TEXT,
    sample_video_titles   TEXT,
    subscriber_count      INTEGER,
    recent_upload_count   INTEGER,
    language_notes        TEXT,
    recommended_status    TEXT,
    review_status         TEXT NOT NULL DEFAULT 'new',
    review_notes          TEXT,
    checked_at            TEXT,
    created_at            TEXT,
    updated_at            TEXT
)
"""


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def ensure_trust_tables_sqlite(conn: sqlite3.Connection) -> None:
    """Create the three trust tables if absent. Idempotent."""
    conn.execute(_CREATE_TRUSTED_SQLITE)
    conn.execute(_CREATE_BLOCKED_SQLITE)
    conn.execute(_CREATE_CANDIDATES_SQLITE)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_trusted_channels_status "
        "ON trusted_youtube_channels (status)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_blocked_channels_channel "
        "ON blocked_youtube_channels (channel_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_channel_candidates_review "
        "ON youtube_channel_candidates (review_status)"
    )
    conn.commit()


def _table_missing(exc: Exception) -> bool:
    return "no such table" in str(exc).lower()


def load_approved_trusted_channels(conn: sqlite3.Connection) -> list[TrustedChannel]:
    """Return only ``status = 'approved'`` trusted channels.

    A missing table means "no trust registry configured" → empty list, so the
    feed keeps running on the existing lanes (backward compatibility).
    """
    try:
        rows = conn.execute(
            "SELECT channel_id, channel_title, channel_handle, channel_url, "
            "source_group, trust_tier, status, notes, risk_notes "
            "FROM trusted_youtube_channels "
            "WHERE status = ? AND channel_id IS NOT NULL AND channel_id <> '' "
            "ORDER BY id",
            (TRUSTED_STATUS_APPROVED,),
        ).fetchall()
    except sqlite3.OperationalError as exc:
        if _table_missing(exc):
            return []
        raise
    return [
        TrustedChannel(
            channel_id=r["channel_id"],
            channel_title=r["channel_title"] or "",
            source_group=r["source_group"] or "trusted/culture",
            trust_tier=r["trust_tier"] or "candidate",
            status=r["status"],
            channel_handle=r["channel_handle"],
            channel_url=r["channel_url"],
            notes=r["notes"],
            risk_notes=r["risk_notes"],
        )
        for r in rows
    ]


def load_blocked_channel_ids(conn: sqlite3.Connection) -> set[str]:
    """Return the set of hard-blocked channel ids (empty if table missing)."""
    try:
        rows = conn.execute(
            "SELECT channel_id FROM blocked_youtube_channels "
            "WHERE channel_id IS NOT NULL AND channel_id <> ''"
        ).fetchall()
    except sqlite3.OperationalError as exc:
        if _table_missing(exc):
            return set()
        raise
    return {r["channel_id"] if isinstance(r, sqlite3.Row) else r[0] for r in rows}


def load_channel_candidates(conn: sqlite3.Connection) -> list[dict]:
    """Return the candidate review queue (empty if table missing).

    This is a review queue only — it never feeds ingestion.
    """
    try:
        rows = conn.execute(
            "SELECT channel_id, channel_title, suggested_source_group, "
            "discovery_source, review_status, recommended_status "
            "FROM youtube_channel_candidates ORDER BY id"
        ).fetchall()
    except sqlite3.OperationalError as exc:
        if _table_missing(exc):
            return []
        raise
    return [dict(r) for r in rows]


# ── Postgres loaders (production cron path) ──────────────────────────────────
# Postgres tables are created by migrations/011_trusted_sources.sql. If that
# migration has not been applied yet, a SELECT raises and aborts the txn — we
# roll back and return empty so ingestion still runs on search + popular (Part G).
_TRUSTED_SELECT_COLUMNS = (
    "channel_id, channel_title, channel_handle, channel_url, "
    "source_group, trust_tier, status, notes, risk_notes"
)


def _pg_table_missing(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "does not exist" in msg or "undefinedtable" in msg


def _pg_rollback(conn) -> None:
    try:
        conn.rollback()
    except Exception:
        pass


def load_approved_trusted_channels_postgres(conn) -> list[TrustedChannel]:
    """Postgres equivalent of :func:`load_approved_trusted_channels`."""
    cur = conn.cursor()
    try:
        cur.execute(
            f"SELECT {_TRUSTED_SELECT_COLUMNS} FROM trusted_youtube_channels "
            "WHERE status = %s AND channel_id IS NOT NULL AND channel_id <> '' "
            "ORDER BY id",
            (TRUSTED_STATUS_APPROVED,),
        )
        rows = cur.fetchall()
    except Exception as exc:
        _pg_rollback(conn)
        if _pg_table_missing(exc):
            return []
        raise
    return [
        TrustedChannel(
            channel_id=r[0],
            channel_title=r[1] or "",
            source_group=r[4] or "trusted/culture",
            trust_tier=r[5] or "candidate",
            status=r[6],
            channel_handle=r[2],
            channel_url=r[3],
            notes=r[7],
            risk_notes=r[8],
        )
        for r in rows
    ]


def load_blocked_channel_ids_postgres(conn) -> set[str]:
    """Postgres equivalent of :func:`load_blocked_channel_ids`."""
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT channel_id FROM blocked_youtube_channels "
            "WHERE channel_id IS NOT NULL AND channel_id <> ''"
        )
        rows = cur.fetchall()
    except Exception as exc:
        _pg_rollback(conn)
        if _pg_table_missing(exc):
            return set()
        raise
    return {r[0] for r in rows if r and r[0]}


# ── Write helpers (used by tests now; the human-review workflow/admin later) ──
def upsert_trusted_channel_sqlite(
    conn: sqlite3.Connection,
    *,
    channel_id: str,
    channel_title: str = "",
    source_group: str = "trusted/culture",
    trust_tier: str = "candidate",
    status: str = "candidate",
    channel_handle: str | None = None,
    channel_url: str | None = None,
    notes: str | None = None,
    risk_notes: str | None = None,
    approved_by: str | None = None,
) -> None:
    ensure_trust_tables_sqlite(conn)
    now = _now_iso()
    approved_at = now if status == TRUSTED_STATUS_APPROVED else None
    conn.execute(
        """
        INSERT INTO trusted_youtube_channels
            (channel_id, channel_title, channel_handle, channel_url, source_group,
             trust_tier, status, notes, risk_notes, approved_by, approved_at,
             created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
            channel_title=excluded.channel_title,
            channel_handle=excluded.channel_handle,
            channel_url=excluded.channel_url,
            source_group=excluded.source_group,
            trust_tier=excluded.trust_tier,
            status=excluded.status,
            notes=excluded.notes,
            risk_notes=excluded.risk_notes,
            approved_by=excluded.approved_by,
            approved_at=excluded.approved_at,
            updated_at=excluded.updated_at
        """,
        (channel_id, channel_title, channel_handle, channel_url, source_group,
         trust_tier, status, notes, risk_notes, approved_by, approved_at, now, now),
    )
    conn.commit()


def block_channel_sqlite(
    conn: sqlite3.Connection,
    *,
    channel_id: str,
    channel_title: str = "",
    reason: str = "manual_block",
    blocked_by: str | None = None,
) -> None:
    ensure_trust_tables_sqlite(conn)
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO blocked_youtube_channels
            (channel_id, channel_title, reason, blocked_by, blocked_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
            channel_title=excluded.channel_title,
            reason=excluded.reason,
            blocked_by=excluded.blocked_by,
            updated_at=excluded.updated_at
        """,
        (channel_id, channel_title, reason, blocked_by, now, now, now),
    )
    conn.commit()


def add_channel_candidate_sqlite(
    conn: sqlite3.Connection,
    *,
    channel_id: str,
    channel_title: str = "",
    suggested_source_group: str | None = None,
    discovery_source: str | None = None,
    why_suggested: str | None = None,
    possible_risks: str | None = None,
    review_status: str = "new",
    recommended_status: str | None = None,
) -> None:
    ensure_trust_tables_sqlite(conn)
    now = _now_iso()
    conn.execute(
        """
        INSERT INTO youtube_channel_candidates
            (channel_id, channel_title, suggested_source_group, discovery_source,
             why_suggested, possible_risks, recommended_status, review_status,
             created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(channel_id) DO UPDATE SET
            channel_title=excluded.channel_title,
            suggested_source_group=excluded.suggested_source_group,
            discovery_source=excluded.discovery_source,
            why_suggested=excluded.why_suggested,
            possible_risks=excluded.possible_risks,
            recommended_status=excluded.recommended_status,
            review_status=excluded.review_status,
            updated_at=excluded.updated_at
        """,
        (channel_id, channel_title, suggested_source_group, discovery_source,
         why_suggested, possible_risks, recommended_status, review_status, now, now),
    )
    conn.commit()
