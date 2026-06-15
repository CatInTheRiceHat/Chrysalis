"""
Daily YouTube feed ingestion for Chrysalis.

Uses the YouTube Data API only for metadata, stores embeddable short videos in a
shared feed_videos table, and exposes rows in the shape the existing Chrysalis
feed ranker expects. No videos are downloaded, proxied, converted, or rehosted.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
import json
import math
import os
from pathlib import Path
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Iterable, NamedTuple

from core.database import resolve_database_path
from core.feed_captions import build_short_description
from core.feed_integrity import score_feed_integrity
from core.labeling.explain import build_reasons
from core.labeling.metadata_scoring import parse_duration_seconds, score_metadata
from core.labeling.schema import SCORING_VERSION

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = resolve_database_path()
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

class SourceQuerySpec(NamedTuple):
    source_category: str
    source_query: str


DEFAULT_SOURCE_BUCKETS: tuple[SourceQuerySpec, ...] = (
    SourceQuerySpec("news/current events", "current events explained"),
    SourceQuerySpec("opinion/commentary", "thoughtful commentary culture"),
    SourceQuerySpec("travel", "travel vlog city guide"),
    SourceQuerySpec("food", "food recipes street food"),
    SourceQuerySpec("cute animals", "cute animals funny pets"),
    SourceQuerySpec("fashion/aesthetic", "fashion aesthetic outfit ideas"),
    SourceQuerySpec("gaming", "gaming highlights cozy gaming"),
    SourceQuerySpec("comedy", "clean comedy sketch"),
    SourceQuerySpec("internet culture", "internet culture memes explained"),
    SourceQuerySpec("AI/technology", "AI technology news explained"),
    SourceQuerySpec("pop culture", "pop culture news explained"),
    SourceQuerySpec("sports", "sports highlights athlete story"),
    SourceQuerySpec("wellness/mental health", "mental health wellness tips"),
    SourceQuerySpec("study/productivity", "study productivity tips"),
    SourceQuerySpec("lifestyle/vlogs", "day in my life lifestyle vlog"),
    SourceQuerySpec("education/explainers", "science history explained"),
    SourceQuerySpec("music/culture", "music culture new music review"),
)

DEFAULT_QUERIES: tuple[str, ...] = tuple(spec.source_query for spec in DEFAULT_SOURCE_BUCKETS)

RELEVANCE_TERMS: tuple[str, ...] = (
    "news", "current events", "explained", "commentary", "travel", "food",
    "recipe", "animals", "pets", "fashion", "aesthetic", "gaming", "comedy",
    "internet culture", "memes", "technology", "ai", "pop culture", "sports",
    "wellness", "mental health", "study", "productivity", "lifestyle", "vlog",
    "education", "science", "history", "music", "culture", "review",
    "guide", "tips", "story", "highlights",
)

BLOCKED_TERMS: tuple[str, ...] = (
    # Hard blocks stay narrow: explicit/adult/gambling/scam/violent unsafe terms.
    "18+", "nsfw", "porn", "sex tape", "onlyfans", "nude",
    "casino", "gambling", "betting", "parlay",
    "free robux", "gift card generator", "telegram crypto",
    "graphic violence", "gore", "beheading", "execution video",
    "blackout challenge", "choking challenge", "train surfing",
    "hate speech", "white power", "extremist propaganda",
)

SHORT_TARGET_SECONDS = 180
MAX_ALLOWED_SECONDS = 240
MIN_RELEVANCE_SCORE = 0.18
_THUMBNAIL_PREFERENCE = ("maxres", "standard", "high", "medium", "default")

RequestJson = Callable[[str, dict], dict | None]


class YouTubeIngestError(RuntimeError):
    """Raised when ingestion cannot be configured or executed."""


@dataclass
class FeedVideoCandidate:
    id: str
    source: str
    youtube_video_id: str
    title: str
    channel_title: str
    channel_id: str
    description: str
    short_description: str
    thumbnail_url: str
    embed_url: str
    watch_url: str
    published_at: str
    duration_seconds: int | None
    view_count: int
    tags: list[str]
    category_id: str
    topic: str
    source_category: str
    source_query: str
    integrity_score: float
    integrity_flags: dict
    production_style: str
    creator_scale: str
    score: float
    status: str
    created_at: str
    updated_at: str
    chrysalis_scores: dict
    ranking_reason: str
    safety_reason: str
    concern_reason: str | None
    label_confidence: float
    scored_at: str
    scoring_version: str


@dataclass
class IngestResult:
    ok: bool
    added: int
    updated: int
    skipped: int
    fetched: int
    queries: list[str]
    days_back: int
    max_results_per_query: int

    def to_dict(self) -> dict:
        return asdict(self)


_CREATE_FEED_VIDEOS_SQLITE = """
CREATE TABLE IF NOT EXISTS feed_videos (
    id                  TEXT PRIMARY KEY,
    source              TEXT NOT NULL DEFAULT 'youtube',
    youtube_video_id    TEXT NOT NULL UNIQUE,
    title               TEXT,
    channel_title       TEXT,
    channel_id          TEXT,
    description         TEXT,
    short_description   TEXT,
    thumbnail_url       TEXT,
    embed_url           TEXT,
    watch_url           TEXT,
    published_at        TEXT,
    duration_seconds    INTEGER,
    view_count          INTEGER,
    tags                TEXT,
    category_id         TEXT,
    topic               TEXT,
    source_category     TEXT,
    source_query        TEXT,
    integrity_score     REAL,
    integrity_flags     TEXT,
    production_style    TEXT,
    creator_scale       TEXT,
    score               REAL,
    created_at          TEXT,
    updated_at          TEXT,
    status              TEXT NOT NULL DEFAULT 'active',
    chrysalis_scores    TEXT,
    ranking_reason      TEXT,
    safety_reason       TEXT,
    concern_reason      TEXT,
    label_confidence    REAL,
    scored_at           TEXT,
    scoring_version     TEXT
)
"""

_CREATE_FEED_VIDEOS_POSTGRES = """
CREATE TABLE IF NOT EXISTS feed_videos (
    id                  TEXT PRIMARY KEY,
    source              TEXT NOT NULL DEFAULT 'youtube',
    youtube_video_id    TEXT NOT NULL UNIQUE,
    title               TEXT,
    channel_title       TEXT,
    channel_id          TEXT,
    description         TEXT,
    short_description   TEXT,
    thumbnail_url       TEXT,
    embed_url           TEXT,
    watch_url           TEXT,
    published_at        TEXT,
    duration_seconds    INTEGER,
    view_count          BIGINT,
    tags                JSONB,
    category_id         TEXT,
    topic               TEXT,
    source_category     TEXT,
    source_query        TEXT,
    integrity_score     REAL,
    integrity_flags     JSONB,
    production_style    TEXT,
    creator_scale       TEXT,
    score               REAL,
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    status              TEXT NOT NULL DEFAULT 'active',
    chrysalis_scores    JSONB,
    ranking_reason      TEXT,
    safety_reason       TEXT,
    concern_reason      TEXT,
    label_confidence    REAL,
    scored_at           TIMESTAMPTZ,
    scoring_version     TEXT
)
"""


def _load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


_load_dotenv()


def configured_queries(value: str | None = None) -> list[str]:
    return [spec.source_query for spec in configured_source_queries(value)]


def configured_source_queries(value: str | None = None) -> list[SourceQuerySpec]:
    raw = value if value is not None else os.environ.get("YOUTUBE_FEED_QUERIES", "")
    if not raw.strip():
        return list(DEFAULT_SOURCE_BUCKETS)
    return [_parse_source_query_spec(q) for q in raw.split(",") if q.strip()]


def _parse_source_query_spec(raw: str) -> SourceQuerySpec:
    value = raw.strip()
    for separator in ("::", "|", "="):
        if separator in value:
            category, _, query = value.partition(separator)
            category = category.strip() or "custom"
            query = query.strip() or category
            return SourceQuerySpec(category, query)
    return SourceQuerySpec("custom", value)


def _coerce_source_query_specs(queries: Iterable[str | SourceQuerySpec] | None) -> list[SourceQuerySpec]:
    if queries is None:
        return configured_source_queries()
    specs: list[SourceQuerySpec] = []
    for item in queries:
        if isinstance(item, SourceQuerySpec):
            specs.append(item)
        elif isinstance(item, tuple) and len(item) == 2:
            specs.append(SourceQuerySpec(str(item[0]).strip() or "custom", str(item[1]).strip()))
        else:
            specs.append(_parse_source_query_spec(str(item)))
    return [spec for spec in specs if spec.source_query]


def ensure_sqlite_feed_videos_table(conn: sqlite3.Connection) -> None:
    conn.execute(_CREATE_FEED_VIDEOS_SQLITE)
    _ensure_sqlite_feed_video_columns(conn)
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_status_score "
        "ON feed_videos (status, score DESC, published_at DESC)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_youtube_id "
        "ON feed_videos (youtube_video_id)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_source_category "
        "ON feed_videos (source_category)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_source_query "
        "ON feed_videos (source_query)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_integrity_score "
        "ON feed_videos (integrity_score)"
    )
    conn.commit()


def _ensure_sqlite_feed_video_columns(conn: sqlite3.Connection) -> None:
    existing = {
        row[1]
        for row in conn.execute("PRAGMA table_info(feed_videos)").fetchall()
    }
    for column, column_type in {
        "source_category": "TEXT",
        "source_query": "TEXT",
        "short_description": "TEXT",
        "integrity_score": "REAL",
        "integrity_flags": "TEXT",
        "production_style": "TEXT",
        "creator_scale": "TEXT",
    }.items():
        if column not in existing:
            conn.execute(f"ALTER TABLE feed_videos ADD COLUMN {column} {column_type}")


def ensure_postgres_feed_videos_table(conn) -> None:
    cur = conn.cursor()
    cur.execute(_CREATE_FEED_VIDEOS_POSTGRES)
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS source_category TEXT")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS source_query TEXT")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS short_description TEXT")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS integrity_score REAL")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS integrity_flags JSONB")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS production_style TEXT")
    cur.execute("ALTER TABLE feed_videos ADD COLUMN IF NOT EXISTS creator_scale TEXT")
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_status_score "
        "ON feed_videos (status, score DESC, published_at DESC)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_youtube_id "
        "ON feed_videos (youtube_video_id)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_source_category "
        "ON feed_videos (source_category)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_source_query "
        "ON feed_videos (source_query)"
    )
    cur.execute(
        "CREATE INDEX IF NOT EXISTS idx_feed_videos_integrity_score "
        "ON feed_videos (integrity_score)"
    )
    conn.commit()


def ingest_youtube_videos_sqlite(
    *,
    db_path: str | os.PathLike | None = None,
    api_key: str | None = None,
    queries: Iterable[str | SourceQuerySpec] | None = None,
    max_results_per_query: int = 10,
    days_back: int = 7,
    request_json: RequestJson | None = None,
    now: datetime | None = None,
) -> IngestResult:
    source_specs = _coerce_source_query_specs(queries)
    query_list = [spec.source_query for spec in source_specs]
    candidates, skipped = fetch_youtube_candidates(
        api_key=api_key,
        queries=source_specs,
        max_results_per_query=max_results_per_query,
        days_back=days_back,
        request_json=request_json,
        now=now,
    )
    conn = sqlite3.connect(resolve_database_path(db_path))
    try:
        added, updated = store_candidates_sqlite(conn, candidates)
    finally:
        conn.close()
    return IngestResult(
        ok=True,
        added=added,
        updated=updated,
        skipped=skipped,
        fetched=len(candidates),
        queries=query_list,
        days_back=days_back,
        max_results_per_query=max_results_per_query,
    )


def ingest_youtube_videos_postgres(
    conn,
    *,
    api_key: str | None = None,
    queries: Iterable[str | SourceQuerySpec] | None = None,
    max_results_per_query: int = 10,
    days_back: int = 7,
    request_json: RequestJson | None = None,
    now: datetime | None = None,
) -> IngestResult:
    source_specs = _coerce_source_query_specs(queries)
    query_list = [spec.source_query for spec in source_specs]
    candidates, skipped = fetch_youtube_candidates(
        api_key=api_key,
        queries=source_specs,
        max_results_per_query=max_results_per_query,
        days_back=days_back,
        request_json=request_json,
        now=now,
    )
    added, updated = store_candidates_postgres(conn, candidates)
    return IngestResult(
        ok=True,
        added=added,
        updated=updated,
        skipped=skipped,
        fetched=len(candidates),
        queries=query_list,
        days_back=days_back,
        max_results_per_query=max_results_per_query,
    )


def fetch_youtube_candidates(
    *,
    api_key: str | None = None,
    queries: Iterable[str | SourceQuerySpec] | None = None,
    max_results_per_query: int = 10,
    days_back: int = 7,
    request_json: RequestJson | None = None,
    now: datetime | None = None,
) -> tuple[list[FeedVideoCandidate], int]:
    api_key = api_key or os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key and request_json is None:
        raise YouTubeIngestError("YOUTUBE_API_KEY is required for YouTube ingestion.")

    max_results_per_query = max(1, min(int(max_results_per_query), 25))
    days_back = max(2, min(int(days_back), 7))
    source_specs = _coerce_source_query_specs(queries)
    now_utc = now or datetime.now(timezone.utc)
    published_after = (now_utc - timedelta(days=days_back)).replace(microsecond=0)
    published_after_str = published_after.isoformat().replace("+00:00", "Z")
    request = request_json or _youtube_request_json(api_key)

    seen: set[str] = set()
    search_hits: list[tuple[str, SourceQuerySpec]] = []
    skipped = 0

    for source_spec in source_specs:
        data = request("search", {
            "part": "snippet",
            "type": "video",
            "maxResults": str(max_results_per_query),
            "order": "date",
            "publishedAfter": published_after_str,
            "videoDuration": "short",
            "videoEmbeddable": "true",
            "safeSearch": "strict",
            "relevanceLanguage": "en",
            "regionCode": "US",
            "q": source_spec.source_query,
        }) or {}
        for item in data.get("items", []):
            video_id = ((item.get("id") or {}).get("videoId") or "").strip()
            if not video_id or video_id in seen:
                skipped += 1
                continue
            seen.add(video_id)
            search_hits.append((video_id, source_spec))

    candidates: list[FeedVideoCandidate] = []
    source_spec_by_id = {video_id: source_spec for video_id, source_spec in search_hits}

    for batch in _chunks([video_id for video_id, _ in search_hits], 50):
        data = request("videos", {
            "part": "snippet,contentDetails,statistics,status",
            "id": ",".join(batch),
        }) or {}
        for item in data.get("items", []):
            candidate = _candidate_from_video_item(
                item,
                source_spec=source_spec_by_id.get(
                    str(item.get("id")),
                    SourceQuerySpec("custom", ""),
                ),
                now=now_utc,
                days_back=days_back,
            )
            if candidate is None:
                skipped += 1
                continue
            candidates.append(candidate)

    return candidates, skipped


def store_candidates_sqlite(
    conn: sqlite3.Connection,
    candidates: Iterable[FeedVideoCandidate],
) -> tuple[int, int]:
    ensure_sqlite_feed_videos_table(conn)
    added = 0
    updated = 0
    for candidate in candidates:
        exists = conn.execute(
            "SELECT 1 FROM feed_videos WHERE youtube_video_id = ?",
            (candidate.youtube_video_id,),
        ).fetchone()
        _upsert_sqlite_candidate(conn, candidate)
        if exists:
            updated += 1
        else:
            added += 1
    conn.commit()
    return added, updated


def store_candidates_postgres(conn, candidates: Iterable[FeedVideoCandidate]) -> tuple[int, int]:
    ensure_postgres_feed_videos_table(conn)
    cur = conn.cursor()
    added = 0
    updated = 0
    for candidate in candidates:
        cur.execute(
            "SELECT 1 FROM feed_videos WHERE youtube_video_id = %s",
            (candidate.youtube_video_id,),
        )
        exists = cur.fetchone() is not None
        _upsert_postgres_candidate(cur, candidate)
        if exists:
            updated += 1
        else:
            added += 1
    conn.commit()
    return added, updated


def load_active_feed_video_rows_sqlite(
    conn: sqlite3.Connection,
    *,
    limit: int | None = None,
) -> list[dict]:
    params: tuple = (int(limit),) if limit is not None else ()
    for options in _active_feed_video_column_attempts():
        sql = _active_feed_video_rows_sql(**options)
        if limit is not None:
            sql += " LIMIT ?"
        try:
            return [dict(r) for r in conn.execute(sql, params).fetchall()]
        except sqlite3.OperationalError as exc:
            message = str(exc).lower()
            if "no such table" in message:
                return []
            if _missing_optional_feed_video_column(message):
                continue
            raise
    return []


def load_active_feed_video_rows_postgres(conn, *, limit: int | None = None) -> list[dict]:
    params: tuple = ()
    if limit is not None:
        params = (int(limit),)
    cur = conn.cursor()
    for options in _active_feed_video_column_attempts():
        sql = _active_feed_video_rows_sql(**options)
        if limit is not None:
            sql += " LIMIT %s"
        try:
            cur.execute(sql, params)
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, r)) for r in cur.fetchall()]
        except Exception as exc:
            message = str(exc).lower()
            conn.rollback()
            if "feed_videos" in message and "does not exist" in message:
                return []
            if _missing_optional_feed_video_column(message):
                cur = conn.cursor()
                continue
            raise
    return []


def _active_feed_video_rows_sql(
    *,
    include_source_metadata: bool,
    include_short_description: bool,
    include_integrity_metadata: bool,
) -> str:
    if include_source_metadata:
        source_columns = "source_category,\n            source_query,"
    else:
        source_columns = "topic AS source_category,\n            NULL AS source_query,"

    if include_short_description:
        short_description_column = "short_description,"
    else:
        short_description_column = "NULL AS short_description,"

    if include_integrity_metadata:
        integrity_columns = (
            "integrity_score,\n"
            "            integrity_flags,\n"
            "            production_style,\n"
            "            creator_scale,"
        )
    else:
        integrity_columns = (
            "NULL AS integrity_score,\n"
            "            NULL AS integrity_flags,\n"
            "            NULL AS production_style,\n"
            "            NULL AS creator_scale,"
        )
    return f"""
        SELECT
            youtube_video_id AS video_id,
            title,
            description,
            channel_id,
            channel_title,
            topic,
            category_id,
            tags,
            duration_seconds,
            {source_columns}
            {short_description_column}
            {integrity_columns}
            thumbnail_url,
            embed_url,
            watch_url,
            view_count,
            published_at,
            score AS ingest_score,
            chrysalis_scores,
            ranking_reason,
            safety_reason,
            concern_reason,
            label_confidence,
            scoring_version
        FROM feed_videos
        WHERE status = 'active'
        ORDER BY score DESC, published_at DESC
    """


def _active_feed_video_column_attempts() -> list[dict]:
    return [
        {
            "include_source_metadata": True,
            "include_short_description": True,
            "include_integrity_metadata": True,
        },
        {
            "include_source_metadata": True,
            "include_short_description": True,
            "include_integrity_metadata": False,
        },
        {
            "include_source_metadata": True,
            "include_short_description": False,
            "include_integrity_metadata": False,
        },
        {
            "include_source_metadata": False,
            "include_short_description": False,
            "include_integrity_metadata": False,
        },
    ]


def _missing_optional_feed_video_column(message: str) -> bool:
    return (
        "source_category" in message
        or "source_query" in message
        or "short_description" in message
        or "integrity_score" in message
        or "integrity_flags" in message
        or "production_style" in message
        or "creator_scale" in message
    )


def merge_primary_rows(primary: list[dict], fallback: list[dict]) -> list[dict]:
    """Return primary rows first, then fallback rows that are not duplicate videos."""
    seen = {
        str(row.get("video_id") or row.get("youtube_id") or "").strip()
        for row in primary
    }
    merged = list(primary)
    for row in fallback:
        video_id = str(row.get("video_id") or row.get("youtube_id") or "").strip()
        if not video_id or video_id in seen:
            continue
        seen.add(video_id)
        merged.append(row)
    return merged


def _youtube_request_json(api_key: str) -> RequestJson:
    def request(endpoint: str, params: dict) -> dict | None:
        params = dict(params)
        params["key"] = api_key
        url = f"{YOUTUBE_API_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=12) as response:
                return json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as exc:
            print(f"[youtube_ingest] YouTube API error on {endpoint}: {exc}")
            return None
    return request


def _candidate_from_video_item(
    item: dict,
    *,
    source_spec: SourceQuerySpec,
    now: datetime,
    days_back: int,
) -> FeedVideoCandidate | None:
    video_id = str(item.get("id") or "").strip()
    if not video_id:
        return None

    status = item.get("status") or {}
    if status.get("embeddable") is not True:
        return None
    if status.get("privacyStatus") and status.get("privacyStatus") != "public":
        return None
    if status.get("uploadStatus") and status.get("uploadStatus") != "processed":
        return None

    snippet = item.get("snippet") or {}
    details = item.get("contentDetails") or {}
    stats = item.get("statistics") or {}
    title = str(snippet.get("title") or "").strip()
    description = str(snippet.get("description") or "").strip()
    tags = [str(tag) for tag in (snippet.get("tags") or [])]
    duration_seconds = parse_duration_seconds(details.get("duration"))
    if duration_seconds is None or duration_seconds > MAX_ALLOWED_SECONDS:
        return None
    if duration_seconds > SHORT_TARGET_SECONDS:
        # "Keep under 180 seconds if possible": allow up to YouTube's short
        # window only when the rest of the metadata is very relevant.
        soft_duration_penalty = True
    else:
        soft_duration_penalty = False

    text = " ".join([title, description, " ".join(tags), snippet.get("channelTitle") or ""])
    if _contains_blocked_term(text):
        return None

    published_at = str(snippet.get("publishedAt") or "")
    view_count = _safe_int(stats.get("viewCount"))
    source_category = source_spec.source_category or "custom"
    source_query = source_spec.source_query
    topic = source_category
    thumbnail_url = _best_thumbnail(snippet)
    short_description = build_short_description(description)

    row_for_scoring = {
        "title": title,
        "description": description,
        "short_description": short_description,
        "tags": tags,
        "channel_title": snippet.get("channelTitle") or "",
        "video_id": video_id,
        "category": source_category,
        "topic": source_category,
        "source_category": source_category,
        "source_query": source_query,
        "category_id": snippet.get("categoryId") or "",
        "duration_seconds": duration_seconds,
        "thumbnail_url": thumbnail_url,
        "embed_url": f"https://www.youtube-nocookie.com/embed/{video_id}",
        "watch_url": f"https://www.youtube.com/watch?v={video_id}",
        "view_count": view_count,
        "like_count": _safe_int(stats.get("likeCount")),
        "comment_count": _safe_int(stats.get("commentCount")),
    }
    labels = score_metadata(row_for_scoring)
    integrity = score_feed_integrity(row_for_scoring, labels=labels.to_dict())
    relevance = _relevance_score(
        title=title,
        description=description,
        tags=tags,
        query=source_query,
        source_category=source_category,
        published_at=published_at,
        duration_seconds=duration_seconds,
        view_count=view_count,
        labels=labels.to_dict(),
        now=now,
        days_back=days_back,
    )
    if soft_duration_penalty:
        relevance *= 0.78
    if relevance < MIN_RELEVANCE_SCORE:
        return None

    reasons = build_reasons(labels, "flutter-feed")
    timestamp = now.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return FeedVideoCandidate(
        id=video_id,
        source="youtube",
        youtube_video_id=video_id,
        title=title,
        channel_title=str(snippet.get("channelTitle") or ""),
        channel_id=str(snippet.get("channelId") or ""),
        description=description,
        short_description=short_description,
        thumbnail_url=thumbnail_url,
        embed_url=f"https://www.youtube-nocookie.com/embed/{video_id}",
        watch_url=f"https://www.youtube.com/watch?v={video_id}",
        published_at=published_at,
        duration_seconds=duration_seconds,
        view_count=view_count,
        tags=tags,
        category_id=str(snippet.get("categoryId") or ""),
        topic=topic,
        source_category=source_category,
        source_query=source_query,
        integrity_score=integrity["integrity_score"],
        integrity_flags=integrity["integrity_flags"],
        production_style=integrity["production_style"],
        creator_scale=integrity["creator_scale"],
        score=round(relevance, 4),
        status="active",
        created_at=timestamp,
        updated_at=timestamp,
        chrysalis_scores=labels.to_dict(),
        ranking_reason=reasons["ranking_reason"],
        safety_reason=reasons["safety_reason"],
        concern_reason=reasons["concern_reason"],
        label_confidence=labels.confidence,
        scored_at=timestamp,
        scoring_version=SCORING_VERSION,
    )


def _upsert_sqlite_candidate(conn: sqlite3.Connection, candidate: FeedVideoCandidate) -> None:
    placeholders = ",".join(["?"] * 34)
    conn.execute(
        f"""
        INSERT INTO feed_videos (
            id, source, youtube_video_id, title, channel_title, channel_id,
            description, short_description, thumbnail_url, embed_url, watch_url, published_at,
            duration_seconds, view_count, tags, category_id, topic,
            source_category, source_query, integrity_score, integrity_flags,
            production_style, creator_scale, score, created_at, updated_at, status,
            chrysalis_scores, ranking_reason, safety_reason, concern_reason,
            label_confidence, scored_at, scoring_version
        ) VALUES (
            {placeholders}
        )
        ON CONFLICT(youtube_video_id) DO UPDATE SET
            title = excluded.title,
            channel_title = excluded.channel_title,
            channel_id = excluded.channel_id,
            description = excluded.description,
            short_description = excluded.short_description,
            thumbnail_url = excluded.thumbnail_url,
            embed_url = excluded.embed_url,
            watch_url = excluded.watch_url,
            published_at = excluded.published_at,
            duration_seconds = excluded.duration_seconds,
            view_count = excluded.view_count,
            tags = excluded.tags,
            category_id = excluded.category_id,
            topic = excluded.topic,
            source_category = excluded.source_category,
            source_query = excluded.source_query,
            integrity_score = excluded.integrity_score,
            integrity_flags = excluded.integrity_flags,
            production_style = excluded.production_style,
            creator_scale = excluded.creator_scale,
            score = excluded.score,
            updated_at = excluded.updated_at,
            status = excluded.status,
            chrysalis_scores = excluded.chrysalis_scores,
            ranking_reason = excluded.ranking_reason,
            safety_reason = excluded.safety_reason,
            concern_reason = excluded.concern_reason,
            label_confidence = excluded.label_confidence,
            scored_at = excluded.scored_at,
            scoring_version = excluded.scoring_version
        """,
        _candidate_sqlite_values(candidate),
    )


def _upsert_postgres_candidate(cur, candidate: FeedVideoCandidate) -> None:
    values = _candidate_postgres_values(candidate)
    placeholders = ["%s"] * 34
    for index in (14, 20, 27):
        placeholders[index] = "%s::jsonb"
    cur.execute(
        f"""
        INSERT INTO feed_videos (
            id, source, youtube_video_id, title, channel_title, channel_id,
            description, short_description, thumbnail_url, embed_url, watch_url, published_at,
            duration_seconds, view_count, tags, category_id, topic,
            source_category, source_query, integrity_score, integrity_flags,
            production_style, creator_scale, score, created_at, updated_at, status,
            chrysalis_scores, ranking_reason, safety_reason, concern_reason,
            label_confidence, scored_at, scoring_version
        ) VALUES (
            {",".join(placeholders)}
        )
        ON CONFLICT(youtube_video_id) DO UPDATE SET
            title = excluded.title,
            channel_title = excluded.channel_title,
            channel_id = excluded.channel_id,
            description = excluded.description,
            short_description = excluded.short_description,
            thumbnail_url = excluded.thumbnail_url,
            embed_url = excluded.embed_url,
            watch_url = excluded.watch_url,
            published_at = excluded.published_at,
            duration_seconds = excluded.duration_seconds,
            view_count = excluded.view_count,
            tags = excluded.tags,
            category_id = excluded.category_id,
            topic = excluded.topic,
            source_category = excluded.source_category,
            source_query = excluded.source_query,
            integrity_score = excluded.integrity_score,
            integrity_flags = excluded.integrity_flags,
            production_style = excluded.production_style,
            creator_scale = excluded.creator_scale,
            score = excluded.score,
            updated_at = excluded.updated_at,
            status = excluded.status,
            chrysalis_scores = excluded.chrysalis_scores,
            ranking_reason = excluded.ranking_reason,
            safety_reason = excluded.safety_reason,
            concern_reason = excluded.concern_reason,
            label_confidence = excluded.label_confidence,
            scored_at = excluded.scored_at,
            scoring_version = excluded.scoring_version
        """,
        values,
    )


def _candidate_sqlite_values(candidate: FeedVideoCandidate) -> tuple:
    return (
        candidate.id,
        candidate.source,
        candidate.youtube_video_id,
        candidate.title,
        candidate.channel_title,
        candidate.channel_id,
        candidate.description,
        candidate.short_description,
        candidate.thumbnail_url,
        candidate.embed_url,
        candidate.watch_url,
        candidate.published_at,
        candidate.duration_seconds,
        candidate.view_count,
        json.dumps(candidate.tags),
        candidate.category_id,
        candidate.topic,
        candidate.source_category,
        candidate.source_query,
        candidate.integrity_score,
        json.dumps(candidate.integrity_flags),
        candidate.production_style,
        candidate.creator_scale,
        candidate.score,
        candidate.created_at,
        candidate.updated_at,
        candidate.status,
        json.dumps(candidate.chrysalis_scores),
        candidate.ranking_reason,
        candidate.safety_reason,
        candidate.concern_reason,
        candidate.label_confidence,
        candidate.scored_at,
        candidate.scoring_version,
    )


def _candidate_postgres_values(candidate: FeedVideoCandidate) -> tuple:
    values = list(_candidate_sqlite_values(candidate))
    # tags, integrity_flags, and chrysalis_scores are JSONB parameters in Postgres.
    return tuple(values)


def _relevance_score(
    *,
    title: str,
    description: str,
    tags: list[str],
    query: str,
    source_category: str,
    published_at: str,
    duration_seconds: int | None,
    view_count: int,
    labels: dict,
    now: datetime,
    days_back: int,
) -> float:
    title_l = title.lower()
    blob = " ".join([title, description, " ".join(tags)]).lower()
    query_terms = [
        term
        for term in f"{source_category} {query}".lower().replace("/", " ").split()
        if len(term) > 2
    ]
    keyword_hits = 0.0
    for term in (*RELEVANCE_TERMS, *query_terms):
        if term in title_l:
            keyword_hits += 1.7
        elif term in blob:
            keyword_hits += 1.0
    keyword_score = _clamp01(keyword_hits / 8.0)

    recency_score = _recency_score(published_at, now, days_back)
    duration_score = 1.0 if duration_seconds and duration_seconds <= SHORT_TARGET_SECONDS else 0.45
    engagement_boost = _clamp01(math.log10(max(view_count, 0) + 1) / 6.0)
    metadata_signal_score = max(
        float(labels.get("calm", 0.0)),
        float(labels.get("educational", 0.0)),
        float(labels.get("self_love", 0.0)),
        float(labels.get("reflection_value", 0.0)),
        float(labels.get("prosocial", 0.0)),
        float(labels.get("novelty", 0.0)),
    )
    risk_penalty = float(labels.get("overall_risk", 0.0)) * 0.42

    return _clamp01(
        keyword_score * 0.46
        + recency_score * 0.22
        + duration_score * 0.17
        + metadata_signal_score * 0.11
        + engagement_boost * 0.04
        - risk_penalty
    )


def _recency_score(published_at: str, now: datetime, days_back: int) -> float:
    try:
        published = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return 0.0
    age_days = max(0.0, (now - published).total_seconds() / 86400)
    return _clamp01(1.0 - (age_days / max(days_back, 1)))


def _contains_blocked_term(text: str) -> bool:
    lowered = text.lower()
    return any(term in lowered for term in BLOCKED_TERMS)


def _best_thumbnail(snippet: dict) -> str:
    thumbs = snippet.get("thumbnails") or {}
    for size in _THUMBNAIL_PREFERENCE:
        url = (thumbs.get(size) or {}).get("url")
        if url:
            return url
    return ""


def _safe_int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _chunks(items: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))
