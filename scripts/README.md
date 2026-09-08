# scripts/

## coverage-audit.mjs

Read-only Supabase audit: counts articles per region x country x category, to track
whether the category-specific scrape crons (`supabase/migrations/20260903140000_category_specific_scrape_crons.sql`)
are actually improving coverage. See the script's header comment for full background.

Run manually:

```
node scripts/coverage-audit.mjs
```

Writes a timestamped `.json` (raw rows) and `.txt` (human-readable summary) to
`logs/coverage-audit/` (gitignored).

### Why this runs locally, not as a Claude Code cloud routine

A cloud routine version of this was tried first (2026-09-04) but every run failed —
the cloud sandbox's egress proxy rejects outbound requests to arbitrary third-party
hosts like Supabase with `connect_rejected (organization policy)`, regardless of the
environment's "Network access" setting. That's an org-level network boundary, not
something configurable per-environment. Confirmed across 6 daily attempts
(2026-09-04 through 2026-09-08) plus a dedicated "full access" environment before
giving up on that approach and switching to local execution.

### Windows Task Scheduler setup

Registered as task `SnewwebCoverageAudit`, daily at 9:00 AM local time:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Program Files\nodejs\node.exe" `
  -Argument '"C:\Users\PCD8GXXXXXX\Desktop\nsewspace\scripts\coverage-audit.mjs"' `
  -WorkingDirectory "C:\Users\PCD8GXXXXXX\Desktop\nsewspace"
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "SnewwebCoverageAudit" -Action $action -Trigger $trigger -Settings $settings `
  -Description "Daily read-only Supabase coverage audit for snewweb.org."
```

**Gotcha that cost real time to debug:** `New-ScheduledTaskSettingsSet`'s defaults include
`DisallowStartIfOnBatteries = $true`. On a laptop running on battery, the task silently
"succeeds" (`LastTaskResult: 0`, `LastRunTime` advances) without ever actually launching
the process — no error, no output, nothing. Diagnosed by adding an unconditional
first-line tripwire file write to the script and confirming it never appeared even
though the identical command worked fine when run interactively. Always pass
`-AllowStartIfOnBatteries -DontStopIfGoingOnBatteries` explicitly.

Check status / re-run manually:

```powershell
Get-ScheduledTaskInfo -TaskName "SnewwebCoverageAudit"
schtasks /run /tn "SnewwebCoverageAudit"
```

Requires the task to run on this specific machine while logged in as this user
(`LogonType: InteractiveToken`) — it won't fire if the machine is off or the user isn't
logged in. There's no email/Slack notification wired up; check `logs/coverage-audit/`
for the latest `.txt` file, or ask Claude to read the latest one.
