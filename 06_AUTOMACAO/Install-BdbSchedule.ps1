$ErrorActionPreference = 'Stop'
$bdbTaskName = 'Reise - Black BDB - Atualizacao diaria 08h'
$bdbScriptPath = Join-Path $PSScriptRoot 'Run-BdbHidden.py'
$bdbPythonPath = (Get-Command python.exe -ErrorAction Stop).Source
$bdbPythonWindowlessPath = Join-Path (Split-Path -Parent $bdbPythonPath) 'pythonw.exe'
if (-not (Test-Path -LiteralPath $bdbPythonWindowlessPath)) { throw 'pythonw.exe nao encontrado junto ao Python instalado.' }
$bdbUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
if ((Get-TimeZone).Id -ne 'E. South America Standard Time') {
    throw 'Configure o Windows para o fuso de Brasilia antes de instalar a tarefa das 8h.'
}
$bdbAction = New-ScheduledTaskAction -Execute $bdbPythonWindowlessPath -Argument ('"' + $bdbScriptPath + '"') -WorkingDirectory $PSScriptRoot
$bdbTrigger = New-ScheduledTaskTrigger -Daily -At '08:00'
$bdbPrincipal = New-ScheduledTaskPrincipal -UserId $bdbUser -LogonType Interactive -RunLevel Limited
$bdbSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 25) -RestartCount 2 -RestartInterval (New-TimeSpan -Minutes 10)
$bdbDescription = 'Atualiza o snapshot SSOT do Black BDB diariamente as 08:00 (Brasilia). Mes ate hoje e comparativo do ano anterior; heatmap mensal. Requer computador ligado e sessao conectada. Sem escrita na planilha CRM.'
Register-ScheduledTask -TaskName $bdbTaskName -Action $bdbAction -Trigger $bdbTrigger -Principal $bdbPrincipal -Settings $bdbSettings -Description $bdbDescription -Force | Out-Null
Get-ScheduledTask -TaskName $bdbTaskName | Select-Object TaskName, State
Get-ScheduledTaskInfo -TaskName $bdbTaskName | Select-Object NextRunTime, LastRunTime, LastTaskResult
