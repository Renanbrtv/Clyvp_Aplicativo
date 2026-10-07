@echo off
cd /d "%~dp0"
node scripts\configurar-publicacao.mjs
if errorlevel 1 goto fim
node scripts\make-legal-docs.mjs
node scripts\check-release.mjs
:fim
pause
