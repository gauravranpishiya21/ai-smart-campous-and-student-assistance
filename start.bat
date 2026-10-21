@echo off
chcp 65001 >nul
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
title CornerStone Smart Education ERP Launcher
cd /d "%~dp0"

echo ==============================================================
echo       CornerStone Smart Education ERP - Quick Launch
echo ==============================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python ^(3.10+^) and ensure "Add Python to PATH" is checked.
    echo.
    pause
    exit /b 1
)

:: 2. Check Backend Dependencies
echo [1/4] Checking Python dependencies...
python -c "import flask, flask_cors, flask_socketio, sqlalchemy" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Installing required packages...
    python -m pip install flask flask-cors flask-socketio flask-mail pyjwt sqlalchemy openpyxl reportlab pytest werkzeug python-dotenv
)
if %errorlevel% neq 0 (
    echo [WARNING] Some dependencies could not be installed automatically.
) else (
    echo [OK] Backend dependencies are verified.
)
echo.

:: 3. Check & Initialize Database if needed
echo [2/4] Checking SQLite database...
if not exist "%~dp0backend\student_system.db" (
    echo [INFO] Database file not found. Setting up schema and seed data...
    python "%~dp0backend\setup_db.py"
    python "%~dp0backend\seed_data.py"
    echo [OK] Database initialized successfully.
) else (
    echo [OK] Database exists and is ready.
)
echo.

:: 4. Start Backend (Flask API)
echo [3/4] Starting Backend API Server on http://localhost:5000 ...
start "CornerStone Backend (Flask API :5000)" cmd /k "chcp 65001 >nul && set PYTHONUTF8=1 && cd /d "%~dp0backend" && python app.py"

:: 5. Start Frontend (HTTP Server)
echo [4/4] Starting Frontend Web Server on http://localhost:3000 ...
start "CornerStone Frontend (Web Server :3000)" cmd /k "cd /d "%~dp0frontend" && python -m http.server 3000"

:: 6. Launch Browser
echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Launching web browser...
start http://localhost:3000

echo.
echo ==============================================================
echo   CornerStone Smart Education ERP is now running!
echo --------------------------------------------------------------
echo   * Frontend Web App:  http://localhost:3000
echo   * Direct Login:      http://localhost:3000/login.html
echo   * Backend REST API:  http://localhost:5000
echo --------------------------------------------------------------
echo   Default Demo Credentials:
echo   - Admin:    Mobile: 1234567890 ^| Password: admin123
echo   - Student:  Mobile: 9999999999 ^| Password: password123 (Medical: 8888888888)
echo   - Faculty:  Mobile: 9876543210 ^| Password: password123
echo   - HOD/Accounts/Librarian/Warden: 7020001002 / 7020001001 / 7020001004 / 7020001003 ^| staff123
echo --------------------------------------------------------------
echo   NOTE: Keep the Backend and Frontend command windows open.
echo   To shut down, close those windows or run stop.bat.
echo ==============================================================
echo.
pause
