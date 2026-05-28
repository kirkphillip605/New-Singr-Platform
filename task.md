# Phase 1: Monorepo Foundation — Task Tracker

## Agent 1A: Monorepo Scaffold
- [x] Root `package.json` with pnpm + Turborepo
- [x] `pnpm-workspace.yaml`
- [x] `turbo.json` pipeline configuration
- [x] Directory structure (`apps/`, `packages/`)
- [x] `packages/config/` — shared TSConfig, ESLint, Prettier
- [x] `.env.example` from SAD Section 8
- [x] Placeholder `package.json` for each app/package
- [x] `pnpm install` succeeds

## Agent 1B: Docker Compose & Infrastructure
- [x] `compose.yaml` with all services
- [x] Healthchecks for db-postgres and cache-redis
- [x] Compose Watch for api-node dev reloading
- [x] `docker/` Dockerfile templates
- [x] `docker compose config` validates

## Verification
- [x] `pnpm install` succeeds at root
- [x] `turbo run build --dry-run` shows correct task graph
- [x] `docker compose config` validates

---

# Phase 2: Database Layer — Task Tracker

## Deliverables
- [x] Full Prisma schema mapping all SAD Section 5 tables in `packages/db/prisma/schema.prisma`
- [x] Prisma 7 config in `packages/db/prisma.config.ts` loading DATABASE_URL
- [x] Singleton Prisma Client in `packages/db/src/client.ts` using `@prisma/adapter-pg`
- [x] Seed script in `packages/db/prisma/seed.ts` creating:
  - 1 `global_admin` user
  - 1 `host` user with a `HostProfile`
  - 2 `singer` users
  - 1 public venue + 1 private venue
  - 1 show per venue
  - 1 system with an API key
  - Sample songs (50) in the system's songbook
  - Sample requests
  - Sample favorites
- [x] Raw SQL migration for GIN index on `songs.search_vector` and trigger function to auto-populate from artist & title

## Verification
- [x] Prisma schema validates cleanly
- [x] Initial migrations (`init` and `add_search_trigger`) apply successfully on host Postgres
- [x] Prisma Client successfully generated
- [x] Database seed command executes cleanly and populates all tables

---

# Phase 3: API Core & Authentication — Task Tracker

## Deliverables
- [x] Express.js server entry point (`apps/api-node/src/index.ts`)
- [x] ioredis client singleton configuration (`apps/api-node/src/lib/redis.ts`)
- [x] Middlewares (`apps/api-node/src/middleware/`):
  - [x] Auth session validation middleware
  - [x] Role-based access control middleware
  - [x] Redis-backed rate limiting middleware
  - [x] Global error handler middleware
- [x] Better Auth Server configuration (`apps/api-node/src/lib/auth.ts`)
- [x] Route mounting for `/api/auth/*`
- [x] Auth client utility (`apps/api-node/src/lib/auth-client.ts`)

## Verification
- [x] Express server starts up and logs clean connection to database & Redis
- [x] Health check endpoint (`GET /health`) returns 200 OK
- [x] Better Auth endpoints (`GET /api/auth/ok`) return valid response
- [x] Seeding script verifies relationship integrity

---

# Phase 4: Legacy OpenKJ Adapter — Task Tracker

## Deliverables
- [x] Legacy router file (`apps/api-node/src/routes/legacy/okj-adapter.routes.ts`)
- [x] Command executors file (`apps/api-node/src/routes/legacy/okj-commands.ts`)
- [x] Mounted legacy router inside Main App Router
- [x] In-process 5s debounced shadow-swap transaction logic

## Verification
- [x] POST `connectionTest` returns `connection: ok`
- [x] POST `getEntitledSystemCount` returns correct count of active systems
- [x] POST `getVenues` returns modern shows mapped to integer `venue_id`s
- [x] POST `getRequests` returns correct joined pending requests list
- [x] POST `deleteRequest` / `clearRequests` soft-deletes and increments Counter
- [x] POST `addSongs` inserts into `SongShadow` and debounces shadow swap transaction
- [x] Shadow swap transaction completely executes and populates live `Song` table
- [x] Workspace compiles and lints with 0 errors

---

# Phase 5: Modern REST API — Task Tracker

## Deliverables
- [x] Shows endpoints (`apps/api-node/src/routes/v1/shows.routes.ts`)
  - [x] GET `/v1/shows/nearby` (PostGIS-style query with distance sorting)
  - [x] POST `/v1/shows/:slug/join` (PIN verification for private shows)
  - [x] GET `/v1/shows/:slug/catalog` (FTS query using postgres simple `tsvector`)
- [x] Requests endpoints (`apps/api-node/src/routes/v1/requests.routes.ts`)
  - [x] POST `/v1/requests` (submit request with serial increment)
  - [x] GET `/v1/requests` (host endpoint to view requests)
  - [x] PATCH `/v1/requests/:id` (reorder/update request status)
  - [x] DELETE `/v1/requests/:id` (soft-delete request)
- [x] Users endpoints (`apps/api-node/src/routes/v1/users.routes.ts`)
  - [x] GET `/v1/users/history` (view request history)
  - [x] GET `/v1/users/favorites` (list favorites)
  - [x] POST `/v1/users/favorites` (add favorite)
  - [x] DELETE `/v1/users/favorites/:id` (remove favorite)
- [x] Venues endpoints (`apps/api-node/src/routes/v1/venues.routes.ts`)
  - [x] GET `/v1/venues` (list host's venues)
  - [x] POST `/v1/venues` (create venue with Google Places mock/stub)
  - [x] PATCH `/v1/venues/:id` (update private venue details)
  - [x] DELETE `/v1/venues/:id` (soft-delete venue)
- [x] Systems endpoints (`apps/api-node/src/routes/v1/systems.routes.ts`)
  - [x] GET `/v1/systems` (list host's systems)
  - [x] POST `/v1/systems` (create system with gap-fill system number logic)
  - [x] DELETE `/v1/systems/:id` (soft-delete system freeing gap)
  - [x] POST `/v1/systems/:id/regenerate-key` (rotate system API key)
- [x] Admin endpoints (`apps/api-node/src/routes/v1/admin.routes.ts`)
  - [x] POST `/v1/admin/impersonate` (admin user impersonation)
  - [x] GET `/v1/admin/users` (paginated user lists)
  - [x] PATCH `/v1/admin/users/:id/ban` (ban user)
  - [x] GET `/v1/admin/metrics` (platform wide metrics)
- [x] Billing & Teams endpoints (`apps/api-node/src/routes/v1/billing.routes.ts`, `apps/api-node/src/routes/v1/teams.routes.ts`)
  - [x] List subscription tiers, create Stripe checkout session
  - [x] Stripe webhook handler (price, subscription updates)
  - [x] CRUD host team management and invites

## Verification
- [x] Nearby shows returns sorted list by distance
- [x] Song catalog FTS search returns matches from Postgres
- [x] Request submission increments serial
- [x] Gap-fill system number logic correctly re-allocates deleted system numbers
- [x] Impersonation logs admin metadata correctly
- [x] Stripe signature validation is active and verified

---

# Phase 6: Real-time & Background Workers — Task Tracker

## Deliverables
- [x] WebSocket Server (`apps/api-node/src/ws/ws-server.ts`)
  - [x] Initialize socket.io server integrated with Express HTTP server
  - [x] Session authentication middleware validating connection cookies
  - [x] Dynamic room joining (`show:<showId>`) for singers and hosts
  - [x] Implement ping-pong heartbeats and disconnection handling
- [x] BullMQ Workers (`apps/api-node/src/workers/`)
  - [x] Install `bullmq` dependency
  - [x] Configure `song-sync.queue.ts` with 5s debounce reset logic
  - [x] Create `song-sync.worker.ts` migrating C++ shadow-swap debounce to Redis
  - [x] Emit socket.io updates when song sync processes are completed

## Verification
- [x] WebSocket client connects, authenticates, and joins show rooms successfully
- [x] Singer REST submit requests emit `new_request` WebSocket events
- [x] Debounced BullMQ queue correctly replaces C++ memory timeouts
- [x] Swapping live songs successfully updates clients in real-time
