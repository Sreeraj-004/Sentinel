
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Script


SAMPLE_SCRIPTS = [
    {
        "name": "cpu_diagnostics.ps1",
        "language": "powershell",
        "description": "Identify CPU-intensive processes and collect CPU utilization diagnostics.",
        "when_to_use": (
            "Use when CPU utilization exceeds the configured threshold "
            "or when a server experiences sustained CPU pressure."
        ),
        "why_to_use": (
            "Identify processes consuming CPU resources and provide "
            "diagnostic information before selecting a remediation action."
        ),
        "content": r'''$ErrorActionPreference = "Stop"

Write-Output "Collecting CPU utilization..."

try {
    $CpuSamples = Get-CimInstance `
        -ClassName Win32_PerfFormattedData_PerfProc_Process |
        Where-Object {
            $_.Name -notin @("_Total", "Idle")
        } |
        Sort-Object PercentProcessorTime -Descending |
        Select-Object -First 10 Name, IDProcess, PercentProcessorTime

    $CpuUsage = Get-CimInstance Win32_Processor |
        Measure-Object -Property LoadPercentage -Average

    Write-Output "CPU Utilization: $($CpuUsage.Average)%"
    Write-Output "Top CPU-consuming processes:"

    $CpuSamples | Format-Table -AutoSize
}
catch {
    Write-Error "CPU diagnostics failed: $($_.Exception.Message)"
    exit 1
}
''',
    },
    {
        "name": "memory_diagnostics.ps1",
        "language": "powershell",
        "description": "Identify memory utilization and processes consuming the most RAM.",
        "when_to_use": (
            "Use when memory utilization exceeds the configured threshold "
            "or when available physical memory becomes critically low."
        ),
        "why_to_use": (
            "Identify memory-intensive processes and collect memory "
            "statistics to support controlled memory optimization."
        ),
        "content": r'''$ErrorActionPreference = "Stop"

try {
    $OS = Get-CimInstance Win32_OperatingSystem

    $TotalMemoryGB = [math]::Round(
        $OS.TotalVisibleMemorySize / 1MB, 2
    )

    $FreeMemoryGB = [math]::Round(
        $OS.FreePhysicalMemory / 1MB, 2
    )

    $UsedMemoryGB = [math]::Round(
        $TotalMemoryGB - $FreeMemoryGB, 2
    )

    $MemoryUsage = if ($TotalMemoryGB -gt 0) {
        [math]::Round(
            ($UsedMemoryGB / $TotalMemoryGB) * 100, 2
        )
    } else {
        0
    }

    Write-Output "Total Memory: $TotalMemoryGB GB"
    Write-Output "Used Memory: $UsedMemoryGB GB"
    Write-Output "Available Memory: $FreeMemoryGB GB"
    Write-Output "Memory Utilization: $MemoryUsage%"

    Write-Output "Top memory-consuming processes:"

    Get-Process |
        Sort-Object WorkingSet64 -Descending |
        Select-Object -First 10 ProcessName, Id,
            @{
                Name = "MemoryMB"
                Expression = {
                    [math]::Round($_.WorkingSet64 / 1MB, 2)
                }
            } |
        Format-Table -AutoSize
}
catch {
    Write-Error "Memory diagnostics failed: $($_.Exception.Message)"
    exit 1
}
''',
    },
    {
        "name": "disk_cleanup.ps1",
        "language": "powershell",
        "description": "Remove expired temporary files from an approved cleanup directory.",
        "when_to_use": (
            "Use when disk utilization exceeds the configured threshold "
            "and an approved temporary directory contains files older "
            "than the configured retention period."
        ),
        "why_to_use": (
            "Recover disk capacity, reduce storage pressure, and help "
            "prevent disk exhaustion incidents."
        ),
        "content": r'''[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$TargetPath,

    [ValidateRange(1, 365)]
    [int]$RetentionDays = 7
)

$ErrorActionPreference = "Stop"

try {
    $ResolvedPath = (Resolve-Path -LiteralPath $TargetPath).Path
    $DriveRoot = [System.IO.Path]::GetPathRoot($ResolvedPath)

    if ($ResolvedPath.TrimEnd('\') -eq $DriveRoot.TrimEnd('\')) {
        throw "Drive root cannot be used as a cleanup directory."
    }

    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)

    $Files = Get-ChildItem `
        -LiteralPath $ResolvedPath `
        -File `
        -Recurse `
        -Force `
        -ErrorAction SilentlyContinue |
        Where-Object {
            $_.LastWriteTime -lt $CutoffDate
        }

    $DeletedCount = 0
    $FailedCount = 0
    $RecoveredBytes = [long]0

    foreach ($File in $Files) {
        if ($PSCmdlet.ShouldProcess(
            $File.FullName,
            "Delete expired temporary file"
        )) {
            try {
                $FileSize = $File.Length

                Remove-Item `
                    -LiteralPath $File.FullName `
                    -Force `
                    -ErrorAction Stop

                $DeletedCount++
                $RecoveredBytes += $FileSize
            }
            catch {
                $FailedCount++
                Write-Warning "Unable to delete $($File.FullName): $($_.Exception.Message)"
            }
        }
    }

    $RecoveredMB = [math]::Round(
        $RecoveredBytes / 1MB, 2
    )

    Write-Output "Cleanup completed."
    Write-Output "Target: $ResolvedPath"
    Write-Output "Deleted files: $DeletedCount"
    Write-Output "Failed files: $FailedCount"
    Write-Output "Recovered space: $RecoveredMB MB"
}
catch {
    Write-Error "Disk cleanup failed: $($_.Exception.Message)"
    exit 1
}
''',
    },
    {
        "name": "service_recovery.ps1",
        "language": "powershell",
        "description": "Check a Windows service and optionally start it when stopped.",
        "when_to_use": (
            "Use when a monitored Windows service is reported as stopped "
            "or when an application experiences service unavailability."
        ),
        "why_to_use": (
            "Restore an approved stopped service and verify its resulting "
            "state to reduce service-related incidents."
        ),
        "content": r'''[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ServiceName,

    [switch]$Restart
)

$ErrorActionPreference = "Stop"

try {
    $Service = Get-Service -Name $ServiceName -ErrorAction Stop

    Write-Output "Service: $($Service.Name)"
    Write-Output "Initial Status: $($Service.Status)"

    if ($Service.Status -eq "Stopped") {
        if ($Restart) {
            if ($PSCmdlet.ShouldProcess(
                $ServiceName,
                "Start stopped service"
            )) {
                Start-Service -Name $ServiceName -ErrorAction Stop

                $Service = Get-Service -Name $ServiceName
                $Service.WaitForStatus(
                    "Running",
                    [TimeSpan]::FromSeconds(30)
                )

                $Service = Get-Service -Name $ServiceName
                Write-Output "Service started successfully."
            }
        }
        else {
            Write-Warning "Service is stopped. Pass -Restart to start it."
        }
    }
    else {
        Write-Output "Service is already running."
    }

    $Service = Get-Service -Name $ServiceName

    Write-Output "Final Status: $($Service.Status)"
}
catch {
    Write-Error "Service recovery failed: $($_.Exception.Message)"
    exit 1
}
''',
    },
    {
        "name": "health_check.py",
        "language": "python",
        "description": "Collect CPU, memory, disk and process health metrics.",
        "when_to_use": (
            "Use during scheduled health checks, when resource utilization "
            "approaches configured thresholds, or when investigating "
            "infrastructure performance degradation."
        ),
        "why_to_use": (
            "Collect a consolidated resource health snapshot to support "
            "early detection, analysis, and script selection."
        ),
        "content": '''import json
import psutil


def collect_health_metrics():
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")

    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "memory": {
            "total_gb": round(memory.total / (1024 ** 3), 2),
            "available_gb": round(memory.available / (1024 ** 3), 2),
            "used_percent": memory.percent,
        },
        "disk": {
            "total_gb": round(disk.total / (1024 ** 3), 2),
            "free_gb": round(disk.free / (1024 ** 3), 2),
            "used_percent": disk.percent,
        },
    }


if __name__ == "__main__":
    print(json.dumps(collect_health_metrics(), indent=4))
''',
    },
]


def seed_scripts(db: Session) -> None:
    for script_data in SAMPLE_SCRIPTS:
        existing_script = db.scalar(
            select(Script).where(
                Script.name == script_data["name"]
            )
        )

        if existing_script is None:
            db.add(Script(**script_data))

    db.commit()
