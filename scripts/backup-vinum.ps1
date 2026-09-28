param(
  [string]$Destination
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
if (-not $Destination) {
  $Destination = Join-Path $repositoryRoot 'backups'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDirectory = Join-Path $Destination "vinum-$timestamp"
$databaseDump = Join-Path $backupDirectory 'vinum.dump'
$uploadsArchive = Join-Path $backupDirectory 'uploads.zip'

New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
Push-Location $repositoryRoot
try {
  docker compose up -d postgres
  docker compose exec -T postgres pg_dump -U vinum -d vinum --format=custom --file=/tmp/vinum.dump
  docker compose cp postgres:/tmp/vinum.dump $databaseDump
  docker compose exec -T postgres rm -f /tmp/vinum.dump

  $uploads = Join-Path $repositoryRoot 'backend\uploads'
  if (Test-Path $uploads) {
    Compress-Archive -Path (Join-Path $uploads '*') -DestinationPath $uploadsArchive -Force
  }

  $environmentFile = Join-Path $repositoryRoot '.env'
  if (Test-Path $environmentFile) {
    Copy-Item -LiteralPath $environmentFile -Destination (Join-Path $backupDirectory '.env')
  }
} finally {
  Pop-Location
}

Write-Host "Backup criado em: $backupDirectory"
Write-Host 'Copie essa pasta para um dispositivo externo ou armazenamento privado antes de formatar.'
