# Production backup and ProductionTracker rebuild

## Internal backup – save to DB each night (easiest)

Backups are stored **inside your database** in a `Backup` table. No GitHub secrets, no S3, no files to move.

1. **Run the new migration** (adds `Backup` table):
   ```bash
   npx prisma migrate deploy
   ```

2. **Call the backup API each night** – use a free cron service (e.g. [cron-job.org](https://cron-job.org)):
   - **URL:** `https://<your-app>.railway.app/api/backup`
   - **Method:** POST
   - **Schedule:** daily (e.g. 2:00 AM).
   - Save. Each night the app will create a new backup row in your DB.

3. **List or download backups:**
   - List: `GET https://<your-app>.railway.app/api/backup`
   - Download latest: `GET https://<your-app>.railway.app/api/backup?download=latest`

Backups stay in the same database; if the DB is lost you lose them too. For extra safety, occasionally download one via `?download=latest` and store it elsewhere. You can delete old backup rows from the `Backup` table if it gets large (e.g. keep last 30).

---

## Automated daily backup (GitHub Actions)

**GitHub Actions** runs a backup every day at 2:00 UTC and keeps it as an artifact for 90 days. No Railway Pro or S3 required.

1. In your GitHub repo: **Settings → Secrets and variables → Actions**
2. Add a secret: **`DATABASE_URL`** = your production PostgreSQL URL (e.g. from Railway).
3. Optionally add **`DIRECT_URL`** if your app uses it for Prisma.
4. Push the branch that contains `.github/workflows/backup-db.yml`. The workflow will run on the schedule and on every push you can trigger it manually via **Actions → Backup production DB → Run workflow**.

Backups appear under **Actions → run → Artifacts** (download the `db-backup-*` zip).

---

## Manual backup (run when needed)

After a mistaken production cleanup, use these steps to **back up** data and **rebuild** ProductionTracker.

## 1. Back up the database (do this first)

Backups are written to `./backups/` (gitignored). You must set `BACKUP_PRODUCTION=1` to confirm.

```bash
# Full backup: JSON export + pg_dump (if PostgreSQL and pg_dump in PATH)
BACKUP_PRODUCTION=1 node backup-production-db.mjs

# Or JSON-only (no pg_dump required)
BACKUP_PRODUCTION=1 node backup-production-db.mjs --json-only
```

Or via npm:

```bash
BACKUP_PRODUCTION=1 npm run db:backup
BACKUP_PRODUCTION=1 npm run db:backup:json
```

- **JSON export**: one file per table under `backups/json-<timestamp>/`, plus `_summary.json`.
- **pg_dump**: `backups/dump-<timestamp>.sql` (only when `DATABASE_URL` is PostgreSQL and `pg_dump` is available).

Copy the `backups/` folder somewhere safe (e.g. off the server).

### Optional: upload backups to S3

If you use AWS S3, set these env vars when running the backup script (or in Railway/GitHub secrets if you run backup there):

- `BACKUP_S3_BUCKET` – bucket name  
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (or default region)  
- Optional: `BACKUP_S3_PREFIX` (default `db-backups`)

Install the SDK: `npm install @aws-sdk/client-s3`. Backups will be uploaded to `s3://<bucket>/<prefix>/YYYY-MM-DD/`.

## 2. Rebuild ProductionTracker from existing data

This repopulates `ProductionTracker` from:

- Expenses (projectName, productionDate, amounts)
- Invoices (billTo, productionDate, totalAmount, invoiceId)
- Quotations (billTo, productionDate, totalAmount)
- Paragon tickets (billTo, productionDate, totalAmount)
- Erha tickets (billTo, productionDate, totalAmount)

Run against the **database you want to fix** (e.g. production, using `.env`):

```bash
node rebuild-production-trackers.mjs
```

Or:

```bash
npm run db:rebuild-trackers
```

- Creates or updates one tracker per project name (by `projectName` / `billTo`).
- Links trackers to expenses by setting `expenseId` where the tracker matches the expense’s `projectName`.

## Avoiding future mistakes

- **Tests**: Always use a dedicated test DB. `tests/setup.ts` refuses to run if `DATABASE_URL` does not look like a test DB (e.g. must contain `test` or set `USE_TEST_DATABASE=true`).
- **Cleanup scripts**: `cleanup-production-test-data.mjs` and `cleanup-tracker-leaks.mjs` delete only records that match test patterns (e.g. names containing "Test", "TEST-"). Never run a full truncate or schema reset against production.
- **Backups**: Run `db:backup` regularly (e.g. before any manual DB script or deploy) so you can restore from `backups/` if needed.
