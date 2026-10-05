@echo off
start "Storyland Backend" cmd /k "cd /d C:\Users\white\Desktop\Storyland RF\backend && node server.js"
start "ngrok" cmd /k "ngrok http 3002"
