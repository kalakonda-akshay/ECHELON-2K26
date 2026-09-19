@echo off
title TraceRoot AI - Local Launcher
echo ========================================================
echo   Starting TraceRoot AI (Backend + Frontend)
echo ========================================================

cd /d "%~dp0"

echo 1. Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "TraceRoot AI - FastAPI Backend (Port 8000)" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo 2. Starting Next.js Dev Server on http://localhost:3000 ...
start "TraceRoot AI - Next.js Frontend (Port 3000)" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo 3. Opening Browser at http://localhost:3000 ...
start http://localhost:3000

echo ========================================================
echo   TraceRoot AI is running locally!
echo   Frontend: http://localhost:3000
echo   Backend:  http://127.0.0.1:8000
echo ========================================================
