@echo off
REM 设置Playwright使用Microsoft Edge浏览器
set PLAYWRIGHT_BROWSER=msedge
set PLAYWRIGHT_CHANNEL=msedge
set PLAYWRIGHT_BROWSER_NAME=chromium

echo Playwright浏览器已设置为Microsoft Edge
echo 环境变量:
echo   PLAYWRIGHT_BROWSER=%PLAYWRIGHT_BROWSER%
echo   PLAYWRIGHT_CHANNEL=%PLAYWRIGHT_CHANNEL%
echo   PLAYWRIGHT_BROWSER_NAME=%PLAYWRIGHT_BROWSER_NAME%

REM 启动Claude Code
claude code