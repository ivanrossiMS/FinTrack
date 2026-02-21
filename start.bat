@echo off
cd /d "%~dp0"
echo ==========================================
echo        Iniciando Finance+ App
echo ==========================================
echo Diretorio atual: %CD%

echo.
echo 1. Verificando dependencias...
if not exist "node_modules" (
    echo Dependencias nao encontradas. Instalando...
    call npm install
) else (
    echo Dependencias ja instaladas.
)

echo.
echo 2. Iniciando servidor...
echo O navegador deve abrir em breve, ou acesse http://localhost:5173
echo.

call npm run dev
pause
