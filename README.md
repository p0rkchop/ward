# Ward: Capacity-First Auto-Matching Scheduler

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7.4-purple?style=for-the-badge&logo=prisma)](https://prisma.io)
[![Turso](https://img.shields.io/badge/Turso-SQLite-green?style=for-the-badge&logo=sqlite)](https://turso.tech)
[![Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

A two-sided scheduling application where professional availability is strictly constrained by physical resource capacity, and clients are auto-matched to professionals based on timeslot selection.

## 🚀 Overview

Ward solves a critical problem in service scheduling: **physical capacity constraints**. Traditional schedulers are "person-centric" and ignore facility limits. Ward is "timeslot-centric" and "resource-constrained," ensuring that booking availability reflects actual physical capacity.

### Key Differentiator

**Two-step availability loop:**
1. **Professionals** must first book a physical "Resource" (e.g., room, station) to generate availability
2. **Clients** pick from a pool of available timeslots, and the system auto-assigns an available Professional

## ✨ Features

- **🔐 Phone-Based Authentication**: Twilio Verify SMS verification (5-minute codes)
- **👥 Role-Based Access Control**: ADMIN, PROFESSIONAL, CLIENT with distinct permissions
- **📅 Resource-Constrained Scheduling**: Professionals book physical resources to create availability
- **🤖 Auto-Matching Algorithm**: Clients select timeslots, system randomly assigns available professionals
- **⏱️ Fixed Time Slot Granularity**: 30-minute intervals for all bookings
- **🔄 Soft Deletion**: Preserves data history without cascade deletion
- **⚡ Performance Optimized**: Batch processing, composite indexes, connection pooling
- **🛡️ Security Hardened**: Rate limiting, environment validation, IDOR prevention

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend/Backend** | Next.js 14 (App Router) with Server Actions |
| **Database** | SQLite (Turso for production, file-based for local) |
| **ORM** | Prisma with libSQL adapter |
| **Authentication** | NextAuth with Twilio custom provider |
| **Styling** | Tailwind CSS + Geist font |
| **Testing** | Vitest + Testing Library |
| **Deployment** | Vercel with serverless functions |

### User Roles & Permissions

| Role | Core Actions | Data Access |
|------|--------------|-------------|
| **ADMIN** | Creates "Resources" (physical capacity limits) | Full access to all facility, professional, and client data |
| **PROFESSIONAL** | Books Resources to create "Shifts" (availability) | View available Resources, view assigned Client bookings |
| **CLIENT** | Selects timeslots, receives service | View aggregated timeslots (cannot see individual professionals) |

## 🗄️ Database Schema

### Core Entities

- **`User`**: Base user with phone authentication (`id`, `phoneNumber`, `role`, `email`, `name`)
- **`Resource`**: Physical capacity constraint (`id`, `name`, `description`, `isActive`, `deletedAt`)
- **`Shift`**: Professional availability (`id`, `professionalId`, `resourceId`, `startTime`, `endTime`, `deletedAt`)
- **`Booking`**: Client appointment (`id`, `clientId`, `shiftId`, `startTime`, `endTime`, `status`, `notes`, `deletedAt`)

### Business Rules

1. **Time Slot Granularity**: All bookings use fixed 30-minute intervals
2. **Resource Constraints**: A Resource cannot be double-booked at overlapping times
3. **Professional Constraints**: A Professional cannot have overlapping Shifts
4. **Booking Constraints**: A Shift cannot have overlapping Bookings
5. **Soft Deletion**: All entities use `deletedAt` timestamps instead of hard deletion

## 🤖 Auto-Matching Algorithm

### Timeslot Availability Calculation

When displaying timeslots to a Client, the system:
1. Finds all active `Shifts` (not deleted) covering the time slot
2. Subtracts `Bookings` with status `CONFIRMED` (cancelled bookings don't occupy capacity)
3. If `(Total concurrent Shifts) - (Total concurrent CONFIRMED Bookings) > 0`, the timeslot is available

### Random Assignment Strategy (MVP)

When a Client selects a valid timeslot:
1. Query all available, unbooked `Shifts` for that specific 30-minute slot
2. Randomly select one `Shift` from the pool
3. Create a `Booking` with status `CONFIRMED` tied to that Shift

### Concurrency Handling

- Database transactions with appropriate locking
- Race condition prevention for simultaneous bookings
- Automatic retry with different shifts on conflict

## 🚀 Getting Started

### Prerequisites

- Node.js 18.17+ and npm 9+
- [Turso Account](https://turso.tech) (for production database)
- [Twilio Account](https://twilio.com) with Verify service configured

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
   # Edit .env with your local settings
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

5. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - Use phone verification to log in (Twilio trial numbers work for testing)

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection URL | Yes | `file:./dev.db` (local) |
| `TURSO_AUTH_TOKEN` | Turso authentication token | For Turso only | - |
| `NEXTAUTH_SECRET` | NextAuth.js encryption secret | Yes | - |
| `NEXTAUTH_URL` | Public URL of your app | Yes | `http://localhost:3000` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes | - |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID | Yes | - |
| `PRISMA_ACCELERATE_URL` | Prisma Accelerate URL (optional) | No | - |
| `NODE_ENV` | Environment mode | No | `development` |

## 📦 Deployment

### Vercel Deployment (Recommended)

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Import to Vercel**: Go to [Vercel Dashboard](https://vercel.com/dashboard) → "Add New" → "Project"
3. **Configure Environment Variables**: Add all required variables from the table above
4. **Deploy**: Vercel automatically builds and deploys your application

### Production Database Setup

1. **Create Turso database:**
   ```bash
   turso db create ward-production
   turso db show ward-production --url
   turso db tokens create ward-production
   ```

2. **Push schema to production:**
   ```bash
   export DATABASE_URL="libsql://your-database.turso.io"
   export TURSO_AUTH_TOKEN="your-auth-token"
   npx prisma db push
   ```

### Health Check Endpoint

The application includes a health check endpoint:
- `GET /api/health` - Returns 200 OK with database connection status
- Useful for uptime monitoring and load balancer health checks

**For comprehensive deployment instructions, troubleshooting, and production considerations, see [DEPLOYMENT.md](DEPLOYMENT.md).**

## 🧪 Testing

### Test Commands

```bash
# Run all tests
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run integration tests only
npm test -- --run integration
```

### Test Coverage

- **95 unit tests** across core functionality (shift creation, booking auto-matching, validation)
- **5 integration tests** for user flows (authentication, booking lifecycle)
- **100% test pass rate** with comprehensive error scenarios

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
  - Vercel Support: `support@vercel.com`
  - Turso Support: `support@turso.tech`
  - Twilio Support: `help@twilio.com`

---

**Built with ❤️ using Next.js, Prisma, and Turso**
