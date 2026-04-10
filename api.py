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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8001", "http://localhost:3000", "null"],
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
    if "topic" not in out.columns:
        out["topic"] = "unlabeled"
    if "prosocial" not in out.columns:
        out["prosocial"] = 0
    if "risk" not in out.columns:
        out["risk"] = 0
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
