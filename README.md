# MorphoMedia: Healthy Feed Algorithm

A youth-centric social media recommender system that prioritizes digital well-being over engagement maximization.

## Quick Start

```bash
# Install dependencies
pip install pandas numpy matplotlib fastapi uvicorn python-multipart

# Set up your YouTube API key (optional, for live video data)
cp .env.example .env
# Edit .env and add your YOUTUBE_API_KEY

# Run the API server
python api.py
# Server starts at http://localhost:8000
```

## Project Structure

```
MorphoMedia/
├── algorithm.py          # Core ranking algorithm with Gini diversity, engagement decay
├── data.py               # Data processing utilities
├── metrics.py            # Evaluation metrics (diversity@k, streak detection, etc.)
├── graphs.py             # Visualization scripts for experiment results
├── api.py                # FastAPI web server with YouTube integration
├── experiments.py        # Run evaluation experiments
├── youtube_service.py    # YouTube Data API wrapper with caching
├── datasets/             # Processed datasets
├── results/              # Experiment outputs (CSVs, figures)
└── website/              # Frontend UI (served by api.py)
```

## Algorithm Overview

The ranking formula balances four key factors:

| Factor | Weight (entertainment preset) | Purpose |
|--------|-------------------------------|---------|
| Engagement (e) | 0.55 | Baseline popularity, decayed during passive consumption |
| Diversity (d) | 0.20 | Gini coefficient promotes content variety |
| Prosocial (p) | 0.15 | Up-ranks prosocial/bridging content |
| Risk (r) | 0.10 | Down-ranks harmful upward comparison triggers |

### Key Features

- **Passive Consumption Decay**: Detects doomscrolling and forces diversity injection
- **Similarity Mindset Modifier**: Mitigates harmful social comparison by checking creator-user similarity
- **Gini Coefficient Diversity**: Mathematically enforces content variety to prevent filter bubbles
- **User-Controllable Weights**: Frontend sliders allow real-time algorithm adjustment

## Running Experiments

```bash
# Run 10 evaluation sessions
python experiments.py --n_sessions 10

# Generate result visualizations
python graphs.py --summary results/data/experiment_summary.csv
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the frontend UI |
| `/api/run/local` | POST | Run algorithm with custom weights |
| `/api/youtube/videos/{topic}` | GET | Fetch live YouTube video IDs |
| `/api/youtube/cache` | GET | Debug YouTube cache status |

## Configuration

Presets available in `algorithm.py`:
- `baseline` - Engagement-only ranking
- `entertainment` - Balanced weights (default)
- `inspiration` - High diversity focus
- `learning` - High prosocial focus

Night mode adds extra risk penalty and caps feed length at 15.

## Documentation

- `README_ALGORITHM.md` - Mathematical formulas and UI mapping guide
- `Social Media Algorithm Project Enhancement.md` - Research paper with full theoretical background

## License

MIT
