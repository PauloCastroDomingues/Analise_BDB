param()

$ErrorActionPreference = 'Stop'
$bdbWorkspace = Split-Path -Parent $PSScriptRoot
$bdbConfigPath = Join-Path $bdbWorkspace '04_APP_FRONT\src\config.js'
$bdbLogDirectory = Join-Path $PSScriptRoot 'logs'
New-Item -ItemType Directory -Path $bdbLogDirectory -Force | Out-Null
$bdbTimezone = [TimeZoneInfo]::FindSystemTimeZoneById('E. South America Standard Time')
$bdbNow = [TimeZoneInfo]::ConvertTimeFromUtc([DateTime]::UtcNow, $bdbTimezone)
$bdbEnd = $bdbNow.ToString('yyyy-MM-dd')
$bdbStart = $bdbNow.ToString('yyyy-MM-01')
$bdbMonthEnd = (Get-Date -Year $bdbNow.Year -Month $bdbNow.Month -Day 1).AddMonths(1).AddDays(-1).ToString('yyyy-MM-dd')
$bdbWindow = [ordered]@{
    start = $bdbStart
    end = $bdbEnd
    compareStart = ([DateTime]::ParseExact($bdbStart, 'yyyy-MM-dd', $null)).AddYears(-1).ToString('yyyy-MM-dd')
    compareEnd = ([DateTime]::ParseExact($bdbEnd, 'yyyy-MM-dd', $null)).AddYears(-1).ToString('yyyy-MM-dd')
}
$bdbRun = [ordered]@{
    startedAt = $bdbNow.ToString('yyyy-MM-ddTHH:mm:ss') + '-03:00'
    timezone = 'America/Sao_Paulo'
    status = 'running'
    window = $bdbWindow
    views = @()
    warnings = @()
}
($bdbRun | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath (Join-Path $bdbLogDirectory 'last-run.json') -Encoding UTF8

function Invoke-BdbRefresh {
    param([string]$View, [System.Collections.IDictionary]$Window)
    $bdbParams = @(('view=' + $View), 'refresh=1', 'force=1', ('_ts=' + [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()))
    foreach ($bdbPair in $Window.GetEnumerator()) {
        $bdbParams += $bdbPair.Key + '=' + [Uri]::EscapeDataString([string]$bdbPair.Value)
    }
    $bdbResponse = Invoke-RestMethod -Uri ($script:bdbEndpoint + '?' + ($bdbParams -join '&')) -TimeoutSec 600
    if (-not $bdbResponse.ok) { throw "Apps Script ($View): $($bdbResponse.error)" }
    if ($bdbResponse.refreshSkipped) { throw "Apps Script ($View) reaproveitou o snapshot em vez de atualizar." }
    return $bdbResponse
}

try {
    $bdbConfig = Get-Content -LiteralPath $bdbConfigPath -Raw -Encoding UTF8
    $script:bdbEndpoint = [regex]::Match($bdbConfig, "https://script\.google\.com/macros/s/[^']+/exec").Value
    if (-not $script:bdbEndpoint) { throw 'URL do Apps Script nao encontrada no config.js.' }
    # KPIs e detalhes usam mes ate hoje; o heatmap mantem a janela mensal.
    $bdbHeatmapWindow = [ordered]@{
        start = $bdbStart
        end = $bdbMonthEnd
        compareStart = $bdbWindow.compareStart
        compareEnd = ([DateTime]::ParseExact($bdbMonthEnd, 'yyyy-MM-dd', $null)).AddYears(-1).ToString('yyyy-MM-dd')
    }
    foreach ($bdbViewName in @('status', 'heatmap', 'targets', 'channels', 'products', 'quality', 'stock', 'growth', 'crm')) {
        $bdbRun.currentView = $bdbViewName
        try {
            $bdbViewWindow = if ($bdbViewName -eq 'heatmap') { $bdbHeatmapWindow } else { $bdbWindow }
            $bdbPayload = Invoke-BdbRefresh -View $bdbViewName -Window $bdbViewWindow
            $bdbRun.generatedAt = $bdbPayload.generatedAt
            $bdbRun.views += $bdbViewName
        } catch {
            if ($bdbViewName -eq 'status') { throw }
            $bdbRun.warnings += "$($bdbViewName): $($_.Exception.Message)"
        }
        ($bdbRun | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath (Join-Path $bdbLogDirectory 'last-run.json') -Encoding UTF8
    }
    $bdbRun.status = if ($bdbRun.warnings.Count) { 'partial' } else { 'success' }
} catch {
    $bdbRun.status = 'failed'
    $bdbRun.error = $_.Exception.Message
} finally {
    $bdbRun.finishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    $bdbJson = $bdbRun | ConvertTo-Json -Depth 8
    $bdbJson | Set-Content -LiteralPath (Join-Path $bdbLogDirectory 'last-run.json') -Encoding UTF8
    ($bdbRun | ConvertTo-Json -Depth 8 -Compress) | Add-Content -LiteralPath (Join-Path $bdbLogDirectory 'history.jsonl') -Encoding UTF8
    Write-Output $bdbJson
}
if ($bdbRun.status -eq 'failed') { exit 1 }
