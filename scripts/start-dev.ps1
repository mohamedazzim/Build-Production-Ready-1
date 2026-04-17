param(
  [switch]$ForceRestart
)

$ErrorActionPreference = "Stop"

$repoRoot = Join-Path $PSScriptRoot ".."

function Test-PortOpen {
  param([int]$Port)

  $tcpClient = New-Object System.Net.Sockets.TcpClient
  try {
    $result = $tcpClient.BeginConnect("127.0.0.1", $Port, $null, $null)
    $connected = $result.AsyncWaitHandle.WaitOne(250)
    if (-not $connected) {
      return $false
    }

    $tcpClient.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $tcpClient.Close()
  }
}

function Stop-ProcessOnPort {
  param(
    [int]$Port,
    [string]$ServiceName
  )

  $listeners = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if (-not $listeners) {
    return
  }

  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $pids) {
    if ($processId -eq $PID) {
      continue
    }

    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Host "Stopped $ServiceName process on port $Port (PID $processId)."
    } catch {
      Write-Host "Could not stop PID $processId on port ${Port}: $($_.Exception.Message)"
    }
  }
}

if ($ForceRestart) {
  Write-Host "Force restart enabled. Stopping existing processes on ports 5000 and 5173..."
  Stop-ProcessOnPort -Port 5000 -ServiceName "API"
  Stop-ProcessOnPort -Port 5173 -ServiceName "frontend"
}

if (Test-PortOpen -Port 5000) {
  Write-Host "API appears to be already running on port 5000. Skipping backend start."
} else {
  Write-Host "Starting API server in a new PowerShell window..."
  Start-Process -FilePath "powershell" -WorkingDirectory $repoRoot -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "pnpm --filter ./artifacts/api-server run dev"
  )
}

if (Test-PortOpen -Port 5173) {
  Write-Host "Frontend appears to be already running on port 5173. Skipping frontend start."
} else {
  Write-Host "Starting frontend in a new PowerShell window..."
  Start-Process -FilePath "powershell" -WorkingDirectory $repoRoot -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", "pnpm --filter ./artifacts/intake-app run dev"
  )
}

Write-Host "Start sequence complete."
