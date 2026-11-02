# AI Resume Platform

A full-featured, AI-powered resume platform built with React + FastAPI + PostgreSQL + GPT-4.

## Features

<img width="1351" height="577" alt="image" src="https://github.com/user-attachments/assets/ffcfc0ad-5704-4c43-8f9e-56da05c3d4b3" />

- **Resume Builder** — Structured editor with AI "Improve with AI" buttons per section (streamed GPT-4 output)
- **Resume Analyzer** — AI scores your resume across sections and gives actionable feedback
- **Job Match** — Paste a job description, get a match score, keyword gaps, and specific rewrite suggestions
- **AI Voice Coach** — Interactive voice assistant ("Aura") that helps build profile, suggests roles, and auto-fills resume sections via voice commands.
- **PDF Export** — 3 professional templates (Modern, Classic, Minimal)
- **Auth** — Email/password + Google & GitHub OAuth, JWT sessions

## Tech Stack

<img width="1323" height="556" alt="image" src="https://github.com/user-attachments/assets/5ef6dc2d-3258-47cb-b762-39256150fc58" />

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL |
| Auth | JWT + OAuth2 (Google, GitHub) via Authlib |
| AI | OpenAI GPT-4o |
| PDF | WeasyPrint + Jinja2 HTML templates |



> Make sure PostgreSQL is running locally and `DATABASE_URL` in `backend/.env` is correct.

<img width="1312" height="586" alt="image" src="https://github.com/user-attachments/assets/9c04b223-a14b-49f6-ac07-84fcd8a3ba78" />

<img width="378" height="572" alt="image" src="https://github.com/user-attachments/assets/4cc72c12-e4c1-4e8a-9449-8513e5d2a6c0" />


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
<img width="1312" height="576" alt="image" src="https://github.com/user-attachments/assets/ca1437f6-5295-4509-9bb3-ecc624021faf" />



