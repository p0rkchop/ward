# Deployment Documentation

## Overview

This is a capacity-first auto-matching scheduler application built with Next.js 14 App Router, Prisma ORM, SQLite (Turso), and NextAuth with Twilio phone verification. The application enables professionals to create shifts and clients to book available timeslots with automatic matching to available professionals.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Vercel Deployment](#vercel-deployment)
5. [Database Management](#database-management)
6. [Authentication Setup](#authentication-setup)
7. [Security Considerations](#security-considerations)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)
11. [Post-Deployment Verification](#post-deployment-verification)

## Prerequisites

### 1. Development Tools
- **Node.js** 18.17 or later (LTS recommended)
- **npm** 9.x or later (comes with Node.js)
- **Git** for version control

### 2. External Services
- **[Turso Account](https://turso.tech)**: Serverless SQLite database for production
- **[Twilio Account](https://twilio.com)**: Phone verification service
- **[Vercel Account](https://vercel.com)** (optional but recommended): Deployment platform
- **GitHub Account** (optional): Code repository hosting

### 3. Twilio Verify Setup
1. Sign up for Twilio (free trial available)
2. Navigate to **Verify** → **Services** in Twilio Console
3. Create a new Verify service
4. Note the **Service SID** (starts with `VA...`)
5. Obtain your **Account SID** and **Auth Token** from the dashboard
6. Ensure the service is configured for SMS verification

### 4. Turso Database Setup
1. Sign up for Turso (free tier available)
2. Install Turso CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
3. Login: `turso auth login`
4. Create database: `turso db create ward-database`
5. Get connection details:
   ```bash
   turso db show ward-database --url
   turso db tokens create ward-database
   ```
6. Note the **Database URL** (starts with `libsql://`) and **Auth Token**

## Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Database Configuration
# For local development with file-based SQLite:
DATABASE_URL="file:./dev.db"
# For production with Turso:
# DATABASE_URL="libsql://your-database.turso.io"
# TURSO_AUTH_TOKEN="your-turso-auth-token"

# NextAuth Configuration
# NEXTAUTH_SECRET is used to encrypt session tokens (JWTs) and cookies.
# Even though Twilio handles phone verification, NextAuth manages the
# session *after* verification succeeds. This secret ensures session
# tokens can't be forged or tampered with. Generate one with:
#   openssl rand -base64 32
NEXTAUTH_SECRET="generate-a-secure-random-secret-here"

# NEXTAUTH_URL tells NextAuth the canonical URL of your app. It uses this
# to build callback URLs and redirect users after sign-in. For local dev
# it's http://localhost:3000. In production, set it to your deployed URL
# (e.g., https://your-app.vercel.app or your custom domain).
NEXTAUTH_URL="http://localhost:3000"

# Twilio Configuration (required for phone verification)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_VERIFY_SERVICE_SID="your-twilio-verify-service-sid"

# Optional: Prisma Accelerate for production performance
# PRISMA_ACCELERATE_URL="https://accelerate.prisma-data.net"

# Environment
NODE_ENV="development"  # Set to "production" in production
```

### Generating Secure Secrets

1. **NEXTAUTH_SECRET** — This secret is used by NextAuth.js to sign and encrypt
   JWT session tokens stored in cookies. Although Twilio Verify handles the actual
   phone-number verification (sending and checking SMS codes), NextAuth manages
   the authenticated session that follows. Without a strong secret, an attacker
   could forge session tokens and impersonate users.

   Generate a cryptographically random value with **one** of these commands:
   ```bash
   # Option A — OpenSSL (macOS / Linux)
   openssl rand -base64 32

   # Option B — Node.js (any platform)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output and use it as the value of `NEXTAUTH_SECRET`. **Never commit
   this value to source control** — set it via your `.env` file locally and via
   Vercel Environment Variables in production.

2. **NEXTAUTH_URL** — The public-facing URL of your application.
   - **Local development**: `http://localhost:3000`
   - **Vercel production**: `https://your-app.vercel.app` (or your custom domain)

   NextAuth uses this URL to construct callback/redirect URLs during the sign-in
   flow. If it doesn't match the URL users actually visit, authentication
   redirects will fail. On Vercel, `NEXTAUTH_URL` is
   [automatically inferred](https://next-auth.js.org/configuration/options#nextauth_url)
   from the `VERCEL_URL` env var in most cases, but it's best to set it
   explicitly — especially if you use a custom domain.

3. **Database Passwords/Tokens**: Use Turso CLI or dashboard to generate tokens.

### Environment Validation

The application includes automatic environment validation on server startup:
- **Auth Configuration**: Validates all required NextAuth and Twilio variables (see `app/lib/auth-config.ts`)
- **Database Configuration**: Validates DATABASE_URL and TURSO_AUTH_TOKEN when using Turso (see `app/lib/db.ts`)
- **Production Warnings**: Warns if using default secrets or localhost URLs in production

## Local Development

### 1. Initial Setup

```bash
# Clone repository
git clone <your-repo-url>
cd ward

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your local settings

# Initialize local SQLite database
npx prisma generate
npx prisma db push

# Optional: Seed with test data (if available)
# npx prisma db seed
```

### 2. Running the Application

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

The application will be available at `http://localhost:3000`.

### 3. Database Management (Local)

```bash
# View data with Prisma Studio
npx prisma studio

# Create migrations for schema changes
npx prisma migrate dev --name "description-of-changes"

# Reset database (development only)
npx prisma migrate reset
```

### 4. Testing

```bash
# Run all tests
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm test -- --run integration
```

## Vercel Deployment

### 1. Repository Setup

Ensure your code is pushed to a GitHub repository:
```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/ward.git
git push -u origin main
```

### 2. Vercel Project Creation

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure project settings:

### 3. Environment Variables Configuration

In Vercel project settings (**Settings** → **Environment Variables**), add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `libsql://your-database.turso.io` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | Your Turso auth token | Required for Turso authentication |
| `NEXTAUTH_SECRET` | Secure random string | Run `openssl rand -base64 32` and paste the output. Encrypts session JWTs — see [Generating Secure Secrets](#generating-secure-secrets). |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your production URL (or custom domain). Used by NextAuth to build sign-in callback URLs. |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | From Twilio dashboard |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | From Twilio dashboard |
| `TWILIO_VERIFY_SERVICE_SID` | Your Twilio Verify Service SID | Starts with `VA...` |
| `PRISMA_ACCELERATE_URL` | Optional Prisma Accelerate URL | For production performance |
| `NODE_ENV` | `production` | Set environment to production |

**Important**: Add these to **Production** environment, not Preview.

### 4. Build Configuration

The project includes `vercel.json` with optimized settings:

```json
{
  "build": {
    "env": { /* environment variable definitions */ },
    "installCommand": "npm install",
    "buildCommand": "npx prisma generate && npm run build",
    "outputDirectory": ".next"
  },
  "functions": {
    "app/api/**/*": {
      "maxDuration": 10
    }
  },
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Build Process**:
1. Installs dependencies with `npm install`
2. Generates Prisma client with `npx prisma generate`
3. Builds Next.js application with `npm run build`
4. Deploys with optimal serverless function settings

### 5. Deployment

1. After configuring environment variables, click **"Deploy"**
2. Vercel will automatically build and deploy
3. Monitor build logs for any issues
4. Once deployed, your application will be available at `https://your-app.vercel.app`

### 6. Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

## Database Management

### Dual-Mode Database Architecture

The application supports two database modes:

1. **Local Development**: File-based SQLite (`dev.db`)
2. **Production**: Turso serverless SQLite

Configuration is handled in `app/lib/db.ts`:
```typescript
// Automatically detects URL format:
// - "file:./dev.db" → uses local SQLite
// - "libsql://..." → uses Turso with libSQL adapter
```

### Production Database Setup

1. **Turso Database Creation**:
   ```bash
   # Create database
   turso db create ward-production

   # Get connection URL
   turso db show ward-production --url

   # Create auth token
   turso db tokens create ward-production
   ```

2. **Schema Deployment**:
   ```bash
   # Set production DATABASE_URL and TURSO_AUTH_TOKEN
   export DATABASE_URL="libsql://..."
   export TURSO_AUTH_TOKEN="..."

   # Push schema to production
   npx prisma db push

   # Or create migration
   npx prisma migrate deploy
   ```

3. **Prisma Accelerate (Optional)**:
   - Sign up at [Prisma Accelerate](https://www.prisma.io/accelerate)
   - Get your Accelerate URL
   - Add to environment variables as `PRISMA_ACCELERATE_URL`

### Database Backups

```bash
# Backup Turso database
turso db backup create ward-production

# List backups
turso db backup list ward-production

# Restore from backup
turso db backup restore ward-production <backup-id>
```

## Authentication Setup

### How Twilio + NextAuth Work Together

This app uses **Twilio Verify** for identity verification and **NextAuth.js** for
session management. Here's how the pieces fit:

1. **User enters phone number** → App calls the Twilio Verify API to send an SMS code.
2. **Twilio sends SMS code** → User enters the 6-digit code in the app.
3. **App verifies code with Twilio** → If correct, NextAuth creates a signed JWT
   session token (encrypted with `NEXTAUTH_SECRET`) and stores it in an HTTP-only
   cookie.
4. **Subsequent requests** → NextAuth reads the cookie, verifies the JWT signature
   using `NEXTAUTH_SECRET`, and provides the session (user ID, role, phone) to
   the app.
5. **Auto-registration**: New phone numbers are automatically registered with the
   CLIENT role.

> **Why `NEXTAUTH_SECRET` matters**: Twilio only verifies the phone number once.
> After that, the user's identity lives in the JWT session token. If the secret
> is weak or compromised, attackers can forge tokens and bypass Twilio entirely.
>
> **Why `NEXTAUTH_URL` matters**: NextAuth redirects users to callback URLs
> derived from this value. A mismatch causes redirect failures after sign-in.

### Twilio Configuration Details

1. **Verify Service**:
   - Go to Twilio Console → Verify → Services
   - Create service specifically for this application
   - Configure SMS channel
   - Set code length and expiry (default: 6 digits, 10 minutes)

2. **Phone Number Requirements**:
   - Test numbers: Use Twilio trial numbers or verified numbers
   - Production: Purchase Twilio phone number or use toll-free
   - International: Configure country codes as needed

3. **Pricing Considerations**:
   - Verify API pricing: ~$0.05 per verification
   - Consider rate limiting to prevent abuse
   - Monitor usage in Twilio console

### Session Management

- **Strategy**: JWT (JSON Web Tokens)
- **Max Age**: 30 days
- **Storage**: HTTP-only cookies
- **User Data**: Phone number, role, user ID stored in session

## Security Considerations

### Implemented Security Features

1. **Rate Limiting** (`app/lib/rate-limit.ts`):
   - Global: 100 requests/minute per IP
   - API: 60 requests/minute per IP
   - Auth: 10 attempts/15 minutes per IP
   - Sliding window algorithm with automatic cleanup

2. **Environment Validation**:
   - Server-side validation of all required environment variables
   - Warnings for default/development values in production
   - Early failure on missing configuration

3. **Authorization Enforcement**:
   - Role-based access control (ADMIN, PROFESSIONAL, CLIENT)
   - Session-based user identification (prevents IDOR)
   - Business rule validation in server actions

4. **Database Security**:
   - Parameterized queries via Prisma (prevents SQL injection)
   - Connection pooling and timeout configuration
   - Turso auth token encryption in transit

5. **Next.js Security**:
   - CSRF protection via NextAuth
   - HTTP-only cookies for session storage
   - Secure headers via Next.js defaults

### Production Security Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ random bytes)
- [ ] Set `NEXTAUTH_URL` to production domain
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Monitor rate limit logs
- [ ] Regularly rotate Turso auth tokens
- [ ] Review Twilio usage for suspicious activity
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Implement WAF if needed (Vercel Enterprise)

### Rate Limiting Configuration

The application includes three rate limiters:

```typescript
// Global rate limiter: 100 requests/minute per IP
globalRateLimiter.check(clientIP)

// API rate limiter: 60 requests/minute per IP
apiRateLimiter.check(clientIP)

// Auth rate limiter: 10 attempts/15 minutes per IP
authRateLimiter.check(clientIP)
```

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when window resets

## Performance Optimization

### Database Optimizations

1. **Composite Indexes** (added to `prisma/schema.prisma`):
   ```prisma
   // Shift indexes
   @@index([professionalId, startTime, deletedAt])
   @@index([resourceId, startTime, deletedAt])

   // Booking indexes
   @@index([shiftId, startTime, status, deletedAt])
   @@index([clientId, startTime, deletedAt])
   ```

2. **Batch Query Processing**:
   - Timeslot aggregation uses batch queries instead of N+1 queries
   - Reduced database round-trips for timeslot availability checks

3. **Connection Management**:
   - Prisma connection pooling for serverless environments
   - Turso connection reuse

### Next.js Optimizations

1. **Image Optimization** (`next.config.ts`):
   ```typescript
   images: {
     formats: ['image/avif', 'image/webp'],
     deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
   }
   ```

2. **Server Components**:
   - Maximum use of React Server Components
   - Reduced client-side JavaScript bundle

3. **Code Splitting**:
   - Automatic route-based code splitting
   - Dynamic imports for heavy components

### Caching Strategy

1. **Vercel Edge Network**: Automatic CDN caching
2. **Turso Built-in Cache**: Query result caching
3. **Prisma Accelerate** (optional): Database query caching
4. **Next.js ISR**: Potential for incremental static regeneration

## Monitoring & Logging

### Application Logging

The application uses structured logging:

```typescript
// Development: Detailed logs
// Production: Error-only logs with sanitized data
if (process.env.NODE_ENV !== 'production') {
  console.error('Detailed error:', error);
} else {
  console.error('Sanitized error message');
}
```

### Vercel Analytics

1. **Web Analytics**: Enable in Vercel project settings
2. **Speed Insights**: Monitor performance metrics
3. **Error Tracking**: View runtime errors in dashboard

### Database Monitoring

1. **Turso Dashboard**:
   - Query performance
   - Connection metrics
   - Storage usage

2. **Prisma Metrics** (with Accelerate):
   - Query latency
   - Cache hit rates
   - Error rates

### Twilio Monitoring

1. **Verify Service Logs**:
   - Verification success/failure rates
   - SMS delivery status
   - Geographic usage patterns

2. **Alert Configuration**:
   - Set up alerts for failed verifications
   - Monitor for unusual patterns (potential abuse)

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Error**: `Prisma client not generated`
```bash
# Solution: Generate Prisma client manually
npx prisma generate
# Then rebuild
npm run build
```

**Error**: `Environment variables missing`
```bash
# Solution: Check all required variables in .env
# Verify with: node -e "require('dotenv').config(); console.log(process.env)"
```

#### 2. Database Connection Issues

**Turso Connection Errors**:
```bash
# Verify Turso database is running
turso db list
turso db show your-database --url

# Test connection
turso db shell your-database
```

**SQLite File Permissions** (local):
```bash
# Ensure write permissions to dev.db
chmod 666 dev.db  # Or appropriate permissions
```

#### 3. Authentication Problems

**Twilio Verify Failures**:
- Verify Twilio credentials in environment
- Check Verify service is active
- Ensure phone numbers are verified (trial accounts)
- Check SMS balance

**NextAuth Session Issues**:
- Verify `NEXTAUTH_SECRET` is set and consistent
- Check `NEXTAUTH_URL` matches deployment URL
- Clear browser cookies for the domain

#### 4. Rate Limiting Issues

**429 Too Many Requests**:
- Check rate limit headers in response
- Implement exponential backoff in client
- Review middleware configuration

### Debug Mode

Enable detailed logging for debugging:

```bash
# Set debug environment variable
export DEBUG="ward:*"

# Or in .env
DEBUG="ward:*"

# Restart application
npm run dev
```

### Health Check Endpoints

The application includes built-in health checks:

1. **API Health**: `GET /api/health`
   - Returns 200 OK with database connection status
   - Includes timestamp and environment information
   - Returns 503 Service Unavailable if database is disconnected
   - Useful for uptime monitoring and load balancer health checks

2. **Database Health**: Check via Prisma connection
   - The health endpoint tests database connectivity with `SELECT 1` query
   - Automatically validates connection on each request

3. **Auth Health**: Attempt login with test credentials
   - Manual verification of authentication flow
   - Test with a known phone number and verification code

## Post-Deployment Verification

### 1. Smoke Tests

After deployment, verify:

1. **Application Loads**: Visit `https://your-app.vercel.app`
2. **Authentication Works**: Test phone verification flow
3. **Database Connectivity**: Create test shift/booking
4. **Role-Based Access**: Verify admin/professional/client permissions

### 2. Performance Testing

1. **Lighthouse Audit**: Run Chrome DevTools Lighthouse
2. **Load Testing**: Simulate concurrent users
3. **Database Performance**: Monitor query times

### 3. Security Verification

1. **Headers Check**: Use securityheaders.com
2. **SSL/TLS**: Check SSL Labs for certificate
3. **Rate Limiting**: Test with rapid requests
4. **Error Handling**: Verify no stack traces in production

### 4. Monitoring Setup

1. **Uptime Monitoring**: Set up Pingdom or similar
2. **Error Tracking**: Configure Sentry or equivalent
3. **Performance Monitoring**: Vercel Analytics + Turso metrics

### 5. Backup Verification

1. **Database Backups**: Test backup restoration
2. **Configuration Backups**: Export environment variables
3. **Code Backups**: Ensure GitHub repository is current

## Maintenance

### Regular Tasks

1. **Dependency Updates**:
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```

2. **Database Maintenance**:
   ```bash
   # Check for orphaned records
   # Review query performance
   # Optimize indexes as needed
   ```

3. **Log Review**:
   - Monitor error rates
   - Review authentication attempts
   - Check for suspicious patterns

4. **Backup Verification**:
   - Test backup restoration quarterly
   - Verify backup completeness

### Scaling Considerations

1. **User Growth**:
   - Monitor Turso database limits
   - Consider sharding for large datasets
   - Implement pagination for large lists

2. **Geographic Distribution**:
   - Use Vercel Edge Functions for global latency
   - Consider Turso database replication
   - Implement CDN for static assets

3. **Feature Additions**:
   - Review schema changes for migration complexity
   - Consider feature flags for gradual rollout
   - Update tests for new functionality

## Support & Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Turso Documentation](https://docs.turso.tech)
- [Twilio Verify Documentation](https://www.twilio.com/docs/verify)
- [NextAuth Documentation](https://next-auth.js.org)

### Community Support
- [GitHub Issues](https://github.com/your-repo/ward/issues)
- [Vercel Community](https://vercel.com/community)
- [Prisma Slack](https://slack.prisma.io)

### Emergency Contacts
- **Vercel Support**: support@vercel.com
- **Turso Support**: support@turso.tech
- **Twilio Support**: help@twilio.com

---

*Last Updated: 2026-02-23*
*Application Version: 0.1.0*
*Deployment Guide Version: 1.0.0*