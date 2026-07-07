# Dispara os jobs agendados do Lexia localmente (Windows / app rodando no PC).
# Lê JOBS_TOKEN do .env e chama o endpoint via localhost. O app precisa estar
# no ar (npm run start / npm run dev) na hora agendada.
#
# Uso:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\jobs-local.ps1 relatorio-diario
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\jobs-local.ps1 notificacoes
param(
  [string]$Job = "relatorio-diario",
  [string]$BaseUrl = "http://localhost:3000"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { Write-Output "FALHA: .env não encontrado em $envFile"; exit 1 }

$line = Get-Content $envFile | Where-Object { $_ -match '^\s*JOBS_TOKEN\s*=' } | Select-Object -First 1
$token = $line -replace '^\s*JOBS_TOKEN\s*=\s*', '' -replace '^"|"$', '' -replace "^'|'$", ''
if (-not $token) { Write-Output "FALHA: JOBS_TOKEN não definido no .env"; exit 1 }

try {
  $r = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/jobs/$Job" -Headers @{ "X-Job-Token" = $token } -TimeoutSec 120
  Write-Output ("OK {0}: {1}" -f $Job, ($r | ConvertTo-Json -Compress))
} catch {
  Write-Output ("FALHA {0}: {1}" -f $Job, $_.Exception.Message)
  exit 1
}
