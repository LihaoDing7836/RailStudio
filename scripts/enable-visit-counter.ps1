# Run once in an elevated Windows Server PowerShell, after deploying dist.
param([string]$SiteName = 'Default Web Site')
$ErrorActionPreference = 'Stop'
Import-Module ServerManager
$result = Install-WindowsFeature Web-Asp-Net45
if (-not $result.Success) { throw 'ASP.NET installation failed' }
Import-Module WebAdministration
$site = Get-Item "IIS:\Sites\$SiteName"
$siteRoot = [Environment]::ExpandEnvironmentVariables($site.physicalPath)
if (-not (Test-Path (Join-Path $siteRoot 'api\visits.ashx'))) { throw 'Deploy the latest complete dist folder first.' }
# A dedicated pool avoids changing the settings of other sites.
$poolName = 'ZhenxingRail'
if (-not (Test-Path "IIS:\AppPools\$poolName")) { New-WebAppPool -Name $poolName | Out-Null }
Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion -Value 'v4.0'
Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedPipelineMode -Value 'Integrated'
Set-ItemProperty "IIS:\AppPools\$poolName" -Name processModel.identityType -Value 4
$statsFolder = Join-Path $env:ProgramData 'ZhenxingRail\Statistics'
New-Item -ItemType Directory -Path $statsFolder -Force | Out-Null
$counterFile = Join-Path $statsFolder 'visits.txt'
if (-not (Test-Path $counterFile)) { [IO.File]::WriteAllText($counterFile, "0`r`n") }
& icacls.exe $statsFolder /grant "IIS AppPool\${poolName}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to grant counter write permission' }
& icacls.exe $siteRoot /grant "IIS AppPool\${poolName}:(OI)(CI)RX" /T | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Failed to grant website read permission' }
Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $poolName
# Do not reset the count during future deployments or repeat setup.
Write-Host "Visit counter enabled. Persistent data: $statsFolder" -ForegroundColor Green
Write-Host 'Open the public website to verify the footer counter. Normal refresh adds one page view.'
if ($result.RestartNeeded -eq 'Yes') { Write-Host 'Windows requires a restart to finish installing ASP.NET.' }
