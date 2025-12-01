@echo off
chcp 65001 >nul
echo ========================================
echo 실시간 협업 문서 편집기 시작 중...
echo ========================================
echo.

REM 현재 디렉토리로 이동
cd /d "%~dp0"

REM Node.js 설치 확인
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo Node.js를 설치해주세요: https://nodejs.org/
    pause
    exit /b 1
)

REM .env 파일 확인 및 생성
if not exist ".env" (
    echo .env 파일이 없습니다. 생성 중...
    echo DATABASE_URL="file:./prisma/dev.db" > .env
    echo .env 파일이 생성되었습니다.
    echo.
)

REM node_modules 확인
if not exist "node_modules" (
    echo 의존성 패키지를 설치하는 중...
    call npm install
    if %errorlevel% neq 0 (
        echo [오류] 패키지 설치에 실패했습니다.
        pause
        exit /b 1
    )
    echo.
)

REM Prisma 클라이언트 생성
echo Prisma 클라이언트 생성 중...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [경고] Prisma 클라이언트 생성에 실패했습니다.
    echo.
)

REM 데이터베이스 마이그레이션 확인
if not exist "prisma\dev.db" (
    echo 데이터베이스를 초기화하는 중...
    call npx prisma migrate dev --name init
    if %errorlevel% neq 0 (
        echo [경고] 마이그레이션에 실패했습니다. db push를 시도합니다...
        call npx prisma db push
    )
    echo.
)

REM 서버 시작 (새 창에서 실행)
echo 서버를 시작하는 중...
echo 브라우저가 곧 자동으로 열립니다...
echo.
start "실시간 협업 문서 편집기 서버" cmd /k "npm run dev"

REM 서버가 시작될 때까지 대기 (서버 준비 확인)
echo 서버가 준비될 때까지 대기 중...
:wait_loop
timeout /t 2 /nobreak >nul
powershell -Command "(Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue).StatusCode" >nul 2>&1
if %errorlevel% neq 0 (
    echo 서버 준비 중...
    goto wait_loop
)

REM 브라우저 열기
echo 서버가 준비되었습니다!
echo 브라우저를 여는 중...
start http://localhost:3000

echo.
echo ========================================
echo 서버가 실행 중입니다.
echo 브라우저가 열렸습니다.
echo.
echo 서버를 중지하려면 서버 창을 닫으세요.
echo ========================================
echo.

