@echo off
setlocal
cd /d "%~dp0\.."
echo ============================================
echo       SMART CAMPUS - STARTING SERVER
echo ============================================
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 22.5 or newer from https://nodejs.org/
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -p "process.versions.node"') do set NODE_VERSION=%%v
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=5)?0:1)"
if errorlevel 1 (
  echo ERROR: This project requires Node.js 22.5 or newer. Found %NODE_VERSION%.
  echo Update Node.js from https://nodejs.org/ and run start.bat again.
  pause
  exit /b 1
)
if not exist "node_modules\express" (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
  )
)
echo.
echo Server will start at http://localhost:3000
echo Keep this window open while using the website.
echo Press Ctrl+C here to stop the server.
echo.
call npm start
pause
