@echo off
echo ==========================================
echo   PRO KEYS Dashboard - First Time Setup
echo ==========================================

echo.
echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Setup complete!
echo.
echo [3/3] Starting development server...
call npm run dev

pause
