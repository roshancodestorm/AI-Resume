@echo off
title AI Resume Platform Launcher
echo ========================================================
echo Starting AI Resume Platform...
echo ========================================================

cd /d "%~dp0backend"
start "AI Resume - Backend API" cmd /k ".venv\Scripts\python.exe -m uvicorn app.main:app --port 8000 --reload"

cd /d "%~dp0frontend"
start "AI Resume - Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo Both servers have been launched!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - Swagger Docs: http://localhost:8000/docs
echo ========================================================
