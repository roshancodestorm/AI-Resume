# AI Resume Platform

A full-featured, AI-powered resume platform built with React + FastAPI + PostgreSQL + GPT-4.

## Features

- **Resume Builder** — Structured editor with AI "Improve with AI" buttons per section (streamed GPT-4 output)
- **Resume Analyzer** — AI scores your resume across sections and gives actionable feedback
- **Job Match** — Paste a job description, get a match score, keyword gaps, and specific rewrite suggestions
- **AI Voice Coach** — Interactive voice assistant ("Aura") that helps build profile, suggests roles, and auto-fills resume sections via voice commands.
- **PDF Export** — 3 professional templates (Modern, Classic, Minimal)
- **Auth** — Email/password + Google & GitHub OAuth, JWT sessions

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Auth | JWT + OAuth2 (Google, GitHub) via Authlib |
| AI | OpenAI GPT-4o |
| PDF | WeasyPrint + Jinja2 HTML templates |

## Getting Started

### 1. Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- An OpenAI API key

### 2. Clone & configure

```bash
# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env:
# - Set OPENAI_API_KEY
# - Set SECRET_KEY (random 32+ chars)
# - Set Google/GitHub OAuth credentials (optional)
```

### 3. Start everything with Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 4. Run database migrations

```bash
docker compose exec backend alembic upgrade head
```

### 5. Local development (without Docker)

**Backend:**
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
cp .env.example .env          # fill in values
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

> Make sure PostgreSQL is running locally and `DATABASE_URL` in `backend/.env` is correct.

## OAuth Setup (optional)

### Google
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add `http://localhost:8000/auth/google/callback` as authorized redirect URI
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`

### GitHub
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set Homepage URL to `http://localhost:5173`
4. Set Callback URL to `http://localhost:8000/auth/github/callback`
5. Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `backend/.env`

## Project Structure

```
AI Resume/
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/           # API client (auth, resumes, ai)
│   │   ├── components/    # Reusable UI + resume section components
│   │   ├── contexts/      # AuthContext
│   │   ├── pages/         # Route pages
│   │   └── types/         # TypeScript types
│   └── Dockerfile
├── backend/                # FastAPI
│   ├── app/
│   │   ├── api/routes/    # auth, users, resumes, ai
│   │   ├── core/          # config, database, security
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── services/      # ai_service, pdf_service
│   │   └── templates/pdf/ # Jinja2 HTML templates (3 themes)
│   ├── alembic/           # DB migrations
│   └── Dockerfile
└── docker-compose.yml
```

## API Reference

Interactive docs available at http://localhost:8000/docs

Key endpoints:
- `POST /auth/register` — Create account
- `POST /auth/login` — Get JWT tokens
- `GET /auth/google` — Start Google OAuth
- `GET /users/me` — Current user
- `GET/POST /resumes/` — List / create resumes
- `GET/PUT /resumes/{id}` — Get / update resume
- `PUT /resumes/{id}/sections/{sid}` — Update a section
- `GET /resumes/{id}/export?template=modern` — Download PDF
- `POST /ai/improve-section` — Stream AI section improvements
- `POST /ai/analyze/{id}` — Analyze resume
- `POST /ai/job-match` — Match resume to job description
- `POST /ai/coach/chat` — Chat with AI Career Coach (STT/TTS support)
- `POST /ai/coach/apply-section` — Apply AI-drafted sections to resume

## AI Voice Coach Module

The platform features a real-time AI Voice Coach ("Aura") designed to guide users through the resume-building process.

### Capabilities
- **Voice-Driven Profile Building**: Extract skills, projects, and experience through natural conversation.
- **Multilingual Support**: Auto-detects and responds in English, Hindi, or Hinglish.
- **Role Discovery**: Suggests optimal job roles (e.g., AI Intern, Data Analyst) based on extracted skills.
- **Auto-Fill Sections**: Automatically structures verbal input into professional ATS-friendly resume sections.
- **Job Tailoring**: Adjusts resume content to match specific job descriptions via the matcher engine.

### Tech Stack
- **STT (Speech-to-Text)**: Browser Web Speech API (Chrome optimized).
- **TTS (Text-to-Speech)**: Browser `speechSynthesis` API.
- **Brain**: OpenAI GPT-4o with tool-calling for structured data generation.
- **UI**: Floating action button with interactive chat overlay and real-time screen updates.

### Safety & Truthfulness
- **Strict Confirmation**: AI never saves changes without explicit user approval.
- **Fact-Only Generation**: AI is restricted to information provided by the user; it does not invent skills or metrics.
