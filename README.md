# Ward: Capacity-First Auto-Matching Scheduler

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.4-purple?style=for-the-badge&logo=prisma)](https://prisma.io)
[![Turso](https://img.shields.io/badge/Turso-SQLite-green?style=for-the-badge&logo=sqlite)](https://turso.tech)
[![Twilio](https://img.shields.io/badge/Twilio-Verify-red?style=for-the-badge&logo=twilio)](https://twilio.com)
[![Resend](https://img.shields.io/badge/Resend-Email-purple?style=for-the-badge)](https://resend.com)
[![Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

A two-sided scheduling application where professional availability is strictly constrained by physical resource capacity, and clients are auto-matched to professionals based on timeslot selection.

## 🚀 Overview

Ward solves a critical problem in service scheduling: **physical capacity constraints**. Traditional schedulers are "person-centric" and ignore facility limits. Ward is "timeslot-centric" and "resource-constrained," ensuring that booking availability reflects actual physical capacity.

### Key Differentiator

**Two-step availability loop:**
1. **Admins** create **Events** with date ranges, hours, and **Resources** (rooms, tables, stations) with defined capacities
2. **Professionals** book **Shifts** on Resources during Event hours to generate client-facing availability
3. **Clients** pick from a pool of available timeslots, and the system **auto-assigns** an available Professional

## ✨ Features

### Core Scheduling
- **📅 Event-Driven Scheduling**: Multi-day events with configurable hours per day, blackout periods (e.g., lunch breaks), and timezone support
- **🏢 Resource Capacity Management**: Resources with quantities and professional-per-unit limits (e.g., 5 tables, 1 professional per table)
- **🤖 Auto-Matching Algorithm**: Clients select timeslots; the system randomly assigns from available professionals
- **⏱️ Fixed 30-Minute Slots**: All bookings use consistent 30-minute intervals
- **🔄 Soft Deletion**: Preserves data history without cascade deletion

### Authentication & Authorization
- **🔐 Phone-Based Authentication**: Twilio Verify SMS codes with NextAuth session management
- **👥 Role-Based Access Control**: ADMIN, PROFESSIONAL, and CLIENT roles with strict permission boundaries
- **🛡️ Security Hardened**: Rate limiting (global, API, auth tiers), IDOR prevention, environment validation

### Admin Tools
- **📊 Admin Dashboard**: System-wide statistics, user/resource/event management
- **📋 Event Agenda View**: Calendar-style drill-down into event schedules showing all shifts and bookings
- **🔀 Booking Management**: Reassign clients to different professionals/timeslots, remove bookings
- **👤 User Management**: Sortable/filterable user list, role assignment, account deletion
- **🗂️ Resource Management**: CRUD with sorting/filtering, location fields, quantity and capacity configuration
- **📧 Email Connectivity Test**: Send a test email from settings to validate Resend configuration step-by-step
- **📤 Data Export**: Export system data as JSON

### Email Notifications (via Resend)
- **Booking confirmed** — sent to client on successful booking
- **Booking cancelled** — sent to client on self-cancellation
- **Admin-cancelled booking** — sent to client when admin removes their booking
- **Booking reassignment** — sent to client when admin moves their booking
- **Welcome email** — sent to new users after account setup
- **Role change** — sent when admin updates a user's role
- **Account deleted** — sent when admin soft-deletes a user
- **New booking → professional** — notifies the assigned professional
- **Booking cancelled → professional** — notifies professional when a booking on their shift is cancelled
- **Appointment reminder** — daily cron job sends reminders for next-day appointments (8 AM Central)

All emails are fire-and-forget — failures never block or roll back the underlying operation.

### User Experience
- **🌗 Dark Mode**: Toggle between light and dark themes, stored per-user in the database
- **⚙️ User Preferences**: Per-user settings for timezone, date format (North American default), 12-hour/24-hour time display
- **🖼️ Branding**: Admin-uploadable login page image (up to 4000×4000 pixels, dynamically scaled)
- **📱 Responsive Design**: Mobile navigation with hamburger menus, responsive calendar grids, mobile-first booking forms
- **🎨 Custom Favicon**: Distinctive browser tab icon

### Platform
- **📈 Vercel Web Analytics**: Built-in analytics integration
- **❤️ Health Check**: `GET /api/health` endpoint for uptime monitoring

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | Server components, server actions, API routes |
| **Language** | TypeScript 5 | Type safety across the entire stack |
| **Database** | Turso (production) / SQLite (local) | Serverless SQLite with libSQL protocol |
| **ORM** | Prisma 7 with libSQL adapter | Type-safe database queries and migrations |
| **Authentication** | NextAuth 4 + Twilio Verify | Phone-based SMS verification with JWT sessions |
| **Email** | Resend | Transactional email notifications from `noreply@career-ward.app` |
| **Styling** | Tailwind CSS 4 + Geist font | Utility-first CSS with dark mode support |
| **Testing** | Vitest + Testing Library | Unit and integration tests |
| **Deployment** | Vercel | Serverless hosting with auto-deploy from GitHub |
| **Analytics** | Vercel Web Analytics | Usage and performance tracking |
| **Validation** | Zod 4 | Runtime schema validation |

### External Services

| Service | Role | Setup Required |
|---------|------|----------------|
| **[Twilio](https://twilio.com)** | Phone verification (SMS codes for login) | Create a Verify service, obtain Account SID, Auth Token, and Service SID |
| **[Turso](https://turso.tech)** | Production database (serverless SQLite) | Create a database, obtain the `libsql://` URL and auth token |
| **[Resend](https://resend.com)** | Transactional email delivery | Verify your domain (DNS records), generate an API key |
| **[Vercel](https://vercel.com)** | Hosting and deployment | Import GitHub repo, configure environment variables |

### User Roles & Permissions

| Role | Core Actions | Data Access |
|------|--------------|-------------|
| **ADMIN** | Create Events & Resources, manage users, reassign/remove bookings, view analytics, system settings | Full access to all data |
| **PROFESSIONAL** | Book Shifts on Resources during Events, view assigned client details | Available Resources, own shifts, assigned client name/phone/email |
| **CLIENT** | Select timeslots, book appointments, cancel own bookings | Aggregated timeslot availability only (cannot see individual professionals) |

## 🗄️ Database Schema

### Core Entities

- **`User`**: Phone-authenticated user with role, name, optional email, preferences (theme, timezone, date/time format)
- **`Event`**: Multi-day scheduling event with timezone and date range
- **`EventDay`**: Per-day configuration (start/end hours, blackout periods)
- **`Resource`**: Physical capacity constraint with quantity, professionals-per-unit, optional location
- **`EventResource`**: Association between Events and Resources
- **`Shift`**: Professional availability on a Resource during Event hours
- **`Booking`**: Client appointment auto-matched to a Shift
- **`AppSetting`**: System-wide configuration (e.g., branding image)

### Business Rules

1. **Event-Driven**: All scheduling occurs within defined Events with explicit date ranges and hours
2. **Resource Capacity**: Resources have quantities and professional-per-unit limits that constrain availability
3. **Time Slot Granularity**: All bookings use fixed 30-minute intervals
4. **No Double-Booking**: Resources, Professionals, and Shifts cannot have overlapping commitments
5. **Cascade on Event Edit**: Shifts and bookings outside updated event dates are automatically cancelled
6. **Soft Deletion**: All entities use `deletedAt` timestamps instead of hard deletion

## 🤖 Auto-Matching Algorithm

### Timeslot Availability Calculation

When displaying timeslots to a Client:
1. Find all active Shifts (not deleted) covering the time slot within the Event's hours
2. Subtract Bookings with status `CONFIRMED`
3. If `(Total concurrent Shifts) - (Total concurrent CONFIRMED Bookings) > 0`, the timeslot is available

### Random Assignment

When a Client selects a valid timeslot:
1. Query all available, unbooked Shifts for that 30-minute slot
2. Randomly select one Shift from the pool
3. Create a Booking with status `CONFIRMED` tied to that Shift

### Concurrency Handling

- Database transactions with appropriate locking
- Race condition prevention for simultaneous bookings
- Automatic retry with different shifts on conflict

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.17+ and **npm** 9+
- **[Twilio Account](https://twilio.com)**: Create a Verify service for phone-based login
  1. Sign up and navigate to Verify → Services
  2. Create a new service, note the **Service SID** (starts with `VA...`)
  3. Obtain your **Account SID** and **Auth Token** from the Twilio dashboard
- **[Turso Account](https://turso.tech)** (production only): Serverless SQLite database
  1. Install CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
  2. Create database: `turso db create ward-database`
  3. Get URL: `turso db show ward-database --url`
  4. Create token: `turso db tokens create ward-database`
- **[Resend Account](https://resend.com)** (for email notifications):
  1. Add your domain and configure DNS records (TXT/SPF/DKIM)
  2. Generate an API key in the Resend dashboard
- **[Vercel Account](https://vercel.com)** (for deployment):
  1. Import your GitHub repository
  2. Configure environment variables (see table below)

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/p0rkchop/ward.git
   cd ward
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your settings (see Environment Variables below)
   ```

3. **Set up local SQLite database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Access the application** at [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection URL (`file:./dev.db` for local, `libsql://...` for Turso) | Yes |
| `TURSO_AUTH_TOKEN` | Turso authentication token | Production only |
| `NEXTAUTH_SECRET` | Secret for JWT session encryption (generate with `openssl rand -base64 32`) | Yes |
| `NEXTAUTH_URL` | Public URL of the app (`http://localhost:3000` for local) | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID (starts with `VA...`) | Yes |
| `RESEND_API_KEY` | Resend API key for email notifications | Yes |
| `CRON_SECRET` | Secret for authenticating the daily reminder cron job | Production only |
| `NODE_ENV` | Environment mode (`development` or `production`) | No |

## 📦 Deployment

### Vercel Deployment

1. **Push to GitHub** and import the repo in [Vercel Dashboard](https://vercel.com/dashboard)
2. **Configure all environment variables** from the table above
3. **Deploy** — Vercel auto-builds on push to `main` using the build command in `vercel.json`:
   ```
   npx prisma generate && npm run build
   ```
4. **Cron job**: The daily appointment reminder runs automatically via Vercel Cron (`/api/cron/reminders` at 8 AM Central)

### Production Database (Turso)

```bash
turso db create ward-production
turso db show ward-production --url    # → libsql://...
turso db tokens create ward-production # → auth token
npx prisma db push                     # push schema
```

### Domain & Email Setup

- **Domain**: Configure your custom domain in Vercel → Settings → Domains
- **Email**: Add DNS records (TXT, SPF, DKIM) for your domain in Resend to authorize sending from `noreply@<your-domain>`

### Health Check

- `GET /api/health` — returns `{"status":"healthy","database":"connected"}` when the app and database are operational

**For comprehensive deployment instructions, troubleshooting, and production hardening, see [DEPLOYMENT.md](DEPLOYMENT.md).**

## 🧪 Testing

```bash
npm run test:run       # Run all tests
npm run test:ui        # Run with Vitest UI
npm run test:coverage  # Run with coverage report
```

- **100 tests** across 6 test files (unit + integration)
- Covers shift creation, booking auto-matching, admin actions, validation, and end-to-end booking lifecycle
- **100% pass rate**

## 🔒 Security Features

### Implemented Protections

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

## 📊 Performance Optimizations

### Database Optimizations

1. **Composite Indexes** for common query patterns:
   - `@@index([professionalId, startTime, deletedAt])`
   - `@@index([resourceId, startTime, deletedAt])`
   - `@@index([shiftId, startTime, status, deletedAt])`
   - `@@index([clientId, startTime, deletedAt])`

2. **Batch Query Processing**:
   - Timeslot aggregation uses batch queries instead of N+1 queries
   - Reduced database round-trips for timeslot availability checks

3. **Connection Management**:
   - Prisma connection pooling for serverless environments
   - Turso connection reuse

### Next.js Optimizations

1. **Image Optimization**: AVIF and WebP formats with responsive sizes
2. **Server Components**: Maximum use of React Server Components
3. **Code Splitting**: Automatic route-based code splitting

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript strict mode
- Write tests for new functionality
- Update documentation as needed
- Use descriptive commit messages

## 📄 License

This project is proprietary. All rights reserved.

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Comprehensive deployment guide
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development plan and progress tracking
- **[REQUIREMENTS.md](REQUIREMENTS.md)** - Software requirements specification

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/p0rkchop/ward/issues)
- **Documentation**: See the documentation links above
- **Emergency Contacts**:

---

**Vibe Coded like a ADHD multi-tasking agent herding baller by Chris Merkel**

**Built with ❤️ using [Next.js](https://nextjs.org/), [Prisma](https://www.prisma.io/), [Turso](https://turso.tech/), [Resend](https://resend.com/), [Twilio Auth](https://www.twilio.com/en-us/user-authentication-identity)**

### 🎉 Shoutouts:
[Claude Code](https://code.claude.com/docs/en/overview) - you mah boy, my daily driver, but you're cripped with those token limits, thankfully there's [Deepseek](https://deepseek.com/) all your cheap token goodneess, fuckin rad cash-money caching layer, and OpenAI/Anthropic compatible API endpoints. Rigging you to Claude code was next level shit.

### 💥 Diss Track:
- Eat 💩, Twilio SMS service and taking my 20 bucks but not verifying me
- Github Copilot. Look bro, I want to like you, but you're dumb. Wise up, up your game. Stop releasing such jank-ass tools. Up your game. 
