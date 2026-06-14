from __future__ import annotations

from datetime import datetime, timezone
import sqlite3

from core.ranking.feed import build_feed
from integrations.youtube_ingest import (
    ingest_youtube_videos_sqlite,
    load_active_feed_video_rows_sqlite,
)


NOW = datetime(2026, 6, 14, 12, 0, tzinfo=timezone.utc)


def _video(video_id: str, title: str, duration: str = "PT1M20S", views: str = "12000") -> dict:
    return {
        "id": video_id,
        "snippet": {
            "title": title,
            "description": (
                "Short student wellbeing tips for study focus, digital wellness, "
                "confidence, and healthy phone habits."
            ),
            "channelId": f"channel-{video_id}",
            "channelTitle": "Student Wellness Lab",
            "categoryId": "27",
            "publishedAt": "2026-06-13T12:00:00Z",
            "tags": ["student", "study", "focus", "digital wellness"],
            "thumbnails": {"high": {"url": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"}},
        },
        "contentDetails": {"duration": duration},
        "statistics": {"viewCount": views},
        "status": {
            "embeddable": True,
            "privacyStatus": "public",
            "uploadStatus": "processed",
        },
    }


def _fake_youtube(endpoint: str, params: dict) -> dict:
    if endpoint == "search":
        return {
            "items": [
                {"id": {"videoId": "calm1"}},
                {"id": {"videoId": "focus2"}},
                {"id": {"videoId": "bad3"}},
                {"id": {"videoId": "long4"}},
                {"id": {"videoId": "calm1"}},  # duplicate from the same search page
            ]
        }
    if endpoint == "videos":
        ids = str(params["id"]).split(",")
        all_items = {
            "calm1": _video("calm1", "Student focus tips for a calm study reset"),
            "focus2": _video("focus2", "AI literacy for students in 60 seconds", "PT58S", "22000"),
            "bad3": _video("bad3", "Political drama exposed and destroyed", "PT45S", "90000"),
            "long4": _video("long4", "Student focus tips full workshop", "PT6M", "5000"),
        }
        return {"items": [all_items[video_id] for video_id in ids if video_id in all_items]}
    raise AssertionError(f"Unexpected endpoint: {endpoint}")


def test_youtube_ingest_stores_filtered_real_videos_without_duplicate_inserts(tmp_path):
    db_path = tmp_path / "feed.db"

    first = ingest_youtube_videos_sqlite(
        db_path=db_path,
        api_key="test-key",
        queries=["student focus tips"],
        max_results_per_query=10,
        days_back=7,
        request_json=_fake_youtube,
        now=NOW,
    )
    assert first.added == 2
    assert first.updated == 0
    assert first.skipped >= 3

    second = ingest_youtube_videos_sqlite(
        db_path=db_path,
        api_key="test-key",
        queries=["student focus tips"],
        max_results_per_query=10,
        days_back=7,
        request_json=_fake_youtube,
        now=NOW,
    )
    assert second.added == 0
    assert second.updated == 2

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        rows = load_active_feed_video_rows_sqlite(conn)
    finally:
        conn.close()

    assert {row["video_id"] for row in rows} == {"focus2", "calm1"}
    assert rows[0]["ingest_score"] >= rows[1]["ingest_score"]
    assert all(row["embed_url"].startswith("https://www.youtube-nocookie.com/embed/") for row in rows)
    assert all(row["thumbnail_url"].endswith("/hqdefault.jpg") for row in rows)

    feed = build_feed(rows, "flutter-feed", k=10)
    assert {item["youtube_id"] for item in feed} == {"calm1", "focus2"}
    assert all(item["embed_url"].startswith("https://www.youtube-nocookie.com/embed/") for item in feed)
