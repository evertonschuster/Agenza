# assistant-service

Placeholder Python AI/ML service (FastAPI). Only a `/health` endpoint exists — flesh out
once actual AI feature requirements are defined (e.g. inbox reply drafting, appointment
insights).

## Local dev

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
pytest
```
