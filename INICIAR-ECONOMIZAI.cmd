@echo off
title Economizai - Servidor local
cd /d "%~dp0"
echo Iniciando o Economizai pela pasta oficial:
echo %CD%
echo.
npm run dev
