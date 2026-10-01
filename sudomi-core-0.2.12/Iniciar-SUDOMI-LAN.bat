@echo off
setlocal
where.exe node >nul 2>&1
if not errorlevel 1 goto use_path_node
set "SUDOMI_NODE=C:\Users\endocer\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%SUDOMI_NODE%" (
  echo No encontre Node.js en esta PC.
  echo Instala Node.js o ejecuta este archivo en la PC donde se preparo SUDOMI.
  pause
  exit /b 1
)
"%SUDOMI_NODE%" "%~dp0lan-server.js"
goto stopped
:use_path_node
node "%~dp0lan-server.js"
:stopped
echo.
echo El servidor se detuvo. Presiona una tecla para cerrar esta ventana.
pause >nul
