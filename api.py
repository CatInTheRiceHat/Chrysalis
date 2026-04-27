from contextlib import asynccontextmanager
import json
import os
import sqlite3
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pandas as pd
from pathlib import Path
from core.algorithm import (
    WEIGHTS,
    add_engagement,
    build_prototype_feed,
    get_mode_settings,
    rank_baseline,
    validate_and_clean,
)
from core.metrics import diversity_at_k, max_streak, prosocial_ratio
from integrations.youtube_service import fetch_videos_by_topic, get_youtube_id_for_video, get_all_topics_cache_status
from migration_scheduler import create_scheduler
from core.cocoon import (
    CocoonProfile,
    calculate_this_weeks_cap,
    should_graduate,
    advance_week,
)

DB_PATH = Path(os.environ.get("DATABASE_PATH", str(Path(__file__).parent / "chrysalis.db")))


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = create_scheduler()
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=json.loads(os.getenv("CORS_ORIGINS", '["http://localhost:5173","http://localhost:8001","http://localhost:3000","null"]')),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent
WEBSITE_DIR = ROOT / "website"
DEFAULT_DATASET = ROOT / "datasets" / "processed_dataset.csv"

# Serve the website frontend
@app.get("/")
def serve_index():
    return FileResponse(WEBSITE_DIR / "index.html")

app.mount("/static", StaticFiles(directory=WEBSITE_DIR), name="static")

from pydantic import BaseModel, Field


class RunLocalRequest(BaseModel):
    preset: str = Field(default="entertainment", description="Algorithm preset template to load.", example="entertainment")
    night_mode: bool = Field(default=False, description="Toggle algorithm night mode parameters.")
    recent_window: int = Field(default=10, description="The maximum rolling window size for consecutive streak monitoring.")
    serendipity_weight: float = Field(default=None, description="Direct slider override for 'Serendipity / Diversity' ranking. Forces a Gini-coefficient evaluation.", ge=0.0, le=10.0, example=2.0)
    similarity_weight: float = Field(default=None, description="Internal algorithm modifier. Controls how harshly to penalize upward appearance comparison. Handled on backend inherently.", ge=0.0, le=10.0, example=5.0)
    dataset_path: str = Field(default=None, description="Internal path route. Leave null to read default dataset.")
    passive_streak: int = Field(default=0, description="Integer representing how many videos the user has consumed without engaging. Degrades baseline engagement score via Decay Function.")
    user_trait: str = Field(default="urban", description="Current mock user demographic trait. (urban, rural, suburban, international)", example="urban")

def metrics_for_feed(feed: pd.DataFrame) -> dict:
    return {
        "diversity_at_10": int(diversity_at_k(feed, k=10, topic_col="topic")),
        "max_topic_streak": int(max_streak(feed, "topic")),
        "max_creator_streak": int(max_streak(feed, "channel")),
        "prosocial_ratio": float(prosocial_ratio(feed, prosocial_col="prosocial")),
    }

def ensure_algorithm_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    _defaults = {
        "topic": "unlabeled",
        "prosocial": 0,
        "risk": 0,
        "active_engagement_ratio": 0.0,
        "creator_authenticity": 0.5,
    }
    for col, default in _defaults.items():
        if col not in out.columns:
            out[col] = default
    return out

@app.post("/api/run/local")
def run_local(request: RunLocalRequest):
    dataset_path = Path(request.dataset_path) if request.dataset_path else DEFAULT_DATASET
    if not dataset_path.exists():
        raise HTTPException(status_code=400, detail=f"Dataset not found: {dataset_path}")
        
    df = pd.read_csv(dataset_path)
    df = ensure_algorithm_columns(df)
    df = validate_and_clean(df)
    df, _ = add_engagement(df)

    weights, k = get_mode_settings(
        preset=request.preset, night_mode=request.night_mode, k_default=100)
    
    # Apply direct UCRS overrides
    if request.serendipity_weight is not None:
        weights["d"] = request.serendipity_weight
    if request.similarity_weight is not None:
        weights["r"] = request.similarity_weight
        
    user_profile = {
        "user_trait": request.user_trait,
        "passive_streak": request.passive_streak
    }
    
    improved = build_prototype_feed(
        df, weights=weights, user_profile=user_profile, k=k, recent_window=request.recent_window
    ).reset_index(drop=True)
    
    baseline = rank_baseline(df, k=k).reset_index(drop=True)

    cols = [
        c for c in [
            "video_id", "title", "topic", "channel", 
            "prosocial", "risk", "engagement", "diversity", 
            "score", "appearance_comparison", "creator_trait"
        ] if c in improved.columns
    ]

    feed_records = improved[cols].head(min(k, 50)).to_dict(orient="records")

    # Inject live YouTube video IDs into each feed item
    for item in feed_records:
        topic = item.get("topic", "entertainment")
        seed = item.get("video_id", "fallback")
        item["youtube_id"] = get_youtube_id_for_video(topic, seed)

    return {
        "preset": request.preset,
        "night_mode": request.night_mode,
        "k": k,
        "weights": weights,
        "improved_metrics": metrics_for_feed(improved),
        "baseline_metrics": metrics_for_feed(baseline),
        "improved_feed": feed_records
    }

@app.get("/api/youtube/videos/{topic}")
def youtube_videos(topic: str, max_results: int = 12):
    """Standalone endpoint to fetch live YouTube video IDs by topic."""
    ids = fetch_videos_by_topic(topic, max_results=max_results)
    return {"topic": topic, "video_ids": ids, "count": len(ids)}

@app.get("/api/youtube/cache")
def youtube_cache():
    """Debug endpoint to inspect YouTube cache status."""
    return get_all_topics_cache_status()


# ---------------------------------------------------------------------------
# Migration Mode
# ---------------------------------------------------------------------------

@app.get("/api/migration/today")
def migration_today():
    """
    Return today's Migration Mode drops (morning at 07:00, evening at 19:00).
    Each drop is the same 10-15 posts for every user — non-personalized.

    - 200: at least one drop has run; absent drop is null in the response.
    - 404: no drops have been written for today yet.
    """
    today = date.today().isoformat()
    conn = sqlite3.connect(DB_PATH)
    try:
        rows = conn.execute(
            """
            SELECT mode, scheduled_at, feed_json, item_count
            FROM migration_drops
            WHERE drop_date = ?
            """,
            (today,),
        ).fetchall()
    finally:
        conn.close()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No Migration Mode drops have run yet for {today}. "
                "Morning drop is scheduled for 07:00, evening drop for 19:00."
            ),
        )

    drops: dict = {}
    for mode, scheduled_at, feed_json, item_count in rows:
        drops[mode] = {
            "mode": mode,
            "scheduled_at": scheduled_at,
            "item_count": item_count,
            "feed": json.loads(feed_json),
        }

    return {
        "date": today,
        "morning": drops.get("morning"),   # None if not yet run
        "evening": drops.get("evening"),   # None if not yet run
    }


class CocoonEnrollRequest(BaseModel):
    user_id: str
    current_daily_minutes: int = Field(..., gt=0)


@app.post("/api/cocoon/enroll")
def cocoon_enroll(request: CocoonEnrollRequest):
    today = date.today().isoformat()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(
            """
            INSERT OR IGNORE INTO cocoon_profiles
                (user_id, start_minutes, current_week, start_date, graduated)
            VALUES (?, ?, 0, ?, 0)
            """,
            (request.user_id, request.current_daily_minutes, today),
        )
        conn.commit()
        row = conn.execute(
            "SELECT start_minutes, current_week FROM cocoon_profiles WHERE user_id = ?",
            (request.user_id,),
        ).fetchone()
    finally:
        conn.close()

    profile = CocoonProfile(
        user_id=request.user_id,
        start_minutes=row[0],
        current_week=row[1],
        start_date=date.fromisoformat(today),
    )
    daily_cap = calculate_this_weeks_cap(profile)
    return {
        "user_id": profile.user_id,
        "start_minutes": profile.start_minutes,
        "current_week": profile.current_week,
        "daily_cap": daily_cap,
        "should_graduate": should_graduate(profile),
    }


@app.get("/api/cocoon/status/{user_id}")
def cocoon_status(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT start_minutes, current_week, start_date, graduated FROM cocoon_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No Cocoon profile found for user '{user_id}'.")

    profile = CocoonProfile(
        user_id=user_id,
        start_minutes=row[0],
        current_week=row[1],
        start_date=date.fromisoformat(row[2]),
    )
    daily_cap = calculate_this_weeks_cap(profile)
    return {
        "user_id": user_id,
        "current_week": profile.current_week,
        "daily_cap": daily_cap,
        "minutes_remaining_today": daily_cap,
        "should_graduate": should_graduate(profile),
    }


@app.post("/api/cocoon/advance/{user_id}")
def cocoon_advance(user_id: str):
    conn = sqlite3.connect(DB_PATH)
    try:
        row = conn.execute(
            "SELECT start_minutes, current_week, start_date FROM cocoon_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"No Cocoon profile found for user '{user_id}'.")

        profile = CocoonProfile(
            user_id=user_id,
            start_minutes=row[0],
            current_week=row[1],
            start_date=date.fromisoformat(row[2]),
        )
        next_profile = advance_week(profile)
        graduating = should_graduate(next_profile)
        conn.execute(
            "UPDATE cocoon_profiles SET current_week = ?, graduated = ? WHERE user_id = ?",
            (next_profile.current_week, int(graduating), user_id),
        )
        conn.commit()
    finally:
        conn.close()

    return {
        "user_id": user_id,
        "current_week": next_profile.current_week,
        "daily_cap": calculate_this_weeks_cap(next_profile),
        "graduated": graduating,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
