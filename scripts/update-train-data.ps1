# Run on Windows IIS: fetch missing official photo assets, then atomically replace catalogue JSON.
# Usage: powershell.exe -NoProfile -File C:\RailStudioTools\update-train-data.ps1
param(
  [string]$SiteName = 'Default Web Site',
  [string]$DataUrl = 'https://raw.githubusercontent.com/LihaoDing7836/RailStudio/main/dist/data/trains.json'
)
$ErrorActionPreference = 'Stop'
Import-Module WebAdministration
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$siteRoot = [Environment]::ExpandEnvironmentVariables((Get-Item "IIS:\Sites\$SiteName").physicalPath)
$destination = Join-Path $siteRoot 'data\trains.json'
if (!(Test-Path $destination)) { throw 'Deploy the new homepage version first; no existing catalogue was found.' }
$temporary = $destination + '.' + [guid]::NewGuid().ToString('N') + '.tmp'
try {
  & curl.exe --fail --location --retry 3 --max-time 180 --output $temporary $DataUrl
  if ($LASTEXITCODE -ne 0) { throw 'Download failed. Existing catalogue is unchanged.' }
  $payload = Get-Content -LiteralPath $temporary -Raw -Encoding UTF8 | ConvertFrom-Json
  if (!$payload.updated -or $payload.trains.Count -lt 1000) { throw 'Invalid catalogue; existing file is unchanged.' }
  if (@($payload.trains | Where-Object { !$_.id -or !$_.sku -or $_.brand -notin @('TOMIX','KATO') }).Count -gt 0) { throw 'Invalid product record.' }
  $old = Get-Content -LiteralPath $destination -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($payload.trains.Count -lt $old.trains.Count * 0.8) { throw 'Unexpected drop in product count.' }
  # New catalogue snapshots may reference locally served official photographs.
  # Fetch every required asset before publishing the new JSON snapshot.
  $imageRoot = Join-Path $siteRoot 'train-images'
  New-Item -ItemType Directory -Force -Path $imageRoot | Out-Null
  $assetBase = $DataUrl -replace '/data/trains\.json$', '/'
  if ($assetBase -eq $DataUrl) { throw 'DataUrl must end with /data/trains.json for image synchronization.' }
  $images = @($payload.trains | ForEach-Object { $_.image_url; $_.image_gallery } | Where-Object { $_ -like 'train-images/*' } | Sort-Object -Unique)
  foreach ($relative in $images) {
    if ($relative -notmatch '^train-images/[a-f0-9]{24}\.(jpg|jpeg|png|gif|webp)$') { throw 'Invalid photo path.' }
    $imagePath = Join-Path $siteRoot $relative
    if (!(Test-Path $imagePath)) {
      $imageTemp = $imagePath + '.tmp'
      try {
        & curl.exe --fail --location --retry 3 --max-time 90 --output $imageTemp ($assetBase + $relative)
        if ($LASTEXITCODE -ne 0 -or (Get-Item $imageTemp).Length -lt 32) { throw 'Photo download failed. Catalogue is unchanged.' }
        Move-Item -LiteralPath $imageTemp -Destination $imagePath
      } finally {
        if (Test-Path $imageTemp) { Remove-Item -LiteralPath $imageTemp -Force }
      }
    }
  }
  if ((Get-FileHash $temporary).Hash -ne (Get-FileHash $destination).Hash) {
    # Put the backup outside the served directory, beside the deployment root.
    $backup = Join-Path (Split-Path $siteRoot -Parent) 'trains.previous.json'
    [IO.File]::Replace($temporary, $destination, $backup, $true)
  }
  Write-Host "Catalogue ready: $($payload.trains.Count) sets; source date $($payload.updated)"
} finally {
  if (Test-Path $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
