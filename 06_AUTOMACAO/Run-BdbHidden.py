"""Run the Windows refresh without attaching a console to the logged-in session."""
from datetime import datetime, timezone
from pathlib import Path
import os
import subprocess
import sys

automation_dir = Path(__file__).resolve().parent
log_dir = automation_dir / "logs"
log_dir.mkdir(exist_ok=True)
power_shell = Path(os.environ["SystemRoot"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
command = [
    str(power_shell), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", str(automation_dir / "Refresh-Bdb.ps1"),
]
with (log_dir / "launcher.log").open("a", encoding="utf-8") as log:
    log.write(f"{datetime.now(timezone.utc).isoformat()} started\n")
    log.flush()
    try:
        result = subprocess.run(
            command, cwd=automation_dir, stdout=log, stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW, timeout=24 * 60,
        )
        log.write(f"{datetime.now(timezone.utc).isoformat()} exit={result.returncode}\n")
        sys.exit(result.returncode)
    except Exception as exc:
        log.write(f"{datetime.now(timezone.utc).isoformat()} failed: {exc}\n")
        sys.exit(1)
