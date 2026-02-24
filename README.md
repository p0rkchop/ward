This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel with SQLite (Turso)

This application is configured for Vercel deployment with SQLite using [Turso](https://turso.tech), a serverless SQLite-compatible database.

### Prerequisites

1. Create a [Turso account](https://turso.tech) and database
2. Get your database URL and auth token from Turso dashboard
3. Set up [Twilio Verify](https://www.twilio.com/verify) for phone authentication

### Environment Variables

Configure these environment variables in your Vercel project:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Turso database URL (e.g., `libsql://your-db.turso.io`) | Yes |
| `TURSO_AUTH_TOKEN` | Turso authentication token | Yes (for Turso) |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js encryption | Yes |
| `NEXTAUTH_URL` | Public URL of your app (e.g., `https://your-app.vercel.app`) | Yes |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Yes |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Verify Service SID | Yes |
| `PRISMA_ACCELERATE_URL` | Prisma Accelerate URL (optional) | No |

### Deployment Steps

1. **Push to GitHub**: Ensure your code is in a GitHub repository
2. **Import to Vercel**:
   - Go to [Vercel](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
3. **Configure Environment Variables**:
   - Add all required environment variables from the table above
   - For local development, copy `.env.example` to `.env` and fill in values
4. **Deploy**: Vercel will automatically build and deploy your application

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. For local SQLite database, set:
   ```
   DATABASE_URL="file:./dev.db"
   ```
   (Leave `TURSO_AUTH_TOKEN` empty for local file-based SQLite)
3. Install dependencies:
   ```bash
   npm install
   ```
4. Generate Prisma client and push schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. Run development server:
   ```bash
   npm run dev
   ```

### Database Management

- **Local development**: Uses file-based SQLite (`dev.db`)
- **Production**: Uses Turso (serverless SQLite)
- **Prisma Studio**: Run `npx prisma studio` to view/edit data locally
- **Migrations**: Use `npx prisma migrate dev` for schema changes

### Notes

- The application uses `libsql` Prisma adapter for SQLite compatibility
- Turso provides serverless SQLite that works on Vercel's serverless functions
- Phone authentication requires Twilio Verify service
- All database queries are optimized for serverless environments

### Detailed Deployment Documentation

For comprehensive deployment instructions, environment setup, troubleshooting, and production considerations, see [DEPLOYMENT.md](DEPLOYMENT.md).
