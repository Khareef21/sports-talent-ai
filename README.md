# Sports Talent AI Scout

Next.js (Pages Router) frontend + FastAPI backend. Vertical jump assessment uses MediaPipe Pose, flight-time physics (`h = g × t² / 8`), age/gender benchmarks, and an optional Gemini coach report.

## Run locally

**Backend** (from `server/`):

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend** (from `client/`):

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API calls are proxied to `http://127.0.0.1:8000`.

Copy `server/.env.example` to `server/.env`. Set `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) for AI coach copy; without it, physics metrics still work. Supabase is optional.

Use **Demo Mode** in the UI to walk through Quality Check → Results without a camera.
