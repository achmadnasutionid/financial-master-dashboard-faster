# Redis Caching - Railway Setup Guide

## What is Redis Caching?

Redis caching dramatically improves your dashboard performance by:
- **Faster Load Times**: Dashboard loads from cache (milliseconds) instead of database (seconds)
- **Reduced Database Load**: Fewer queries = better performance
- **Auto-Invalidation**: Cache automatically clears when data changes

## Performance Impact

**Before Redis:**
- Dashboard API: ~500-800ms (database query time)
- Multiple page loads = Multiple slow queries

**After Redis:**
- First request: ~500-800ms (fetches from DB, stores in cache)
- Subsequent requests: ~10-50ms (serves from cache) = **10-80x faster!**
- Cache expires after 5 minutes or when data changes

## How to Set Up Redis on Railway

### Step 1: Add Redis Service

1. Go to your Railway project: https://railway.app/project/[your-project-id]
2. Click **"+ New"** button
3. Select **"Database"** → **"Add Redis"**
4. Railway will automatically provision a Redis instance

### Step 2: Link Redis to Your App

1. Click on your Redis service
2. Go to the **"Connect"** tab
3. Copy the **"Redis URL"** (looks like: `redis://default:password@host:port`)

### Step 3: Add Environment Variable

1. Click on your main app service (master-dashboard-faster)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add:
   - **Variable Name**: `REDIS_URL`
   - **Value**: Paste the Redis URL you copied

5. Click **"Add"**
6. Railway will automatically redeploy your app

### Step 4: Verify It's Working

1. Wait for deployment to complete
2. Open your dashboard
3. Open browser DevTools (F12) → Network tab
4. Refresh the dashboard
5. Check the `/api/dashboard-stats` request:
   - First load: Will show `"fromCache": false`
   - Second load (within 5 min): Will show `"fromCache": true` ✅

## Current Cached Endpoints

These endpoints now use Redis caching:

1. **Dashboard Stats API** (`/api/dashboard-stats`)
   - Caches: All invoices, quotations, expenses, products, planning
   - TTL: 5 minutes
   - Auto-invalidates: When any invoice/quotation/expense/tracker is created/updated/deleted

## Cache Invalidation

The cache automatically clears when you:
- ✅ Create a new invoice/quotation/expense/tracker
- ✅ Update an invoice/quotation/expense/tracker
- ✅ Delete an invoice/quotation/expense/tracker
- ✅ After 5 minutes (automatic expiry)

## Optional: Adjust Cache TTL

If you want to cache for longer or shorter, edit `lib/redis.ts`:

```typescript
// Current: 5 minutes (300 seconds)
await cache.set(cacheKeys.dashboardStats(), responseData, 300)

// Change to 10 minutes:
await cache.set(cacheKeys.dashboardStats(), responseData, 600)

// Change to 1 minute:
await cache.set(cacheKeys.dashboardStats(), responseData, 60)
```

## Troubleshooting

### Redis connection fails?
- The app will work fine without Redis (graceful fallback)
- Check Railway logs for Redis connection errors
- Verify `REDIS_URL` environment variable is set correctly

### Cache not updating?
- Cache auto-expires after 5 minutes
- Force fresh data by adding `?skipCache=true` to the API URL
- Example: `/api/dashboard-stats?skipCache=true`

### Want to clear all cache?
- Restart the Redis service in Railway (it will clear all data)
- Or deploy a one-time script to flush Redis

## Cost

- **Redis on Railway Hobby Plan**: Included in your plan
- **No additional cost** for small-medium traffic
- **Estimated usage**: <100MB memory for typical dashboard data

## Next Steps

Now that Redis is set up, you can optionally:
1. Add caching to other frequently-accessed API endpoints
2. Add session storage in Redis (for multi-user auth)
3. Add rate limiting using Redis
4. Add real-time features with Redis pub/sub

---

**Need help?** Check Railway docs: https://docs.railway.app/databases/redis
