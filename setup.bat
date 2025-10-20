@echo off
REM AutoCrowd Setup Script for Windows
REM This script sets up the entire AutoCrowd development environment

echo 🚀 Setting up AutoCrowd Development Environment
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)
echo [SUCCESS] Node.js is installed

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python 3.8+ is not installed. Please install Python and try again.
    exit /b 1
)
echo [SUCCESS] Python is installed

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed. Please install Git and try again.
    exit /b 1
)
echo [SUCCESS] Git is installed

echo [INFO] Installing dependencies...

REM Install root dependencies
echo [INFO] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    exit /b 1
)

REM Install frontend dependencies
echo [INFO] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    exit /b 1
)
cd ..

REM Install backend dependencies
echo [INFO] Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    exit /b 1
)
cd ..

REM Install contract dependencies
echo [INFO] Installing contract dependencies...
cd contracts
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install contract dependencies
    exit /b 1
)
cd ..

REM Install Python dependencies
echo [INFO] Installing Python dependencies...
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies
    exit /b 1
)

echo [SUCCESS] All dependencies installed successfully

REM Setup environment files
echo [INFO] Setting up environment files...

if not exist .env (
    copy env.example .env
    echo [WARNING] Created .env file from template. Please update with your values.
)

if not exist frontend\.env.local (
    copy frontend\env.example frontend\.env.local
    echo [WARNING] Created frontend\.env.local file from template. Please update with your values.
)

if not exist backend\.env (
    copy backend\env.example backend\.env
    echo [WARNING] Created backend\.env file from template. Please update with your values.
)

if not exist contracts\.env (
    copy contracts\env.example contracts\.env
    echo [WARNING] Created contracts\.env file from template. Please update with your values.
)

echo [SUCCESS] Environment files created

echo.
echo [SUCCESS] 🎉 AutoCrowd setup completed successfully!
echo.
echo Next steps:
echo 1. Update environment files with your configuration:
echo    - .env (root)
echo    - frontend\.env.local
echo    - backend\.env
echo    - contracts\.env
echo.
echo 2. Deploy contracts:
echo    npm run deploy:contracts
echo.
echo 3. Start development servers:
echo    npm run dev
echo.
echo 4. Start backend services:
echo    cd backend ^&^& npm run dev
echo.
echo Happy coding! 🚀

pause
