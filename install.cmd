@echo off
echo Installing JARVIS...
cd /d "F:\jarvis"
call npm install
echo.
echo Adding `jarvis` to PATH (needs admin for system-wide, else user PATH)...
setx PATH "%PATH%;F:\jarvis\bin" >nul
echo.
echo Done! Now:
echo   1. Restart cmd, then type:  jarvis
echo   2. Or:  npm start   (inside F:\jarvis)
echo   3. For AI brain install Ollama: https://ollama.com/download then: ollama pull llama3.1:8b
pause
