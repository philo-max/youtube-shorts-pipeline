@echo off
title YouTube Shorts Pipeline - Auto Video Generator
cd /d %~dp0
echo ===================================================
echo   YouTube Shorts Pipeline - Auto Video Generator
echo ===================================================
echo.
echo Running automated video generation pipeline...
echo.
node bin/pipeline.js
echo.
echo ===================================================
echo   Process completed! Check the logs above.
echo ===================================================
pause
