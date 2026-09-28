param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = Split-Path $PSScriptRoot -Parent
$resolvedBackup = Resolve-Path -LiteralPath $BackupDirectory
$databaseDump = Join-Path $resolvedBackup 'vinum.dump'

if (-not (Test-Path -LiteralPath $databaseDump)) {
  throw "O arquivo vinum.dump não foi encontrado em $resolvedBackup."
}

Push-Location $repositoryRoot
try {
  if (-not (Test-Path '.env')) {
    $savedEnvironment = Join-Path $resolvedBackup '.env'
    if (Test-Path -LiteralPath $savedEnvironment) {
      Copy-Item -LiteralPath $savedEnvironment -Destination '.env'
    } else {
      throw 'Crie o arquivo .env antes de restaurar o banco.'
    }
  }

  docker compose up -d postgres
  docker compose cp $databaseDump postgres:/tmp/vinum-restore.dump
  docker compose exec -T postgres pg_restore -U vinum -d vinum --clean --if-exists --no-owner /tmp/vinum-restore.dump
  docker compose exec -T postgres rm -f /tmp/vinum-restore.dump

  $uploadsArchive = Join-Path $resolvedBackup 'uploads.zip'
  if (Test-Path -LiteralPath $uploadsArchive) {
    $uploads = Join-Path $repositoryRoot 'backend\uploads'
    New-Item -ItemType Directory -Path $uploads -Force | Out-Null
    Expand-Archive -LiteralPath $uploadsArchive -DestinationPath $uploads -Force
  }

  npm install
  npm run prisma:generate
  npm run prisma:deploy
  docker compose up -d
} finally {
  Pop-Location
}

Write-Host 'VINUM restaurado. Confirme a aplicação, a API e o pgAdmin antes de remover o backup.'
