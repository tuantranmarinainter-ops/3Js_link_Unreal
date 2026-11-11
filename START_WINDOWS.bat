@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 server.py
) else (
  python server.py
)
echo.
echo If Python was not found, install Python 3.9+ from python.org and enable Add to PATH.
pause
