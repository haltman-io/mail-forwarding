# Email Confirmations Cleanup Cronjob

This document describes the **periodic cleanup job** responsible for removing expired and obsolete records from the `email_confirmations` table.

This cronjob is **part of the application maintenance layer**, not the mail routing layer (Postfix). It exists to ensure database hygiene, security, and predictable behavior over time.

---

## Purpose

The `email_confirmations` table stores **temporary state** used during email confirmation workflows (for example: pending confirmations, one-time tokens, or short-lived validation steps).

These records **must not live forever**.

This cronjob ensures that:

* Expired confirmation tokens are removed
* Old confirmed/expired records do not accumulate
* The table remains small, predictable, and auditable
* No permanent routing or configuration data is ever touched

---

## What This Cronjob Cleans

Only the `email_confirmations` table is affected.

### Deletion Rules

The cleanup logic applies the following rules:

1. **Pending confirmations**

   * Status: `pending`
   * Condition: `expires_at < NOW(6)`
   * Action: **deleted immediately after expiration**

2. **Finalized confirmations**

   * Status: `confirmed` or `expired`
   * Condition: `created_at < NOW(6) - INTERVAL 7 DAY`
   * Action: **deleted after a 7-day retention window**

No other tables are accessed or modified.

---

## Script Location

The cleanup logic is implemented as a standalone shell script:

```
/usr/local/bin/cleanup_email_confirmations.sh
```

---

## Cleanup Script — Source Code

```bash
#!/usr/bin/env bash
set -euo pipefail

CNF_FILE="${1:-}"
if [[ -z "${CNF_FILE}" ]]; then
  echo "[ERR] Missing CNF file path argument."
  echo "Usage: $0 /path/to/db.cnf"
  exit 2
fi

if [[ ! -f "${CNF_FILE}" ]]; then
  echo "[ERR] CNF file not found: ${CNF_FILE}"
  exit 2
fi

LOG_FILE="/var/log/forward/cleanup_email_confirmations.log"
LOCK_FILE="/var/lock/cleanup_email_confirmations.lock"

mkdir -p "$(dirname "${LOG_FILE}")"

# Always log something, even if later steps fail
echo "[$(date -Is)] [INF] Cleanup script invoked (cnf=${CNF_FILE})" >> "${LOG_FILE}"

# Prevent overlapping runs
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date -Is)] [WRN] Another cleanup is running. Exiting." >> "${LOG_FILE}"
  exit 0
fi

SQL="$(cat <<'SQL'
DELETE FROM email_confirmations
WHERE (status = 'pending' AND expires_at < NOW(6))
   OR (status IN ('confirmed','expired') AND created_at < (NOW(6) - INTERVAL 7 DAY));
SQL
)"

# Run SQL
OUT="$(mysql --defaults-extra-file="${CNF_FILE}" --batch --raw --silent -e "${SQL}" 2>&1)" || {
  echo "[$(date -Is)] [ERR] mysql failed: ${OUT}" >> "${LOG_FILE}"
  exit 1
}

echo "[$(date -Is)] [INF] mysql output: ${OUT}" >> "${LOG_FILE}"
echo "[$(date -Is)] [INF] Cleanup done." >> "${LOG_FILE}"
```

---

## Database Configuration File

The script **does not embed credentials**.
Database access is provided via a MySQL client configuration file.

### File Location

```
/etc/haltman/forward-db.cnf
```

### File Content (example)

Replace values with **your own**:

```ini
[client]
host=127.0.0.1
user=mailuser
password=YOUR_PASSWORD_HERE
database=maildb
```

### Permissions (recommended)

```bash
sudo chown root:root /etc/haltman/forward-db.cnf
sudo chmod 600 /etc/haltman/forward-db.cnf
```

---

## Script Permissions

Make the script executable:

```bash
sudo chmod 755 /usr/local/bin/cleanup_email_confirmations.sh
```

---

## Manual Execution (Validation)

Before enabling the cronjob, **always test manually**.

```bash
sudo /usr/local/bin/cleanup_email_confirmations.sh /etc/haltman/forward-db.cnf
```

Check logs:

```bash
sudo tail -n 50 /var/log/forward/cleanup_email_confirmations.log
```

Expected behavior:

* Script logs invocation
* No overlapping execution
* SQL runs successfully
* Cleanup completion is logged

---

## Cron Configuration

Example cron entry (every 10 minutes):

```cron
*/10 * * * * /usr/local/bin/cleanup_email_confirmations.sh /etc/haltman/forward-db.cnf
```

### Notes

* Use **absolute paths**
* Do **not** rely on environment variables
* The script is safe to run repeatedly (idempotent by design)

---

