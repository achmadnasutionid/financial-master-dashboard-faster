# Railway Deployment Guide

## 🚀 Quick Deploy

### 1. Create Railway Account
1. Go to https://railway.app
2. Click "Login" and connect your GitHub account
3. Verify your account (required for full trial access)

### 2. Create New Project
1. Click "New Project"
2. Select "Deploy PostgreSQL"
3. Wait for database to be ready (~30 seconds)

### 3. Get Database Connection String
1. Click on the PostgreSQL service
2. Go to "Variables" tab
3. Copy the `DATABASE_URL` value
4. It will look like: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

### 4. Add Your App
1. In the same project, click "New"
2. Select "GitHub Repo"
3. Choose `master-dashboard-faster` repository
4. Railway will auto-detect Next.js

### 5. Configure Environment Variables
Click on your web service → "Variables" tab → Add these:

```bash
# Database (use the PostgreSQL service variable reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

# Copy these from your Vercel .env if you have them:
GOOGLE_SHEETS_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=your-private-key
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
```

**Note:** Railway can reference other services with `${{Postgres.DATABASE_URL}}` syntax!

### 6. Deploy
1. Railway will automatically build and deploy
2. First deployment takes 3-5 minutes
3. Watch the build logs in real-time

### 7. Get Your URL
1. Go to "Settings" tab
2. Click "Generate Domain"
3. You'll get a URL like: `master-dashboard-faster.up.railway.app`

---

## 📊 Migration Checklist

### Before Migration:
- [x] Railway config created (`railway.toml`)
- [x] Package.json updated with correct scripts
- [ ] GitHub repo for `master-dashboard-faster` exists
- [ ] Railway account created and verified

### During Migration:
- [ ] PostgreSQL service created on Railway
- [ ] Database connection string copied
- [ ] Web service connected to GitHub
- [ ] Environment variables added
- [ ] First deployment successful
- [ ] Custom domain generated

### After Migration:
- [ ] Test creating a quotation
- [ ] Test navigation speed
- [ ] Test all CRUD operations
- [ ] Compare performance with Vercel version
- [ ] Decide which to keep

---

## 🔄 Data Migration (Optional)

If you want to migrate existing data from Neon to Railway PostgreSQL:

### Option A: Fresh Start (Recommended for Testing)
```bash
# Railway will automatically run migrations on first deploy
# Start with a clean database
```

### Option B: Migrate Existing Data
```bash
# 1. Export from Neon
pg_dump $NEON_DATABASE_URL > backup.sql

# 2. Import to Railway
psql $RAILWAY_DATABASE_URL < backup.sql
```

---

## 💰 Cost Monitoring

### Check Usage:
1. Railway Dashboard → "Usage"
2. Monitor daily/monthly costs
3. Set up billing alerts (optional)

### Expected Costs:
- **Trial:** $5 free credits (30 days)
- **After Trial:** ~$2-5/month for your app
  - PostgreSQL: ~$1-2
  - Web Service: ~$1-3

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Check build logs in Railway dashboard
# Common issues:
# - Missing environment variables
# - Prisma migration errors
# - Node version mismatch
```

### Database Connection Fails
```bash
# Verify variables are set:
# - DATABASE_URL should reference Postgres service
# - Format: ${{Postgres.DATABASE_URL}}
```

### App Won't Start
```bash
# Check if migrations ran:
# Railway runs: npx prisma migrate deploy
# Check logs for migration errors
```

---

## 🎯 Next Steps After Successful Deploy

1. **Test Performance:**
   - Open Railway URL
   - Navigate between pages
   - Compare speed with Vercel

2. **Load Test Data:**
   - Create some test quotations
   - Test all features work

3. **Performance Comparison:**
   - Time how long operations take
   - Note the difference in "feel"

4. **Make Decision:**
   - If faster → Keep Railway ($5/month)
   - If not much difference → Back to Vercel (free)

---

## 🔙 Rollback Plan

If Railway doesn't work out:
1. Keep using Vercel deployment (unchanged)
2. Delete Railway project (no charges after trial)
3. Apply Vercel optimizations instead

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- This project's issues: GitHub Issues

---

**Ready to deploy? Follow the steps above!** 🚀
