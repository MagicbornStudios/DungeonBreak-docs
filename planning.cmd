@echo off
setlocal
set ROOT=%~dp0
set CLI=%ROOT%packages\planning-mcp\dist\cli.js
if not exist "%CLI%" (
  echo Planning CLI is not built. Run: pnpm --dir packages/planning-mcp run build
  exit /b 1
)
node "%CLI%" %*
endlocal
