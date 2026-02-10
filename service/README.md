# Ares Auth Service

Authentication and authorization service for Metorial.

## Development Setup

### Prerequisites

- Bun >= 1.2.15
- Docker & Docker Compose

### Quick Start

1. **Start infrastructure services** (Postgres, Redis, Object Storage):
   ```bash
   bun run infra:up
   ```

2. **Generate Prisma client and push database schema**:
   ```bash
   bun run db:generate
   bun run db:push
   ```

3. **Start the development server**:
   ```bash
   bun run dev
   ```

   The service will be available at:
   - Main service: http://localhost:52120
   - Health check: http://localhost:12121
   - Frontend: http://localhost:52120/metorial-ares

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Service Configuration
DATABASE_URL=postgresql://ares:ares@localhost:25432/ares
REDIS_URL=redis://localhost:26379/0
RELAY_URL=http://localhost:52110

# Service URLs
ARES_AUTH_URL=http://localhost:52120
ARES_ADMIN_URL=http://localhost:52120
ARES_INTERNAL_URL=http://localhost:52120

# Email Configuration
EMAIL_NAME="Ares Dev"
EMAIL_ADDRESS=dev@example.com

# Domain Configuration
COOKIE_DOMAIN=localhost

# Frontend URLs
AUTH_FRONTEND_HOST=http://localhost:52120/metorial-ares

# Turnstile (Cloudflare Captcha)
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Security Keys
AUTH_TICKET_SECRET=dev-secret-change-in-production
```

### Available Commands

```bash
# Development
bun run dev                 # Start dev server with hot reload
bun run start               # Start production server

# Frontend
bun run frontend:dev        # Start frontend dev server (Vite)
bun run frontend:build      # Build frontend for production

# Database
bun run db:generate         # Generate Prisma client
bun run db:push            # Push schema to databases (dev & test)
bun run db:push:dev        # Push schema to dev database
bun run db:push:test       # Push schema to test database

# Infrastructure
bun run infra:up           # Start infrastructure services
bun run infra:down         # Stop infrastructure services
bun run infra:logs         # View infrastructure logs

# Testing
bun run test               # Run tests
bun run test:watch         # Run tests in watch mode
bun run typecheck          # Run TypeScript type checking
```

## Docker

### Development with Docker Compose

```bash
# Start all services including the app
docker compose -p ares -f ./docker-compose.dev.yml --profile service up

# Start only infrastructure
docker compose -p ares -f ./docker-compose.dev.yml --profile infra up
```

### Production Build

```bash
docker build -t ares-service .
```

## Project Structure

```
service/
├── src/
│   ├── apis/          # API routes and controllers
│   ├── email/         # Email templates
│   ├── events/        # Event handlers
│   ├── lib/           # Utility libraries
│   ├── queues/        # Queue processors
│   ├── services/      # Business logic
│   ├── db.ts          # Database connection
│   ├── endpoints.ts   # Server setup
│   ├── env.ts         # Environment validation
│   └── server.ts      # Entry point
├── frontend/
│   └── auth/          # Auth frontend (React + Vite)
├── prisma/
│   └── schema/        # Prisma schema files
├── Dockerfile         # Production Docker image
└── dev.Dockerfile     # Development Docker image
```

## Notes

- The Relay service is optional for local development. Email sending functionality will be unavailable without it, but the service will start normally.
- Frontend assets are served at `/metorial-ares/assets/` path.
- The service uses Prisma with PostgreSQL for data storage.
