# 🚀 AutoCrowd FREE Services Deployment Guide

This guide will help you deploy AutoCrowd using completely FREE services for a production-ready setup.

## 📋 Overview

**Total Cost: $0/month** (within free tiers)

### Free Services Used:
- ✅ **Vercel** - Frontend + Backend hosting
- ✅ **Supabase** - PostgreSQL database
- ✅ **Upstash** - Redis caching
- ✅ **Alchemy/Infura** - Ethereum RPC (free tier)
- ✅ **Blockscout** - Blockchain explorer (free)

## 🛠️ Step-by-Step Setup

### Step 1: Prerequisites

1. **Node.js 18+** installed
2. **Git** installed
3. **Vercel account** (free)
4. **Supabase account** (free)
5. **Upstash account** (free)

### Step 2: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/SairajMN/AutoCrowd.git
cd AutoCrowd

# Make setup script executable (Linux/Mac)
chmod +x setup-free-services.sh

# Run automated setup
./setup-free-services.sh
```

### Step 3: Manual Setup (if script fails)

#### 3.1 Setup Supabase (Free PostgreSQL)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to **Settings > Database**
4. Copy the **Connection string** (it looks like: `postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres`)
5. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres
   ```

#### 3.2 Setup Upstash Redis (Free)

1. Go to [console.upstash.com](https://console.upstash.com) and sign up
2. Create a **Redis database**
3. Copy the **REDIS URL** (starts with `rediss://`)
4. Update `backend/.env`:
   ```env
   REDIS_URL=rediss://:[YOUR_PASSWORD]@[YOUR_ENDPOINT]:6379
   ```

#### 3.3 Setup Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## 🔧 Environment Configuration

### Backend (.env) - FREE Services

```env
# Vercel + Free Services Configuration

# Server Configuration
PORT=8000
NODE_ENV=production

# Blockchain Configuration (Free Tier)
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/demo
PRIVATE_KEY=demo_private_key_for_read_only
CHAIN_ID=11155111

# Contract Addresses
CAMPAIGN_FACTORY_ADDRESS=0xF4086e98642d8572E451E5D4A3dff3B0D451143d
AI_VERIFICATION_HANDLER_ADDRESS=0x4C887cd7dcFe9725D816efab0F5061317E590B57
PYUSD_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9

# AI/ASI Configuration (Demo Mode)
ASI_AGENT_ENDPOINT=https://api.asi.one
ASI_API_KEY=demo_asi_key
METTA_KNOWLEDGE_GRAPH_URL=https://metta.asi.one
AGENT_VERSE_URL=https://agentverse.asi.one

# FREE Database Configuration
# Supabase PostgreSQL (Free Tier)
DATABASE_URL=postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres

# Upstash Redis (Free Tier)
REDIS_URL=rediss://:[YOUR_PASSWORD]@[YOUR_ENDPOINT]:6379

# Security (Generate random strings for production)
JWT_SECRET=autocrowd_jwt_secret_min_32_chars_for_free_tier
ENCRYPTION_KEY=autocrowd_encryption_key_32_chars_free

# Monitoring & Logging (Free Tier)
LOG_LEVEL=info
SENTRY_DSN=

# External APIs (Free Tier)
BLOCKSCOUT_API_URL=https://eth-sepolia.blockscout.com/api/v2
BLOCKSCOUT_API_KEY=

# AI Verification Settings (Conservative for free tier)
VERIFICATION_TIMEOUT=60000
MAX_RETRY_ATTEMPTS=2
CONFIDENCE_THRESHOLD=0.7

# CORS for Vercel deployment
CORS_ORIGIN=https://autocrowd.vercel.app
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=50

# Health Checks
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=false
```

### Frontend (.env.local) - FREE Services

```env
# Vercel + Free Services Frontend Configuration
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/demo
NEXT_PUBLIC_BLOCK_EXPLORER=https://eth-sepolia.blockscout.com
NEXT_PUBLIC_CAMPAIGN_FACTORY_ADDRESS=0xF4086e98642d8572E451E5D4A3dff3B0D451143d
NEXT_PUBLIC_PYUSD_CONTRACT_ADDRESS=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9
NEXT_PUBLIC_BLOCKSCOUT_API_URL=https://eth-sepolia.blockscout.com/api/v2
NEXT_PUBLIC_API_URL=https://autocrowd.vercel.app/api

# Free Analytics (Vercel Analytics)
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_VERCEL_ANALYTICS=true

# Feature Flags (Conservative for free tier)
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=false
NEXT_PUBLIC_MAINTENANCE_MODE=false
NEXT_PUBLIC_FREE_TIER=true
```

## 📊 FREE Service Limits & Monitoring

### Supabase (PostgreSQL) - FREE Tier
- **500MB** database size
- **50MB** file storage
- **50,000** monthly active users
- **100** concurrent connections
- **500** hours compute time/month

**Monitor Usage:**
- Dashboard: https://supabase.com/dashboard
- Check database size regularly
- Monitor connection counts

### Upstash Redis - FREE Tier
- **10,000** requests/day
- **100** concurrent connections
- **256MB** max memory
- **7 days** data persistence

**Monitor Usage:**
- Console: https://console.upstash.com
- Check daily request count
- Monitor memory usage

### Vercel - FREE Tier (Hobby Plan)
- **100GB** bandwidth/month
- **100** deployments/month
- **1,000** functions/month
- **100** hours compute/month
- **No custom domains** (use .vercel.app)

**Monitor Usage:**
- Dashboard: https://vercel.com/dashboard
- Check bandwidth usage
- Monitor function invocations

### Alchemy/Infura - FREE Tier
- **300M** compute units/month
- Rate limited to ~30 requests/second

**Monitor Usage:**
- Dashboard: https://dashboard.alchemy.com
- Check compute unit usage

## 🚨 Scaling Considerations

### When to Upgrade (Expected Growth)

#### Supabase Upgrade Triggers:
- Database size > 400MB
- Monthly active users > 40,000
- Concurrent connections > 80

#### Upstash Upgrade Triggers:
- Daily requests > 8,000
- Memory usage > 200MB

#### Vercel Upgrade Triggers:
- Bandwidth > 80GB/month
- Functions > 800/month
- Need custom domain

### Upgrade Plans:
- **Supabase Pro**: $25/month (2GB DB, 100k users)
- **Upstash**: $0.2/100k requests
- **Vercel Pro**: $20/month (custom domains, analytics)

## 🔧 Troubleshooting

### Common Issues

#### 1. Vercel Deployment Fails
```bash
# Check Vercel logs
vercel logs

# Redeploy
vercel --prod --force
```

#### 2. Database Connection Issues
```bash
# Test Supabase connection
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -c "SELECT 1;"
```

#### 3. Redis Connection Issues
```bash
# Test Upstash connection
redis-cli -u "rediss://:[password]@[endpoint]:6379" ping
```

#### 4. Environment Variables Not Set
```bash
# Check Vercel environment variables
vercel env ls

# Add missing variables
vercel env add VARIABLE_NAME
```

## 📈 Performance Optimization

### For FREE Tier Limits:

1. **Enable Caching**: Redis caching for API responses
2. **Rate Limiting**: Conservative rate limits (50 req/15min)
3. **Optimize Queries**: Use database indexes
4. **CDN**: Vercel automatically serves static assets via CDN
5. **Compression**: Gzip compression enabled

### Monitoring Queries:

```sql
-- Supabase: Check database size
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔄 Backup Strategy

### Supabase Backups:
- Automatic daily backups
- 7-day retention on free tier
- Manual backups available

### Redis Backups:
- 7-day data persistence
- Automatic snapshots

### Code & Config:
- Git version control
- Environment variables backed up
- Vercel deployments are immutable

## 🎯 Next Steps After Deployment

1. **Test AI Verification**: Try creating a campaign and verifying milestones
2. **Monitor Usage**: Check all dashboards regularly
3. **Optimize Performance**: Implement caching where needed
4. **Plan Scaling**: Monitor usage patterns for upgrade timing
5. **Add Analytics**: Set up Vercel Analytics for user behavior

## 🆘 Support & Resources

### Free Support:
- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Upstash**: https://docs.upstash.com

### Community:
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community for help

### Paid Support:
- **Vercel Enterprise**: Priority support
- **Supabase Pro**: Dedicated support

---

**Total Setup Time: ~30 minutes**
**Total Cost: $0/month**
**Scalability: Handles 1000s of users within free limits**

🎉 **Congratulations! Your AI-powered crowdfunding platform is now live and completely free!**
