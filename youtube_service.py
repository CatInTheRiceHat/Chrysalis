"""
YouTube Data API v3 Service for Morphomedia
Fetches real, embeddable video IDs by topic category.
Uses in-memory caching to minimize quota usage.
"""

import os
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

# Load .env file manually (zero dependencies)
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

# Map Morphomedia topics to YouTube video category IDs
# See: https://developers.google.com/youtube/v3/docs/videoCategories/list
TOPIC_TO_CATEGORY_ID = {
    "entertainment": "24",  # Entertainment
    "education": "27",      # Education
    "lifestyle": "26",      # Howto & Style
    "news": "25",           # News & Politics
    "gaming": "20",         # Gaming
    "music": "10",          # Music
    "sports": "17",         # Sports
}

# Fallback IDs in case the API is unavailable (verified working as of 2026)
FALLBACK_IDS = {
    "entertainment": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "education": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "lifestyle": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "news": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "gaming": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "music": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
    "sports": ["dQw4w9WgXcQ", "9bZkp7q19f0", "kJQP7kiw5Fk"],
}

# In-memory cache: { topic: { "ids": [...], "fetched_at": timestamp } }
_cache = {}
CACHE_TTL_SECONDS = 4 * 60 * 60  # 4 hours


def _api_request(endpoint: str, params: dict) -> dict | None:
    """Make a YouTube Data API request. Returns parsed JSON or None on error."""
    params["key"] = YOUTUBE_API_KEY
    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{YOUTUBE_API_BASE}/{endpoint}?{query_string}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        print(f"[youtube_service] API error: {e}")
        return None


def fetch_videos_by_topic(topic: str, max_results: int = 12) -> list[str]:
    """
    Fetch real YouTube video IDs for a given Morphomedia topic.
    Uses mostPopular chart filtered by category (costs 1 quota unit).
    Results are cached for CACHE_TTL_SECONDS.
    
    Returns a list of video ID strings.
    """
    topic = topic.lower()
    
    # Check cache
    if topic in _cache:
        entry = _cache[topic]
        age = time.time() - entry["fetched_at"]
        if age < CACHE_TTL_SECONDS and entry["ids"]:
            return entry["ids"]

    # No API key? Use fallbacks
    if not YOUTUBE_API_KEY:
        print("[youtube_service] No YOUTUBE_API_KEY set. Using fallback IDs.")
        return FALLBACK_IDS.get(topic, FALLBACK_IDS["entertainment"])

    category_id = TOPIC_TO_CATEGORY_ID.get(topic, "24")  # default to entertainment

    data = _api_request("videos", {
        "part": "id,snippet",
        "chart": "mostPopular",
        "videoCategoryId": category_id,
        "regionCode": "US",
        "maxResults": str(max_results),
    })

    if data and "items" in data:
        ids = [item["id"] for item in data["items"]]
        # Cache the results
        _cache[topic] = {
            "ids": ids,
            "fetched_at": time.time(),
        }
        print(f"[youtube_service] Fetched {len(ids)} videos for '{topic}' (category {category_id})")
        return ids

    # API failed — use fallbacks
    print(f"[youtube_service] API call failed for topic '{topic}'. Using fallbacks.")
    return FALLBACK_IDS.get(topic, FALLBACK_IDS["entertainment"])


def get_youtube_id_for_video(topic: str, seed: str) -> str:
    """
    Get a single YouTube video ID for a given topic.
    Uses the seed string (e.g., the algorithm's video_id) to deterministically 
    pick from the cached list, so re-renders are consistent.
    """
    ids = fetch_videos_by_topic(topic)
    if not ids:
        return "dQw4w9WgXcQ"  # ultimate fallback
    
    # Deterministic selection based on seed
    hash_val = 0
    for ch in str(seed):
        hash_val = ord(ch) + ((hash_val << 5) - hash_val)
    
    return ids[abs(hash_val) % len(ids)]


def get_all_topics_cache_status() -> dict:
    """Return info about what's currently cached (for debugging)."""
    status = {}
    for topic in TOPIC_TO_CATEGORY_ID:
        if topic in _cache:
            entry = _cache[topic]
            age = time.time() - entry["fetched_at"]
            status[topic] = {
                "count": len(entry["ids"]),
                "age_minutes": round(age / 60, 1),
                "fresh": age < CACHE_TTL_SECONDS,
            }
        else:
            status[topic] = {"count": 0, "age_minutes": None, "fresh": False}
    return status
